// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

// 1. GEOCODE SEGURO
exports.getCoords = functions.https.onCall(async (data, context) => {
  const { address } = data;
  if (!address || typeof address !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Endereço inválido.');
  }
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  const res = await axios.get(url);
  if (res.data.status !== 'OK' || !res.data.results?.[0]) {
    throw new functions.https.HttpsError('not-found', 'Endereço não encontrado.');
  }
  const { lat, lng } = res.data.results[0].geometry.location;
  return { lat, lng };
});

// 2. DISTÂNCIA SEGURA
exports.getDistance = functions.https.onCall(async (data, context) => {
  const { origin, destination } = data;
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${key}`;

  try {
    const res = await axios.get(url);
    if (res.data.rows[0].elements[0].status === "OK") {
      return res.data.rows[0].elements[0].distance.value / 1000;
    }
    throw new Error("Localização não encontrada");
  } catch (e) { throw new functions.https.HttpsError('internal', e.message); }
});

// 4. TIMEOUT CRON JOB (Confiável)
exports.processOfferTimeouts = functions.pubsub.schedule('every 1 minutes').onRun(async () => {
  const agora = admin.firestore.Timestamp.now();
  const snap = await admin.firestore().collection('ofertas')
    .where('status', '==', 'pendente')
    .where('expiresAt', '<=', agora)
    .get();

  const batch = admin.firestore().batch();
  snap.forEach(doc => batch.update(doc.ref, { status: 'timeout' }));
  await batch.commit();
  console.log(`Timeouts processados: ${snap.size}`);
});

// 5. DISPATCH INTELIGENTE
exports.startDispatch = functions.firestore.document('fretes/{freteId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const prevData = change.before.data();

    // HEATMAP DATA COLLECTION
    if (!prevData.cidadeOrigem && newData.cidadeOrigem) {
       await admin.firestore().collection('analytics_demand').add({
           cidadeOrigem: newData.cidadeOrigem,
           timestamp: admin.firestore.FieldValue.serverTimestamp()
       })
    }


    if (newData.status === 'disponivel' && prevData.status !== 'disponivel' && !newData.dispatchStarted) {
      await change.after.ref.update({ dispatchStarted: true });

      const agora = Date.now();
      const trintaSegundosAtras = admin.firestore.Timestamp.fromMillis(agora - 30000);

      const motoristasSnap = await admin.firestore().collection('motoristas_online')
        .where('categoria', '==', newData.veiculo)
        .where('lastSeen', '>', trintaSegundosAtras)
        .get();

      // BASIC DYNAMIC PRICING
      let valorFinalMotorista = newData.valorMotorista;
      const numMotoristasOnline = motoristasSnap.size;
      
      if (numMotoristasOnline < 3) {
          valorFinalMotorista = valorFinalMotorista * 1.20;
      } else if (numMotoristasOnline > 10) {
          valorFinalMotorista = valorFinalMotorista * 0.90;
      }

      if (valorFinalMotorista !== newData.valorMotorista) {
          await change.after.ref.update({ valorMotorista: valorFinalMotorista });
          newData.valorMotorista = valorFinalMotorista; 
      }


      let fila = [];
      
      // We need to fetch driver ratings from motoristas_cadastros to filter and score
      const motoristaIds = [];
      motoristasSnap.forEach(doc => motoristaIds.push(doc.id));
      
      let motoristasCadastros = {};
      if (motoristaIds.length > 0) {
          // Note: Firestore 'in' queries are limited to 10 elements. 
          // For a production system, a more robust approach is needed, 
          // perhaps keeping rating denormalized in motoristas_online.
          // For now, doing individual gets or assuming a small number for MVP.
           // To be safe and simple, fetching one by one.
           for(const mid of motoristaIds) {
               const doc = await admin.firestore().collection('motoristas_cadastros').doc(mid).get();
               motoristasCadastros[mid] = doc.data() || { rating: 5.0 };
           }
      }

      motoristasSnap.forEach(doc => {
        const m = doc.data();
        const cadastro = motoristasCadastros[doc.id];
        const rating = cadastro.rating || 5.0;

        // DRIVER RELIABILITY FILTER
        if (rating < 3.5) return;

        const d = calculateDistance(newData.origemLat, newData.origemLng, m.lat, m.lng);
        
        // PRIORITY DISPATCH (SMART MATCHING)
        let score = d / rating; 

        if (m.destinoPreferencial && newData.cidadeDestino.toLowerCase().includes(m.destinoPreferencial.toLowerCase())) {
          score = score * 0.2;
        }
        fila.push({ id: doc.id, token: m.tokenFCM, score });
      });

      fila.sort((a, b) => a.score - b.score);
      const queueIds = fila.map(f => f.id);

      await admin.firestore().collection('fretes').doc(context.params.freteId).update({
        dispatchQueue: queueIds,
        currentDriverIndex: 0
      });

      if (queueIds.length > 0) {
        await triggerOffer(context.params.freteId, queueIds[0], fila[0].token, newData);
      } else {
        await admin.firestore().collection('fretes').doc(context.params.freteId).update({
            status: "sem_motorista"
        });
      }
    }

    // DRIVER SCORE SYSTEM
    if (newData.status === 'entregue' && prevData.status !== 'entregue') {
         if (newData.motoristaId) {
             const motoristaRef = admin.firestore().collection('motoristas_cadastros').doc(newData.motoristaId);
             
             await admin.firestore().runTransaction(async (t) => {
                 const motoristaDoc = await t.get(motoristaRef);
                 if (!motoristaDoc.exists) return;
                 
                 const data = motoristaDoc.data();
                 const totalCorridas = (data.totalCorridas || 0) + 1;
                 const rating = data.rating || 5.0;
                 
                 // Simple average logic for MVP, assumes 5 for new runs.
                 const newRating = ((rating * (totalCorridas - 1)) + 5.0) / totalCorridas;

                 t.update(motoristaRef, {
                     totalCorridas: totalCorridas,
                     rating: newRating
                 });
             });
         }
    }
  });

// 6. AVANÇO AUTOMÁTICO NA FILA
exports.onOfferResponse = functions.firestore.document('ofertas/{ofertaId}')
  .onUpdate(async (change, context) => {
    const data = change.after.data();
    if (data.status === 'recusado' || data.status === 'timeout') {
      const freteRef = admin.firestore().collection('fretes').doc(data.freteId);
      const freteDoc = await freteRef.get();
      const freteData = freteDoc.data();

      if (freteData.status !== 'disponivel') return;

      const nextIndex = freteData.currentDriverIndex + 1;
      if (nextIndex < freteData.dispatchQueue.length) {
        const nextDriverId = freteData.dispatchQueue[nextIndex];
        const nextDriverDoc = await admin.firestore().collection('motoristas_online').doc(nextDriverId).get();
        
        if (!nextDriverDoc.exists) {
          console.warn(`Motorista ${nextDriverId} não encontrado. Pulando.`);
          await freteRef.update({ currentDriverIndex: nextIndex });
          await admin.firestore().collection('ofertas').add({
            freteId: data.freteId, motoristaId: nextDriverId, status: 'timeout',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return;
        }

        await freteRef.update({ currentDriverIndex: nextIndex });
        await triggerOffer(data.freteId, nextDriverId, nextDriverDoc.data().tokenFCM, freteData);
      } else {
        // END OF QUEUE HANDLING
        await freteRef.update({
            status: "sem_motorista"
        });
      }
    }
    
    // ANTI-FRAUD & RATE LIMIT: The actual enforcement of Rate Limit and Anti-Fraud 
    // happens when the driver attempts to accept via transaction in the frontend/backend.
    // Since we are not touching Motorista.tsx, we must ensure the Firestore rules 
    // or a callable function handles it. Given constraints, we can add a callable 
    // function here that Motorista.tsx *could* use, but since we can't edit it, 
    // we must rely on Firestore Rules for security where possible.
  });

async function triggerOffer(freteId, driverId, token, freteData) {
  const ofertaRef = await admin.firestore().collection('ofertas').add({
    freteId, motoristaId: driverId, status: 'pendente',
    valor: freteData.valorMotorista, cidadeOrigem: freteData.cidadeOrigem,
    cidadeDestino: freteData.cidadeDestino, 
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 20000)
  });

  if (token) {
    const message = { 
      notification: { 
        title: '🚚 Carga Próxima!', 
        body: `Ganho: R$ ${freteData.valorMotorista} | ${freteData.cidadeOrigem} → ${freteData.cidadeDestino}` 
      }, 
      token 
    };
    await admin.messaging().send(message).catch(async (e) => {
      if (e.code === 'messaging/registration-token-not-registered') {
        await admin.firestore().collection('motoristas_online').doc(driverId).update({ tokenFCM: admin.firestore.FieldValue.delete() });
        console.warn(`Token FCM removido para motorista ${driverId}`);
      } else {
        console.error('Erro push:', e.code, e.message);
      }
    });
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
