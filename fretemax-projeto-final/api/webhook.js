// =========================================================
// NOME DO ARQUIVO: api/webhook.js
// CTO-Log: Auditoria Etapa 5 (Escrow e Pagamentos) - REVISÃO FINAL.
// 6. 🔥 CTO FIX (FASE 12): Validação de Titularidade. Proteção absoluta contra Swap de Motorista e Late Approvals.
// 8. 🔥 CTO FIX (PAGAMENTO REAL): Idempotência de String corrigida (aprovado === approved).
// 9. 🔥 CTO FIX (BUSINESS): Rejeição não devolve ao radar automaticamente, vira EXPIRADO.
// 10. 🔥 CTO FIX (BLOCO 03): Transação Atômica injetada para evitar Race Condition contra o Watchdog de 5 minutos.
// 11. 🔥 CTO FIX (BLOCO 05): Sincronização da timeline visual do cliente injetada no Firestore.
// 12. 🔥 CTO FIX (EXECUÇÃO BLOCO 03): Novo Funil de Pré-Pagamento. A carga vai para 'disponivel' após o PIX. Fluxo sem motorista.
// =========================================================

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database'; 
import crypto from 'crypto';

if (!getApps().length) {
  if (process.env.FIREBASE_ADMIN_CREDENTIAL) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)),
      databaseURL: process.env.FIREBASE_RTDB_URL || `https://${JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL).project_id}-default-rtdb.firebaseio.com` 
    });
  } else {
    console.error("[ERRO CRÍTICO SERVERLESS] FIREBASE_ADMIN_CREDENTIAL não configurado na Vercel.");
  }
}

const db = getFirestore();
const rtdb = getDatabase(); 

async function dispararWhatsAppSeguro(telefone, mensagem) {
  const apiUrl = process.env.WHATSAPP_API_URL; 
  if (!apiUrl) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); 

  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
      signal: controller.signal
    });
  } catch (e) {
    console.error("[WHATSAPP ERRO]", e.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    const dataId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    const type = req.query.topic || req.body?.type || req.body?.action;

    if (!process.env.MP_WEBHOOK_SECRET) {
      console.error("[ERRO DE INFRAESTRUTURA] MP_WEBHOOK_SECRET não encontrado nas variáveis da Vercel.");
      return res.status(500).send('Configuração de servidor ausente');
    }

    if (xSignature) {
      const parts = xSignature.split(',');
      const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
      
      const v1Signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.split('=')[1]);
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      
      const hmac = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
        .update(manifest).digest('hex');
      
      if (!v1Signatures.includes(hmac)) {
        console.error(`[FRAUDE BLOQUEADA] Assinatura calculada não confere com o Mercado Pago. ID: ${dataId}`);
        return res.status(401).send('Assinatura inválida');
      }
    } else {
        console.warn("[ALERTA DE SEGURANÇA] Webhook recebido sem x-signature.");
    }

    const isPayment = type === 'payment' || type?.startsWith('payment');

    if (isPayment && dataId) {
      const paymentId = dataId;
      
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      if (!mpResponse.ok) return res.status(500).send('Erro de comunicação com a API do Mercado Pago');

      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) return res.status(400).send('Sem referência no pagamento');

      const freteRef = db.collection('fretes').doc(pedidoId);

      let zapPayload = null;

      // 🔥 CTO FIX: Transação Atômica para blindar contra o Watchdog
      await db.runTransaction(async (transaction) => {
        const freteSnap = await transaction.get(freteRef);

        if (!freteSnap.exists) return;

        const freteData = freteSnap.data();

        // 🔥 CTO FIX: Idempotência de tradução (Português vs Inglês)
        const isAlreadyApproved = paymentData.status === 'approved' && freteData.pagamentoStatus === 'aprovado';
        const isAlreadyRejected = ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentData.status) && freteData.pagamentoStatus === paymentData.status;

        if ((isAlreadyApproved || isAlreadyRejected) && freteData.pagamentoId === paymentId) {
           console.log(`[IDEMPOTÊNCIA] Pagamento ${paymentId} já processado. Ignorando duplicata.`);
           return;
        }

        // ==========================================
        // CASO 1: PAGAMENTO APROVADO
        // ==========================================
        if (paymentData.status === 'approved') {
          
          if (freteData.status === 'aguardando_pagamento') {
            
            // 🔥 CTO FIX (BLOCO 03): Liberação Firestore (SSOT) direto para o FEED/RADAR
            transaction.update(freteRef, {
              status: 'disponivel', 
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'mural_aberto', // Libera visualização no radar 
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });

            // 🔥 CTO FIX (BLOCO 05): Registro na subcoleção de chat da viagem
            const chatRef = freteRef.collection('chat').doc();
            transaction.set(chatRef, {
              texto: '🔔 [Torre Operacional]: Pagamento de custódia (Escrow) confirmado. Carga oficialmente publicada no Radar de Motoristas.',
              nome: 'Torre de Controle (IA)',
              tipoUsuario: 'admin',
              createdAt: FieldValue.serverTimestamp()
            });
            
            if (freteData.clienteZap || freteData.telefoneCliente) {
               const zapCliente = freteData.clienteZap || freteData.telefoneCliente;
               const linkRastreio = `https://app.fretogo.com.br/cliente?order=${pedidoId}`;
               zapPayload = {
                 telefone: zapCliente,
                 mensagem: `✅ *FretoGo*: Pagamento Escrow confirmado!\n\nSua carga acaba de ser publicada no Radar e está visível para os motoristas. Acompanhe a operação ao vivo: ${linkRastreio}`
               };
            }
          } else {
            console.warn(`[LATE APPROVAL] Carga em status: ${freteData.status}. Alteração de status principal ignorada.`);
            transaction.update(freteRef, {
              pagamentoStatus: 'aprovado',
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });
          }

        // ==========================================
        // CASO 2: PAGAMENTO REJEITADO / ESTORNADO
        // ==========================================
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentData.status)) {
          
          if (freteData.status === 'aguardando_pagamento') {
            console.log(`[ROLLBACK] Pagamento recusado ou estornado. Expirando reserva.`);
            
            // 🔥 CTO FIX: Status alterado para expirado em vez de disponivel, conforme regra comercial.
            transaction.update(freteRef, {
              status: 'expirado', 
              pagamentoStatus: paymentData.status,
              atualizadoEm: FieldValue.serverTimestamp()
            });

          } else {
            transaction.update(freteRef, { pagamentoStatus: paymentData.status, atualizadoEm: FieldValue.serverTimestamp() });
          }
        }
      });

      // Side-effects executados apenas se a transação atômica commitar com sucesso
      if (zapPayload) {
        console.log(`[SUCESSO] Escrow Validado. Pagamento Aprovado. Viagem Liberada no Radar!`);
        await dispararWhatsAppSeguro(zapPayload.telefone, zapPayload.mensagem);
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK PANIC CRÍTICO]:`, err);
    res.status(500).send('Erro interno no servidor de pagamentos');
  }
}
