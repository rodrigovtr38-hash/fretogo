// api/webhook.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

// 🔥 CTO FIX: Removidas as importações do React/Client-side para evitar Crash 500 na Vercel.
// O Webhook deve usar apenas firebase-admin e strings brutas de status.

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
    // 🛡️ Validação de Assinatura do Mercado Pago
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

    if (payment?.type === 'payment' && payment.data?.id) {
      const paymentId = payment.data.id;
      
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      if (!mpResponse.ok) return res.status(500).send('Erro ao consultar MP');

      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) return res.status(400).send('Sem referência');

      const freteRef = db.collection('fretes').doc(pedidoId);
      const freteSnap = await freteRef.get();

      if (freteSnap.exists) {
        const freteData = freteSnap.data();

        // 🔥 PAGAMENTO APROVADO - Sincronização Server-Side
        if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {
          
          // Verifica Idempotência (Garante que não processe o mesmo PIX duas vezes)
          if (freteData.pagamentoStatus !== 'aprovado') {
            
            await freteRef.update({
              status: 'buscando_motorista', // Status real do Enum injetado como string
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'em_andamento',
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });
            
            console.log(`[WEBHOOK] Pagamento do Frete ${pedidoId} Aprovado. Disparando para o Radar.`);
            // A esteira de Dispatch do cliente/radar capturará essa mudança de status automaticamente
          }
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno');
  }
}
