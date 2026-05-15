// ============================================================================
// 🚛 FRETOGO - CORE TYPES & INTERFACES (ENTERPRISE LOGISTICS ARCHITECTURE)
// ============================================================================

/**
 * STATUS OPERACIONAIS (WORKFLOW DE CARGA)
 * Expandido com 'finalizado' para suportar o fluxo de caixa do Admin
 */
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

export type VehicleType = 
  | 'moto' 
  | 'carro_pequeno' 
  | 'utilitario' 
  | 'toco' 
  | 'truck' 
  | 'carreta_ls' 
  | 'bi_trem_cegonha';

export type DriverApprovalStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'bloqueado';
export type RepasseStatus = 'pendente' | 'processando' | 'pago' | 'erro' | 'estornado';
export type DriverLevel = 'novato' | 'bronze' | 'prata' | 'ouro' | 'diamante';
export type RiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';
export type PriorityLevel = 'baixa' | 'normal' | 'alta' | 'critica';
export type IncidentType = 'atraso' | 'avaria' | 'acidente' | 'extravio' | 'fraude' | 'outro';

// ============================================================================
// 📍 COMPONENTES BASE
// ============================================================================

export interface Coords {
  lat: number;
  lng: number;
}

export interface AddressData {
  cep: string;
  bairro: string;
  rua: string;
  num: string;
  complemento?: string;
  cidade?: string;
  estado?: string;
}

// ============================================================================
// 👤 USUÁRIOS E CLIENTES
// ============================================================================

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: 'cliente' | 'motorista' | 'admin';
}

export interface ClientData {
  id?: string;
  nome: string;
  whatsapp: string;
  email?: string;
  cpfCnpj?: string;
  createdAt?: any; // Firebase Timestamp
  
  // Analítica & Score Cliente
  clienteScore?: number;
  clienteRecorrente?: boolean;
  totalPedidos?: number;
  totalGasto?: number;
  taxaCancelamentoCliente?: number;
}

// ============================================================================
// 🚚 MOTORISTA (DRIVER DOSSIER & ANALYTICS)
// ============================================================================

export interface DriverData {
  // Dados Core (Legado mantido)
  id?: string;
  nome: string;
  whatsapp: string;
  placa: string;
  categoria: VehicleType;
  status: DriverApprovalStatus;
  score?: number;
  taxaAceite?: number;
  totalCorridas?: number;
  email?: string;
  cnh?: string;
  cpf?: string;
  renavam?: string;
  cidadeEstado?: string;
  documentoUrl?: string; // Foto unificada legado
  createdAt?: any;
  updatedAt?: any;

  // 🛡️ Antifraude e Compliance
  selfieUrl?: string;
  cnhUrl?: string;
  crlvUrl?: string;
  placaUrl?: string;
  comprovanteResidenciaUrl?: string;
  validacaoManual?: boolean;
  riscoFraude?: RiskLevel;
  motivoRejeicao?: string;

  // 📊 Score e Performance Operacional
  taxaCancelamento?: number;
  entregasConcluidas?: number;
  kmRodados?: number;
  nivelMotorista?: DriverLevel;
  reputacao?: number;
  ocorrencias?: number;
  avaliacoesRecebidas?: number;

  // 🧠 Inteligência Artificial Logística
  destinoPreferencial?: string;
  regioesFavoritas?: string[];
  retornoInteligente?: boolean;
  scoreOperacional?: number;

  // 📡 Tracking e Status Realtime
  isOnline?: boolean;
  ultimaLocalizacao?: Coords;
  ultimaAtualizacaoGps?: any; // Firebase Timestamp
  tokenFCM?: string; // Push Notifications
}

// ============================================================================
// 📦 ORDEM DE SERVIÇO (FRETE CORE)
// ============================================================================

export interface OrderData {
  // Estrutura Core (Legado mantido intacto)
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
  tipoFrete: 'imediato' | 'agendado';
  dataAgendada: Date | string | null;
  motoristaId?: string | null;
  motoristaNome?: string;
  motoristaZap?: string;
  filaMatching?: string[];
  rotaInteligente?: boolean;
  comprovanteUrl?: string;
  createdAt?: any;

  // Dados Adicionais de Entrada
  clienteNome?: string;
  clienteZap?: string;
  qtdVolumes?: string;
  coleta?: AddressData;
  entrega?: AddressData;
  adminAction?: boolean;
  updatedAt?: any;

  // ⏳ Timeline Operacional (Rastreio Preciso)
  aceitoEm?: any;
  coletaEm?: any;
  transporteEm?: any;
  entregueEm?: any;
  finalizadoEm?: any;
  canceladoEm?: any;
  motivoCancelamento?: string;
  canceladoPor?: 'cliente' | 'motorista' | 'admin' | 'sistema';

  // 💰 Sistema Financeiro e Clearing
  repasseStatus?: RepasseStatus;
  repassePagoEm?: any;
  comprovanteRepasseUrl?: string;
  valorRepasse?: number;
  lucroLiquido?: number;
  taxaGateway?: number;
  idTransacaoGateway?: string;

  // 📡 Tracking em Tempo Real (Acompanhamento da Viagem)
  ultimaLocalizacao?: Coords;
  ultimaAtualizacaoGps?: any;
  velocidadeAtual?: number;
  tempoEstimadoEntrega?: number; // em minutos
  distanciaRestante?: number; // em km

  // ⚠️ Alertas e Incidentes
  alertas?: string[];
  prioridadeOperacional?: PriorityLevel;
  incidenteAtivo?: boolean;
  detalhesIncidente?: string;

  // 📈 Analytics da Carga Relacionada ao Cliente
  clienteScore?: number;
  clienteRecorrente?: boolean;
}

// ============================================================================
// 📊 ANALYTICS E INCIDENTES (ESTRUTURA PARA ESCALABILIDADE)
// ============================================================================

export interface PlatformAnalytics {
  id: string; // ex: 'global' ou '2026-05'
  tempoMedioEntrega: number; // em minutos
  ticketMedio: number;
  totalFaturado: number;
  lucroLiquido: number;
  totalCorridas: number;
  corridasCanceladas: number;
  motoristasAtivos: number;
  clientesAtivos: number;
  totalKmRodados: number;
  updatedAt?: any;
}

export interface IncidentRecord {
  id?: string;
  freteId: string;
  motoristaId?: string;
  clienteId?: string;
  tipo: IncidentType;
  prioridade: PriorityLevel;
  descricao: string;
  status: 'aberto' | 'em_tratativa' | 'resolvido';
  criadoEm: any;
  resolvidoEm?: any;
  tratadoPorAdmin?: string; // UID do admin
  resolucaoDescricao?: string;
}
