// =========================================================
// NOME DO ARQUIVO: functions/index.js
// CTO-Log: Auditoria Backend - Motor de Despacho (Ponte)
// Melhorias Implementadas:
// 1. Arquitetura "Mural/Feed": Cargas permanecem visíveis por 15 minutos reais.
// 2. Haversine Formula: Cálculo de distância nativo preciso.
// 3. Centralização das Coleções Oficiais.
// 4. 🔥 CTO FIX: Injeção da Cloud Function "getDistance" (Google Distance Matrix API).
// 5. 🔥 CTO FIX: Injeção direta da Chave de API para deploy automático via GitHub.
// 6. 🔥 CTO FIX: Auditoria Forense. Preservação do status real, error_message e payload completo do Google.
// 7. 🔎 DIAGNOSTIC-LOG: Logs completos de rastreamento adicionados antes de cada throw.
// 8. 🔥 CTO FIX (BLOCO 02): Watchdog de Reservas. Ceifador autônomo para fretes sem pagamento após 5 minutos.
// 9. 🔥 CTO FIX (BLOCO 10): Watchdog de Liberação de Agendamentos (O "Relógio").
// 10. 🔥 CTO FIX (BLOCO 10): Watchdog de Expiração Absoluta (Garbage Collector do expiraEm).
// 11. 🔥 CTO FIX: Injeção da Validação Zero Trust para Foto + PIN.
// 12. 🔥 CTO FIX: Injeção de Liquidação Centralizada de Viagem (Bypass Firestore Rules).
// 13. 🔥 CTO FIX (PATCH BLOCO 01): Criação de Frete Zero Trust e Idempotência.
// 14. 🔥 CTO FIX (PATCH BLOCO 01): Cancelamento Server-Side e Máquina de Estados.
// 15. 🔥 CTO FIX (PATCH BLOCO 01): Auto-Bid Server-Side Recalculation.
// =========================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

const db = admin.firestore();

// 🛡 TRAVAS DE NUVEM
const runtimeOpts = {
  timeoutSeconds: 30, 
  memory: '256MB',    
  maxInstances: 50    
};

const VALID_VEHICLE_CATEGORIES = new Set([
  'moto', 'carro', 'utilitarios', 'toco', 'truck', 'carreta', 'bitrem'
]);

const ALLOWED_FREIGHT_SCALAR_FIELDS = [
  'tipoConta', 'empresaNome', 'empresaDocumento', 'clienteNome', 'clienteZap',
  'clienteDocumento', 'distancia', 'distanciaRealKm', 'distanciaTotalKm',
  'distanciaTarifada', 'peso', 'pesoKg', 'tipoCarga', 'tipoMaterial',
  'qtdVolumes', 'valorNF', 'observacoes', 'cidadeOrigem', 'cidadeDestino',
  'enderecoColetaTexto', 'enderecoEntregaTexto'
];

const VEHICLE_WEIGHT_LIMITS = {
  moto: 30,
  carro: 250,
  utilitarios: 800,
  toco: 4000,
  truck: 12000,
  carreta: 30000,
  bitrem: 45000,
};

function getGoogleMapsKey() {
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Serviço de mapas temporariamente indisponível.'
    );
  }
  return key;
}

function toFiniteNumber(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} ausente.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new functions.https.HttpsError('invalid-argument', `${fieldName} inválido.`);
  }
  return parsed;
}

function validateCoordinates(latValue, lngValue, label) {
  const lat = toFiniteNumber(latValue, `${label}.lat`);
  const lng = toFiniteNumber(lngValue, `${label}.lng`);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new functions.https.HttpsError('invalid-argument', `Coordenadas de ${label} fora da faixa permitida.`);
  }
  return { lat, lng };
}

function sanitizeText(value, maxLength) {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function parseTimestampMillis(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'object') {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    if (Number.isFinite(seconds) && Number.isFinite(nanoseconds)) {
      return seconds * 1000 + Math.floor(nanoseconds / 1000000);
    }
  }
  if (value instanceof Date) return value.getTime();
  const parsed = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeAddress(value, fallbackCoordinates, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${label} inválido.`);
  }

  const coordinates = validateCoordinates(
    value.lat ?? fallbackCoordinates?.lat,
    value.lng ?? fallbackCoordinates?.lng,
    label
  );

  const clean = { ...coordinates };
  for (const key of ['cep', 'bairro', 'rua', 'num', 'cidade', 'uf', 'endereco']) {
    const normalized = sanitizeText(value[key], key === 'endereco' ? 500 : 120);
    if (normalized !== undefined) clean[key] = normalized;
  }
  return clean;
}

function sanitizeFreightPayload(payload, uid) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new functions.https.HttpsError('invalid-argument', 'Payload do frete inválido.');
  }

  const categoria = sanitizeText(payload.categoria || payload.veiculo, 40)?.toLowerCase();
  if (!categoria || !VALID_VEHICLE_CATEGORIES.has(categoria)) {
    throw new functions.https.HttpsError('invalid-argument', 'Categoria de veículo inválida.');
  }

  if (!Array.isArray(payload.paradas) || payload.paradas.length < 1 || payload.paradas.length > 5) {
    throw new functions.https.HttpsError('invalid-argument', 'O frete deve possuir entre 1 e 5 destinos.');
  }

  const origem = sanitizeAddress(
    payload.origem,
    { lat: payload.origemLat, lng: payload.origemLng },
    'origem'
  );
  const destino = sanitizeAddress(
    payload.destino,
    { lat: payload.destinoLat, lng: payload.destinoLng },
    'destino'
  );
  const paradas = payload.paradas.map((parada, index) =>
    sanitizeAddress(parada, null, `paradas[${index}]`)
  );

  const clean = {};
  for (const field of ALLOWED_FREIGHT_SCALAR_FIELDS) {
    if (payload[field] !== undefined) clean[field] = payload[field];
  }

  clean.clienteId = uid;
  clean.empresaId = uid;
  clean.categoria = categoria;
  clean.veiculo = categoria;
  clean.origem = origem;
  clean.destino = destino;
  clean.coleta = payload.coleta && typeof payload.coleta === 'object'
    ? sanitizeAddress(payload.coleta, origem, 'coleta')
    : origem;
  clean.entrega = payload.entrega && typeof payload.entrega === 'object'
    ? sanitizeAddress(payload.entrega, destino, 'entrega')
    : destino;
  clean.paradas = paradas;
  clean.origemLat = origem.lat;
  clean.origemLng = origem.lng;
  clean.destinoLat = destino.lat;
  clean.destinoLng = destino.lng;
  clean.cidadeOrigem = sanitizeText(clean.coleta.cidade || payload.cidadeOrigem, 120) || '';
  clean.cidadeDestino = sanitizeText(clean.entrega.cidade || payload.cidadeDestino, 120) || '';
  clean.multiplasEntregas = paradas.length > 1;

  const peso = Number(payload.pesoKg ?? payload.peso);
  if (!Number.isFinite(peso) || peso <= 0 || peso > VEHICLE_WEIGHT_LIMITS[categoria]) {
    throw new functions.https.HttpsError('invalid-argument', 'Peso incompatível com a categoria selecionada.');
  }
  clean.peso = String(payload.peso ?? payload.pesoKg);
  clean.pesoKg = peso;

  const qtdVolumes = Number(payload.qtdVolumes);
  if (!Number.isInteger(qtdVolumes) || qtdVolumes < 1 || qtdVolumes > 100000) {
    throw new functions.https.HttpsError('invalid-argument', 'Quantidade de volumes inválida.');
  }
  clean.qtdVolumes = String(qtdVolumes);

  const tipoFrete = payload.tipoFrete === 'agendado' ? 'agendado' : payload.tipoFrete === 'imediato' ? 'imediato' : null;
  if (!tipoFrete) {
    throw new functions.https.HttpsError('invalid-argument', 'Tipo de frete inválido.');
  }
  clean.tipoFrete = tipoFrete;

  if (tipoFrete === 'agendado') {
    const scheduledAt = parseTimestampMillis(payload.dataAgendada);
    const minimumLeadMs = ['toco', 'truck', 'carreta', 'bitrem'].includes(categoria)
      ? 12 * 60 * 60 * 1000
      : 15 * 60 * 1000;
    if (!Number.isFinite(scheduledAt) || scheduledAt < Date.now() + minimumLeadMs) {
      throw new functions.https.HttpsError('invalid-argument', 'Data de agendamento fora da antecedência operacional.');
    }
    clean.dataAgendada = admin.firestore.Timestamp.fromMillis(scheduledAt);
  } else {
    clean.dataAgendada = null;
  }

  clean.visualizacoes = 0;
  clean.motoristasNotificados = 0;
  clean.interessados = 0;

  return clean;
}

// 🔎 DIAGNOSTIC-LOG: helper apenas para não vazar a chave completa do Google nos logs
function mascararChave(key) {
  if (!key || typeof key !== 'string') return 'CHAVE_AUSENTE';
  if (key.length <= 6) return '******';
  return `******${key.slice(-6)}`;
}

function calcularDistanciaExata(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}

async function sendPushInternal(userId, tipo, titulo, corpo, dados) {
  try {
    const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes';
    const userDoc = await db.collection(colecao).doc(userId).get();
    
    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) return false;

    const message = {
      token: fcmToken,
      notification: {
        title: titulo || 'FretoGo Network',
        body: corpo || 'Você tem uma nova notificação operacional'
      },
      data: dados || {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'fretes' }
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`[PUSH] Disparado -> ${userId}`);
    return true;
  } catch (error) {
    console.error('[PUSH ERRO]', error.message);
    return false;
  }
}

// ========================================================
// 1. GEOCODE SEGURO
// ========================================================
exports.getCoords = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const address = sanitizeText(data?.address, 500);
  if (!address || address.length < 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Endereço inválido.');
  }

  const key = getGoogleMapsKey();
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  try {
    const res = await axios.get(url, { timeout: 5000 });
    const result = res.data?.results?.[0];
    if (res.data?.status !== 'OK' || !result?.geometry?.location) {
      const googleStatus = res.data?.status || 'STATUS_DESCONHECIDO';
      console.error('[GETCOORDS] Geocodificação recusada:', googleStatus);
      throw new functions.https.HttpsError('not-found', 'Endereço não localizado pelo serviço de mapas.');
    }

    const { lat, lng } = validateCoordinates(
      result.geometry.location.lat,
      result.geometry.location.lng,
      'resultado'
    );
    const components = Array.isArray(result.address_components) ? result.address_components : [];
    const findComponent = (type, short = false) => {
      const component = components.find(item => Array.isArray(item.types) && item.types.includes(type));
      return component ? (short ? component.short_name : component.long_name) : undefined;
    };

    return {
      lat,
      lng,
      cidade: findComponent('locality') || findComponent('administrative_area_level_2'),
      uf: findComponent('administrative_area_level_1', true),
      cep: findComponent('postal_code'),
      enderecoFormatado: sanitizeText(result.formatted_address, 500),
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[GETCOORDS] Falha de integração:', error.message);
    throw new functions.https.HttpsError('internal', 'Falha de comunicação com o serviço de mapas.');
  }
});

// ========================================================
// 1.1. DISTANCE MATRIX
// ========================================================
exports.getDistance = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const origin = sanitizeText(data?.origin, 500);
  const destination = sanitizeText(data?.destination, 500);
  if (!origin || !destination || origin.length < 5 || destination.length < 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Origem e destino válidos são obrigatórios.');
  }

  const key = getGoogleMapsKey();
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    const res = await axios.get(url, { timeout: 5000 });
    const element = res.data?.rows?.[0]?.elements?.[0];
    if (res.data?.status !== 'OK' || !element || element.status !== 'OK') {
      const googleStatus = element?.status || res.data?.status || 'STATUS_DESCONHECIDO';
      console.error('[GETDISTANCE] Rota recusada:', googleStatus);
      throw new functions.https.HttpsError('failed-precondition', 'Não foi possível calcular uma rota rodoviária válida.');
    }

    const distanceInMeters = Number(element.distance?.value);
    if (!Number.isFinite(distanceInMeters) || distanceInMeters < 0) {
      throw new functions.https.HttpsError('data-loss', 'O serviço de mapas retornou uma distância inválida.');
    }

    return distanceInMeters / 1000;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[GETDISTANCE] Falha de integração:', error.message);
    throw new functions.https.HttpsError('internal', 'Falha de comunicação com o serviço de mapas.');
  }
});

// ========================================================
// 2. O DESPERTADOR (CRON JOB DE FRETE AGENDADO PARA WHATSAPP)
// ========================================================
exports.despertadorAgendamentos = functions.runWith(runtimeOpts).pubsub.schedule('every 5 minutes').onRun(async () => {
  const agora = admin.firestore.Timestamp.now();
  const limiteD1 = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
  const limite1h = admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);

  const [fretesD1, fretes1h] = await Promise.all([
    db.collection('fretes')
      .where('status', '==', 'agendado')
      .where('dataAgendada', '>=', agora)
      .where('dataAgendada', '<=', limiteD1)
      .limit(200)
      .get(),
    db.collection('fretes')
      .where('status', '==', 'agendado')
      .where('dataAgendada', '>=', agora)
      .where('dataAgendada', '<=', limite1h)
      .limit(200)
      .get()
  ]);

  const pendingUpdates = new Map();

  fretesD1.forEach(docFrete => {
    const data = docFrete.data();
    if (data.pagamentoStatus === 'aprovado' && data.notificadoD1 !== true) {
      pendingUpdates.set(docFrete.id, {
        ref: docFrete.ref,
        payload: {
        notificadoD1: true,
        pendenteEnvioWhatsApp: true,
        tipoNotificacaoWorker: 'D-1',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    }
  });

  fretes1h.forEach(docFrete => {
    const data = docFrete.data();
    if (data.pagamentoStatus === 'aprovado' && data.notificado1h !== true) {
      const current = pendingUpdates.get(docFrete.id)?.payload || {};
      pendingUpdates.set(docFrete.id, {
        ref: docFrete.ref,
        payload: {
        ...current,
        notificadoD1: true,
        notificado1h: true,
        pendenteEnvioWhatsApp: true,
        tipoNotificacaoWorker: 'D-HORA',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    }
  });

  if (pendingUpdates.size > 0) {
    const batch = db.batch();
    pendingUpdates.forEach(({ ref, payload }) => batch.update(ref, payload));
    await batch.commit();
  }
  return null;
});

// ========================================================
// 3. O OPERÁRIO (WORKER ASSÍNCRONO DE WHATSAPP)
// ========================================================
exports.workerNotificacoes = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const newValue = change.after.data();
  const previousValue = change.before.data();

  // Tratativa WhatsApp
  if (newValue.pendenteEnvioWhatsApp === true && previousValue.pendenteEnvioWhatsApp !== true) {
    try {
      const telefone = newValue.telefoneCliente || newValue.clienteZap;
      if (!telefone) throw new Error("Sem telefone na carga.");

      const apiUrl = process.env.WHATSAPP_API_URL;
      if (apiUrl) {
         await axios.post(apiUrl, {
           phone: telefone,
           message: `📦 *FretoGo Network*\n\nAviso Operacional: Sua carga agendada está próxima! Status: ${newValue.tipoNotificacaoWorker}`
         }, {
           headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
           timeout: 5000
         });
      }

      await change.after.ref.update({
        pendenteEnvioWhatsApp: false,
        erroWhatsApp: null
      });

    } catch (error) {
      await change.after.ref.update({
        pendenteEnvioWhatsApp: false,
        erroWhatsApp: 'Falha API Externa'
      });
    }
  }

  // Notifica Cliente no celular via Push (Coleta Feita)
  if (newValue.status === 'coletando' && previousValue.status !== 'coletando') {
    if (newValue.clienteId) {
      await sendPushInternal(
        newValue.clienteId, 
        'cliente', 
        '✅ Carga Coletada', 
        `O motorista ${newValue.motoristaNome || 'parceiro'} confirmou o embarque. Acompanhe a rota pelo painel.`, 
        { freteId: context.params.freteId, tipo: 'coleta' }
      );
    }
  }

  return null;
});

// ========================================================
// 4. RESET DIÁRIO DE RETORNO (CRON MEIA-NOITE)
// ========================================================
exports.resetContadorRetorno = functions.runWith({ timeoutSeconds: 60, memory: '512MB' })
  .pubsub.schedule('0 0 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    
    const collectionsToReset = ['motoristas_cadastros', 'motoristas_online'];
    
    for (const col of collectionsToReset) {
      let emProcessamento = true;
      while (emProcessamento) {
        const snapshot = await db.collection(col)
          .where('retornosUsadosHoje', '>', 0)
          .limit(400)
          .get();
          
        if (snapshot.empty) {
          emProcessamento = false;
          break;
        }
        
        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.update(doc.ref, {
            retornosUsadosHoje: 0,
            modoRetorno: false,
            destinoRetorno: admin.firestore.FieldValue.delete(),
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }
    }
    return null;
  });

// ========================================================
// 5. ATIVAÇÃO ATÔMICA DO MODO RETORNO
// ========================================================
exports.ativarModoRetorno = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sessão inválida.');
  }

  const uid = context.auth.uid;
  const destinoRetorno = sanitizeText(data?.destinoRetorno, 200);
  if (!destinoRetorno) {
    throw new functions.https.HttpsError('invalid-argument', 'Destino obrigatório.');
  }

  let coordinates = { lat: null, lng: null };
  if (data?.lat !== undefined || data?.lng !== undefined) {
    coordinates = validateCoordinates(data?.lat, data?.lng, 'destinoRetorno');
  }

  const motoristaRef = db.collection('motoristas_cadastros').doc(uid);
  const motoristaOnlineRef = db.collection('motoristas_online').doc(uid);

  try {
    await db.runTransaction(async transaction => {
      const onlineSnap = await transaction.get(motoristaOnlineRef);
      if (!onlineSnap.exists || onlineSnap.data()?.online !== true) {
        throw new functions.https.HttpsError('failed-precondition', 'MOTORISTA_OFFLINE');
      }

      const motoristaSnap = await transaction.get(motoristaRef);
      if (!motoristaSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'PERFIL_NAO_ENCONTRADO');
      }

      const usados = Number(motoristaSnap.data()?.retornosUsadosHoje || 0);
      if (!Number.isFinite(usados) || usados >= 2) {
        throw new functions.https.HttpsError('resource-exhausted', 'LIMITE_RETORNO_DIARIO_ATINGIDO');
      }

      const payloadUpdate = {
        modoRetorno: true,
        destinoRetorno,
        retornosUsadosHoje: usados + 1,
        latitudeRetorno: coordinates.lat,
        longitudeRetorno: coordinates.lng,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(motoristaRef, payloadUpdate, { merge: true });
      transaction.set(motoristaOnlineRef, payloadUpdate, { merge: true });
    });

    return { success: true, message: 'Modo Retorno Armado.' };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('[MODO RETORNO] Falha:', error.message);
    throw new functions.https.HttpsError('internal', 'Falha ao ativar o modo retorno.');
  }
});

// ========================================================
// 6. RADAR DO MURAL (Broadcasting - Avisa a frota, mas NÃO trava a carga)
// ========================================================
exports.iniciarDespachoAutomatico = functions.runWith(runtimeOpts).firestore
  .document('fretes/{freteId}')
  .onUpdate(async (change, context) => {
    const antes = change.before.data();
    const depois = change.after.data();
    const freteId = context.params.freteId;

    if (antes.status === 'disponivel' || depois.status !== 'disponivel') return null;
    if (depois.pagamentoStatus !== 'aprovado' || depois.motoristaId) return null;

    const origemLat = Number(depois.origem?.lat ?? depois.origemLat);
    const origemLng = Number(depois.origem?.lng ?? depois.origemLng);
    const categoria = sanitizeText(depois.categoria || depois.veiculo, 40)?.toLowerCase();

    if (!Number.isFinite(origemLat) || !Number.isFinite(origemLng)) return null;
    if (!categoria || !VALID_VEHICLE_CATEGORIES.has(categoria)) return null;

    try {
      const opened = await db.runTransaction(async transaction => {
        const currentSnap = await transaction.get(change.after.ref);
        if (!currentSnap.exists) return false;
        const current = currentSnap.data();
        if (current.status !== 'disponivel' || current.pagamentoStatus !== 'aprovado' || current.motoristaId) {
          return false;
        }

        transaction.update(change.after.ref, {
          ofertaExpiraEm: admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
          dispatchStatus: 'mural_aberto',
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        return true;
      });

      if (!opened) return null;

      const motoristasSnap = await db.collection('motoristas_online')
        .where('online', '==', true)
        .where('disponivel', '==', true)
        .where('categoria', 'array-contains', categoria)
        .get();

      await Promise.all(motoristasSnap.docs.map(async motoristaDoc => {
        const motorista = motoristaDoc.data();
        const latitude = Number(motorista.latitude);
        const longitude = Number(motorista.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const distancia = calcularDistanciaExata(origemLat, origemLng, latitude, longitude);
        if (distancia > 50) return;

        const valorMotorista = Number(depois.valorMotorista || depois.valorTotal || 0);
        await sendPushInternal(
          motoristaDoc.id,
          'motorista',
          '🚚 Nova Carga no Mural!',
          `R$ ${Number.isFinite(valorMotorista) ? valorMotorista.toFixed(2) : '0,00'} - A ${distancia.toFixed(1)} km de você. Abra o app para aceitar!`,
          { freteId, tipo: 'novo_frete' }
        );
      }));
    } catch (error) {
      console.error('[MURAL ERRO]', error);
    }

    return null;
  });

// ========================================================
// 7. WATCHDOG DO MURAL (O verdadeiro Ceifador de 15 Minutos)
// ========================================================
exports.watchdogOfertasExpiradas = functions.runWith(runtimeOpts).pubsub.schedule('every 1 minutes').onRun(async () => {
  const agora = admin.firestore.Timestamp.now();
  const fretesExpirados = await db.collection('fretes')
    .where('status', '==', 'disponivel')
    .where('dispatchStatus', '==', 'mural_aberto')
    .where('ofertaExpiraEm', '<', agora)
    .limit(100)
    .get();

  if (fretesExpirados.empty) return null;

  await Promise.all(fretesExpirados.docs.map(async docFrete => {
    await db.runTransaction(async transaction => {
      const currentSnap = await transaction.get(docFrete.ref);
      if (!currentSnap.exists) return;

      const current = currentSnap.data();
      const expiresAt = current.ofertaExpiraEm?.toMillis?.();
      if (
        current.status !== 'disponivel' ||
        current.dispatchStatus !== 'mural_aberto' ||
        current.motoristaId ||
        !Number.isFinite(expiresAt) ||
        expiresAt >= Date.now()
      ) return;

      transaction.update(docFrete.ref, {
        status: 'sem_motorista',
        dispatchStatus: 'encerrado',
        motivoEncerramento: 'Tempo limite do Mural (15min) excedido',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }));

  return null;
});

// ========================================================
// 7.1. WATCHDOG DE RESERVAS LEGADAS
// ========================================================
exports.watchdogReservasExpiradas = functions.runWith(runtimeOpts).pubsub.schedule('every 1 minutes').onRun(async () => {
  const agoraMs = Date.now();
  const reservasExpiradas = await db.collection('fretes')
    .where('status', '==', 'reservado_aguardando_pagamento')
    .where('reservaExpiraEm', '<', agoraMs)
    .limit(100)
    .get();

  if (reservasExpiradas.empty) return null;

  await Promise.all(reservasExpiradas.docs.map(async docFrete => {
    await db.runTransaction(async transaction => {
      const currentSnap = await transaction.get(docFrete.ref);
      if (!currentSnap.exists) return;

      const current = currentSnap.data();
      const expiraEm = Number(current.reservaExpiraEm);
      if (current.status !== 'reservado_aguardando_pagamento' || !Number.isFinite(expiraEm) || expiraEm >= Date.now()) {
        return;
      }

      if (current.pagamentoStatus === 'aprovado' && current.motoristaId) {
        transaction.update(docFrete.ref, {
          status: 'aceito',
          dispatchStatus: 'encerrado',
          reservaExpiraEm: null,
          ofertaExpiraEm: null,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }

      let motoristaOnlineRef = null;
      let motoristaOnlineSnap = null;
      if (current.motoristaId) {
        motoristaOnlineRef = db.collection('motoristas_online').doc(current.motoristaId);
        motoristaOnlineSnap = await transaction.get(motoristaOnlineRef);
      }

      transaction.update(docFrete.ref, {
        status: 'expirado',
        dispatchStatus: 'encerrado',
        motoristaId: null,
        motoristaNome: null,
        motoristaTelefone: null,
        motoristaZap: null,
        motoristaLat: null,
        motoristaLng: null,
        reservaExpiraEm: null,
        ofertaExpiraEm: null,
        alertaInsucesso: true,
        motivoCancelamento: 'Reserva legada expirada sem confirmação de pagamento.',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });

      if (motoristaOnlineRef && motoristaOnlineSnap?.exists) {
        const online = motoristaOnlineSnap.data();
        const linkedToFreight = [online.freteAtualId, online.activeTripId, online.currentTripId].includes(docFrete.id);
        if (linkedToFreight) {
          transaction.set(motoristaOnlineRef, {
            state: 'ONLINE',
            freteAtualId: null,
            activeTripId: null,
            currentTripId: null,
            disponivel: true,
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }
    });
  }));

  console.log(`[WATCHDOG RESERVAS] ${reservasExpiradas.size} reserva(s) legada(s) processada(s) sem republicação automática.`);
  return null;
});

// ========================================================
// 8. NOTIFICAÇÃO DE ENTREGA CONCLUÍDA
// ========================================================
exports.notificarEntregaConcluida = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const antes = change.before.data();
  const depois = change.after.data();
  
  if (antes.status !== 'em_transporte' && antes.status !== 'finalizando') return null;
  if (depois.status !== 'entregue' && depois.status !== 'finalizado') return null;
  
  if (depois.clienteId) {
    await sendPushInternal(
      depois.clienteId,
      'cliente',
      '📦 Entrega confirmada',
      'A entrega foi confirmada. O processamento financeiro seguirá o fluxo seguro da plataforma.',
      { freteId: context.params.freteId, tipo: 'entrega' }
    );
  }
  return null;
});

// ========================================================
// 9. WATCHDOG DE LIBERAÇÃO DE AGENDAMENTOS
// ========================================================
exports.watchdogLiberacaoAgendados = functions.runWith(runtimeOpts).pubsub.schedule('every 2 minutes').onRun(async () => {
  const agora = admin.firestore.Timestamp.now();
  const fretesAgendados = await db.collection('fretes')
    .where('status', '==', 'agendado')
    .where('dataAgendada', '<=', agora)
    .limit(100)
    .get();

  if (fretesAgendados.empty) return null;

  await Promise.all(fretesAgendados.docs.map(async docFrete => {
    await db.runTransaction(async transaction => {
      const currentSnap = await transaction.get(docFrete.ref);
      if (!currentSnap.exists) return;

      const current = currentSnap.data();
      const scheduledAt = current.dataAgendada?.toMillis?.();
      if (
        current.status !== 'agendado' ||
        current.pagamentoStatus !== 'aprovado' ||
        current.motoristaId ||
        !Number.isFinite(scheduledAt) ||
        scheduledAt > Date.now()
      ) return;

      transaction.update(docFrete.ref, {
        status: 'disponivel',
        dispatchStatus: 'liberado_por_horario',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }));

  console.log(`[WATCHDOG AGENDAMENTOS] ${fretesAgendados.size} agendamento(s) elegível(is) verificado(s).`);
  return null;
});

// ========================================================
// 10. WATCHDOG DE PAGAMENTOS NÃO CONCLUÍDOS
// ========================================================
exports.watchdogLimpezaFretesExpirados = functions.runWith(runtimeOpts).pubsub.schedule('every 15 minutes').onRun(async () => {
  const agoraMs = Date.now();
  const fretesExpirados = await db.collection('fretes')
    .where('status', '==', 'aguardando_pagamento')
    .where('expiraEm', '<', agoraMs)
    .limit(200)
    .get();

  if (fretesExpirados.empty) return null;

  await Promise.all(fretesExpirados.docs.map(async docFrete => {
    await db.runTransaction(async transaction => {
      const currentSnap = await transaction.get(docFrete.ref);
      if (!currentSnap.exists) return;

      const current = currentSnap.data();
      const expiresAt = Number(current.expiraEm);
      if (
        current.status !== 'aguardando_pagamento' ||
        current.pagamentoStatus === 'aprovado' ||
        !Number.isFinite(expiresAt) ||
        expiresAt >= Date.now()
      ) return;

      transaction.update(docFrete.ref, {
        status: 'expirado',
        dispatchStatus: 'expirado_pagamento_nao_concluido',
        motivoEncerramento: 'Pagamento não concluído dentro da janela operacional.',
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }));

  console.log(`[WATCHDOG PAGAMENTO] ${fretesExpirados.size} pagamento(s) pendente(s) verificado(s).`);
  return null;
});

// ========================================================
// 11. VALIDAÇÃO DE PIN E FOTO (ZERO TRUST - SEGURANÇA MESTRE)
// ========================================================
exports.validarPinDaEtapa = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  // 1. Autenticação e Inputs
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { freteId, pin } = data;
  if (!freteId || pin === null || pin === undefined || String(pin).trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Frete ou PIN não informados.');
  }

  const freteRef = db.collection('fretes').doc(freteId);

  // 2. Transação Atômica (Evita concorrência e dupla validação)
  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(freteRef);
    if (!snapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Ordem operacional não encontrada.');
    }

    const frete = snapshot.data();

    // Validação de Identidade (Apenas o motorista dono da carga pode validar)
    if (frete.motoristaId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Você não é o motorista autorizado desta viagem.');
    }

    // Trava de Bruteforce
    if (frete.bloqueioPin) {
      throw new functions.https.HttpsError('permission-denied', 'SISTEMA BLOQUEADO: Limite de tentativas excedido. Contate a Torre.');
    }

    let pinCorreto = '';
    let etapaAtualKey = '';
    let isColeta = false;

    // 3. Roteamento de Etapas (Coleta vs Múltiplas Entregas)
    if (frete.status === 'coletando') {
      isColeta = true;
      pinCorreto = frete.pinColeta;
      etapaAtualKey = 'coleta';
    } else if (frete.status === 'em_transporte') {
      const paradaAtualIndex = frete.paradaAtualIndex || 0;
      const paradas = frete.paradas || [];
      
      if (paradaAtualIndex >= paradas.length && paradas.length > 0) {
         throw new functions.https.HttpsError('failed-precondition', 'Todas as paradas já foram concluídas.');
      }
      
      pinCorreto = frete.pinEntregas ? frete.pinEntregas[paradaAtualIndex] : null;
      etapaAtualKey = `parada_${paradaAtualIndex}`;
    } else {
      throw new functions.https.HttpsError('failed-precondition', 'O status atual da viagem não permite validação de PIN.');
    }

    // 4. Validação de Evidência Fotográfica (Zero Trust)
    if (!frete.fotosPod || !frete.fotosPod[etapaAtualKey]) {
      throw new functions.https.HttpsError('failed-precondition', 'Acesso negado. A foto da evidência ainda não consta no servidor central.');
    }

    // 5. Motor de Combate a Força Bruta (Tentativas Locais)
    if (String(pin).trim() !== String(pinCorreto ?? '').trim()) {
      const errosAtuais = (frete.tentativasPin || 0) + 1;
      
      if (errosAtuais >= 3) {
        transaction.update(freteRef, { tentativasPin: errosAtuais, bloqueioPin: true });
        throw new functions.https.HttpsError('permission-denied', 'SISTEMA BLOQUEADO: Limite de 3 tentativas excedido. Contate a Torre.');
      } else {
        transaction.update(freteRef, { tentativasPin: errosAtuais });
        throw new functions.https.HttpsError('invalid-argument', `PIN incorreto. Restam ${3 - errosAtuais} tentativas.`);
      }
    }

    // 6. SUCESSO - Consumo do PIN e Avanço de Etapa
    const payloadUpdate = {
      tentativasPin: 0,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    };
    
    let mensagemLog = '';

    if (isColeta) {
      payloadUpdate.status = 'em_transporte';
      payloadUpdate.pinColeta = null; // PIN CONSUMIDO E INVALIDADO
      mensagemLog = "✅ [Torre Operacional]: Coleta finalizada (PIN validado no servidor). Motorista a caminho do Destino Final.";
    } else {
      const paradaAtualIndex = frete.paradaAtualIndex || 0;
      const paradas = frete.paradas || [];
      const totalParadas = paradas.length > 0 ? paradas.length : 1;

      // Consome o PIN desta entrega sem apagar os PINs das entregas seguintes
      const pinEntregasAtualizados = [...(frete.pinEntregas || [])];
      pinEntregasAtualizados[paradaAtualIndex] = null;
      payloadUpdate.pinEntregas = pinEntregasAtualizados;

      if (paradaAtualIndex + 1 < totalParadas) {
        payloadUpdate.paradaAtualIndex = paradaAtualIndex + 1;
        payloadUpdate.status = 'em_transporte';
        mensagemLog = `✅ [Torre Operacional]: Entrega da Parada ${paradaAtualIndex + 1} validada (PIN consumido). Iniciando trajeto para o próximo ponto.`;
      } else {
        payloadUpdate.status = 'finalizando';
        mensagemLog = "🏁 [Torre Operacional]: Rota Logística Finalizada (Último PIN validado). Aguardando liquidação.";
      }
    }

    transaction.update(freteRef, payloadUpdate);

    // 7. Registro Autônomo da Torre Operacional no Chat
    const messagesRef = freteRef.collection('chat').doc();
    transaction.set(messagesRef, {
      texto: mensagemLog,
      nome: 'Torre de Controle (Segurança)',
      tipoUsuario: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, novoStatus: payloadUpdate.status };
  });
});

// ========================================================
// 12. LIQUIDAÇÃO DE VIAGEM (Bypass Seguro de Firestore Rules)
// ========================================================
exports.liquidarViagemMotorista = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  // 1. Autenticação Obrigatória
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { freteId, chavePix } = data;
  if (!freteId || !chavePix) {
    throw new functions.https.HttpsError('invalid-argument', 'FreteId ou chave PIX ausentes.');
  }

  const freteRef = db.collection('fretes').doc(freteId);

  // 2. Transação Atômica de Liquidação
  return await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(freteRef);
    if (!snapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Ordem operacional não encontrada.');
    }

    const frete = snapshot.data();

    // Validação da Identidade
    if (frete.motoristaId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Você não é o motorista autorizado desta operação.');
    }

    // Trava de Dupla Execução
    if (frete.status === 'entregue' || frete.status === 'finalizado') {
      throw new functions.https.HttpsError('failed-precondition', 'Esta viagem já foi liquidada ou está finalizada.');
    }

    // Trava de Estágio Correto
    if (frete.status !== 'finalizando') {
      throw new functions.https.HttpsError('failed-precondition', 'O status atual não permite liquidação. Finalize todas as entregas com PIN antes de solicitar o pagamento.');
    }

    // Execução Autorizada: Atualiza status para 'entregue' e persiste a chave PIX
    transaction.update(freteRef, {
      status: 'entregue',
      chavePixMotorista: chavePix,
      liquidadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });

    // Auditoria de Log (Chat FTI)
    const messagesRef = freteRef.collection('chat').doc();
    transaction.set(messagesRef, {
      texto: `💸 [Torre Operacional]: Motorista solicitou liquidação (PIX). Status alterado para ENTREGUE. Escrow aguardando liberação.`,
      nome: 'Torre de Controle (Financeiro)',
      tipoUsuario: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, novoStatus: 'entregue' };
  });
});

// ========================================================
// 13. CRIAR FRETE ZERO TRUST
// ========================================================
exports.criarFreteB2B = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const payload = data?.payload;
  const idempotencyKey = sanitizeText(data?.idempotencyKey, 180);
  if (!payload || !idempotencyKey || !/^[A-Za-z0-9_-]{12,180}$/.test(idempotencyKey)) {
    throw new functions.https.HttpsError('invalid-argument', 'Payload ou chave de idempotência inválidos.');
  }

  const uid = context.auth.uid;
  const cleanPayload = sanitizeFreightPayload(payload, uid);
  const valorBrutoInput = toFiniteNumber(
    payload.valorTotal ?? payload.valorBruto ?? payload.valorFreteBruto,
    'valorTotal'
  );
  const valorPedagio = payload.valorPedagio === undefined || payload.valorPedagio === null || payload.valorPedagio === ''
    ? 0
    : toFiniteNumber(payload.valorPedagio, 'valorPedagio');

  if (valorBrutoInput <= 0 || valorPedagio < 0 || valorPedagio > valorBrutoInput) {
    throw new functions.https.HttpsError('invalid-argument', 'Valores financeiros inválidos.');
  }

  const categoria = cleanPayload.categoria;
  const isHeavy = ['toco', 'truck', 'carreta', 'bitrem'].includes(categoria);
  const taxa = isHeavy ? 0.15 : 0.20;
  const baseComissao = Math.max(0, valorBrutoInput - valorPedagio);
  const valorComissao = Number((baseComissao * taxa).toFixed(2));
  const valorLiquidoMotorista = Number((valorBrutoInput - valorComissao).toFixed(2));
  if (!Number.isFinite(valorLiquidoMotorista) || valorLiquidoMotorista <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valor líquido do motorista inválido.');
  }

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();
  const pinColeta = generatePin();
  const pinEntregas = cleanPayload.paradas.map(() => generatePin());
  const cidadeDestinoFormatada = sanitizeText(
    cleanPayload.cidadeDestino || cleanPayload.destino?.cidade,
    120
  ) || '';

  const idempotencyRef = db.collection('idempotency_keys').doc(idempotencyKey);
  return db.runTransaction(async transaction => {
    const idempotencyDoc = await transaction.get(idempotencyRef);
    if (idempotencyDoc.exists) {
      const idempotencyData = idempotencyDoc.data();
      if (!idempotencyData?.freteId) {
        throw new functions.https.HttpsError('data-loss', 'Registro de idempotência inválido.');
      }

      const existingFreightRef = db.collection('fretes').doc(idempotencyData.freteId);
      const existingFreight = await transaction.get(existingFreightRef);
      if (!existingFreight.exists || existingFreight.data()?.clienteId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Chave de idempotência não pertence ao usuário.');
      }
      return { success: true, freteId: existingFreight.id };
    }

    const dataExpiracao = Date.now() + 15 * 60 * 1000;
    const freteData = {
      ...cleanPayload,
      cidadeDestinoFormatada,
      status: 'aguardando_pagamento',
      pagamentoStatus: 'pendente',
      dispatchStatus: 'retido_pagamento',
      expiraEm: dataExpiracao,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      notificadoD1: false,
      notificado1h: false,
      pinColeta,
      pinEntregas,
      valorTotal: valorBrutoInput,
      valorBruto: valorBrutoInput,
      valorFreteBruto: valorBrutoInput,
      taxaFreto: taxa * 100,
      valorComissao,
      lucroPlataforma: valorComissao,
      valorLiquidoMotorista,
      valorMotorista: valorLiquidoMotorista,
      valorPedagio
    };

    const newFreteRef = db.collection('fretes').doc();
    transaction.set(newFreteRef, freteData);
    transaction.set(idempotencyRef, {
      freteId: newFreteRef.id,
      clienteId: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, freteId: newFreteRef.id };
  });
});

// ========================================================
// 14. CANCELAR FRETE COM VALIDAÇÃO DE ESTADO (PATCH BLOCO 01)
// ========================================================
exports.cancelarFreteB2B = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  const { freteId } = data;
  if (!freteId) throw new functions.https.HttpsError('invalid-argument', 'FreteId ausente.');

  const freteRef = db.collection('fretes').doc(freteId);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(freteRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Frete não encontrado.');
    
    const frete = snap.data();
    if (frete.clienteId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Apenas o contratante pode cancelar.');
    }

    if (frete.pagamentoStatus === 'aprovado') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Frete pago exige o fluxo de cancelamento com reembolso confirmado.'
      );
    }

    const statusProibidos = ['em_transporte', 'coletando', 'finalizando', 'entregue', 'finalizado', 'cancelado'];
    if (statusProibidos.includes(frete.status)) {
      throw new functions.https.HttpsError('failed-precondition', `A viagem está em andamento (status: ${frete.status}) e não pode ser cancelada diretamente.`);
    }

    transaction.update(freteRef, {
      status: 'cancelado',
      dispatchStatus: 'cancelado_pelo_cliente',
      canceladoEm: admin.firestore.FieldValue.serverTimestamp(),
      canceladoPor: context.auth.uid,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });

    if (frete.motoristaId) {
      const motoristaOnlineRef = db.collection('motoristas_online').doc(frete.motoristaId);
      transaction.set(motoristaOnlineRef, {
         freteAtualId: null,
         activeTripId: null,
         currentTripId: null,
         disponivel: true,
         atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return { success: true, freteId };
  });
});

// ========================================================
// 15. AUTO-BID RECALCULATION SERVER-SIDE
// ========================================================
exports.recalcularAutoBid = functions.firestore.document('fretes/{freteId}').onUpdate(async (change) => {
  const antes = change.before.data();
  const depois = change.after.data();

  if (depois.valorTotal === antes.valorTotal || antes.valorTotal === undefined) return null;
  if (antes.pagamentoStatus === 'aprovado' || depois.pagamentoStatus === 'aprovado') {
    console.error('[AUTO-BID] Alteração financeira ignorada após aprovação do pagamento.');
    return null;
  }
  if (!['expirado', 'sem_motorista', 'disponivel'].includes(antes.status) || depois.status !== 'disponivel') {
    console.error('[AUTO-BID] Alteração financeira ignorada fora do estado permitido.');
    return null;
  }

  const valorBrutoInput = Number(depois.valorTotal);
  const valorPedagio = Number(depois.valorPedagio || 0);
  if (!Number.isFinite(valorBrutoInput) || valorBrutoInput <= 0 || !Number.isFinite(valorPedagio) || valorPedagio < 0 || valorPedagio > valorBrutoInput) {
    console.error('[AUTO-BID] Valores inválidos; margens não recalculadas.');
    return null;
  }

  const categoria = sanitizeText(depois.categoria || depois.veiculo, 40)?.toLowerCase();
  if (!categoria || !VALID_VEHICLE_CATEGORIES.has(categoria)) return null;

  const isHeavy = ['toco', 'truck', 'carreta', 'bitrem'].includes(categoria);
  const taxa = isHeavy ? 0.15 : 0.20;
  const baseComissao = Math.max(0, valorBrutoInput - valorPedagio);
  const valorComissao = Number((baseComissao * taxa).toFixed(2));
  const valorLiquidoMotorista = Number((valorBrutoInput - valorComissao).toFixed(2));
  if (!Number.isFinite(valorLiquidoMotorista) || valorLiquidoMotorista <= 0) return null;

  await change.after.ref.update({
    valorBruto: valorBrutoInput,
    valorFreteBruto: valorBrutoInput,
    taxaFreto: taxa * 100,
    valorComissao,
    lucroPlataforma: valorComissao,
    valorLiquidoMotorista,
    valorMotorista: valorLiquidoMotorista,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
  });
  return null;
});
