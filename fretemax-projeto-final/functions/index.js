const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

// 🛡️ TRAVAS DE NUVEM (A3 e A7): Previne que um ataque zere o limite gratuito
const runtimeOpts = {
  timeoutSeconds: 15, // Mata a função rápido se der erro (economiza $)
  memory: '256MB',    // App leve não precisa de memória extra
  maxInstances: 50    // Escudo financeiro: máximo de 50 instâncias simultâneas
};

// ========================================================
// 1. GEOCODE SEGURO (Buscador de Coordenadas)
// ========================================================
exports.getCoords = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { address } = data;
  if (!address || typeof address !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Endereço inválido.');
  }
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  // 🛡️ ALERTA A1 RESOLVIDO: Timeout de 5s para APIs externas. Falha rápido sem travar a nuvem.
  const res = await axios.get(url, { timeout: 5000 });
  if (res.data.status !== 'OK' || !res.data.results?.[0]) {
    throw new functions.https.HttpsError('not-found', 'Endereço não encontrado.');
  }
  const { lat, lng } = res.data.results[0].geometry.location;
  return { lat, lng };
});

// ========================================================
// 2. DISTÂNCIA SEGURA (Cálculo de Rota do Cliente)
// ========================================================
exports.getDistance = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { origin, destination } = data;
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    // 🛡️ ALERTA A1 RESOLVIDO: Timeout de 5s no Axios
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data.rows[0].elements[0].status === "OK") {
      return res.data.rows[0].elements[0].distance.value / 1000;
    }
    throw new Error("Localização não encontrada");
  } catch (e) { 
    throw new functions.https.HttpsError('internal', e.message); 
  }
});

// 🔥 NOTA DO CTO: O Motor de Matching foi removido daqui para evitar 
// conflito (Race Condition) com o DispatchQueueService do Frontend, 
// zerando custos desnecessários no Firebase e centralizando a roleta.
