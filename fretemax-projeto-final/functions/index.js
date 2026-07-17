// =========================================================
// NOME DO ARQUIVO: functions/index.js
// CTO-Log: Auditoria Backend - Motor de Despacho (Ponte)
// Melhorias Implementadas:
// 1. Circuit Breaker no Watchdog: Limite de 5 tentativas de despacho para evitar fila de espera infinita para o cliente.
// 2. Haversine Formula: Cálculo de distância nativo preciso (não gasta cota da API do Google Maps).
// 3. Centralização das Coleções Oficiais (motoristas_cadastros / motoristas_online).
// =========================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

const db = admin.firestore();

// 🛡 TRAVAS DE NUVEM (Evita contas surpresas no Google Cloud)
const runtimeOpts = {
  timeoutSeconds: 30, 
  memory: '256MB',    
  maxInstances: 50    
};

// ========================================================
// FUNÇÃO UTILITÁRIA: FÓRMULA DE HAVERSINE (Distância Precisa)
// ========================================================
function calcularDistanciaExata(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distância em km
}

// ========================================================
// FUNÇÃO INTERNA: MOTOR DE PUSH (Isolado Anti-Crash)
// ========================================================
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
  const { address } = data;
  if (!address || typeof address !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Endereço inválido.');
  }
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

  const res = await axios.get(url, { timeout: 5000 });
  if (res.data.status !== 'OK' || !res.data.results?.[0]) {
    throw new functions.https.HttpsError('not-found', 'Endereço não encontrado pelo Google.');
  }
  const { lat, lng } = res.data.results[0].geometry.location;
  return { lat, lng };
});

// ========================================================
// 2. O DESPERTADOR (CRON JOB DE FRETE AGENDADO)
// ========================================================
exports.despertadorAgendamentos = functions.runWith(runtimeOpts).pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const agora = new Date();
  const limiteD1 = new Date(agora.getTime() + 24 * 60 * 60 * 1000); 
  const limite1h = new Date(agora.getTime() + 1 * 60 * 60 * 1000); 

  const fretesD1 = await db.collection('fretes')
    .where('agendadoPara', '<=', limiteD1)
    .where('notificadoD1', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(200) 
    .get();

  const batch = db.batch();

  fretesD1.forEach(doc => {
    batch.update(doc.ref, { 
      notificadoD1: true, 
      pendenteEnvioWhatsApp: true,
      tipoNotificacaoWorker: 'D-1',
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  const fretes1h = await db.collection('fretes')
    .where('agendadoPara', '<=', limite1h)
    .where('notificado1h', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(200)
    .get();

  fretes1h.forEach(doc => {
    batch.update(doc.ref, { 
      notificado1h: true, 
      pendenteEnvioWhatsApp: true,
      tipoNotificacaoWorker: 'D-HORA',
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  if (fretesD1.size > 0 || fretes1h.size > 0) {
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
  const uid = context.auth?.uid || data.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sessão inválida.');

  const { destinoRetorno, lat, lng } = data;
  if (!destinoRetorno) throw new functions.https.HttpsError('invalid-argument', 'Destino obrigatório.');

  const motoristaRef = db.collection('motoristas_cadastros').doc(uid);
  const motoristaOnlineRef = db.collection('motoristas_online').doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      const onlineSnap = await transaction.get(motoristaOnlineRef);
      if (!onlineSnap.exists) throw new Error('MOTORISTA_OFFLINE'); 

      const docSnap = await transaction.get(motoristaRef);
      const usados = docSnap.exists ? (docSnap.data().retornosUsadosHoje || 0) : 0;
      
      if (usados >= 2) throw new Error('LIMITE_RETORNO_DIARIO_ATINGIDO');

      const payloadUpdate = {
        modoRetorno: true,
        destinoRetorno: destinoRetorno.trim(),
        retornosUsadosHoje: usados + 1,
        latitudeRetorno: lat || null,
        longitudeRetorno: lng || null,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(motoristaRef, payloadUpdate, { merge: true });
      transaction.set(motoristaOnlineRef, payloadUpdate, { merge: true });
    });

    return { success: true, message: 'Modo Retorno Armado.' };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================================
// 6. GATILHO DE DESPACHO (O Início da Ponte)
// ========================================================
exports.iniciarDespachoAutomatico = functions.runWith(runtimeOpts).firestore
  .document('fretes/{freteId}')
  .onUpdate(async (change, context) => {
    const antes = change.before.data();
    const depois = change.after.data();
    const freteId = context.params.freteId;

    if (antes.status === 'disponivel' || depois.status !== 'disponivel') return null;
    if (depois.dispatchStatus === 'em_andamento') return null;

    try {
      const origemLat = depois.origem?.lat || depois.origemLat;
      const origemLng = depois.origem?.lng || depois.origemLng;
      const categoria = depois.categoria;

      if (!origemLat || !origemLng) return null;

      const motoristasSnap = await db.collection('motoristas_online')
        .where('online', '==', true)
        .where('disponivel', '==', true)
        .where('categoria', 'array-contains', categoria)
        .get();

      if (motoristasSnap.empty) {
        await change.after.ref.update({
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      let motoristaMaisProximo = null;
      let menorDistancia = Infinity;

      // Cálculo Exato de Haversine
      motoristasSnap.forEach(doc => {
        const m = doc.data();
        if (!m.latitude || !m.longitude) return;
        
        const dist = calcularDistanciaExata(origemLat, origemLng, m.latitude, m.longitude);
        
        if (dist < menorDistancia && dist <= 50) { // 50km de raio
          menorDistancia = dist;
          motoristaMaisProximo = { id: doc.id, ...m, distancia: dist };
        }
      });

      if (!motoristaMaisProximo) {
        await change.after.ref.update({
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        return null;
      }

      await change.after.ref.update({
        status: 'aguardando_aceite',
        dispatchStatus: 'em_andamento',
        motoristaAtualDestaque: motoristaMaisProximo.id,
        motoristaAtualNome: motoristaMaisProximo.nome,
        distanciaColetaKm: Math.round(menorDistancia * 10) / 10,
        ofertaExpiraEm: admin.firestore.Timestamp.fromMillis(Date.now() + 30000), // 30 Segundos
        tentativasDespacho: 1, // Inicia contador
        filaTotal: motoristasSnap.size,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });

      // ENVIA PUSH SEGURO
      const valorMotorista = depois.valorMotorista || depois.valorTotal || 0;
      await sendPushInternal(
        motoristaMaisProximo.id,
        'motorista',
        '🚚 Novo Frete Disponível!',
        `R$ ${valorMotorista.toFixed(2)} - Apenas ${menorDistancia.toFixed(1)}km até a coleta`,
        { freteId: freteId, tipo: 'novo_frete' }
      );

    } catch (error) {
      console.error(`[DISPATCH ERRO]`, error);
    }
    return null;
  });

// ========================================================
// 7. WATCHDOG DE OFERTAS EXPIRADAS (O Disjuntor)
// ========================================================
exports.watchdogOfertasExpiradas = functions.runWith(runtimeOpts).pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const agora = admin.firestore.Timestamp.now();
  
  const fretesExpirados = await db.collection('fretes')
    .where('status', '==', 'aguardando_aceite')
    .where('ofertaExpiraEm', '<', agora)
    .limit(100)
    .get();

  if (fretesExpirados.empty) return null;

  const batch = db.batch();

  for (const docFrete of fretesExpirados.docs) {
    const frete = docFrete.data();
    
    // 🛡 CIRCUIT BREAKER DO CTO: Limite de tentativas para não travar o cliente
    const tentativasAtuais = frete.tentativasDespacho || 0;
    if (tentativasAtuais >= 5) {
      batch.update(docFrete.ref, {
         status: 'sem_motorista',
         dispatchStatus: 'encerrado',
         motivoEncerramento: 'Limite de tentativas de despacho excedido',
         atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });
      continue; // Pula para o próximo frete
    }

    try {
      const origemLat = frete.origem?.lat || frete.origemLat;
      const origemLng = frete.origem?.lng || frete.origemLng;
      const categoria = frete.categoria;
      const motoristaAnterior = frete.motoristaAtualDestaque;

      if (!origemLat || !origemLng) continue;

      const motoristasSnap = await db.collection('motoristas_online')
        .where('online', '==', true)
        .where('disponivel', '==', true)
        .where('categoria', 'array-contains', categoria)
        .get();

      let proximoMotorista = null;
      let menorDistancia = Infinity;

      motoristasSnap.forEach(docMotorista => {
        if (docMotorista.id === motoristaAnterior) return; // Ignora o que acabou de rejeitar/expirar
        
        const m = docMotorista.data();
        if (!m.latitude || !m.longitude) return;
        
        const dist = calcularDistanciaExata(origemLat, origemLng, m.latitude, m.longitude);
        
        if (dist < menorDistancia && dist <= 50) {
          menorDistancia = dist;
          proximoMotorista = { id: docMotorista.id, ...m, distancia: dist };
        }
      });

      if (proximoMotorista) {
        batch.update(docFrete.ref, {
          motoristaAtualDestaque: proximoMotorista.id,
          motoristaAtualNome: proximoMotorista.nome,
          distanciaColetaKm: Math.round(menorDistancia * 10) / 10,
          ofertaExpiraEm: admin.firestore.Timestamp.fromMillis(Date.now() + 30000), // + 30 seg
          tentativasDespacho: admin.firestore.FieldValue.increment(1),
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const valorMotorista = frete.valorMotorista || frete.valorTotal || 0;
        await sendPushInternal(
          proximoMotorista.id,
          'motorista',
          '🚚 Oportunidade Repassada!',
          `Carga disponível na região! R$ ${valorMotorista.toFixed(2)}`,
          { freteId: docFrete.id, tipo: 'novo_frete' }
        );

      } else {
        batch.update(docFrete.ref, {
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`[WATCHDOG ERRO] Frete:`, error);
    }
  }

  if (!fretesExpirados.empty) {
    await batch.commit();
  }
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
      '📦 Entrega Blindada Realizada',
      `O valor retido em Escrow foi liberado ao motorista. PIN utilizado: ${depois.pinEntregas?.[0] || 'confirmado'}`,
      { freteId: context.params.freteId, tipo: 'entrega' }
    );
  }
  return null;
});
