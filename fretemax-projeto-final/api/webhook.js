import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
    const payment = req.body; 

    if (payment && payment.type === 'payment' && payment.data && payment.data.id) {
      const paymentId = payment.data.id;
      
      // ✅ LOG CLARO: Ajuda no debug na Vercel
      console.log(`[WEBHOOK] Notificação de pagamento recebida. ID do MP: ${paymentId}`);

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      // ✅ AJUSTE 1: Validar erro da API do Mercado Pago antes de tentar ler o JSON
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

        // ✅ AJUSTE 3: Tratar pagamento rejeitado/recusado para não travar o app do cliente
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

        // 🔥 PAGAMENTO APROVADO
        if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {
          
          // Proteção de Duplicidade: Só destrava o radar se o status ainda não andou
          if (!['disponivel', 'aceito', 'em_transporte', 'entregue'].includes(freteData.status)) {
            
            await freteRef.update({
              status: 'disponivel',
              pagoEm: FieldValue.serverTimestamp(),
            });
            console.log(`[WEBHOOK SUCESSO] Frete ${pedidoId} liberado e entrou no Radar!`);
          }
        }
      } else {
        console.warn(`[WEBHOOK] Documento de frete ${pedidoId} não encontrado no Firestore.`);
      }
    }

    // Sempre retorna 200 para o Mercado Pago dar a mensagem como entregue
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno do servidor');
  }
}
