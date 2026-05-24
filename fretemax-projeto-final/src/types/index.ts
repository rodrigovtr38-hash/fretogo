/* =========================================================
   ORDER STATUS
========================================================= */

export type OrderStatus =
  | 'aguardando_pagamento'
  | 'disponivel'
  | 'aceito'
  | 'coleta'
  | 'em_transporte'
  | 'entregue'
  | 'finalizado'
  | 'cancelado'
  | 'erro_pagamento'
  | 'expirado'
  | 'sem_motorista'
  | 'timeout_motorista'
  | 'agendado';

/* =========================================================
   MACHINE STATE
========================================================= */

export const VALID_STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
  aguardando_pagamento: [
    'disponivel',
    'erro_pagamento',
    'cancelado',
  ],

  disponivel: [
    'aceito',
    'sem_motorista',
    'expirado',
    'cancelado',
    'timeout_motorista',
  ],

  aceito: [
    'coleta',
    'cancelado',
  ],

  coleta: [
    'em_transporte',
    'cancelado',
  ],

  em_transporte: [
    'entregue',
    'cancelado',
  ],

  entregue: [
    'finalizado',
  ],

  finalizado: [],

  cancelado: [],

  erro_pagamento: [],

  expirado: [],

  sem_motorista: [],

  timeout_motorista: [],

  agendado: [
    'disponivel',
    'cancelado',
  ],
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

/* =========================================================
   VEHICLE CONFIG
========================================================= */

export interface VehicleConfig {
  nome: string;

  fator: number;

  capacidadeKg: number;

  prioridadeMatching: number;
}

/* =========================================================
   USER
========================================================= */

export interface UserProfile {
  uid: string;

  email: string | null;
}

/* =========================================================
   ROLES
========================================================= */

export type UserRole =
  | 'cliente'
  | 'motorista'
  | 'admin'
  | 'operador';

/* =========================================================
   DRIVER STATUS
========================================================= */

export type DriverStatus =
  | 'pendente'
  | 'aprovado'
  | 'rejeitado'
  | 'bloqueado';

/* =========================================================
   DRIVER
========================================================= */

export interface DriverData {
  id?: string;

  nome: string;

  whatsapp: string;

  placa: string;

  categoria: VehicleType;

  status: DriverStatus;

  score?: number;

  taxaAceite?: number;

  totalCorridas?: number;

  totalCancelamentos?: number;

  totalEntregas?: number;

  mediaEntregaMinutos?: number;

  riscoFraude?: boolean;

  validacaoManual?: boolean;

  online?: boolean;

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
   TIMELINE
========================================================= */

export interface TimelineEvent {
  status: OrderStatus;

  createdAt: any;

  actor?: string;

  actorId?: string;

  actorRole?: UserRole;

  observacao?: string;

  metadata?: Record<
    string,
    any
  >;
}

/* =========================================================
   REPASSE
========================================================= */

export interface RepasseData {
  valor?: number;

  pagoEm?: any;

  pagoPor?: string;

  comprovantePix?: string;

  status?: 'pendente' | 'pago';
}

/* =========================================================
   MATCHING LOG
========================================================= */

export interface MatchingLog {
  motoristaId: string;

  timestamp: any;

  distanciaKm?: number;

  prioridade?: number;

  score?: number;

  motivo?: string;

  aceitou?: boolean;
}

/* =========================================================
   OPERATION LOG
========================================================= */

export interface OperationLog {
  actorId: string;

  actorNome?: string;

  actorRole: UserRole;

  action: string;

  createdAt: any;

  metadata?: Record<
    string,
    any
  >;
}

/* =========================================================
   ANALYTICS
========================================================= */

export interface AnalyticsGlobal {
  totalFretes: number;

  totalMotoristas: number;

  corridasAtivas: number;

  faturamentoTotal: number;

  lucroTotal: number;

  ticketMedio: number;

  updatedAt?: any;
}

/* =========================================================
   ORDER
========================================================= */

export interface OrderData {
  id?: string;

  status: OrderStatus;

  distancia: number;

  veiculo: VehicleType;

  valorTotal: number;

  valorMotorista: number;

  lucroPlataforma: number;

  cidadeOrigem: string;

  cidadeDestino: string;

  enderecoColetaTexto: string;

  enderecoEntregaTexto: string;

  peso: string;

  tipoMaterial: string;

  origemLat: number;

  origemLng: number;

  destinoLat: number;

  destinoLng: number;

  tipoFrete:
    | 'imediato'
    | 'agendado';

  dataAgendada:
    | Date
    | string
    | null;

  motoristaId?: string | null;

  motoristaNome?: string;

  motoristaZap?: string;

  clienteId?: string;

  clienteNome?: string;

  clienteZap?: string;

  qtdVolumes?: number;

  filaMatching?: string[];

  matchingLogs?: MatchingLog[];

  rotaInteligente?: boolean;

  prioridadeDinamica?: number;

  scoreOperacional?: number;

  comprovanteUrl?: string;

  timeline?: TimelineEvent[];

  repasse?: RepasseData;

  adminAction?: boolean;

  analyticsProcessed?: boolean;

  canceladoPor?: UserRole;

  canceladoEm?: any;

  finalizadoEm?: any;

  aceitoEm?: any;

  coletaEm?: any;

  transporteEm?: any;

  entregueEm?: any;

  updatedAt?: any;

  createdAt?: any;
}

/* =========================================================
   CHAT MESSAGE
========================================================= */

export interface ChatMessage {
  id?: string;

  texto: string;

  enviadoPor:
    | 'cliente'
    | 'motorista'
    | 'admin';

  nome: string;

  freteId?: string;

  createdAt?: any;

  visualizado?: boolean;
}

/* =========================================================
   COORDS
========================================================= */

export interface Coords {
  lat: number;

  lng: number;
}

/* =========================================================
   ADDRESS
========================================================= */

export interface AddressData {
  cep: string;

  bairro: string;

  rua: string;

  num: string;
}

/* =========================================================
   FIREBASE COLLECTIONS
========================================================= */

export const COLLECTIONS = {
  FRETES: 'fretes',

  MOTORISTAS:
    'motoristas_cadastros',

  MOTORISTAS_ONLINE:
    'motoristas_online',

  ANALYTICS:
    'analytics_global',

  ADMIN_LOGS:
    'admin_logs',

  EVENTOS:
    'eventos_operacionais',
} as const;
