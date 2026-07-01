// api/pagamento.js
// CTO-Log: Arquivo verificado. Lógica de blindagem financeira mantida.

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

    // 🔒 BUSCA SEGURA VIA FIREBASE ADMIN DIRETO NO BANCO
    const freteRef = db.collection('fretes').doc(idPedido);
    const freteSnap = await freteRef.get();

    if (!freteSnap.exists) {
      throw new Error('Pedido não encontrado no banco de dados');
    }

    const freteData = freteSnap.data();
    const valorReal = Number(freteData.valorTotal);

    if (isNaN(valorReal) || valorReal <= 0) {
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
        notification_url: `https://${req.headers.host}/api/webhook`, 
        payment_methods: {
          excluded_payment_types: [], 
          installments: 1,
          default_installments: 1
        },
        statement_descriptor: "FRETOGO", 
        back_urls: {
          success: `https://${req.headers.host}/cliente`,
          failure: `https://${req.headers.host}/cliente`,
          pending: `https://${req.headers.host}/cliente`
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();

    if (!data.init_point) {
      console.error("[ERRO MP]: O Mercado Pago não devolveu o link.", data);
      return res.status(500).json({ 
        error: 'Erro ao criar preferência no Mercado Pago',
        detalhe: data 
      });
    }

    return res.status(200).json({ url: data.init_point });

  } catch (error) {
    console.error("[ERRO PAGAMENTO]:", error.message);
    return res.status(500).json({ 
      error: 'Erro ao gerar pagamento',
      detalhe: error.message 
    });
  }
}
