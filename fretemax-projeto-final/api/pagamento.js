export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

  // AJUSTE: 'preco' removido da desestruturação para não confiarmos no frontend
  const { titulo, idPedido } = req.body;

  try {
    if (!idPedido) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // AJUSTE [SEGURANÇA CRÍTICA]: Buscar o valor DIRETAMENTE do banco de dados via REST API
    const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${process.env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/fretes/${idPedido}`;
    const getDoc = await fetch(firebaseUrl);
    
    if (!getDoc.ok) {
      throw new Error('Pedido não encontrado ou ID inválido no banco de dados');
    }

    const docSnap = await getDoc.json();
    
    if (!docSnap.fields || !docSnap.fields.valorTotal) {
      throw new Error('Documento de frete inválido ou sem valor definido');
    }

    // Extrai o valor real salvo no banco de forma segura
    const valorRealBruto = docSnap.fields.valorTotal.doubleValue || docSnap.fields.valorTotal.integerValue;
    const valorReal = Number(valorRealBruto);

    if (!valorReal || valorReal <= 0) {
      console.error(`[FRAUDE EVITADA] Tentativa de pagamento zerado. Pedido: ${idPedido}`);
      return res.status(400).json({ error: 'Valor do frete inválido no banco de dados' });
    }

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
            unit_price: valorReal // AJUSTE: Usando o valor blindado do banco
          }
        ],
        payer: {
          email: `${idPedido}@fretogo.com`,
          identification: {
            type: "CPF",
            number: "19119119100" 
          }
        },
        external_reference: idPedido,
        notification_url: `https://${req.headers.host}/api/webhook`, 
        payment_methods: {
          excluded_payment_types: [], 
          excluded_payment_methods: [],
          installments: 12,
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
      console.error("Erro MP:", data);
      return res.status(500).json({ 
        error: 'Erro ao criar preferência',
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
