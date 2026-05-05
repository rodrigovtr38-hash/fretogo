const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

// ========================================================
// 1. GEOCODE SEGURO (Buscador de Coordenadas)
// ========================================================
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

// ========================================================
// 2. DISTÂNCIA SEGURA (Cálculo de Rota do Cliente)
// ========================================================
exports.getDistance = functions.https.onCall(async (data, context) => {
  const { origin, destination } = data;
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    const res = await axios.get(url);
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
exports.motorDeMatching = functions.firestore.document('fretes/{freteId}').onWrite(async (change, context) => {
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
            // Ignora se não tiver coordenadas ou se for de outra categoria
            if (m.lat == null || m.lng == null || m.categoria !== after.veiculo) return;
            
            // Cálculo Rápido de Distância Direto no Servidor (Fórmula de Haversine)
            const R = 6371;
            const dLat = (m.lat - after.origemLat) * Math.PI / 180;
            const dLon = (m.lng - after.origemLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(after.origemLat * Math.PI / 180) * Math.cos(m.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

            if (dist <= 15) { 
                candidatos.push({ id: doc.id, ...m, distancia: dist });
            }
        });

        // Failsafe: Ninguém no raio
        if (candidatos.length === 0) {
            return change.after.ref.update({ status: 'sem_motorista' });
        }

        // Ordena a fila (Prioriza Score Alto e Distância Curta)
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
            // Trava o servidor por 16 segundos aguardando o motorista agir
            await new Promise(resolve => setTimeout(resolve, 16000));

            // Acabou o tempo. Busca o frete de novo pra ver se ele aceitou.
            const freshSnap = await change.after.ref.get();
            const freshData = freshSnap.data();

            // Se ainda tá disponível e o motorista não saiu da fila, nós o tiramos!
            if (freshData && freshData.status === 'disponivel' && freshData.filaMatching && freshData.filaMatching[0] === currentDriver) {
                const novaFila = freshData.filaMatching.slice(1); 
                
                if (novaFila.length === 0) {
                    // Acabou a fila inteira. Devolve a bola pro cliente.
                    await change.after.ref.update({ status: 'sem_motorista', filaMatching: [] });
                } else {
                    // Tem mais gente na fila? Roda a roleta.
                    await change.after.ref.update({ filaMatching: novaFila });
                }
            }
        }
    }
    return null;
});
