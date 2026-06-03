// api/webhook.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

// 🔐 Inicializa o Firebase apenas uma vez na Vercel (Padrão Serverless Seguro)
if (!getApps().length) {
  if (process.env.FIREBASE_ADMIN_CREDENTIAL) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL))
    });
  } else {
    console.error("[ERRO CRÍTICO] FIREBASE_ADMIN_CREDENTIAL não configurado.");
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
    // 🛡️ Validação de Assinatura HMAC (Antifraude do Mercado Pago)
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    const dataId = req.query?.['data.id'] || req.body?.data?.id;

    if (xSignature && process.env.MP_WEBHOOK_SECRET) {
      const parts = xSignature.split(',');
      const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
      const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
        .update(manifest).digest('hex');
      
      if (hmac !== v1) {
        console.error("[FRAUDE BLOQUEADA] Assinatura do Webhook inválida.");
        return res.status(401).send('Assinatura inválida');
      }
    }

    const payment = req.body; 

    if (payment && payment.type === 'payment' && payment.data && payment.data.id) {
      const paymentId = payment.data.id;
      
      console.log(`[WEBHOOK] Notificação de pagamento recebida. ID do MP: ${paymentId}`);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      if (!mpResponse.ok) {
        console.error(`[WEBHOOK] Erro ao consultar Mercado Pago: Status ${mpResponse.status}`);
        return res.status(500).send('Erro ao validar pagamento');
      }

      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) {
        console.warn(`[WEBHOOK] Pagamento ${paymentId} não possui external_reference. Ignorando.`);
        return res.status(400).send('Sem referência de pedido');
      }

      const freteRef = db.collection('fretes').doc(pedidoId);
      const freteSnap = await freteRef.get();

      if (freteSnap.exists) {
        const freteData = freteSnap.data();

        if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
          if (!['disponivel', 'aceito', 'em_transporte', 'entregue'].includes(freteData.status)) {
            await freteRef.update({
              status: 'erro_pagamento',
              atualizadoEm: FieldValue.serverTimestamp()
            });
            console.warn(`[WEBHOOK] Pagamento recusado. Frete ${pedidoId} marcado como erro.`);
          }
          return res.status(200).send('OK'); 
        }

        // 🔥 PAGAMENTO APROVADO OPERACIONAL
        if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {
          
          if (!['disponivel', 'aceito', 'em_transporte', 'entregue'].includes(freteData.status)) {
            
            // Atualiza o banco com os recibos financeiros de auditoria de 24h
            await freteRef.update({
              status: 'disponivel',
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'dispatch_ready',
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              pagamentoValor: paymentData.transaction_amount,
              atualizadoEm: FieldValue.serverTimestamp()
            });
            
            console.log(`[WEBHOOK SUCESSO] Frete ${pedidoId} liberado e marcado como dispatch_ready. Recibo: ${paymentId}`);
            
            // O gatilho de disparo da fila (DispatchQueueService) será invocado pela Cloud Function 
            // de escuta em tempo real ou pelo ciclo assíncrono do Orchestrator.
          }
        }
      } else {
        console.warn(`[WEBHOOK] Documento de frete ${pedidoId} não encontrado no Firestore.`);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno do servidor');
  }
}
