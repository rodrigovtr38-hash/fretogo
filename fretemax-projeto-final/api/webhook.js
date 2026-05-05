import crypto from 'crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 🔐 Inicialização segura (evita múltiplas instâncias em Serverless)
if (!getApps().length) {
  if (!process.env.FIREBASE_ADMIN_CREDENTIAL) {
    console.error("[ERRO CRÍTICO] FIREBASE_ADMIN_CREDENTIAL não configurado na Vercel.");
  } else {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL))
    });
  }
}

const db = getFirestore();

// ✅ AJUSTE 1: Desabilitar o bodyParser da Vercel para permitir a leitura do Raw Body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper para converter o stream da requisição no buffer bruto (Raw Body)
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
    // ✅ AJUSTE 1: Captura do rawBody e validação criptográfica (HMAC)
    const rawBody = await getRawBody(req);
    const signatureHeader = req.headers['x-signature'];

    if (!signatureHeader) {
      console.warn('[WEBHOOK] Tentativa de acesso bloqueada: Sem assinatura HMAC.');
      return res.status(401).send('Acesso não autorizado');
    }

    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[ERRO CRÍTICO] MERCADO_PAGO_WEBHOOK_SECRET não configurado na Vercel.');
      return res.status(500).send('Erro interno do servidor');
    }

    // Isola o valor do hash. (Muitos webhooks mandam algo como "ts=123,v1=hash", garantimos extrair o hash correto)
    let clientSignature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (clientSignature.includes('v1=')) {
      const match = clientSignature.match(/v1=([a-f0-9]+)/);
      if (match) clientSignature = match[1];
    }

    // Calcula a nossa assinatura baseada no RAW BODY
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(clientSignature, 'utf-8');

    // Compara de forma segura (timing-safe) para impedir Timing Attacks
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      console.warn('[WEBHOOK] Assinatura HMAC inválida. Rejeitando payload falsificado.');
      return res.status(401).send('Acesso não autorizado: HMAC Inválido');
    }

    // Parseia o JSON a partir do rawBody já validado
    const payment = JSON.parse(rawBody.toString('utf-8'));

    if (payment.type === 'payment') {
      const paymentId = payment.data.id;

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });

      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) {
        console.error(`[WEBHOOK] Pagamento sem referência`);
        return res.status(400).send('Sem referência');
      }

      // 🔥 Só processa pagamento REAL e CREDITADO
      if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {

        const freteRef = db.collection('fretes').doc(pedidoId);
        const freteSnap = await freteRef.get();

        if (!freteSnap.exists) {
          console.error(`[WEBHOOK] Frete não encontrado: ${pedidoId}`);
          return res.status(404).send('Frete não encontrado');
        }

        const freteData = freteSnap.data();

        // 🔒 Proteção contra duplicidade
        if (['disponivel', 'aceito', 'em_transporte'].includes(freteData.status)) {
          console.log(`[WEBHOOK IGNORADO] Já processado`);
          return res.status(200).send('Já atualizado');
        }

        // 🔓 Libera o frete no radar com privilégios de Admin
        await freteRef.update({
          status: 'disponivel',
          pagoEm: new Date(),
        });

        console.log(`[WEBHOOK OK] Frete liberado no radar: ${pedidoId}`);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error(`[WEBHOOK ERRO]:`, err);
    res.status(500).send('Erro interno');
  }
}
