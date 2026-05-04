// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  try {
    const payment = req.body;

    if (payment.type === 'payment') {
      const paymentId = payment.data.id;
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });
      
      const paymentData = await mpResponse.json();
      const pedidoId = paymentData.external_reference;

      if (!pedidoId) return res.status(400).send('Sem referência');

      if (paymentData.status === 'approved') {
        const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${process.env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/fretes/${pedidoId}`;
        
        // IDEMPOTENT PAYMENT WEBHOOK
        const getDoc = await fetch(firebaseUrl);
        const docSnap = await getDoc.json();
        const statusAtual = docSnap?.fields?.status?.stringValue;

        if (statusAtual === 'disponivel') {
             return res.status(200).send('Já atualizado');
        }

        await fetch(`${firebaseUrl}?updateMask.fieldPaths=status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: { stringValue: 'disponivel' } } })
        });
      }
    }
    res.status(200).send('OK');
  } catch (err) { 
    res.status(500).send('Erro no Webhook'); 
  }
}
