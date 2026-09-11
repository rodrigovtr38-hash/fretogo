// =========================================================
// NOME DO ARQUIVO: api/reembolso.js
// Reembolso autenticado e idempotente, sem chamada externa dentro da transação.
// =========================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const ADMIN_UID = 'uV1yeZoGfhZTRWDVL1CnMW6b6NY2';
const REFUND_LOCK_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
const REFUNDABLE_STATUSES = new Set([
  'aguardando_pagamento', 'disponivel', 'agendado', 'buscando_motorista',
  'sem_motorista', 'expirado', 'cancelado',
]);
const AUTHORIZED_SANDBOX_ACCOUNTS = new Set([
  'contato@fretogo.com.br',
  'rodrigovtr38@gmail.com',
]);

let firebaseServices = null;

function getFirebaseServices() {
  if (firebaseServices) return firebaseServices;

  let app = getApps()[0];
  if (!app) {
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-fretogo' });
    } else {
      const rawCredential = process.env.FIREBASE_ADMIN_CREDENTIAL;
      if (!rawCredential) throw new Error('FIREBASE_ADMIN_CREDENTIAL_AUSENTE');
      app = initializeApp({ credential: cert(JSON.parse(rawCredential)) });
    }
  }
  firebaseServices = { db: getFirestore(app), auth: getAuth(app) };
  return firebaseServices;
}

function getBearerToken(req) {
  const header = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function normalizeDocumentId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(normalized) ? normalized : null;
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function finalizeRefund(db, freteRef, lockToken, refundStatus, requestedBy) {
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(freteRef);
    if (!snapshot.exists) throw new Error('FRETE_NAO_ENCONTRADO');

    const current = snapshot.data();
    if (current.reembolsado === true) return;
    if (current.reembolsoLockToken !== lockToken) throw new Error('LOCK_REEMBOLSO_DIVERGENTE');

    transaction.update(freteRef, {
      reembolsado: true,
      dataReembolso: FieldValue.serverTimestamp(),
      reembolsoData: FieldValue.serverTimestamp(),
      statusReembolso: refundStatus || 'approved',
      pagamentoStatus: 'reembolsado',
      status: 'cancelado',
      dispatchStatus: 'encerrado_reembolso',
      motoristaId: null,
      motoristaNome: null,
      motoristaTelefone: null,
      motoristaZap: null,
      ofertaExpiraEm: null,
      reservaExpiraEm: null,
      checkoutLock: false,
      reembolsoLockToken: FieldValue.delete(),
      reembolsoLockTime: FieldValue.delete(),
      reembolsoSolicitadoPor: requestedBy,
      reembolsoPor: requestedBy,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });
}

async function failRefund(db, freteRef, lockToken) {
  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(freteRef);
      if (!snapshot.exists || snapshot.data()?.reembolsoLockToken !== lockToken) return;
      transaction.update(freteRef, {
        statusReembolso: 'failed',
        reembolsoLockToken: FieldValue.delete(),
        reembolsoLockTime: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('[REEMBOLSO] Falha ao liberar lock:', error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METODO_NAO_PERMITIDO' });
  }

  let db;
  let freteRef;
  let lockToken;

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'USUARIO_NAO_AUTENTICADO' });

    const services = getFirebaseServices();
    db = services.db;

    let decodedToken;
    try {
      decodedToken = await services.auth.verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'TOKEN_INVALIDO' });
    }

    const idPedido = normalizeDocumentId(req.body?.idPedido || req.body?.freteId);
    if (!idPedido) return res.status(400).json({ error: 'FRETE_ID_INVALIDO' });

    freteRef = db.collection('fretes').doc(idPedido);
    lockToken = crypto.randomUUID();

    const refundState = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(freteRef);
      if (!snapshot.exists) return { error: 'FRETE_NAO_ENCONTRADO', statusCode: 404 };

      const frete = snapshot.data();
      const isOwner = frete.clienteId === decodedToken.uid;
      const isAdmin = decodedToken.uid === ADMIN_UID || decodedToken.admin === true;
      if (!isOwner && !isAdmin) return { error: 'USUARIO_NAO_AUTORIZADO', statusCode: 403 };

      if (frete.reembolsado === true || frete.pagamentoStatus === 'reembolsado') {
        return { alreadyRefunded: true };
      }

      const pagamentoId = String(frete.pagamentoId || frete.transactionId || '').trim();
      if (!pagamentoId || frete.pagamentoStatus !== 'aprovado') {
        return { error: 'PAGAMENTO_NAO_APROVADO', statusCode: 409 };
      }

      if (!REFUNDABLE_STATUSES.has(String(frete.status || '')) || frete.motoristaId) {
        return { error: 'REEMBOLSO_BLOQUEADO_OPERACAO_ATIVA', statusCode: 409 };
      }

      const now = Date.now();
      const previousLockTime = Number(frete.reembolsoLockTime || 0);
      if (frete.statusReembolso === 'processing' && now - previousLockTime < REFUND_LOCK_MS) {
        return { error: 'REEMBOLSO_EM_PROCESSAMENTO', statusCode: 409 };
      }

      transaction.update(freteRef, {
        statusReembolso: 'processing',
        reembolsoLockToken: lockToken,
        reembolsoLockTime: now,
        reembolsoSolicitadoPor: decodedToken.uid,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      return { pagamentoId, isAdmin };
    });

    if (refundState.error) {
      return res.status(refundState.statusCode).json({ error: refundState.error });
    }
    if (refundState.alreadyRefunded) {
      return res.status(200).json({ success: true, alreadyRefunded: true });
    }

    const normalizedEmail = String(decodedToken.email || '').trim().toLowerCase();
    const isAuthorizedSandbox = decodedToken.email_verified === true && AUTHORIZED_SANDBOX_ACCOUNTS.has(normalizedEmail);
    const isSandboxPayment = refundState.pagamentoId.startsWith('QA_BYPASS_');

    if (isSandboxPayment) {
      if (!isAuthorizedSandbox && !refundState.isAdmin) {
        await failRefund(db, freteRef, lockToken);
        return res.status(403).json({ error: 'HOMOLOGACAO_NAO_AUTORIZADA' });
      }

      await finalizeRefund(db, freteRef, lockToken, 'approved_test', decodedToken.uid);
      return res.status(200).json({ success: true, sandbox: true });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      await failRefund(db, freteRef, lockToken);
      return res.status(503).json({ error: 'REEMBOLSO_INDISPONIVEL' });
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`refund:${idPedido}:${refundState.pagamentoId}`)
      .digest('hex');

    const mpResponse = await fetchWithTimeout(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(refundState.pagamentoId)}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    );

    let mpData = {};
    try {
      mpData = await mpResponse.json();
    } catch {
      mpData = {};
    }

    if (!mpResponse.ok) {
      await failRefund(db, freteRef, lockToken);
      console.error('[REEMBOLSO] Mercado Pago recusou a solicitação:', mpResponse.status);
      return res.status(502).json({ error: 'FALHA_AO_PROCESSAR_REEMBOLSO' });
    }

    await finalizeRefund(
      db,
      freteRef,
      lockToken,
      typeof mpData.status === 'string' ? mpData.status : 'approved',
      decodedToken.uid
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    if (db && freteRef && lockToken) {
      await failRefund(db, freteRef, lockToken);
    }
    console.error('[REEMBOLSO] Falha interna:', error.message);
    return res.status(500).json({ error: 'ERRO_AO_PROCESSAR_REEMBOLSO' });
  }
}
