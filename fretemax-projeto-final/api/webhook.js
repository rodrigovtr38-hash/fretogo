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

      // AJUSTE: Log e proteção contra dados inválidos
      if (!pedidoId) {
        console.error(`[WEBHOOK FALHA] Pagamento ${paymentId} sem external_reference.`);
        return res.status(400).send('Sem referência');
      }

      // AJUSTE [SEGURANÇA]: Só avança se aprovado E creditado (evita pendências falsas)
      if (paymentData.status === 'approved' && paymentData.status_detail === 'accredited') {
        const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${process.env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/fretes/${pedidoId}`;
        
        const getDoc = await fetch(firebaseUrl);
        
        // AJUSTE: Prevenir erro caso o frete tenha sido deletado
        if (!getDoc.ok) {
           console.error(`[WEBHOOK FALHA] Frete ${pedidoId} não encontrado no banco.`);
           return res.status(404).send('Frete não encontrado');
        }

        const docSnap = await getDoc.json();
        const statusAtual = docSnap?.fields?.status?.stringValue;

        // AJUSTE: Prevenção de corrida/duplicidade aprimorada
        if (statusAtual === 'disponivel' || statusAtual === 'aceito' || statusAtual === 'em_transporte') {
             console.log(`[WEBHOOK IGNORADO] Pedido ${pedidoId} já está rodando (Status: ${statusAtual}).`);
             return res.status(200).send('Já atualizado');
        }

        await fetch(`${firebaseUrl}?updateMask.fieldPaths=status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: { stringValue: 'disponivel' } } })
        });
        
        console.log(`[WEBHOOK SUCESSO] Pedido ${pedidoId} liberado no radar.`);
      } else {
        console.log(`[WEBHOOK INFO] Pagamento ${paymentId} ignorado (Status: ${paymentData.status}).`);
      }
    }
    res.status(200).send('OK');
  } catch (err) { 
    console.error(`[WEBHOOK ERRO INTERNO]:`, err);
    res.status(500).send('Erro no Webhook'); 
  }
}
