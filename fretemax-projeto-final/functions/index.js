const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

const db = admin.firestore();

// 🛡 TRAVAS DE NUVEM
const runtimeOpts = {
  timeoutSeconds: 15, 
  memory: '256MB',    
  maxInstances: 50    
};

// 1. GEOCODE SEGURO 
exports.getCoords = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { address } = data;
  if (!address || typeof address !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Endereço inválido.');
  }
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  const res = await axios.get(url, { timeout: 5000 });
  if (res.data.status !== 'OK' || !res.data.results?.[0]) {
    throw new functions.https.HttpsError('not-found', 'Endereço não encontrado.');
  }
  const { lat, lng } = res.data.results[0].geometry.location;
  return { lat, lng };
});

// 2. DISTÂNCIA SEGURA 
exports.getDistance = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { origin, destination } = data;
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data.rows[0].elements[0].status === "OK") {
      return res.data.rows[0].elements[0].distance.value / 1000;
    }
    throw new Error("Localização não encontrada");
  } catch (e) { 
    throw new functions.https.HttpsError('internal', e.message); 
  }
});

// ========================================================
// 3. O DESPERTADOR (CRON JOB) - AJUSTE CTO
// ========================================================
// Roda a cada 5 minutos para rastrear cargas agendadas
exports.despertadorAgendamentos = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const agora = new Date();
  const limiteD1 = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // Daqui 24 horas
  const limite1h = new Date(agora.getTime() + 1 * 60 * 60 * 1000); // Daqui 1 hora

  // Busca fretes agendados que ainda não foram notificados em D-1
  const fretesD1 = await db.collection('fretes')
    .where('agendadoPara', '<=', limiteD1)
    .where('notificadoD1', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(500) // Bloqueio antifalência: processa em lotes de 500 para não estourar memória
    .get();

  const batch = db.batch();

  fretesD1.forEach(doc => {
    // Apenas marca que a notificação tem que ser enviada. 
    // Uma Trigger ou o Webhook assíncrono vai ler isso e disparar o WhatsApp sem travar o banco.
    batch.update(doc.ref, { 
      notificadoD1: true, 
      pendenteEnvioWhatsAppD1: true,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Busca fretes agendados para 1 HORA antes (D-Hora)
  const fretes1h = await db.collection('fretes')
    .where('agendadoPara', '<=', limite1h)
    .where('notificado1h', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(500)
    .get();

  fretes1h.forEach(doc => {
    // Alerta máximo de operação!
    batch.update(doc.ref, { 
      notificado1h: true, 
      pendenteEnvioWhatsApp1h: true,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  if (fretesD1.size > 0 || fretes1h.size > 0) {
    await batch.commit();
    console.log(`[DESPERTADOR] Processou ${fretesD1.size} D-1 e ${fretes1h.size} D-Hora.`);
  }
  return null;
});
