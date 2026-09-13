// =========================================================
// NOME DO ARQUIVO: src/services/clientFreightService.ts
// Publicação segura via Cloud Function com idempotência persistente.
// =========================================================

import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';

const inflightRegistry = new Map<string, Promise<CreateFreightResult>>();
const CREATE_KEY_PREFIX = 'fretogo_create_freight_';
const CREATE_KEY_TTL_MS = 30 * 60 * 1000;

type CreateFreightResult = {
  success: boolean;
  freteId?: string;
  error?: string;
};

type ServiceResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface FreightPayload {
  clienteId: string;
  categoria: string;
  origem: { lat: number; lng: number; endereco?: string; cidade?: string; uf?: string };
  destino: { lat: number; lng: number; endereco?: string; cidade?: string; uf?: string };
  valor?: number;
  valorBruto?: number;
  distanciaTotalKm?: number;
  distanciaTarifada?: number;
  distanciaRealKm?: number;
  pesoKg?: string | number;
  tipoCarga?: string;
  paradas?: Array<Record<string, unknown>>;
  valorPedagio?: number;
  empresaId?: string;
  tipoConta?: string;
  empresaNome?: string;
  empresaDocumento?: string;
  clienteNome?: string;
  clienteZap?: string;
  clienteDocumento?: string;
  distancia?: number;
  veiculo?: string;
  peso?: string;
  tipoMaterial?: string;
  qtdVolumes?: string;
  valorNF?: string;
  observacoes?: string;
  valorTotal?: number;
  valorFreteBruto?: number;
  valorMotorista?: number;
  valorLiquidoMotorista?: number;
  lucroPlataforma?: number;
  cidadeOrigem?: string;
  cidadeDestino?: string;
  enderecoColetaTexto?: string;
  enderecoEntregaTexto?: string;
  coleta?: Record<string, unknown>;
  entrega?: Record<string, unknown>;
  origemLat?: number;
  origemLng?: number;
  destinoLat?: number;
  destinoLng?: number;
  pinColeta?: string;
  pinEntregas?: string[];
  multiplasEntregas?: boolean;
  tipoFrete?: 'imediato' | 'agendado' | string;
  dataAgendada?: unknown;
  visualizacoes?: number;
  motoristasNotificados?: number;
  interessados?: number;
  interressados?: number;
}

type PersistedCreateKey = {
  key: string;
  createdAt: number;
};

const toFiniteCoordinate = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getCoordinate = (payload: FreightPayload, side: 'origem' | 'destino', axis: 'lat' | 'lng'): number | null => {
  const nested = payload[side]?.[axis];
  const fallbackKey = `${side}${axis === 'lat' ? 'Lat' : 'Lng'}` as keyof FreightPayload;
  return toFiniteCoordinate(nested ?? payload[fallbackKey]);
};

const normalizeError = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const firebaseError = error as { code?: unknown; message?: unknown };
    if (typeof firebaseError.code === 'string' && firebaseError.code.trim()) return firebaseError.code;
    if (typeof firebaseError.message === 'string' && firebaseError.message.trim()) return firebaseError.message;
  }
  return fallback;
};

const createRandomKey = (clienteId: string): string => {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  return `${clienteId}_${randomPart}`.slice(0, 180);
};

class ClientFreightService {
  private buildPayloadFingerprint(payload: FreightPayload): string {
    const origemLat = getCoordinate(payload, 'origem', 'lat') ?? 0;
    const origemLng = getCoordinate(payload, 'origem', 'lng') ?? 0;
    const destinoLat = getCoordinate(payload, 'destino', 'lat') ?? 0;
    const destinoLng = getCoordinate(payload, 'destino', 'lng') ?? 0;
    const valor = Number(payload.valorTotal ?? payload.valorBruto ?? payload.valorFreteBruto ?? 0);
    const dataAgendada = payload.dataAgendada && typeof payload.dataAgendada === 'object'
      ? JSON.stringify(payload.dataAgendada)
      : String(payload.dataAgendada ?? '');

    return [
      payload.clienteId,
      payload.categoria,
      origemLat.toFixed(6),
      origemLng.toFixed(6),
      destinoLat.toFixed(6),
      destinoLng.toFixed(6),
      Number.isFinite(valor) ? valor.toFixed(2) : '0',
      payload.tipoFrete || 'imediato',
      dataAgendada,
      payload.paradas?.length || 0,
    ].join('|');
  }

  private buildStorageKey(fingerprint: string): string {
    let hash = 2166136261;
    for (let index = 0; index < fingerprint.length; index += 1) {
      hash ^= fingerprint.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${CREATE_KEY_PREFIX}${(hash >>> 0).toString(36)}`;
  }

  private getOrCreateIdempotencyKey(payload: FreightPayload, fingerprint: string): string {
    const fallback = createRandomKey(payload.clienteId);
    if (typeof window === 'undefined') return fallback;

    const storageKey = this.buildStorageKey(fingerprint);
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedCreateKey;
        if (
          typeof parsed.key === 'string' &&
          Number.isFinite(parsed.createdAt) &&
          Date.now() - parsed.createdAt < CREATE_KEY_TTL_MS
        ) {
          return parsed.key;
        }
      }

      window.sessionStorage.setItem(storageKey, JSON.stringify({
        key: fallback,
        createdAt: Date.now(),
      } satisfies PersistedCreateKey));
    } catch (error) {
      console.warn('[FREIGHT SERVICE] Idempotência local indisponível:', error);
    }
    return fallback;
  }

  private clearIdempotencyKey(fingerprint: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(this.buildStorageKey(fingerprint));
    } catch {
      // O backend continua protegido pela chave já enviada.
    }
  }

  private validatePayload(payload: FreightPayload): string | null {
    if (!payload || typeof payload !== 'object') return 'DADOS_DO_FRETE_INVALIDOS';
    if (typeof payload.clienteId !== 'string' || !payload.clienteId.trim()) return 'CLIENTE_INVALIDO';
    if (typeof payload.categoria !== 'string' || !payload.categoria.trim()) return 'CATEGORIA_INVALIDA';

    const origemLat = getCoordinate(payload, 'origem', 'lat');
    const origemLng = getCoordinate(payload, 'origem', 'lng');
    const destinoLat = getCoordinate(payload, 'destino', 'lat');
    const destinoLng = getCoordinate(payload, 'destino', 'lng');

    if (origemLat === null || origemLng === null || origemLat < -90 || origemLat > 90 || origemLng < -180 || origemLng > 180) {
      return 'COORDENADAS_ORIGEM_INVALIDAS';
    }
    if (destinoLat === null || destinoLng === null || destinoLat < -90 || destinoLat > 90 || destinoLng < -180 || destinoLng > 180) {
      return 'COORDENADAS_DESTINO_INVALIDAS';
    }
    
    // 🔥 CTO FIX: Permite rotas diretas (arrays vazios) limitando o máximo de paradas a 5, 
    // corrigindo o bloqueio originado pelo fatiamento correto do componente Cliente.tsx.
    if (payload.paradas && (!Array.isArray(payload.paradas) || payload.paradas.length > 5)) {
      return 'PARADAS_INVALIDAS';
    }
    
    return null;
  }

  async criarFrete(payload: FreightPayload): Promise<CreateFreightResult> {
    const validationError = this.validatePayload(payload);
    if (validationError) return { success: false, error: validationError };

    const normalizedPayload: FreightPayload = {
      ...payload,
      interessados: payload.interessados ?? payload.interressados ?? 0,
    };
    delete normalizedPayload.interressados;

    const fingerprint = this.buildPayloadFingerprint(normalizedPayload);
    const existing = inflightRegistry.get(fingerprint);
    if (existing) return existing;

    const operation = (async (): Promise<CreateFreightResult> => {
      try {
        const functions = getFunctions();
        const criarFreteB2B = httpsCallable<
          { payload: FreightPayload; idempotencyKey: string },
          { success?: boolean; freteId?: string }
        >(functions, 'criarFreteB2B');

        const idempotencyKey = this.getOrCreateIdempotencyKey(normalizedPayload, fingerprint);
        const response = await criarFreteB2B({ payload: normalizedPayload, idempotencyKey });
        const freteId = typeof response.data?.freteId === 'string' ? response.data.freteId.trim() : '';

        if (response.data?.success && freteId) {
          this.clearIdempotencyKey(fingerprint);
          return { success: true, freteId };
        }
        return { success: false, error: 'RESPOSTA_INVALIDA_CRIACAO_FRETE' };
      } catch (error: unknown) {
        console.error('[FREIGHT SERVICE] Erro ao criar frete:', error);
        return { success: false, error: normalizeError(error, 'ERRO_CRIAR_FRETE') };
      } finally {
        inflightRegistry.delete(fingerprint);
      }
    })();

    inflightRegistry.set(fingerprint, operation);
    return operation;
  }

  async cancelarFrete(freteId: string): Promise<ServiceResult> {
    const normalizedFreteId = typeof freteId === 'string' ? freteId.trim() : '';
    if (!normalizedFreteId) return { success: false, error: 'FRETE_ID_INVALIDO' };

    try {
      const functions = getFunctions();
      const cancelarFreteB2B = httpsCallable<{ freteId: string }, { success?: boolean }>(
        functions,
        'cancelarFreteB2B'
      );
      const response = await cancelarFreteB2B({ freteId: normalizedFreteId });
      return response.data?.success
        ? { success: true }
        : { success: false, error: 'ERRO_CANCELAR_FRETE_SERVIDOR' };
    } catch (error: unknown) {
      console.error('[FREIGHT SERVICE] Erro ao cancelar frete:', error);
      return { success: false, error: normalizeError(error, 'ERRO_CANCELAR_FRETE') };
    }
  }

  async buscarFrete(freteId: string): Promise<ServiceResult<Record<string, unknown>>> {
    const normalizedFreteId = typeof freteId === 'string' ? freteId.trim() : '';
    if (!normalizedFreteId) return { success: false, error: 'FRETE_ID_INVALIDO' };

    try {
      const snapshot = await getDoc(doc(db, 'fretes', normalizedFreteId));
      if (!snapshot.exists()) return { success: false, error: 'FRETE_NAO_ENCONTRADO' };
      return { success: true, data: { id: snapshot.id, ...snapshot.data() } };
    } catch (error: unknown) {
      console.error('[FREIGHT SERVICE] Erro ao buscar frete:', error);
      return { success: false, error: normalizeError(error, 'ERRO_BUSCAR_FRETE') };
    }
  }
}

export const clientFreightService = new ClientFreightService();
