// api/reembolso.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 🔐 Inicialização segura do Firebase Admin
if (!getApps().length) {
  if (process.env.FIREBASE_ADMIN_CREDENTIAL) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL))
    });
  } else {
    console.error("[ERRO CRÍTICO] FIREBASE_ADMIN_CREDENTIAL não configurado na Vercel.");
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

  // // AJUSTE CTO: Proteção rigorosa das credenciais do Mercado Pago
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("[ALERTA ADMIN] Token do Mercado Pago não encontrado no Vercel Env.");
    return res.status(500).json({ error: 'Configuração financeira do servidor ausente.' });
  }

  const { idPedido } = req.body;
  if (!idPedido) {
    return res.status(400).json({ error: 'ID do pedido é obrigatório' });
  }

  try {
    const freteRef = db.collection('fretes').doc(idPedido);
    let mpData = null;

    // // AJUSTE CTO: Transação de Segurança "Double-Spend" (Duplo Estorno).
    // Garante que dois cliques não executem dois estornos. O banco tranca a porta.
    await db.runTransaction(async (t) => {
      const freteSnap = await t.get(freteRef);

      if (!freteSnap.exists) {
        throw new Error('Pedido não encontrado no banco de dados');
      }

      const freteData = freteSnap.data();
      const pagamentoId = freteData.pagamentoId || freteData.transacaoId; 

      if (!pagamentoId) {
         throw new Error('Nenhum pagamento confirmado atrelado a este frete.');
      }

      if (freteData.reembolsado || freteData.statusReembolso === 'processing') {
         throw new Error('Este pedido já foi reembolsado ou está em processamento.');
      }

      // Trava Otimista: Marca como "processing" no banco antes de fazer a chamada no Mercado Pago
      t.update(freteRef, { statusReembolso: 'processing' });

      // 💸 CHAMADA PARA A API OFICIAL DE ESTORNO DO MERCADO PAGO
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        throw new Error(mpData.message || 'Falha ao processar devolução no Mercado Pago');
      }

      // ✅ SUCESSO DO MP: Atualiza a transação com a confirmação final
      t.update(freteRef, {
        reembolsado: true,
        dataReembolso: new Date(),
        statusReembolso: mpData.status || 'approved'
      });
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Reembolso processado com sucesso e dinheiro devolvido ao cliente',
      detalhe: mpData 
    });

  } catch (error) {
    console.error("[ERRO REEMBOLSO]:", error.message);
    
    // Fallback: Se der erro no MP, limpa o status de processing para permitir nova tentativa futura
    try {
      await db.collection('fretes').doc(idPedido).update({ statusReembolso: 'failed' });
    } catch (e) {
       // Ignora erro do fallback
    }

    return res.status(500).json({ 
      error: 'Erro interno ao processar o estorno financeiro',
      detalhe: error.message 
    });
  }
}
