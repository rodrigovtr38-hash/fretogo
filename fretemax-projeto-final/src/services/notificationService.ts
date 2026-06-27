// src/services/notificationService.ts
// CTO-Log: Correção CRÍTICA. Substituição do placeholder "SUA_CHAVE_VAPID_AQUI" pela variável de ambiente segura. Sem isso, os motoristas com a tela apagada nunca receberiam o alerta de nova corrida.

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase';

// Tratamento seguro para evitar crash se o Firebase Messaging não for suportado no navegador (ex: Safari antigo)
let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Firebase Messaging não suportado neste navegador.');
}

// 🔥 CTO FIX: Puxando a chave de segurança real do ambiente (Vercel/.env)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export class NotificationService {
  
  // Pede permissão e pega o token do dispositivo
  static async solicitarPermissao(userId: string, tipo: 'motorista' | 'cliente'): Promise<string | null> {
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permissão de notificação negada pelo usuário');
        return null;
      }

      if (!VAPID_KEY) {
        console.error('ALERTA CTO: VITE_FIREBASE_VAPID_KEY não configurada no painel da Vercel. Push notifications falharão.');
        return null;
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        // Salva o token no banco para a Cloud Function poder disparar o push depois
        const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes'; // CTO FIX: Apontado para a coleção real de motoristas
        await updateDoc(doc(db, colecao, userId), {
          fcmToken: token,
          notificacoesAtivas: true,
          atualizadoEm: new Date()
        });
        console.log('Token FCM salvo com sucesso:', token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Erro ao solicitar permissão FCM:', error);
      return null;
    }
  }

  // Escuta notificações quando app está aberto na tela
  static escutarNotificacoes(callback: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('Notificação In-App recebida:', payload);
      callback(payload);
      
      // Mostra notificação nativa mesmo com app aberto
      if (payload.notification) {
        new Notification(payload.notification.title || 'FretoGo', {
          body: payload.notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    });
  }

  // Remove token ao fazer logout (Evita mandar push para motorista offline)
  static async removerToken(userId: string, tipo: 'motorista' | 'cliente') {
    try {
      const colecao = tipo === 'motorista' ? 'motoristas_cadastros' : 'clientes';
      await updateDoc(doc(db, colecao, userId), {
        fcmToken: null,
        notificacoesAtivas: false
      });
    } catch (error) {
      console.error('Erro ao remover token FCM:', error);
    }
  }

  // Envia WhatsApp de aprovação/rejeição (Admin)
  static enviarWhatsAppAprovacao(telefone: string, nome: string, status: 'aprovado' | 'rejeitado') {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (!telefoneLimpo) {
      console.error('Telefone inválido para WhatsApp');
      return;
    }

    const mensagemAprovado = `🚚 *FRETOGO - Cadastro Aprovado!*\n\nParabéns ${nome}! Seu cadastro foi aprovado.\n\n✅ Acesse agora: https://app.fretogo.com.br/motorista\n\n📲 Baixe o app e entre no grupo VIP para receber as primeiras cargas da inauguração.\n\nDúvidas? Responda aqui.`;
    
    const mensagemRejeitado = `⚠️ *FRETOGO - Cadastro Pendente*\n\nOlá ${nome}, seu cadastro precisa de ajustes:\n\n📸 Envie novamente:\n• Foto da CNH (frente e verso legível)\n• Selfie segurando CNH\n• Documento do veículo\n\n🔗 Acesse: https://app.fretogo.com.br/motorista\n\nReenvie as fotos e aprovamos em minutos.`;

    const mensagem = status === 'aprovado' ? mensagemAprovado : mensagemRejeitado;
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(url, '_blank');
  }
}
