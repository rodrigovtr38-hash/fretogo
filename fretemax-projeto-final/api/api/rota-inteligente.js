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
    const motoristasRef = collection(db, 'motoristas_online');
    // Busca apenas motoristas que já estão em rota (ocupados com outra carga)
    const q = query(motoristasRef, where('emRota', '==', true));
    const snapshot = await getDocs(q);

    let candidatos = [];

    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      
      // Proteção: ignora se faltar dados ou se o veículo for incompatível
      if (!m.origemAtualLat || !m.destinoAtualLat) return;
      if (!m.categoria || m.categoria.toLowerCase() !== freteData.veiculo.toLowerCase()) return;

      // 1. Calcula a distância da rota ORIGINAL do motorista
      const distRotaOriginal = calcularKM(m.origemAtualLat, m.origemAtualLng, m.destinoAtualLat, m.destinoAtualLng);

      // 2. Calcula a nova distância se ele desviar para pegar o novo frete
      const distAteColeta = calcularKM(m.origemAtualLat, m.origemAtualLng, freteData.origemLat, freteData.origemLng);
      const distFrete = calcularKM(freteData.origemLat, freteData.origemLng, freteData.destinoLat, freteData.destinoLng);
      const distAteDestinoMot = calcularKM(freteData.destinoLat, freteData.destinoLng, m.destinoAtualLat, m.destinoAtualLng);

      const novaDistanciaTotal = distAteColeta + distFrete + distAteDestinoMot;
      
      // 3. O desvio é a diferença entre a rota nova e a rota original
      const desvio = novaDistanciaTotal - distRotaOriginal;

      // Se o desvio for de até 5km, ele é um candidato inteligente
      if (desvio <= 5) {
        candidatos.push({ id: docSnap.id, ...m, desvio });
      }
    });

    if (candidatos.length > 0) {
      // Ordena pelo menor desvio (o que sai menos da rota ganha)
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
