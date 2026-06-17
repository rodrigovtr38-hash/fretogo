// api/webhook.js
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

// // AJUSTE CTO: Função de Envio de Mensagem (Fire-and-Forget com sistema de Retry básico).
// Essa função não espera a resposta (await) para não travar o Webhook do Mercado Pago.
async function dispararWhatsAppAsync(telefone, mensagem, tentativa = 1) {
  try {
    // Aqui entra o POST para a API Oficial do WhatsApp ou Z-API / Evolution
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
      console.warn(`[WHATSAPP RETRY] Tentativa ${tentativa} falhou para ${telefone}. Tentando de novo...`);
      // Fila simples em memória para tentar de novo sem travar
      setTimeout(() => dispararWhatsAppAsync(telefone, mensagem, tentativa + 1), 5000 * tentativa);
    } else {
      console.error(`[WHATSAPP FALHOU DEFINITIVO] Não foi possível avisar ${telefone}.`);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
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

        if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {
          
          if (freteData.pagamentoStatus !== 'aprovado') {
            
            // 1. Atualiza o banco (Síncrono e Rápido)
            await freteRef.update({
              status: 'buscando_motorista', 
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'em_andamento',
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });
            
            console.log(`[WEBHOOK] Pagamento do Frete ${pedidoId} Aprovado.`);

            // // AJUSTE CTO: Desacoplamento.
            // O webhook dispara a notificação no fundo e JÁ DEVOLVE a resposta 200 ao Mercado Pago.
            // Se o Zap demorar, não quebra a transação do cliente.
            if (freteData.telefoneCliente) {
               dispararWhatsAppAsync(
                 freteData.telefoneCliente, 
                 `✅ FretoGo: Seu pagamento do frete foi confirmado! Estamos localizando o melhor motorista na região.`
               );
            }
          }
        }
      }
    }
    
    // Devolve o 200 pro MP em menos de 1 segundo
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno');
  }
}
