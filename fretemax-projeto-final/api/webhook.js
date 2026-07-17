// api/webhook.js
// CTO-Log: Auditoria Etapa 5 (Escrow e Pagamentos).
// 1. CORREÇÃO CRÍTICA DO BURACO NEGRO DE PAGAMENTO MANTIDA.
// 2. Injeção do Link de Rastreamento Automático (Link Recovery) via WhatsApp.
// 3. 🛡️ BLINDAGEM DE ASSINATURA DUPLA (KEY ROTATION BUG FIX). Suporte a múltiplas chaves (v1) pós-redefinição no Mercado Pago.
// 4. 🔥 CTO FIX: Refatoração Serverless. WhatsApp agora é aguardado com AbortController para não ser "morto" pela Vercel antes do envio.

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

// 🔥 CTO FIX: Função otimizada para Serverless sem retentativas baseadas em setTimeout
async function dispararWhatsAppSeguro(telefone, mensagem) {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL; 
    if (!apiUrl) {
      console.warn("[WHATSAPP ALERTA] WHATSAPP_API_URL não configurada no ambiente.");
      return;
    }

    // AbortController impede que um atraso na API do WhatsApp faça o Mercado Pago achar que o Webhook falhou
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de limite

    await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
  } catch (e) {
    console.error("[WHATSAPP ERRO CRÍTICO] Falha ao enviar notificação para o cliente:", e.message);
    // Em arquiteturas serverless, não fazemos retry interno. Registramos o erro no log e seguimos o fluxo crítico de pagamento.
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
              status: 'disponivel', // OBRIGATÓRIO: Move a carga para o Radar B2B (Pull Model)
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
               
               // 🔥 CTO FIX: Agora o Vercel VAI AGUARDAR o envio antes de matar a thread, com trava de 4s
               await dispararWhatsAppSeguro(zapCliente, mensagemZap);
            }
          }
        }
      }
    }
    
    // Libera o Mercado Pago APÓS concluir todo o fluxo de negócios atômico
    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO CRÍTICO]:`, err);
    res.status(500).send('Erro interno');
  }
}
