// api/reembolso.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore'; // // AJUSTE CTO: Adicionado FieldValue para auditoria temporal precisa do servidor.
import crypto from 'crypto'; // // AJUSTE CTO: Adicionado crypto para gerar a assinatura hash de idempotência.

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

    // // AJUSTE CTO: Transação de Segurança Avançada contra Double-Spend e Corrida de Status Operacional.
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

      // // AJUSTE CTO: Trava 1 (Idempotência Interna) -> Bloqueia cliques duplos simultâneos
      if (freteData.reembolsado || freteData.statusReembolso === 'processing') {
         throw new Error('Este pedido já foi reembolsado ou está em processamento.');
      }

      // // AJUSTE CTO: Trava 2 (Segurança de Operação) -> Se o motorista já aceitou ou saiu, o estorno automático é proibido.
      // O frete só pode ser estornado se o status for 'disponivel', 'aguardando_pagamento' ou 'buscando_motorista'.
      const statusBloqueados = ['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'finalizando', 'entregue', 'finalizado'];
      if (statusBloqueados.includes(freteData.status)) {
         throw new Error(`ESTORNO_BLOQUEADO: O frete está com status ${freteData.status}. O motorista já está em andamento.`);
      }

      // Trava Otimista: Marca como "processing" no banco antes de fazer a chamada de rede externa
      t.update(freteRef, { statusReembolso: 'processing' });

      // // AJUSTE CTO: Geração de chave de Idempotência Criptográfica Única para blindar a API do Mercado Pago
      const idempotencyKey = crypto.createHash('sha256').update(idPedido + pagamentoId).digest('hex');

      // // AJUSTE CTO: AbortController para forçar o Timeout em 10s e impedir que a Vercel mate a thread no meio do processo
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // 💸 CHAMADA PARA A API OFICIAL DE ESTORNO DO MERCADO PAGO
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey // Garante que o Mercado Pago ignore duplicações por instabilidade de sinal
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        throw new Error(mpData.message || 'Falha ao processar devolução no Mercado Pago');
      }

      // ✅ SUCESSO DO MP: Atualiza a transação com os parâmetros corretos do servidor
      t.update(freteRef, {
        reembolsado: true,
        dataReembolso: FieldValue.serverTimestamp(), // Usa hora central do Google Firestore, livre de fraudes locais
        statusReembolso: mpData.status || 'approved',
        status: 'cancelado', // Força a baixa imediata da rota para limpar o radar do app
        atualizadoEm: FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Reembolso processado com sucesso e dinheiro devolvido ao cliente',
      detalhe: mpData 
    });

  } catch (error) {
    console.error("[ERRO REEMBOLSO]:", error.message);
    
    // Fallback: Se der erro no Mercado Pago, limpa o status de lock para viabilizar re-tentativa pelo suporte
    try {
      if (!error.message.includes('ESTORNO_BLOQUEADO')) {
        await db.collection('fretes').doc(idPedido).update({ statusReembolso: 'failed' });
      }
    } catch (e) {
       // Ignora erro de rede no fallback
    }

    // // AJUSTE CTO: Define o Status Code condicional. 409 para conflitos de regra de negócio, 500 para falhas internas severas.
    const statusCode = error.message.includes('ESTORNO_BLOQUEADO') ? 409 : 500;

    return res.status(statusCode).json({ 
      error: 'Erro ao processar o estorno financeiro',
      detalhe: error.message 
    });
  }
}
