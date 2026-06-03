// src/services/clientFreightService.ts

import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  paymentService,
} from './paymentService';

import {
  executeDispatch,
} from './orchestrator';

import {
  AppEvents,
  eventBusService,
} from './eventBusService';

import {
  AppTripState,
} from '../state/tripStateMachine';

type CategoriaOperacional =
  | 'moto'
  | 'carro'
  | 'utilitario'
  | 'toco'
  | 'truck'
  | 'carreta'
  | 'bitrem';

type PrioridadeOperacional =
  | 'normal'
  | 'urgente';

type OperationMode =
  | 'marketplace'
  | 'regional'
  | 'nacional'
  | 'retorno'
  | 'transbordo'
  | 'multipla_entrega'
  | 'carga_pesada';

type Coordinates = {
  lat: number;
  lng: number;
};

type AddressPayload = {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  enderecoFormatado?: string;
  lat: number;
  lng: number;
};

type CreateFreightPayload = {
  clienteId: string;

  origem: AddressPayload;

  destino: AddressPayload;
  
  // 🔥 NOVO: Suporte para múltiplas paradas
  paradas?: AddressPayload[];

  categoria: CategoriaOperacional;

  tipoCarga: string;

  pesoKg: number;

  cubagem?: number;

  volumes: number;

  prioridade: PrioridadeOperacional;

  observacoes?: string;

  distancia?: number;

  kmColeta?: number;

  kmEntrega?: number;

  kmTotal?: number;

  valorTotal?: number;

  agendado?: boolean;

  dataAgendamento?: string;

  retornoDisponivel?: boolean;

  multiplasEntregas?: boolean;

  transbordo?: boolean;

  roteiroRegional?: boolean;

  roteiroNacional?: boolean;

  marketplace?: boolean;

  cargaPesada?: boolean;

  pedagio?: number;

  clienteNome?: string;

  clienteTelefone?: string;
  
  clienteDocumento?: string;
};

type PricingMetadata = {
  taxaPlataformaPercentual: number;

  valorBruto: number;

  valorLiquidoMotorista: number;

  pedagioIncluso: number;

  kmColeta: number;

  kmEntrega: number;

  kmTotal: number;

  etaMinutos: number;

  modoOperacional: OperationMode;

  categoria: CategoriaOperacional;
};

type CreateFreightResponse = {
  success: boolean;

  freteId?: string;

  error?: string;
};

const HEAVY_CATEGORIES: CategoriaOperacional[] =
  [
    'toco',
    'truck',
    'carreta',
    'bitrem',
  ];

const LIGHT_CATEGORIES: CategoriaOperacional[] =
  [
    'moto',
    'carro',
    'utilitario',
  ];

const inflightRegistry =
  new Set<string>();

class ClientFreightService {
  /*
  =========================================================
  HELPERS & SECURITY (PIN)
  =========================================================
  */

  // 🔥 NOVO: Gerador de PIN de segurança (4 dígitos)
  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private normalizeNumber(
    value: unknown,
    fallback = 0,
  ) {
    const parsed =
      Number(value);

    if (
      Number.isNaN(parsed)
    ) {
      return fallback;
    }

    return parsed;
  }

  private round(
    value: number,
  ) {
    return Number(
      value.toFixed(2),
    );
  }

  private buildInflightKey(
    payload: CreateFreightPayload,
  ) {
    return JSON.stringify(
      {
        clienteId:
          payload.clienteId,

        origem:
          payload.origem
            ?.enderecoFormatado,

        destino:
          payload.destino
            ?.enderecoFormatado,

        categoria:
          payload.categoria,

        pesoKg:
          payload.pesoKg,

        volumes:
          payload.volumes,
      },
    );
  }

  private calculateDistanceKm(
    origin: Coordinates,
    destination: Coordinates,
  ) {
    const R = 6371;

    const dLat =
      ((destination.lat -
        origin.lat) *
        Math.PI) /
      180;

    const dLon =
      ((destination.lng -
        origin.lng) *
        Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (origin.lat *
          Math.PI) /
          180,
      ) *
        Math.cos(
          (destination.lat *
            Math.PI) /
            180,
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return this.round(R * c);
  }

  private calculatePedagio(
    payload: CreateFreightPayload,
    kmTotal: number,
  ) {
    const isHeavy =
      HEAVY_CATEGORIES.includes(
        payload.categoria,
      );

    if (!isHeavy) {
      return 0;
    }

    return this.round(
      kmTotal * 0.45,
    );
  }

  private resolveOperationMode(
    payload: CreateFreightPayload,
  ): OperationMode {
    if (
      payload.transbordo
    ) {
      return 'transbordo';
    }

    if (
      payload.multiplasEntregas || (payload.paradas && payload.paradas.length > 1)
    ) {
      return 'multipla_entrega';
    }

    if (
      payload.cargaPesada || HEAVY_CATEGORIES.includes(payload.categoria)
    ) {
      return 'carga_pesada';
    }

    if (
      payload.retornoDisponivel
    ) {
      return 'retorno';
    }

    if (
      payload.roteiroNacional
    ) {
      return 'nacional';
    }

    if (
      payload.roteiroRegional
    ) {
      return 'regional';
    }

    return 'marketplace';
  }

  // 🔥 NOVO: Arquitetura Dual Engine (Last-Mile vs Pesados)
  private calculateBasePrice(
    payload: CreateFreightPayload,
    kmTotal: number,
    qtdParadas: number,
  ) {
    const urgencyFactor =
      payload.prioridade ===
      'urgente'
        ? 1.35
        : 1;

    const weightFactor =
      Math.max(
        1,
        payload.pesoKg /
          100,
      );

    const isHeavy = HEAVY_CATEGORIES.includes(payload.categoria);

    if (isHeavy) {
        // MOTOR PESADO (Viagens longas, galpões)
        const basesPesadas = { toco: 6.2, truck: 8.5, carreta: 11.0, bitrem: 15.0 };
        const taxaKm = basesPesadas[payload.categoria as keyof typeof basesPesadas] || 8.5;
        
        const base = kmTotal * taxaKm * urgencyFactor * weightFactor;
        return this.round(Math.max(250, base)); // Frete Mínimo Blindado (R$ 250)
    } else {
        // MOTOR LAST-MILE (Urbano, Múltiplas entregas, E-commerce)
        const basesLeves = { moto: 1.8, carro: 2.4, utilitario: 3.5 };
        const taxaKm = basesLeves[payload.categoria as keyof typeof basesLeves] || 2.4;
        
        const volumeFactor = Math.max(1, payload.volumes * 0.15);
        
        // Cobra R$ 8,00 por cada parada extra (além da primeira)
        const custoParadasExtras = Math.max(0, qtdParadas - 1) * 8.00;

        const base = (kmTotal * taxaKm * urgencyFactor * volumeFactor) + custoParadasExtras;
        return this.round(Math.max(15, base)); // Frete Mínimo Blindado (R$ 15)
    }
  }

  private calculateETA(
    kmTotal: number,
    payload: CreateFreightPayload,
  ) {
    const avgSpeed =
      HEAVY_CATEGORIES.includes(
        payload.categoria,
      )
        ? 58
        : 75;

    return Math.max(
      15,
      Math.round(
        (kmTotal /
          avgSpeed) *
          60,
      ),
    );
  }

  private normalizePayload(
    payload: CreateFreightPayload,
  ) {
    // 🔥 Avalia se há múltiplas paradas ou apenas um destino
    const paradasArray = payload.paradas && payload.paradas.length > 0 ? payload.paradas : [payload.destino];
    const qtdParadas = paradasArray.length;

    const kmEntrega =
      payload.kmEntrega ||
      payload.distancia ||
      this.calculateDistanceKm(
        payload.origem,
        payload.destino, // Mantemos o último ponto para KM total estimado
      );

    const kmColeta =
      payload.kmColeta ||
      Math.max(
        2,
        Math.round(
          kmEntrega *
            0.12,
        ),
      );

    const kmTotal =
      payload.kmTotal ||
      this.round(
        kmEntrega +
          kmColeta,
      );

    const pedagio =
      payload.pedagio ||
      this.calculatePedagio(
        payload,
        kmTotal,
      );

    const valorBase =
      payload.valorTotal ||
      this.calculateBasePrice(
        payload,
        kmTotal,
        qtdParadas,
      );

    const taxaPercentual =
      HEAVY_CATEGORIES.includes(
        payload.categoria,
      )
        ? 15
        : 20;

    const valorBruto =
      this.round(
        valorBase +
          pedagio,
      );

    const taxaPlataforma =
      this.round(
        (valorBruto *
          taxaPercentual) /
          100,
      );

    const valorLiquidoMotorista =
      this.round(
        valorBruto -
          taxaPlataforma,
      );

    const etaMinutos =
      this.calculateETA(
        kmTotal,
        payload,
      );

    const mode =
      this.resolveOperationMode(
        payload,
      );

    const pricingMetadata: PricingMetadata =
      {
        taxaPlataformaPercentual:
          taxaPercentual,

        valorBruto,

        valorLiquidoMotorista,

        pedagioIncluso:
          pedagio,

        kmColeta,

        kmEntrega,

        kmTotal,

        etaMinutos,

        modoOperacional:
          mode,

        categoria:
          payload.categoria,
      };

    return {
      normalizedPayload: {
        ...payload,

        kmColeta,

        kmEntrega,

        kmTotal,

        valorTotal:
          valorBruto,

        valorLiquidoMotorista,

        pedagio,

        etaMinutos,

        operationMode:
          mode,
          
        paradasTratadas: paradasArray,
      },

      pricingMetadata,
    };
  }

  /*
  =========================================================
  CREATE FREIGHT
  =========================================================
  */

  async criarFrete(
    payload: CreateFreightPayload,
  ): Promise<CreateFreightResponse> {
    const inflightKey =
      this.buildInflightKey(
        payload,
      );

    if (
      inflightRegistry.has(
        inflightKey,
      )
    ) {
      return {
        success: false,
        error:
          'OPERACAO_EM_PROCESSAMENTO',
      };
    }

    inflightRegistry.add(
      inflightKey,
    );

    try {
      const {
        normalizedPayload,
        pricingMetadata,
      } =
        this.normalizePayload(
          payload,
        );

      /*
      =========================================================
      STALE VALIDATION
      =========================================================
      */

      if (
        !normalizedPayload
          .origem?.lat ||
        !normalizedPayload
          .destino?.lat
      ) {
        return {
          success: false,
          error:
            'COORDENADAS_INVALIDAS',
        };
      }

      /*
      =========================================================
      SECURITY: GERAÇÃO DE PINS
      =========================================================
      */
      
      const pinColeta = this.generatePin();
      // Cria um array de PINs de acordo com o número de paradas
      const pinEntregas = normalizedPayload.paradasTratadas.map(() => this.generatePin());

      /*
      =========================================================
      CREATE FREIGHT
      =========================================================
      */

      const freteRef =
        await addDoc(
          collection(
            db,
            'fretes',
          ),
          {
            clienteId:
              normalizedPayload.clienteId,

            clienteNome:
              normalizedPayload.clienteNome ||
              null,

            clienteTelefone:
              normalizedPayload.clienteTelefone ||
              null,
              
            clienteDocumento:
              normalizedPayload.clienteDocumento ||
              null,

            origem:
              normalizedPayload.origem,

            destino:
              normalizedPayload.destino,
              
            // Injeta o array de múltiplas entregas no Firestore
            paradas: 
              normalizedPayload.paradasTratadas,

            categoria:
              normalizedPayload.categoria,

            tipoCarga:
              normalizedPayload.tipoCarga,

            pesoKg:
              normalizedPayload.pesoKg,

            cubagem:
              normalizedPayload.cubagem ||
              0,

            volumes:
              normalizedPayload.volumes,

            prioridade:
              normalizedPayload.prioridade,

            observacoes:
              normalizedPayload.observacoes ||
              '',

            agendado:
              normalizedPayload.agendado ||
              false,

            dataAgendamento:
              normalizedPayload.dataAgendamento ||
              null,

            retornoDisponivel:
              normalizedPayload.retornoDisponivel ||
              false,

            multiplasEntregas:
              normalizedPayload.multiplasEntregas ||
              (normalizedPayload.paradasTratadas.length > 1),

            transbordo:
              normalizedPayload.transbordo ||
              false,

            roteiroRegional:
              normalizedPayload.roteiroRegional ||
              false,

            roteiroNacional:
              normalizedPayload.roteiroNacional ||
              false,

            marketplace:
              normalizedPayload.marketplace ||
              false,

            cargaPesada:
              normalizedPayload.cargaPesada ||
              HEAVY_CATEGORIES.includes(normalizedPayload.categoria),

            operationMode:
              normalizedPayload.operationMode,

            kmColeta:
              pricingMetadata.kmColeta,

            kmEntrega:
              pricingMetadata.kmEntrega,

            kmTotal:
              pricingMetadata.kmTotal,

            etaMinutos:
              pricingMetadata.etaMinutos,

            pedagio:
              pricingMetadata.pedagioIncluso,

            taxaPlataformaPercentual:
              pricingMetadata.taxaPlataformaPercentual,

            valorTotal:
              pricingMetadata.valorBruto,

            valorLiquidoMotorista:
              pricingMetadata.valorLiquidoMotorista,

            // 🔥 INJEÇÃO DA SEGURANÇA (PINS)
            pinColeta: pinColeta,
            pinEntregas: pinEntregas,
            
            pagamentoStatus:
              'pendente',

            dispatchStatus:
              'aguardando_dispatch',

            trackingStatus:
              'aguardando_tracking',

            matchingStatus:
              'aguardando_matching',

            queuePersisted:
              true,

            status:
              AppTripState.PENDENTE,

            runtimeMetadata:
              {
                createdFrom:
                  'client_runtime_enterprise',

                realtime:
                  true,

                pricingSynchronized:
                  true,

                dispatchSynchronized:
                  true,

                trackingSynchronized:
                  true,

                matchingSynchronized:
                  true,

                operationalMode:
                  pricingMetadata.modoOperacional,
              },

            pricingMetadata,

            criadoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp(),
          },
        );

      /*
      =========================================================
      PAYMENT
      =========================================================
      */

      const pagamento =
        await paymentService.processarPagamento(
          {
            valor:
              pricingMetadata.valorBruto,

            descricao:
              `Frete ${normalizedPayload.categoria}`,

            clienteId:
              normalizedPayload.clienteId,

            freteId:
              freteRef.id,
          },
        );

      /*
      =========================================================
      PAYMENT FAILED
      =========================================================
      */

      if (
        !pagamento.success
      ) {
        await updateDoc(
          doc(
            db,
            'fretes',
            freteRef.id,
          ),
          {
            pagamentoStatus:
              'falhou',

            rollbackReason:
              'payment_failed',

            status:
              AppTripState.CANCELADO,

            atualizadoEm:
              serverTimestamp(),
          },
        );

        return {
          success: false,
          error:
            'PAGAMENTO_NEGADO',
        };
      }

      /*
      =========================================================
      PAYMENT APPROVED
      =========================================================
      */

      await updateDoc(
        doc(
          db,
          'fretes',
          freteRef.id,
        ),
        {
          pagamentoStatus:
            'aprovado',

          transactionId:
            pagamento.transactionId,

          dispatchStatus:
            'dispatch_ready',

          matchingStatus:
            'matching_ready',

          trackingStatus:
            'tracking_ready',

          status:
            AppTripState.PROCURANDO_MOTORISTA,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      /*
      =========================================================
      DISPATCH ORCHESTRATION
      =========================================================
      */

      await executeDispatch(
        freteRef.id,
        {
          categoria:
            normalizedPayload.categoria,

          origemLat:
            normalizedPayload
              .origem.lat,

          origemLng:
            normalizedPayload
              .origem.lng,

          destinoLat:
            normalizedPayload
              .destino.lat,

          destinoLng:
            normalizedPayload
              .destino.lng,
        },
      );

      /*
      =========================================================
      EVENTS
      =========================================================
      */

      eventBusService.emit(
        AppEvents.NEW_TRIP_REQUEST,
        {
          freteId:
            freteRef.id,

          categoria:
            normalizedPayload.categoria,

          operationMode:
            normalizedPayload.operationMode,

          pricingMetadata,
        },
      );

      return {
        success: true,

        freteId:
          freteRef.id,
      };
    } catch (error) {
      console.error(
        'ERRO CRIAR FRETE:',
        error,
      );

      return {
        success: false,
        error:
          'ERRO_CRIAR_FRETE',
      };
    } finally {
      inflightRegistry.delete(
        inflightKey,
      );
    }
  }

  /*
  =========================================================
  CANCEL FREIGHT
  =========================================================
  */

  async cancelarFrete(
    freteId: string,
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId,
      );

      await updateDoc(
        freteRef,
        {
          status:
            AppTripState.CANCELADO,

          dispatchStatus:
            'cancelado',

          trackingStatus:
            'cancelado',

          matchingStatus:
            'cancelado',

          atualizadoEm:
            serverTimestamp(),
        },
      );

      eventBusService.emit(
        AppEvents.TRIP_CANCELLED,
        {
          freteId,
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO CANCELAR FRETE:',
        error,
      );

      return false;
    }
  }

  /*
  =========================================================
  UPDATE FREIGHT
  =========================================================
  */

  async atualizarFrete(
    freteId: string,
    payload: Record<
      string,
      any
    >,
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId,
      );

      await updateDoc(
        freteRef,
        {
          ...payload,

          atualizadoEm:
            serverTimestamp(),
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO UPDATE FRETE:',
        error,
      );

      return false;
    }
  }

  /*
  =========================================================
  GET FREIGHT
  =========================================================
  */

  async buscarFrete(
    freteId: string,
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId,
      );

      const snapshot =
        await getDoc(
          freteRef,
        );

      if (
        !snapshot.exists()
      ) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } catch (error) {
      console.error(
        'ERRO BUSCAR FRETE:',
        error,
      );

      return null;
    }
  }

  /*
  =========================================================
  FINISH FREIGHT
  =========================================================
  */

  async finalizarFrete(
    freteId: string,
  ) {
    try {
      const freteRef = doc(
        db,
        'fretes',
        freteId,
      );

      await runTransaction(
        db,
        async transaction => {
          const snapshot =
            await transaction.get(
              freteRef,
            );

          if (
            !snapshot.exists()
          ) {
            throw new Error(
              'Frete não encontrado',
            );
          }

          transaction.update(
            freteRef,
            {
              status:
                AppTripState.ENTREGUE,

              dispatchStatus:
                'finalizado',

              trackingStatus:
                'finalizado',

              matchingStatus:
                'finalizado',

              atualizadoEm:
                serverTimestamp(),
            },
          );
        },
      );

      eventBusService.emit(
        AppEvents.TRIP_FINISHED,
        {
          freteId,
        },
      );

      return true;
    } catch (error) {
      console.error(
        'ERRO FINALIZAR FRETE:',
        error,
      );

      return false;
    }
  }
}

export const clientFreightService =
  new ClientFreightService();
