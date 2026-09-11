// =========================================================
// NOME DO ARQUIVO: api/webhook.js
// Autoridade do pagamento real: assinatura, consulta ao MP e transação idempotente.
// =========================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const REQUEST_TIMEOUT_MS = 10000;
const REJECTED_PAYMENT_STATUSES = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);
const OPERATIONAL_STATUSES = new Set([
  'disponivel', 'agendado', 'buscando_motorista', 'expandindo_busca',
  'ofertando', 'aguardando_aceite', 'reservado_aguardando_pagamento',
  'aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte',
  'parado_operacional', 'chegou_entrega', 'entregando', 'finalizando',
  'validando_comprovante',
]);

let firestore = null;

function getDb() {
  if (firestore) return firestore;

  let app = getApps()[0];
  if (!app) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-fretogo' });
    } else {
      const rawCredential = process.env.FIREBASE_ADMIN_CREDENTIAL;
      if (!rawCredential) throw new Error('FIREBASE_ADMIN_CREDENTIAL_AUSENTE');
      app = initializeApp({ credential: cert(JSON.parse(rawCredential)) });
    }
  }
  firestore = getFirestore(app);
  return firestore;
}

function getHeader(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function getDataId(req) {
  const value = req.query?.['data.id'] ?? req.query?.id ?? req.body?.data?.id ?? req.body?.id;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(normalized) ? normalized : null;
}

function getNotificationType(req) {
  const value = req.query?.type ?? req.query?.topic ?? req.body?.type ?? req.body?.topic;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function timingSafeHexEqual(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateWebhookSignature(req, dataId) {
  const signature = getHeader(req, 'x-signature');
  const requestId = getHeader(req, 'x-request-id');
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret || typeof signature !== 'string' || typeof requestId !== 'string') return false;

  const parts = new Map();
  signature.split(',').forEach(part => {
    const separator = part.indexOf('=');
    if (separator <= 0) return;
    parts.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  });

  const ts = parts.get('ts');
  const receivedSignature = parts.get('v1');
  if (!ts || !receivedSignature || !/^\d+$/.test(ts)) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const calculated = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return timingSafeHexEqual(calculated, receivedSignature);
}

function normalizeFreightId(value) {
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

async function dispararWhatsAppSeguro(telefone, mensagem) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  if (!apiUrl || !token || !telefone) return false;

  try {
    const response = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    }, 4000);
    return response.ok;
  } catch (error) {
    console.error('[WEBHOOK] Falha no WhatsApp:', error.message);
    return false;
  }
}

function buildDriverRelease(transaction, db, freteData, freteId) {
  if (!freteData.motoristaId) return Promise.resolve();

  const refs = [
    db.collection('motoristas_online').doc(freteData.motoristaId),
    db.collection('motoristas_cadastros').doc(freteData.motoristaId),
  ];

  return Promise.all(refs.map(ref => transaction.get(ref))).then(snapshots => {
    snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return;

    const driver = snapshot.data();
    const linked = [driver.freteAtualId, driver.activeTripId, driver.currentTripId].includes(freteId);
    if (!linked) return;

      transaction.set(refs[index], {
      state: 'ONLINE',
      freteAtualId: null,
      activeTripId: null,
      currentTripId: null,
      disponivel: true,
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Método não permitido');
  }

  try {
    if (!process.env.MP_WEBHOOK_SECRET || !process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('[WEBHOOK] Configuração financeira ausente.');
      return res.status(503).send('Configuração de servidor ausente');
    }

    const dataId = getDataId(req);
    if (!dataId) return res.status(400).send('Identificador de notificação ausente');

    if (!validateWebhookSignature(req, dataId)) {
      console.error('[WEBHOOK] Assinatura ausente ou inválida.');
      return res.status(401).send('Assinatura inválida');
    }

    const type = getNotificationType(req);
    const isPayment = type === 'payment' || type.startsWith('payment.');
    if (!isPayment) return res.status(200).send('Evento ignorado');

    const mpResponse = await fetchWithTimeout(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` } }
    );

    if (!mpResponse.ok) {
      console.error('[WEBHOOK] Falha ao consultar pagamento:', mpResponse.status);
      return res.status(502).send('Falha ao consultar pagamento');
    }

    const paymentData = await mpResponse.json();
    if (String(paymentData.id) !== String(dataId)) {
      return res.status(400).send('Pagamento divergente');
    }

    const freteId = normalizeFreightId(paymentData.external_reference);
    if (!freteId) return res.status(400).send('Referência do frete inválida');

    if (paymentData.metadata?.frete_id && paymentData.metadata.frete_id !== freteId) {
      return res.status(400).send('Metadata divergente');
    }

    const db = getDb();
    const freteRef = db.collection('fretes').doc(freteId);
    let whatsappPayload = null;

    await db.runTransaction(async transaction => {
      const freteSnap = await transaction.get(freteRef);
      if (!freteSnap.exists) throw new Error('FRETE_NAO_ENCONTRADO');

      const frete = freteSnap.data();
      if (paymentData.metadata?.cliente_id && paymentData.metadata.cliente_id !== frete.clienteId) {
        throw new Error('CLIENTE_DIVERGENTE');
      }

      const expectedAmount = Number(frete.valorTotal ?? frete.valorBruto ?? frete.valorFreteBruto);
      const paidAmount = Number(paymentData.transaction_amount);
      const amountMatches = Number.isFinite(expectedAmount) && expectedAmount > 0 &&
        Number.isFinite(paidAmount) && Math.abs(expectedAmount - paidAmount) <= 0.01;
      const currencyMatches = !paymentData.currency_id || paymentData.currency_id === 'BRL';

      const isDuplicate = frete.pagamentoId && String(frete.pagamentoId) === String(paymentData.id);
      const commonPaymentUpdate = {
        checkoutLock: false,
        checkoutLockToken: FieldValue.delete(),
        checkoutLockTime: FieldValue.delete(),
        checkoutUrl: FieldValue.delete(),
        checkoutPreferenceId: FieldValue.delete(),
        checkoutExpiraEm: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      };

      if (paymentData.status === 'approved') {
        if (isDuplicate && frete.pagamentoStatus === 'aprovado') return;

        if (!amountMatches || !currencyMatches) {
          transaction.update(freteRef, {
            ...commonPaymentUpdate,
            status: 'cancelado',
            dispatchStatus: 'encerrado_divergencia_financeira',
            pagamentoStatus: 'aprovado',
            pagamentoId: String(paymentData.id),
            transactionId: String(paymentData.id),
            statusReembolso: 'pending',
            reembolsado: false,
            motivoCancelamento: 'Pagamento aprovado com valor ou moeda divergente.',
          });
          return;
        }

        if (frete.pagamentoStatus === 'aprovado' && frete.pagamentoId && !isDuplicate) {
          transaction.update(freteRef, {
            ...commonPaymentUpdate,
            statusReembolso: 'manual_review',
          });
          return;
        }

        if (frete.status !== 'aguardando_pagamento') {
          transaction.update(freteRef, {
            ...commonPaymentUpdate,
            status: 'cancelado',
            dispatchStatus: 'encerrado_aprovacao_tardia',
            pagamentoStatus: 'aprovado',
            pagamentoId: String(paymentData.id),
            transactionId: String(paymentData.id),
            pagoEm: FieldValue.serverTimestamp(),
            statusReembolso: 'pending',
            reembolsado: false,
            motivoCancelamento: 'Pagamento aprovado após o encerramento da janela operacional.',
          });
          return;
        }

        const isAgendado = frete.tipoFrete === 'agendado' || frete.agendado === true;
        transaction.update(freteRef, {
          ...commonPaymentUpdate,
          status: isAgendado ? 'agendado' : 'disponivel',
          pagamentoStatus: 'aprovado',
          dispatchStatus: isAgendado ? 'retido_agendamento' : 'mural_aberto',
          pagamentoId: String(paymentData.id),
          transactionId: String(paymentData.id),
          pagoEm: FieldValue.serverTimestamp(),
          statusReembolso: FieldValue.delete(),
          reembolsado: false,
        });

        const chatRef = freteRef.collection('chat').doc();
        transaction.set(chatRef, {
          texto: isAgendado
            ? 'Pagamento confirmado. A carga permanece agendada até a janela operacional.'
            : 'Pagamento confirmado. A carga foi liberada para o Radar de Motoristas.',
          nome: 'Torre de Controle',
          tipoUsuario: 'admin',
          createdAt: FieldValue.serverTimestamp(),
        });

        const telefone = frete.clienteZap || frete.telefoneCliente;
        if (telefone) {
          whatsappPayload = {
            telefone,
            mensagem: isAgendado
              ? `FretoGo: pagamento confirmado. Sua carga ${freteId} está agendada.`
              : `FretoGo: pagamento confirmado. Sua carga ${freteId} foi publicada no Radar.`,
          };
        }
        return;
      }

      if (['pending', 'in_process', 'authorized'].includes(paymentData.status)) {
        if (frete.pagamentoStatus !== 'aprovado') {
          transaction.update(freteRef, {
            ...commonPaymentUpdate,
            pagamentoStatus: 'processando',
            pagamentoId: String(paymentData.id),
            transactionId: String(paymentData.id),
          });
        }
        return;
      }

      if (REJECTED_PAYMENT_STATUSES.has(paymentData.status)) {
        if (frete.pagamentoId && !isDuplicate && frete.pagamentoStatus === 'aprovado') return;

        const shouldAbortOperation = OPERATIONAL_STATUSES.has(frete.status);
        const wasAwaitingPayment = frete.status === 'aguardando_pagamento';
        const normalizedPaymentStatus = paymentData.status === 'refunded'
          ? 'reembolsado'
          : paymentData.status;
        if (shouldAbortOperation) {
          await buildDriverRelease(transaction, db, frete, freteId);
        }

        transaction.update(freteRef, {
          ...commonPaymentUpdate,
          status: shouldAbortOperation ? 'cancelado' : wasAwaitingPayment ? 'expirado' : frete.status,
          dispatchStatus: shouldAbortOperation || wasAwaitingPayment ? 'encerrado_pagamento' : frete.dispatchStatus,
          pagamentoStatus: normalizedPaymentStatus,
          pagamentoId: String(paymentData.id),
          transactionId: String(paymentData.id),
          reembolsado: ['refunded', 'charged_back'].includes(paymentData.status),
          statusReembolso: ['refunded', 'charged_back'].includes(paymentData.status) ? 'approved' : FieldValue.delete(),
          motivoCancelamento: shouldAbortOperation
            ? 'Operação interrompida por perda da cobertura financeira.'
            : 'Pagamento não aprovado.',
        });
      }
    });

    if (whatsappPayload) {
      await dispararWhatsAppSeguro(whatsappPayload.telefone, whatsappPayload.mensagem);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[WEBHOOK] Falha no processamento:', error.message);
    return res.status(500).send('Erro interno no servidor de pagamentos');
  }
}
