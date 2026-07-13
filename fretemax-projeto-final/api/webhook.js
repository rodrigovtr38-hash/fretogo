// api/webhook.js
// CTO-Log: CORREÇÃO CRÍTICA DO BURACO NEGRO DE PAGAMENTO MANTIDA.
// CTO-Log 2: Injeção do Link de Rastreamento Automático (Link Recovery) via WhatsApp.
// CTO-Log 3: 🛡️ BLINDAGEM DE ASSINATURA DUPLA (KEY ROTATION BUG FIX). Suporte a múltiplas chaves (v1) pós-redefinição no Mercado Pago.

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

    const dataId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    const type = req.query.topic || req.body?.type || req.body?.action;

    // 🛡️ CTO FIX: Verificação de múltiplas assinaturas para evitar bloqueio em Key Rotation
    if (xSignature && process.env.MP_WEBHOOK_SECRET) {
      const parts = xSignature.split(',');
      const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
      
      // Mapeia TODAS as assinaturas v1 enviadas pelo banco no cabeçalho
      const v1Signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.split('=')[1]);
      
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
        .update(manifest).digest('hex');
      
      // Libera o sistema se a nossa chave bater com QUALQUER UMA das chaves recebidas
      if (!v1Signatures.includes(hmac)) {
        console.error("[FRAUDE BLOQUEADA] Nenhuma das assinaturas do Webhook é válida.");
        return res.status(401).send('Assinatura inválida');
      }
    }

    const isPayment = type === 'payment' || type?.startsWith('payment');

    if (isPayment && dataId) {
      const paymentId = dataId;
      
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

        if (paymentData.status === 'approved') {
          
          if (freteData.pagamentoStatus !== 'aprovado') {
            
            await freteRef.update({
              status: 'disponivel', 
              pagamentoStatus: 'aprovado',
              dispatchStatus: 'em_andamento',
              pagoEm: FieldValue.serverTimestamp(),
              pagamentoId: paymentId,
              atualizadoEm: FieldValue.serverTimestamp()
            });
            
            console.log(`[SUCESSO WEBHOOK] Pagamento ${pedidoId} Aprovado. Frete lançado no Radar!`);

            // 🔥 A MÁGICA DO WHATSAPP AQUI: Link de Tracking com Parâmetro ?order=
            if (freteData.clienteZap || freteData.telefoneCliente) {
               const zapCliente = freteData.clienteZap || freteData.telefoneCliente;
               const linkRastreio = `https://app.fretogo.com.br/cliente?order=${pedidoId}`;
               const mensagemZap = `✅ *FretoGo*: Pagamento confirmado!\n\nSua carga já está no Radar dos nossos motoristas.\n\n📍 *Acompanhe em tempo real e pegue seus PINs de Segurança no link abaixo:*\n${linkRastreio}`;
               
               dispararWhatsAppAsync(zapCliente, mensagemZap);
            }
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
