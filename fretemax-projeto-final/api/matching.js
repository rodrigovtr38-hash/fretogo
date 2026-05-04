import { db } from '../src/firebase';
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { verificarMotoristasEmRota } from './rota-inteligente'; 

function calcularKM(lat1, lon1, lat2, lon2) {
  // ✅ AJUSTE 1 (CRÍTICO): Validação de null para coordenadas (permite coordenada zero)
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 9999;
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcularScore(m) {
  // ✅ AJUSTE 3: Blindagem contra NaN usando Number()
  const rating = Number(m.score) || 5;
  const corridas = Number(m.totalCorridas) || 1;
  const aceite = Number(m.taxaAceite) || 1;
  const cancel = Number(m.cancelamentos) || 0;
  return (rating * 0.5) + (aceite * 3) + (corridas * 0.01) - (cancel * 0.2);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Método não permitido');

  const { freteId, lat, lng, veiculo } = req.body;
  
  if (freteId == null || lat == null || lng == null || !veiculo) {
      return res.status(400).json({ error: "Dados incompletos no corpo da requisição" });
  }

  try {
    const freteRef = doc(db, 'fretes', freteId);
    const freteSnap = await getDoc(freteRef);
    if (!freteSnap.exists()) {
        throw new Error("Frete não encontrado no Firestore");
    }
    const freteData = freteSnap.data();

    // ========================================================
    // 🔥 TENTATIVA 1: ROTA INTELIGENTE (NO CAMINHO)
    // ========================================================
    const tentativaRota = await verificarMotoristasEmRota(freteData);

    if (tentativaRota.encontrou) {
      const escolhido = tentativaRota.motorista;
      
      await updateDoc(freteRef, {
        status: 'aceito',
        motoristaId: escolhido.id,
        motoristaNome: escolhido.nome,
        motoristaZap: escolhido.whatsapp,
        rotaInteligente: true, 
        filaMatching: [escolhido.id], 
        // ✅ AJUSTE 2: Histórico de logs não será sobrescrito
        logs: [...(freteData.logs || []), { tipo: 'match_rota_inteligente', data: new Date().toISOString(), motorista: escolhido.nome, desvio: escolhido.desvio }]
      });

      console.log(`[MATCHING] Frete ${freteId} associado via Rota Inteligente para ${escolhido.nome}.`);
      return res.status(200).json({ ok: true, motorista: escolhido.nome, rotaInteligente: true });
    }

    // ========================================================
    // 🔥 TENTATIVA 2: FLUXO NORMAL (MOTORISTA DISPONÍVEL)
    // ========================================================
    const motoristasRef = collection(db, 'motoristas_online');
    const q = query(motoristasRef, where('status', '==', 'disponivel'));
    const snapshot = await getDocs(q);

    let motoristasProximos = [];

    snapshot.forEach(docSnap => {
      const motorista = docSnap.data();
      // 🔥 MICRO AJUSTE FINAL: Proteção contra nulos (aceita coord 0)
      if (motorista.lat == null || motorista.lng == null) return;

      const distancia = calcularKM(lat, lng, motorista.lat, motorista.lng);
      
      // ✅ AJUSTE 4: Segurança absoluta no toLowerCase
      if (distancia <= 15 && (motorista.categoria || '').toLowerCase() === (veiculo || '').toLowerCase()) {
        motoristasProximos.push({ id: docSnap.id, ...motorista, distancia });
      }
    });

    if (motoristasProximos.length === 0) {
      console.log(`[MATCHING] Nenhum motorista encontrado no raio para frete ${freteId}.`);
      return res.status(200).json({ ok: false, message: "Nenhum motorista no raio" });
    }

    motoristasProximos.sort((a, b) => {
      const scoreA = calcularScore(a) - (a.distancia * 0.25);
      const scoreB = calcularScore(b) - (b.distancia * 0.25);
      return scoreB - scoreA;
    });

    const escolhido = motoristasProximos[0];

    await updateDoc(freteRef, {
      status: 'aceito',
      motoristaId: escolhido.id,
      motoristaNome: escolhido.nome,
      motoristaZap: escolhido.whatsapp,
      rotaInteligente: false, 
      filaMatching: motoristasProximos.map(m => m.id), 
      // ✅ AJUSTE 2: Histórico de logs não será sobrescrito
      logs: [...(freteData.logs || []), { tipo: 'match_automatico_fila', data: new Date().toISOString(), motorista: escolhido.nome }]
    });

    const motRef = doc(db, 'motoristas_online', escolhido.id);
    
    await updateDoc(motRef, { 
        status: 'ocupado',
        emRota: true,
        origemAtualLat: freteData.origemLat || lat,
        origemAtualLng: freteData.origemLng || lng,
        destinoAtualLat: freteData.destinoLat || null,
        destinoAtualLng: freteData.destinoLng || null
    });

    console.log(`[MATCHING SUCESSO] Motorista ${escolhido.nome} alocado para frete ${freteId}.`);
    return res.status(200).json({ ok: true, motorista: escolhido.nome });

  } catch (error) {
    console.error("[ERRO MATCHING]:", error.message);
    return res.status(500).json({ error: "Erro interno no servidor de despacho" });
  }
}
