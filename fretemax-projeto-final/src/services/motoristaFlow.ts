// src/services/motoristaFlow.ts
// 🔥 ARQUIVO DEPRECIADO: Funções migradas para dispatchRealtimeService.ts e tripStateMachine.ts
// Mantido apenas como stub para evitar quebras de importações.

export type StatusMotorista = 'OFFLINE' | 'ONLINE' | 'OCUPADO' | 'EM_COLETA' | 'EM_ENTREGA' | 'AGUARDANDO';

export interface OfertaFrete {
  freteId: string;
  clienteId: string;
  valor: number;
  categoria: string;
  distanciaKm: number;
  peso: number;
  descricao: string;
  origem: { endereco: string; lat: number; lng: number; };
  destino: { endereco: string; lat: number; lng: number; };
  criadaEm?: any;
}

export async function atualizarStatusMotorista(_m: string, _s: StatusMotorista) { return false; }
export async function ativarMotoristaOnline(_m: string) { return false; }
export async function desativarMotorista(_m: string) { return false; }
export async function aceitarFrete(_m: string, _f: string) { return false; }
export async function iniciarColeta(_m: string, _f: string) { return false; }
export async function iniciarEntrega(_m: string, _f: string) { return false; }
export async function finalizarEntrega(_m: string, _f: string, _c: string) { return false; }
export async function rejeitarFrete(_m: string, _f: string) { return false; }
export function escutarOfertaMotorista(_m: string, _c: (o: OfertaFrete | null) => void) {
  return () => {};
}
