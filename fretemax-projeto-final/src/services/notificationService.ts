// =========================================================
// NOME DO ARQUIVO: src/services/notificationService.ts
// CTO-Log: Auditoria de Notificações In-App e Push (LOTE 5)
// Status: Firebase Messaging isolado (Crash-safe) e VAPID estruturado.
// =========================================================

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase';

let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('[CTO-Log] Firebase Messaging não suportado neste navegador/dispositivo.');
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export class NotificationService {
  
  // 🔊 CENTRAL DE ÁUDIO OPERACIONAL
  static tocarAlertaSonoro(tipo: 'nova_carga' | 'sucesso' | 'alerta' = 'nova_carga') {
    try {
      let audioUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; 
      
      if (tipo === 'sucesso') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3';
      if (tipo === 'alerta') audioUrl = 'https://assets.mixkit.co/active_storage/sfx/940/940-preview.mp3';

      const beep = new Audio(audioUrl);
      beep.play().catch(() => console.warn('[CTO-Log] Bloqueio de autoplay do navegador ativo.'));
    } catch (error) {
      console.error('[CTO-Log] Falha ao acionar alerta sonoro:', error);
    }
  }

  // 🔔 Pede permissão e pega o token do dispositivo
  static async solicitarPermissao(userId: string, tipo: 'motorista' | 'cliente'): Promise<string | null> {
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[CTO-Log] Permissão de notificação negada pelo usuário');
        return null;
      }

      if (!VAPID_KEY) {
        console.error('[ALERTA CRÍTICO] VITE_FIREBASE_VAPID_KEY não configurada. Push background falhará.');
        return null;
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes';
        await updateDoc(doc(db, colecao, userId), {
          fcmToken: token,
          notificacoesAtivas: true,
          atualizadoEm: new Date()
        });
        console.log('[CTO-Log] Token FCM blindado e salvo.');
        return token;
      }
      return null;
    } catch (error) {
      console.error('[CTO-Log] Erro ao solicitar permissão FCM:', error);
      return null;
    }
  }

  // 👂 Escuta notificações In-App
  static escutarNotificacoes(callback: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('[CTO-Log] Notificação In-App interceptada:', payload);
      callback(payload);
      this.tocarAlertaSonoro('alerta');
      
      if (payload.notification) {
        new Notification(payload.notification.title || 'Central FretoGo', {
          body: payload.notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    });
  }

  // 🗑️ Remove token no logout
  static async removerToken(userId: string, tipo: 'motorista' | 'cliente') {
    try {
      const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes';
      await updateDoc(doc(db, colecao, userId), {
        fcmToken: null,
        notificacoesAtivas: false
      });
    } catch (error) {
      console.error('[CTO-Log] Erro ao remover token FCM:', error);
    }
  }

  // 📱 API WHATSAPP 
  static enviarWhatsAppAprovacao(telefone: string, nome: string, status: 'aprovado' | 'rejeitado') {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (!telefoneLimpo) {
      console.error('[CTO-Log] Telefone inválido para WhatsApp');
      return;
    }

    const mensagemAprovado = `🚚 *FRETOGO - Cadastro Aprovado!*\n\nParabéns ${nome}! Seu cadastro foi aprovado.\n\n✅ Acesse agora: https://app.fretogo.com.br/motorista\n\n📲 Baixe o app e ligue seu Radar para receber as cargas da sua região.\n\nDúvidas operacionais? Responda aqui.`;
    const mensagemRejeitado = `⚠️ *FRETOGO - Cadastro Pendente*\n\nOlá ${nome}, seu cadastro precisa de ajustes na Torre de Controle:\n\n📸 Envie novamente:\n• Foto da CNH (frente e verso legível)\n• Selfie segurando CNH\n• Documento do veículo\n\n🔗 Acesse: https://app.fretogo.com.br/motorista\n\nReenvie as fotos e nossa equipe fará a liberação em minutos.`;

    const mensagem = status === 'aprovado' ? mensagemAprovado : mensagemRejeitado;
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(url, '_blank');
  }
}
