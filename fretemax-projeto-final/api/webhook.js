// api/webhook.js
// CTO-Log: CORREÇÃO CRÍTICA DO BURACO NEGRO DE PAGAMENTO.
// O Webhook agora captura tanto payloads de IPN (req.query) quanto de Webhooks tradicionais (req.body).
// Alterada a validação de Sandbox para garantir a liberação do frete para o Radar do Motorista.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

// Disparo de WhatsApp sem travar a thread do Webhook
async function dispararWhatsAppAsync(telefone, mensagem, tentativa = 1) {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL; 
    if (!apiUrl) return;

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({ phone: telefone, message: mensagem })
    });
  } catch (e) {
    if (tentativa < 3) {
      setTimeout(() => dispararWhatsAppAsync(telefone, mensagem, tentativa + 1), 5000 * tentativa);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    // 🔥 CTO FIX 1: O Mercado Pago manda aviso por IPN (Query) ou Webhook (Body).
    // Agora o sistema rastreia o ID da transação não importa de onde venha.
    const dataId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    const type = req.query.topic || req.body?.type || req.body?.action;

    // Verificação de assinatura (Segurança contra hackers tentando forjar pagamento)
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

    // 🔥 CTO FIX 2: Garante que só vai processar se for um evento de "pagamento"
    const isPayment = type === 'payment' || type?.startsWith('payment');

    if (isPayment && dataId) {
      const paymentId = dataId;
      
      // Bate na porta do Mercado Pago para confirmar se o pagamento é real
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      if (!mpResponse.ok) return res.status(500).send('Erro ao consultar MP');

      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) return res.status(400).send('Sem referência no pagamento');

      const freteRef = db.collection('fretes').doc(pedidoId);
      const freteSnap = await freteRef.get();

      if (freteSnap.exists) {
        const freteData = freteSnap.data();

        // 🔥 CTO FIX 3: Em Sandbox, o "status_detail" varia muito. Vamos focar apenas no "approved".
        if (paymentData.status === 'approved') {
          
          if (freteData.pagamentoStatus !== 'aprovado') {
            
            // ✅ ATUALIZAÇÃO MESTRE: Libera o frete para o Radar e destrava a tela do cliente
            await freteRef.update({
              status: 'disponivel', // É essa palavra mágica que acorda o motorista!
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'em_andamento',
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });
            
            console.log(`[SUCESSO WEBHOOK] Pagamento ${pedidoId} Aprovado. Frete lançado no Radar!`);

            if (freteData.telefoneCliente) {
               dispararWhatsAppAsync(
                 freteData.telefoneCliente, 
                 `✅ FretoGo: Pagamento confirmado! A sua carga já está no Radar dos nossos motoristas. Acompanhe pelo app.`
               );
            }
          }
        }
      }
    }
    
    // Devolve o 200 rápido pro Mercado Pago parar de ligar
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno');
  }
}
