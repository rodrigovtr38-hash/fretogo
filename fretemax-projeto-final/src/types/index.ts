// =========================================================
// NOME DO ARQUIVO: src/types/index.ts
// CTO-Log: Alinhamento Estrito. Desambiguação de DriverStatus para DriverAccountStatus.
// =========================================================

/* =========================================================
   ORDER STATUS (Sincronizado com AppTripState)
========================================================= */
export type OrderStatus =
  | 'aguardando_pagamento'
  | 'pagamento_aprovado'
  | 'erro_pagamento'
  | 'agendado'
  | 'disponivel'
  | 'buscando_motorista'
  | 'expandindo_busca'
  | 'sem_motorista'
  | 'ofertando'
  | 'motorista_encontrado'
  | 'aguardando_aceite'
  | 'aceito'
  | 'redispatch'
  | 'timeout'
  | 'expirado'
  | 'indo_coleta'
  | 'chegou_coleta'
  | 'coletando'
  | 'em_transporte'
  | 'parado_operacional'
  | 'finalizando'
  | 'validando_comprovante'
  | 'entregue'
  | 'cancelado'
  | 'cancelado_cliente'
  | 'cancelado_motorista'
  | 'erro';

/* =========================================================
   MACHINE STATE (Mapa Visual)
========================================================= */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Lógica principal agora é regida por tripStateMachine.ts.
};

/* =========================================================
   VEHICLES
========================================================= */
export type VehicleType =
  | 'moto'
  | 'carro_pequeno'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta_ls'
  | 'bi_trem_cegonha';

export interface VehicleConfig {
  nome: string;
  fator: number;
  capacidadeKg: number;
  prioridadeMatching: number;
}

/* =========================================================
   USER & ROLES
========================================================= */
export interface UserProfile {
  uid: string;
  email: string | null;
}

export type UserRole =
  | 'cliente'
  | 'motorista'
  | 'admin'
  | 'operador';

/* =========================================================
   DRIVER (Dados Globais/Cadastrais)
========================================================= */
export type DriverAccountStatus =
  | 'pendente'
  | 'aprovado'
  | 'rejeitado'
  | 'bloqueado';

export interface DriverData {
  id?: string;
  nome: string;
  whatsapp: string;
  placa: string;
  categoria: VehicleType;
  status: DriverAccountStatus;
  score?: number;
  taxaAceite?: number;
  totalCorridas?: number;
  totalCancelamentos?: number;
  totalEntregas?: number;
  mediaEntregaMinutos?: number;
  riscoFraude?: boolean;
  validacaoManual?: boolean;
  online?: boolean; // Booleano simples para integrações legadas
  emCorrida?: boolean;
  ultimaAtividade?: any;
  tokenFCM?: string;
  fotoUrl?: string;
  documentoUrl?: string;
  cnhUrl?: string;
  cidadeEstado?: string;
  cpf?: string;
  cnh?: string;
  renavam?: string;
  backhaulDestino?: string;
  createdAt?: any;
  updatedAt?: any;
  aprovadoEm?: any;
  aprovadoPor?: string;
}

/* =========================================================
   TIMELINE, LOGS E EXTRAS
========================================================= */
export interface TimelineEvent {
  status: OrderStatus;
  createdAt: any;
  actor?: string;
  actorId?: string;
  actorRole?: UserRole;
  observacao?: string;
  metadata?: Record<string, any>;
}

export interface RepasseData {
  valor?: number;
  pagoEm?: any;
  pagoPor?: string;
  comprovantePix?: string;
  status?: 'pendente' | 'pago';
}

export interface MatchingLog {
  motoristaId: string;
  timestamp: any;
  distanciaKm?: number;
  prioridade?: number;
  score?: number;
  motivo?: string;
  aceitou?: boolean;
}

export interface OperationLog {
  actorId: string;
  actorNome?: string;
  actorRole: UserRole;
  action: string;
  createdAt: any;
  metadata?: Record<string, any>;
}

export interface AnalyticsGlobal {
  totalFretes: number;
  totalMotoristas: number;
  corridasAtivas: number;
  faturamentoTotal: number;
  lucroTotal: number;
  ticketMedio: number;
  updatedAt?: any;
}

export interface ChatMessage {
  id?: string;
  texto: string;
  enviadoPor: 'cliente' | 'motorista' | 'admin';
  nome: string;
  freteId?: string;
  createdAt?: any;
  visualizado?: boolean;
}

export interface Coords {
  lat: number;
  lng: number;
}

export interface AddressData {
  cep: string;
  bairro: string;
  rua: string;
  num: string;
}

export const COLLECTIONS = {
  FRETES: 'fretes',
  MOTORISTAS: 'motoristas_cadastros',
  MOTORISTAS_ONLINE: 'motoristas_online',
  ANALYTICS: 'analytics_global',
  ADMIN_LOGS: 'admin_logs',
  EVENTOS: 'eventos_operacionais',
} as const;
