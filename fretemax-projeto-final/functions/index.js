// functions/index.js
// CTO-Log: 
// 1. Correção das Coleções (motoristas -> motoristas_cadastros / motoristas_online).
// 2. Isolamento da lógica de Push (sendPushInternal) para evitar Crash de chamadas entre funções do Firebase.
// 3. Alinhamento das Strings de Status da State Machine.

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

const db = admin.firestore();

// 🛡 TRAVAS DE NUVEM
const runtimeOpts = {
  timeoutSeconds: 15, 
  memory: '256MB',    
  maxInstances: 50    
};

// ========================================================
// FUNÇÃO INTERNA: MOTOR DE PUSH (Evita Crash no Backend)
// ========================================================
async function sendPushInternal(userId, tipo, titulo, corpo, dados) {
  try {
    // CTO FIX: A tabela correta de dados do usuário é motoristas_cadastros
    const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes';
    const userDoc = await db.collection(colecao).doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`[PUSH INTERNO] Usuário ${userId} não encontrado em ${colecao}`);
      return false;
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.log(`[PUSH INTERNO] Usuário ${userId} sem token FCM`);
      return false;
    }

    const message = {
      token: fcmToken,
      notification: {
        title: titulo || 'FretoGo',
        body: corpo || 'Você tem uma nova notificação'
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
    console.log(`[PUSH INTERNO] Enviado com sucesso para ${userId}:`, response);
    return true;
  } catch (error) {
    console.error('[PUSH INTERNO ERRO]', error);
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
    throw new functions.https.HttpsError('not-found', 'Endereço não encontrado.');
  }
  const { lat, lng } = res.data.results[0].geometry.location;
  return { lat, lng };
});

// ========================================================
// 2. DISTÂNCIA SEGURA 
// ========================================================
exports.getDistance = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { origin, destination } = data;
  const key = functions.config().google?.maps_key || process.env.GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${key}`;

  try {
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data.rows[0].elements[0].status === "OK") {
      return res.data.rows[0].elements[0].distance.value / 1000;
    }
    throw new Error("Localização não encontrada");
  } catch (e) { 
    throw new functions.https.HttpsError('internal', e.message); 
  }
});

// ========================================================
// 3. O DESPERTADOR (CRON JOB)
// ========================================================
exports.despertadorAgendamentos = functions.runWith(runtimeOpts).pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const agora = new Date();
  const limiteD1 = new Date(agora.getTime() + 24 * 60 * 60 * 1000); 
  const limite1h = new Date(agora.getTime() + 1 * 60 * 60 * 1000); 

  const fretesD1 = await db.collection('fretes')
    .where('agendadoPara', '<=', limiteD1)
    .where('notificadoD1', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(500) 
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
    .limit(500)
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
// 3.1 O OPERÁRIO (WORKER ASSÍNCRONO DE WHATSAPP)
// ========================================================
exports.workerNotificacoes = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const newValue = change.after.data();
  const previousValue = change.before.data();

  // WhatsApp
  if (newValue.pendenteEnvioWhatsApp === true && previousValue.pendenteEnvioWhatsApp !== true) {
    try {
      const telefone = newValue.telefoneCliente || newValue.clienteZap;
      if (!telefone) throw new Error("Sem telefone para notificar");

      const apiUrl = process.env.WHATSAPP_API_URL;
      if (apiUrl) {
         await axios.post(apiUrl, {
            phone: telefone,
            message: `FretoGo Informa: Sua carga agendada está próxima! Status: ${newValue.tipoNotificacaoWorker}`
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
      console.error(`[WORKER_ZAP_ERRO] Frete ${context.params.freteId}:`, error.message);
      await change.after.ref.update({
        pendenteEnvioWhatsApp: false,
        erroWhatsApp: 'Falha na comunicação com API externa'
      });
    }
  }

  // NOTIFICA CLIENTE - COLETA REALIZADA (Chamando Função Interna)
  if (newValue.status === 'coletando' && previousValue.status !== 'coletando') {
    const clienteId = newValue.clienteId;
    if (clienteId) {
      await sendPushInternal(
        clienteId, 
        'cliente', 
        '✅ Carga Coletada', 
        `Motorista ${newValue.motoristaNome || 'parceiro'} coletou sua carga. Acompanhe em tempo real.`, 
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
    
    // CTO FIX: Nomes exatos das coleções
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
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Acesso negado. Faça login novamente.');
  }

  const { destinoRetorno, lat, lng } = data;
  if (!destinoRetorno) {
    throw new functions.https.HttpsError('invalid-argument', 'O destino de retorno precisa ser informado.');
  }

  // CTO FIX: A tabela oficial de cadastro é motoristas_cadastros
  const motoristaRef = db.collection('motoristas_cadastros').doc(uid);
  const motoristaOnlineRef = db.collection('motoristas_online').doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      const onlineSnap = await transaction.get(motoristaOnlineRef);
      if (!onlineSnap.exists) {
        throw new Error('MOTORISTA_OFFLINE'); 
      }

      const docSnap = await transaction.get(motoristaRef);
      let usados = 0;
      
      if (docSnap.exists) {
        usados = docSnap.data().retornosUsadosHoje || 0;
      }

      if (usados >= 2) {
        throw new Error('LIMITE_RETORNO_DIARIO_ATINGIDO');
      }

      const novosUsados = usados + 1;
      const payloadUpdate = {
        modoRetorno: true,
        destinoRetorno: destinoRetorno.trim(),
        retornosUsadosHoje: novosUsados,
        latitudeRetorno: lat || null,
        longitudeRetorno: lng || null,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      };

      transaction.set(motoristaRef, payloadUpdate, { merge: true });
      transaction.set(motoristaOnlineRef, payloadUpdate, { merge: true });
    });

    return { success: true, message: 'Modo retorno ativado com sucesso.' };
  } catch (error) {
    console.error('[ERRO_MODO_RETORNO]', error.message);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================================
// 6. GATILHO AUTOMÁTICO DE DESPACHO
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
      console.log(`[DISPATCH] Iniciando para frete ${freteId}`);

      const origemLat = depois.origem?.lat || depois.origemLat;
      const origemLng = depois.origem?.lng || depois.origemLng;
      const categoria = depois.categoria;

      if (!origemLat || !origemLng) return null;

      // CTO FIX: Radar de motoristas consulta motoristas_online
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

      motoristasSnap.forEach(doc => {
        const m = doc.data();
        if (!m.latitude || !m.longitude) return;
        const dist = Math.sqrt(
          Math.pow(m.latitude - origemLat, 2) + 
          Math.pow(m.longitude - origemLng, 2)
        ) * 111; 
        
        if (dist < menorDistancia && dist <= 50) {
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
        ofertaExpiraEm: admin.firestore.Timestamp.fromMillis(Date.now() + 30000),
        filaTotal: motoristasSnap.size,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`[DISPATCH] Oferta enviada para ${motoristaMaisProximo.nome} (${menorDistancia.toFixed(1)}km)`);

      // ENVIA PUSH SEGURO
      const valorMotorista = depois.valorMotorista || depois.valorTotal || 0;
      await sendPushInternal(
        motoristaMaisProximo.id,
        'motorista',
        '🚚 Novo Frete Disponível!',
        `R$ ${valorMotorista.toFixed(2)} - ${menorDistancia.toFixed(1)}km até a coleta`,
        { freteId: freteId, tipo: 'novo_frete' }
      );

    } catch (error) {
      console.error(`[DISPATCH ERRO]`, error);
    }
    return null;
  });

// ========================================================
// 7. WATCHDOG DE OFERTAS EXPIRADAS
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
    const freteId = docFrete.id;

    try {
      const origemLat = frete.origem?.lat || frete.origemLat;
      const origemLng = frete.origem?.lng || frete.origemLng;
      const categoria = frete.categoria;
      const motoristaAnterior = frete.motoristaAtualDestaque;

      if (!origemLat || !origemLng) continue;

      // CTO FIX: Radar consulta motoristas_online
      const motoristasSnap = await db.collection('motoristas_online')
        .where('online', '==', true)
        .where('disponivel', '==', true)
        .where('categoria', 'array-contains', categoria)
        .get();

      let proximoMotorista = null;
      let menorDistancia = Infinity;

      motoristasSnap.forEach(docMotorista => {
        if (docMotorista.id === motoristaAnterior) return;
        
        const m = docMotorista.data();
        if (!m.latitude || !m.longitude) return;
        
        const dist = Math.sqrt(
          Math.pow(m.latitude - origemLat, 2) + 
          Math.pow(m.longitude - origemLng, 2)
        ) * 111;
        
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
          ofertaExpiraEm: admin.firestore.Timestamp.fromMillis(Date.now() + 30000),
          tentativasDespacho: admin.firestore.FieldValue.increment(1),
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Dispara push pro novo motorista
        const valorMotorista = frete.valorMotorista || frete.valorTotal || 0;
        await sendPushInternal(
          proximoMotorista.id,
          'motorista',
          '🚚 Novo Frete Disponível!',
          `R$ ${valorMotorista.toFixed(2)} - ${menorDistancia.toFixed(1)}km até a coleta`,
          { freteId: freteId, tipo: 'novo_frete' }
        );

      } else {
        batch.update(docFrete.ref, {
          status: 'sem_motorista',
          dispatchStatus: 'encerrado',
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`[WATCHDOG ERRO] Frete ${freteId}:`, error);
    }
  }

  if (!fretesExpirados.empty) {
    await batch.commit();
  }
  return null;
});

// ========================================================
// 8. ENVIO DE NOTIFICAÇÃO PUSH (ENDPOINT FRONTEND)
// ========================================================
exports.enviarNotificacaoPush = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { userId, tipo, titulo, corpo, dados } = data;
  
  if (!userId || !tipo) {
    throw new functions.https.HttpsError('invalid-argument', 'userId e tipo são obrigatórios');
  }

  // Usa o nosso motor interno seguro
  const success = await sendPushInternal(userId, tipo, titulo, corpo, dados);
  if (!success) {
    return { success: false, message: 'Falha ao enviar notificação.' };
  }
  return { success: true, message: 'Notificação enviada com sucesso.' };
});

// ========================================================
// 9. NOTIFICAÇÃO DE ENTREGA CONCLUÍDA
// ========================================================
exports.notificarEntregaConcluida = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const antes = change.before.data();
  const depois = change.after.data();
  
  if (antes.status !== 'em_transporte' && antes.status !== 'finalizando') return null;
  if (depois.status !== 'entregue' && depois.status !== 'finalizado') return null;
  
  const clienteId = depois.clienteId;
  if (clienteId) {
    await sendPushInternal(
      clienteId,
      'cliente',
      '📦 Entrega Realizada',
      `Sua carga foi entregue com sucesso! PIN: ${depois.pinEntregas?.[0] || 'confirmado'}`,
      { freteId: context.params.freteId, tipo: 'entrega' }
    );
  }
  return null;
});
