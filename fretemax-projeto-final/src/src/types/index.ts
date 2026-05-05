export type OrderStatus = 'aguardando_pagamento' | 'disponivel' | 'aceito' | 'coleta' | 'em_transporte' | 'entregue' | 'cancelado' | 'erro_pagamento' | 'expirado' | 'sem_motorista' | 'timeout_motorista' | 'agendado';

export type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

export interface UserProfile {
  uid: string;
  email: string | null;
}

export interface DriverData {
  nome: string;
  whatsapp: string;
  placa: string;
  categoria: VehicleType;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  score?: number;
  taxaAceite?: number;
  totalCorridas?: number;
}

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
  tipoFrete: 'imediato' | 'agendado';
  dataAgendada: Date | string | null;
  motoristaId?: string | null;
  motoristaNome?: string;
  motoristaZap?: string;
  filaMatching?: string[];
  rotaInteligente?: boolean;
  comprovanteUrl?: string;
  createdAt?: any;
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
