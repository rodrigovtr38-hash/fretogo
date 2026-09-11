// =========================================================
// NOME DO ARQUIVO: api/pagamento.js
// Checkout Mercado Pago: autenticação, ownership e idempotência.
// =========================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const CHECKOUT_TTL_MS = 15 * 60 * 1000;
const CHECKOUT_LOCK_MS = 30 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
const MERCADO_PAGO_HOSTS = ['mercadopago.com', 'mercadopago.com.br'];

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

function sanitizeTitle(value) {
  if (typeof value !== 'string') return 'Postagem de Carga - FretoGo';
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F]/g, '');
  return normalized.slice(0, 120) || 'Postagem de Carga - FretoGo';
}

function isMercadoPagoUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return MERCADO_PAGO_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function getPublicBaseUrl() {
  const configured = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://app.fretogo.com.br';
  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:') throw new Error('URL_INSEGURA');
    return parsed.origin;
  } catch {
    return 'https://app.fretogo.com.br';
  }
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

async function releaseCheckoutLock(db, freteRef, lockToken) {
  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(freteRef);
      if (!snapshot.exists || snapshot.data()?.checkoutLockToken !== lockToken) return;
      transaction.update(freteRef, {
        checkoutLock: false,
        checkoutLockToken: FieldValue.delete(),
        checkoutLockTime: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('[PAGAMENTO] Falha ao liberar lock:', error.message);
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
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'PAGAMENTO_INDISPONIVEL' });
    }

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

    const titulo = sanitizeTitle(req.body?.titulo || req.body?.descricao);
    freteRef = db.collection('fretes').doc(idPedido);
    lockToken = crypto.randomUUID();

    const checkoutState = await db.runTransaction(async transaction => {
      const freteSnap = await transaction.get(freteRef);
      if (!freteSnap.exists) return { error: 'FRETE_NAO_ENCONTRADO', statusCode: 404 };

      const freteData = freteSnap.data();
      if (freteData.clienteId !== decodedToken.uid) {
        return { error: 'USUARIO_NAO_AUTORIZADO', statusCode: 403 };
      }

      if (freteData.status !== 'aguardando_pagamento') {
        return { error: 'STATUS_NAO_PERMITE_PAGAMENTO', statusCode: 409 };
      }

      if (freteData.pagamentoStatus === 'aprovado') {
        return { error: 'PAGAMENTO_JA_APROVADO', statusCode: 409 };
      }

      const now = Date.now();
      const checkoutExpiraEm = Number(freteData.checkoutExpiraEm || 0);
      if (isMercadoPagoUrl(freteData.checkoutUrl) && checkoutExpiraEm > now) {
        return {
          reuse: true,
          url: freteData.checkoutUrl,
          preferenceId: freteData.checkoutPreferenceId || undefined,
        };
      }

      const lockTime = Number(freteData.checkoutLockTime || 0);
      if (freteData.checkoutLock === true && now - lockTime < CHECKOUT_LOCK_MS) {
        return { error: 'CHECKOUT_EM_PROCESSAMENTO', statusCode: 429 };
      }

      const valorReal = Number(
        freteData.valorTotal ?? freteData.valorBruto ?? freteData.valorFreteBruto
      );
      if (!Number.isFinite(valorReal) || valorReal <= 0) {
        return { error: 'VALOR_INVALIDO_BASE_DADOS', statusCode: 400 };
      }

      const attempt = Number.isInteger(freteData.checkoutAttempt)
        ? freteData.checkoutAttempt + 1
        : 1;

      transaction.update(freteRef, {
        checkoutLock: true,
        checkoutLockToken: lockToken,
        checkoutLockTime: now,
        checkoutAttempt: attempt,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      return { freteData, valorReal: Number(valorReal.toFixed(2)), attempt };
    });

    if (checkoutState.error) {
      return res.status(checkoutState.statusCode).json({ error: checkoutState.error });
    }

    if (checkoutState.reuse) {
      return res.status(200).json({
        success: true,
        url: checkoutState.url,
        id: checkoutState.preferenceId,
        reused: true,
      });
    }

    const { freteData, valorReal, attempt } = checkoutState;
    const publicBaseUrl = getPublicBaseUrl();
    const paymentIdempotencyKey = crypto
      .createHash('sha256')
      .update(`checkout:${idPedido}:${attempt}`)
      .digest('hex');

    const documento = String(freteData.clienteDocumento || '').replace(/\D/g, '');
    const payer = {
      email: decodedToken.email || `cliente_${idPedido}@fretogo.com`,
      name: String(freteData.clienteNome || 'Cliente FretoGo').slice(0, 120),
    };

    if (documento.length === 11 || documento.length === 14) {
      payer.identification = {
        type: documento.length === 14 ? 'CNPJ' : 'CPF',
        number: documento,
      };
    }

    const mpResponse = await fetchWithTimeout(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': paymentIdempotencyKey,
        },
        body: JSON.stringify({
          items: [{
            title: titulo,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: valorReal,
          }],
          payer,
          external_reference: idPedido,
          metadata: {
            frete_id: idPedido,
            cliente_id: decodedToken.uid,
            checkout_attempt: attempt,
          },
          notification_url: `${publicBaseUrl}/api/webhook`,
          payment_methods: {
            excluded_payment_types: [],
            installments: 1,
            default_installments: 1,
          },
          statement_descriptor: 'FRETOGO',
          back_urls: {
            success: `${publicBaseUrl}/cliente?order=${encodeURIComponent(idPedido)}`,
            failure: `${publicBaseUrl}/cliente?order=${encodeURIComponent(idPedido)}`,
            pending: `${publicBaseUrl}/cliente?order=${encodeURIComponent(idPedido)}`,
          },
          auto_return: 'approved',
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(Date.now() + CHECKOUT_TTL_MS).toISOString(),
        }),
      }
    );

    let mpData = {};
    try {
      mpData = await mpResponse.json();
    } catch {
      mpData = {};
    }

    const checkoutUrl = isMercadoPagoUrl(mpData.init_point)
      ? mpData.init_point
      : isMercadoPagoUrl(mpData.sandbox_init_point)
        ? mpData.sandbox_init_point
        : null;

    if (!mpResponse.ok || !checkoutUrl) {
      await releaseCheckoutLock(db, freteRef, lockToken);
      console.error('[PAGAMENTO] Mercado Pago recusou a criação da preferência:', mpResponse.status);
      return res.status(502).json({ error: 'FALHA_AO_CRIAR_CHECKOUT' });
    }

    const checkoutExpiraEm = Date.now() + CHECKOUT_TTL_MS;
    await db.runTransaction(async transaction => {
      const latestSnap = await transaction.get(freteRef);
      if (!latestSnap.exists) return;
      const latest = latestSnap.data();
      if (latest.checkoutLockToken !== lockToken) return;

      const update = {
        checkoutLock: false,
        checkoutLockToken: FieldValue.delete(),
        checkoutLockTime: FieldValue.delete(),
        checkoutUrl,
        checkoutPreferenceId: String(mpData.id || ''),
        checkoutExpiraEm,
        atualizadoEm: FieldValue.serverTimestamp(),
      };

      if (latest.pagamentoStatus !== 'aprovado') {
        update.pagamentoStatus = 'processando';
      }
      transaction.update(freteRef, update);
    });

    return res.status(200).json({
      success: true,
      url: checkoutUrl,
      id: mpData.id ? String(mpData.id) : undefined,
    });
  } catch (error) {
    if (db && freteRef && lockToken) {
      await releaseCheckoutLock(db, freteRef, lockToken);
    }
    console.error('[PAGAMENTO] Falha interna:', error.message);
    return res.status(500).json({ error: 'ERRO_AO_GERAR_PAGAMENTO' });
  }
}
