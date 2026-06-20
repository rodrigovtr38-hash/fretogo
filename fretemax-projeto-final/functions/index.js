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

  // D-1
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
      pendenteEnvioWhatsApp: true, // // AJUSTE CTO: Gatilho unificado para o Worker consuming
      tipoNotificacaoWorker: 'D-1',
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // D-Hora (1 hora antes)
  const fretes1h = await db.collection('fretes')
    .where('agendadoPara', '<=', limite1h)
    .where('notificado1h', '==', false)
    .where('status', 'in', ['disponivel', 'buscando_motorista'])
    .limit(500)
    .get();

  fretes1h.forEach(doc => {
    batch.update(doc.ref, { 
      notificado1h: true, 
      pendenteEnvioWhatsApp: true, // // AJUSTE CTO: Gatilho unificado
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
// 3.1 O OPERÁRIO (WORKER ASSÍNCRONO DE WHATSAPP) - AJUSTE CTO
// ========================================================
// Fica escutando o banco. Se o Cron Job ligar a flag "pendenteEnvioWhatsApp", ele dispara a API externa.
exports.workerNotificacoes = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const newValue = change.after.data();
  const previousValue = change.before.data();

  // Só executa se a flag mudou de false para true
  if (newValue.pendenteEnvioWhatsApp === true && previousValue.pendenteEnvioWhatsApp !== true) {
    try {
      const telefone = newValue.telefoneCliente || newValue.clienteZap;
      if (!telefone) throw new Error("Sem telefone para notificar");

      const apiUrl = process.env.WHATSAPP_API_URL;
      if (apiUrl) {
         // Disparo isolado para API Oficial
         await axios.post(apiUrl, {
            phone: telefone,
            message: `FretoGo Informa: Sua carga agendada está próxima! Status: ${newValue.tipoNotificacaoWorker}`
         }, {
            headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
            timeout: 5000
         });
      }

      // Sucesso: Desliga a flag
      await change.after.ref.update({
        pendenteEnvioWhatsApp: false,
        erroWhatsApp: null
      });

    } catch (error) {
      console.error(`[WORKER_ZAP_ERRO] Frete ${context.params.freteId}:`, error.message);
      // Falhou: Desliga a flag de envio, mas anota o erro para o Admin ver
      await change.after.ref.update({
        pendenteEnvioWhatsApp: false,
        erroWhatsApp: 'Falha na comunicação com API externa'
      });
    }
  }

  // NOTIFICA CLIENTE - COLETA REALIZADA
  if (newValue.status === 'coletando' && previousValue.status !== 'coletando') {
    try {
      const clienteId = newValue.clienteId;
      if (clienteId) {
        await exports.enviarNotificacaoPush({
          userId: clienteId,
          tipo: 'cliente',
          titulo: '✅ Carga Coletada',
          corpo: `Motorista ${newValue.motoristaNome || 'parceiro'} coletou sua carga. Acompanhe em tempo real.`,
          dados: { freteId: context.params.freteId, tipo: 'coleta' }
        }, { auth: { uid: 'system' } });
      }
    } catch (e) { console.error('[PUSH COLETA]', e); }
  }

  return null;
});

// ========================================================
// 4. RESET DIÁRIO DE RETORNO (CRON MEIA-NOITE) - AJUSTE CTO
// ========================================================
exports.resetContadorRetorno = functions.runWith({ timeoutSeconds: 60, memory: '512MB' })
  .pubsub.schedule('0 0 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    
    const collectionsToReset = ['motoristas', 'motoristas_online'];
    
    for (const col of collectionsToReset) {
      let emProcessamento = true;
      
      while (emProcessamento) {
        // // AJUSTE CTO: Filtra com segurança garantindo que vai zerar todos que usaram
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
// 5. ATIVAÇÃO ATÔMICA DO MODO RETORNO - AJUSTE CTO
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

  const motoristaRef = db.collection('motoristas').doc(uid);
  const motoristaOnlineRef = db.collection('motoristas_online').doc(uid);

  try {
    await db.runTransaction(async (transaction) => {
      // // AJUSTE CTO (Furo 2 resolvido): Checa se ele está na tabela de motoristas online
      const onlineSnap = await transaction.get(motoristaOnlineRef);
      if (!onlineSnap.exists) {
        throw new Error('MOTORISTA_OFFLINE'); // Proíbe ativar retorno se estiver desligado/em casa
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
// 6. GATILHO AUTOMÁTICO DE DESPACHO - AJUSTE CTO
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

      // Busca motoristas online da categoria
      const motoristasSnap = await db.collection('motoristas')
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

      // Calcula distância e pega o mais próximo
      let motoristaMaisProximo = null;
      let menorDistancia = Infinity;

      motoristasSnap.forEach(doc => {
        const m = doc.data();
        if (!m.latitude || !m.longitude) return;
        const dist = Math.sqrt(
          Math.pow(m.latitude - origemLat, 2) + 
          Math.pow(m.longitude - origemLng, 2)
        ) * 111; // conversão aproximada para km
        
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

      // ENVIA OFERTA PARA O MOTORISTA MAIS PRÓXIMO
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

      // ENVIA NOTIFICAÇÃO PUSH COM VALOR REAL
      try {
        const valorMotorista = depois.valorMotorista || depois.valorTotal || 0;
        await admin.firestore().collection('motoristas').doc(motoristaMaisProximo.id).get().then(async (motoristaDoc) => {
          if (motoristaDoc.exists && motoristaDoc.data()?.fcmToken) {
            await exports.enviarNotificacaoPush({
              userId: motoristaMaisProximo.id,
              tipo: 'motorista',
              titulo: '🚚 Novo Frete Disponível!',
              corpo: `R$ ${valorMotorista.toFixed(2)} - ${menorDistancia.toFixed(1)}km até a coleta`,
              dados: { freteId: freteId, tipo: 'novo_frete' }
            }, { auth: { uid: 'system' } });
          }
        });
      } catch (pushError) {
        console.error('[PUSH DISPATCH ERRO]', pushError);
      }

    } catch (error) {
      console.error(`[DISPATCH ERRO]`, error);
    }
    return null;
  });

// ========================================================
// 7. WATCHDOG DE OFERTAS EXPIRADAS - AJUSTE CTO
// ========================================================
// Verifica a cada 1 minuto se alguma oferta expirou e passa para o próximo motorista
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

      const motoristasSnap = await db.collection('motoristas')
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
// 8. ENVIO DE NOTIFICAÇÃO PUSH - AJUSTE CTO
// ========================================================
// Envia notificação push para motorista ou cliente usando FCM
exports.enviarNotificacaoPush = functions.runWith(runtimeOpts).https.onCall(async (data, context) => {
  const { userId, tipo, titulo, corpo, dados } = data;
  
  if (!userId || !tipo) {
    throw new functions.https.HttpsError('invalid-argument', 'userId e tipo são obrigatórios');
  }

  try {
    const colecao = tipo === 'motorista' ? 'motoristas' : 'clientes';
    const userDoc = await db.collection(colecao).doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.log(`[PUSH] Usuário ${userId} sem token FCM`);
      return { success: false, message: 'Token não encontrado' };
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
        notification: {
          sound: 'default',
          channelId: 'fretes'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log(`[PUSH] Enviado para ${userId}:`, response);
    return { success: true, messageId: response };

  } catch (error) {
    console.error('[PUSH ERRO]', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================================
// 9. NOTIFICAÇÃO DE ENTREGA CONCLUÍDA
// ========================================================
exports.notificarEntregaConcluida = functions.firestore.document('fretes/{freteId}').onUpdate(async (change, context) => {
  const antes = change.before.data();
  const depois = change.after.data();
  
  if (antes.status !== 'em_transporte' && antes.status !== 'finalizando') return null;
  if (depois.status !== 'entregue' && depois.status !== 'finalizado') return null;
  
  try {
    const clienteId = depois.clienteId;
    if (clienteId) {
      await exports.enviarNotificacaoPush({
        userId: clienteId,
        tipo: 'cliente',
        titulo: '📦 Entrega Realizada',
        corpo: `Sua carga foi entregue com sucesso! PIN: ${depois.pinEntregas?.[0] || 'confirmado'}`,
        dados: { freteId: context.params.freteId, tipo: 'entrega' }
      }, { auth: { uid: 'system' } });
    }
  } catch (e) { console.error('[PUSH ENTREGA]', e); }
  return null;
});
