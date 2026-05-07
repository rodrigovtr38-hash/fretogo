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

// ========================================================
// 3. MOTOR DE MATCHING & TIMEOUT AUTOMÁTICO (NÍVEL UBER)
// ========================================================
// 🛡️ ALERTA A5 RESOLVIDO: Limite exato de 30s de vida. Protege contra "Sleep" infinito.
exports.motorDeMatching = functions.runWith({ timeoutSeconds: 30, memory: '256MB', maxInstances: 50 }).firestore.document('fretes/{freteId}').onWrite(async (change, context) => {
    const after = change.after.data();
    const before = change.before ? change.before.data() : null;

    if (!after) return null;

    // A. INICIAR MATCHING: Status virou 'disponivel' e a fila está vazia
    if (after.status === 'disponivel' && (!before || before.status !== 'disponivel') && (!after.filaMatching || after.filaMatching.length === 0)) {
        
        const motoristasSnap = await admin.firestore().collection('motoristas_online')
            .where('status', '==', 'disponivel')
            .get();

        const candidatos = [];
        
        motoristasSnap.forEach(doc => {
            const m = doc.data();
            if (m.lat == null || m.lng == null || m.categoria !== after.veiculo) return;
            
            const R = 6371;
            const dLat = (m.lat - after.origemLat) * Math.PI / 180;
            const dLon = (m.lng - after.origemLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(after.origemLat * Math.PI / 180) * Math.cos(m.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

            if (dist <= 15) { 
                candidatos.push({ id: doc.id, ...m, distancia: dist });
            }
        });

        if (candidatos.length === 0) {
            return change.after.ref.update({ status: 'sem_motorista' });
        }

        candidatos.sort((a, b) => {
            const scoreA = (Number(a.score) || 5) - (a.distancia * 0.25);
            const scoreB = (Number(b.score) || 5) - (b.distancia * 0.25);
            return scoreB - scoreA; 
        });

        const filaOrdemIds = candidatos.map(c => c.id);

        return change.after.ref.update({
            filaMatching: filaOrdemIds,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // B. TIMEOUT AUTOMÁTICO: Rotação da fila (Tempo esgotado)
    if (after.status === 'disponivel' && after.filaMatching && after.filaMatching.length > 0) {
        const currentDriver = after.filaMatching[0];
        const previousDriver = before && before.filaMatching ? before.filaMatching[0] : null;

        if (currentDriver !== previousDriver) {
            await new Promise(resolve => setTimeout(resolve, 16000));

            const freshSnap = await change.after.ref.get();
            const freshData = freshSnap.data();

            if (freshData && freshData.status === 'disponivel' && freshData.filaMatching && freshData.filaMatching[0] === currentDriver) {
                const novaFila = freshData.filaMatching.slice(1); 
                
                if (novaFila.length === 0) {
                    await change.after.ref.update({ status: 'sem_motorista', filaMatching: [] });
                } else {
                    await change.after.ref.update({ filaMatching: novaFila });
                }
            }
        }
    }
    return null;
});
