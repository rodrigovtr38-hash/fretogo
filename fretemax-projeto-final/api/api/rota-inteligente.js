import { db } from '../src/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Cálculo de distância via fórmula de Haversine
function calcularKM(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function verificarMotoristasEmRota(freteData) {
  try {
    // ✅ PROTEÇÃO 1 (BLINDAGEM TOTAL): Verifica se a requisição tem a base mínima.
    // Garante que veiculo, origemLat, origemLng, destinoLat e destinoLng existam antes de qualquer coisa.
    if (!freteData || !freteData.veiculo || !freteData.origemLat || !freteData.origemLng || !freteData.destinoLat || !freteData.destinoLng) {
      console.warn("[ROTA INTELIGENTE AVISO] Dados do frete incompletos. Abortando verificação.");
      return { encontrou: false };
    }

    const motoristasRef = collection(db, 'motoristas_online');
    const q = query(motoristasRef, where('emRota', '==', true));
    const snapshot = await getDocs(q);

    let candidatos = [];

    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      
      // ✅ PROTEÇÃO 2: Garante que TODAS as coordenadas do motorista existam antes do cálculo. Ignora com return seguro se faltar.
      if (!m.origemAtualLat || !m.origemAtualLng || !m.destinoAtualLat || !m.destinoAtualLng) return;
      
      // ✅ AJUSTE 1 (CRÍTICO): Proteção rigorosa contra undefined para evitar crash silencioso
      if (!m.categoria || (m.categoria || '').toLowerCase() !== (freteData.veiculo || '').toLowerCase()) return;

      const distRotaOriginal = calcularKM(m.origemAtualLat, m.origemAtualLng, m.destinoAtualLat, m.destinoAtualLng);
      const distAteColeta = calcularKM(m.origemAtualLat, m.origemAtualLng, freteData.origemLat, freteData.origemLng);
      const distFrete = calcularKM(freteData.origemLat, freteData.origemLng, freteData.destinoLat, freteData.destinoLng);
      const distAteDestinoMot = calcularKM(freteData.destinoLat, freteData.destinoLng, m.destinoAtualLat, m.destinoAtualLng);

      const novaDistanciaTotal = distAteColeta + distFrete + distAteDestinoMot;
      const desvio = novaDistanciaTotal - distRotaOriginal;

      const lucroMinimo = 8; 
      const custoPorKm = 2.0;
      const custoDesvio = desvio * custoPorKm;

      // ✅ AJUSTE 2 (CRÍTICO): Fallback inteligente ajustado (Evita bloqueio agressivo no matching)
      if (desvio <= 5 && (custoDesvio <= lucroMinimo || desvio <= 2 || custoDesvio <= lucroMinimo * 1.5)) {
        candidatos.push({ id: docSnap.id, ...m, desvio });
      }
    });

    if (candidatos.length > 0) {
      candidatos.sort((a, b) => a.desvio - b.desvio);
      console.log(`[ROTA INTELIGENTE] Encontrado candidato ideal: ${candidatos[0].nome}`);
      return { encontrou: true, motorista: candidatos[0] };
    }

    return { encontrou: false };
  } catch (error) {
    console.error("[ROTA INTELIGENTE ERRO]:", error);
    return { encontrou: false };
  }
}
