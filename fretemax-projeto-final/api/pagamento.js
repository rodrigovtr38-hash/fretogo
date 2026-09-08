// =========================================================
// NOME DO ARQUIVO: api/pagamento.js
// CTO-Log: Arquivo verificado e blindado contra falsos positivos de valor.
// Evolução Fase 5: Agora processa o checkout da "Reserva de Motorista" no momento do Match.
// Evolução Fase 8: Trava dura de estado. Só gera cobrança para reservas ativas e motoristas vinculados.
// Evolução Fase 11: Blindagem de Late Approval. Injeção de Metadata com motorista_id na Preferência MP.
// Evolução Fase 12: Idempotência Atômica. Previne criação simultânea de múltiplos checkouts.
// Evolução Bloco 05-B: Adaptado para fluxo Pré-Match (aguardando_pagamento sem motoristaId).
// =========================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

  const { titulo, idPedido } = req.body;

  try {
    if (!idPedido) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    const freteRef = db.collection('fretes').doc(idPedido);
    let freteData;

    // 🔒 BUSCA SEGURA E ATÔMICA VIA FIREBASE ADMIN
    try {
      freteData = await db.runTransaction(async (transaction) => {
        const freteSnap = await transaction.get(freteRef);

        if (!freteSnap.exists) {
          throw new Error('NOT_FOUND');
        }

        const data = freteSnap.data();
        
        // 🔥 CTO FIX: Proteção de Estado da Reserva (Bloco 05-B - Adaptado para Pré-Match)
        if (data.status !== 'aguardando_pagamento' && data.status !== 'reservado_aguardando_pagamento') {
          throw new Error('INVALID_STATUS');
        }

        // 🔥 CTO FIX (Bloco 05-B): Removida a trava de motorista inexistente, 
        // pois no novo fluxo Escrow o pagamento ocorre ANTES do Match.
        // if (!data.motoristaId) {
        //   throw new Error('NO_DRIVER');
        // }

        // 🔥 CTO FIX: Idempotência - Bloqueio de Concorrência
        // Previne que cliques rápidos gerem múltiplas chamadas ao Mercado Pago.
        // O bloqueio expira em 30s caso haja pane de rede antes do release.
        const now = Date.now();
        if (data.checkoutLock && (now - (data.checkoutLockTime || 0) < 30000)) {
          throw new Error('ALREADY_PROCESSING');
        }

        // Adquire o bloqueio para esta transação específica
        transaction.update(freteRef, {
          checkoutLock: true,
          checkoutLockTime: now
        });

        return data;
      });
    } catch (txError) {
      if (txError.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Pedido não encontrado no banco de dados' });
      }
      if (txError.message === 'INVALID_STATUS') {
        console.error(`[FRAUDE/BLOQUEIO] Tentativa de checkout para frete fora de reserva. ID: ${idPedido}`);
        return res.status(403).json({ error: 'O frete não está disponível para pagamento neste momento.' });
      }
      if (txError.message === 'NO_DRIVER') {
        console.error(`[FRAUDE/BLOQUEIO] Tentativa de checkout para frete sem motorista vinculado. ID: ${idPedido}`);
        return res.status(403).json({ error: 'Nenhum motorista vinculado a esta reserva.' });
      }
      if (txError.message === 'ALREADY_PROCESSING') {
        console.warn(`[CONCORRÊNCIA] Checkout duplo evitado no idPedido: ${idPedido}`);
        return res.status(429).json({ error: 'Já existe um pagamento sendo gerado para este frete. Aguarde.' });
      }
      throw txError; // Outros erros de banco vão para o catch geral.
    }

    // 🔥 CTO FIX: Leitura padronizada da chave de valor
    const valorReal = Number(freteData.valorTotal || freteData.valorBruto || 0);

    if (isNaN(valorReal) || valorReal <= 0) {
      await freteRef.update({ checkoutLock: false }).catch(() => {});
      console.error(`[FRAUDE EVITADA] Valor zerado/inválido. Pedido: ${idPedido}`);
      return res.status(400).json({ error: 'Valor do frete inválido' });
    }

    const clienteNome = freteData.clienteNome || 'Cliente Fretogo';
    const clienteDocumento = freteData.clienteDocumento || '';
    const docType = clienteDocumento.length > 11 ? 'CNPJ' : 'CPF';

    const payerData = {
      email: `cliente_${idPedido}@fretogo.com`, 
      name: clienteNome,
    };

    if (clienteDocumento) {
      payerData.identification = {
        type: docType,
        number: clienteDocumento
      };
    }

    // 🚀 GERAÇÃO DO LINK DO MERCADO PAGO
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            title: titulo,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: valorReal
          }
        ],
        payer: payerData,
        external_reference: idPedido, 
        // 🔥 CTO FIX: BLINDAGEM BLOCO 11 (Contra Late Approval / Swap de Motoristas)
        metadata: {
          motorista_id: freteData.motoristaId || null
        },
        notification_url: `https://${req.headers.host}/api/webhook`, 
        payment_methods: {
          excluded_payment_types: [], 
          installments: 1,
          default_installments: 1
        },
        statement_descriptor: "FRETOGO", 
        back_urls: {
          success: `https://${req.headers.host}/cliente?order=${idPedido}`,
          failure: `https://${req.headers.host}/cliente?order=${idPedido}`,
          pending: `https://${req.headers.host}/cliente?order=${idPedido}`
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();

    if (!data.init_point) {
      // Libera o bloqueio caso o MP retorne erro
      await freteRef.update({ checkoutLock: false }).catch(() => {});
      console.error("[ERRO MP]: O Mercado Pago não devolveu o link.", data);
      return res.status(500).json({ 
        error: 'Erro ao criar preferência no Mercado Pago',
        detalhe: data 
      });
    }

    return res.status(200).json({ url: data.init_point });

  } catch (error) {
    // Libera o bloqueio caso haja falha geral (rede, exceção de código, etc.)
    if (idPedido) {
      await db.collection('fretes').doc(idPedido).update({ checkoutLock: false }).catch(() => {});
    }
    console.error("[ERRO PAGAMENTO]:", error.message);
    return res.status(500).json({ 
      error: 'Erro ao gerar pagamento',
      detalhe: error.message 
    });
  }
}
