// src/services/driverStateService.ts
import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DriverState, canDriverTransition } from '../state/driverStateMachine';

class DriverStateService {
  
  // Mantém o controle básico de transição de status do motorista (Guarda de Trânsito)
  async changeState(uid: string, nextState: DriverState): Promise<boolean> {
    const ref = doc(db, 'motoristas', uid);
    const onlineRef = doc(db, 'motoristas_online', uid);

    try {
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error("Motorista não encontrado");
        
        const currentState = snap.data().status || DriverState.OFFLINE;
        if (!canDriverTransition(currentState, nextState)) {
           throw new Error(`Transição inválida de ${currentState} para ${nextState}`);
        }

        const payload = { status: nextState, atualizadoEm: serverTimestamp() };
        t.update(ref, payload);
        
        // Se ficar offline, remove do radar. Se online, atualiza.
        if (nextState === DriverState.OFFLINE) {
           t.delete(onlineRef);
        } else {
           t.set(onlineRef, payload, { merge: true });
        }
      });
      return true;
    } catch (e) {
      console.error("[DRIVER_STATE] Erro ao mudar estado:", e);
      return false;
    }
  }

  // // AJUSTE CTO: A Catraca do Modo Retorno (Trava de 2x/dia e Anti-Concorrência)
  async ativarModoRetorno(destinoRetorno: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'Sessão expirada' };

      const motoristaRef = doc(db, 'motoristas', user.uid);
      const motoristaOnlineRef = doc(db, 'motoristas_online', user.uid);

      await runTransaction(db, async (t) => {
        const snap = await t.get(motoristaRef);
        if (!snap.exists()) throw new Error("PERFIL_NAO_ENCONTRADO");

        const data = snap.data();
        const usadosHoje = data.retornosUsadosHoje || 0;

        // Trava diária (Regra de Negócio: Máximo 2 por dia)
        if (usadosHoje >= 2) {
          throw new Error("LIMITE_RETORNO_DIARIO_ATINGIDO");
        }

        const novosUsados = usadosHoje + 1;
        const payload = {
          modoRetorno: true,
          destinoRetorno: destinoRetorno.trim().toLowerCase(),
          retornosUsadosHoje: novosUsados,
          dataUltimoReset: data.dataUltimoReset || serverTimestamp(), // Necessário para o CronJob auditar
          atualizadoEm: serverTimestamp()
        };

        // Atualiza atomicamente o perfil do motorista
        t.update(motoristaRef, payload);
        
        // Se ele estiver online, já joga a trava pro Radar imediatamente
        const snapOnline = await t.get(motoristaOnlineRef);
        if (snapOnline.exists()) {
           t.update(motoristaOnlineRef, payload);
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error("[ERRO_ATIVAR_RETORNO]", error);
      return { success: false, error: error.message };
    }
  }

  // // AJUSTE CTO: Desativar manualmente caso o motorista chegue no destino ou desista
  async desativarModoRetorno(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const payload = {
        modoRetorno: false,
        destinoRetorno: null,
        atualizadoEm: serverTimestamp()
      };

      await updateDoc(doc(db, 'motoristas', user.uid), payload);
      
      // Tenta atualizar no radar online (falha silenciosamente se ele estiver offline, o que é o correto)
      await updateDoc(doc(db, 'motoristas_online', user.uid), payload).catch(() => {}); 
      
      return true;
    } catch (e) {
      console.error("[ERRO_DESATIVAR_RETORNO]", e);
      return false;
    }
  }
}

export const driverStateService = new DriverStateService();
