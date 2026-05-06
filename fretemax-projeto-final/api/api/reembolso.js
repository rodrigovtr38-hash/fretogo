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
  // Apenas aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

  const { idPedido } = req.body;

  try {
    if (!idPedido) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // 🔒 BUSCA SEGURA VIA FIREBASE ADMIN DIRETO NO BANCO
    const freteRef = db.collection('fretes').doc(idPedido);
    const freteSnap = await freteRef.get();

    if (!freteSnap.exists) {
      throw new Error('Pedido não encontrado no banco de dados');
    }

    const freteData = freteSnap.data();

    // 🛑 FILTRO FINANCEIRO E ANTI-FRAUDE
    // Só podemos reembolsar se o webhook tiver salvo o ID do pagamento quando o cliente pagou
    const pagamentoId = freteData.pagamentoId || freteData.transacaoId; 

    if (!pagamentoId) {
      console.error(`[ESTORNO ABORTADO] Pedido ${idPedido} não possui ID de transação do Mercado Pago.`);
      return res.status(400).json({ error: 'Nenhum pagamento confirmado atrelado a este frete.' });
    }

    // Trava para não tentar estornar duas vezes e dar erro na API do MP
    if (freteData.reembolsado) {
      return res.status(400).json({ error: 'Este pedido já foi reembolsado anteriormente.' });
    }

    // 💸 CHAMADA PARA A API OFICIAL DE ESTORNO DO MERCADO PAGO
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[ERRO MERCADO PAGO REEMBOLSO]:", mpData);
      throw new Error(mpData.message || 'Falha ao processar devolução no Mercado Pago');
    }

    // ✅ SUCESSO: Dinheiro devolvido. Atualiza o banco de dados.
    await freteRef.update({
      reembolsado: true,
      dataReembolso: new Date(),
      statusReembolso: mpData.status // Geralmente retorna 'approved'
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Reembolso processado com sucesso e dinheiro devolvido ao cliente',
      detalhe: mpData 
    });

  } catch (error) {
    console.error("[ERRO REEMBOLSO]:", error.message);
    return res.status(500).json({ 
      error: 'Erro interno ao processar o estorno financeiro',
      detalhe: error.message 
    });
  }
}
