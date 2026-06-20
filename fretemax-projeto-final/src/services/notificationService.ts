import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase';

const messaging = getMessaging(app);
const VAPID_KEY = 'SUA_CHAVE_VAPID_AQUI'; // Deixar assim, vamos configurar depois

export class NotificationService {
  
  // Pede permissão e pega o token do dispositivo
  static async solicitarPermissao(userId: string, tipo: 'motorista' | 'cliente'): Promise<string | null> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permissão de notificação negada');
        return null;
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        // Salva o token no Firestore
        const colecao = tipo === 'motorista' ? 'motoristas' : 'clientes';
        await updateDoc(doc(db, colecao, userId), {
          fcmToken: token,
          notificacoesAtivas: true,
          atualizadoEm: new Date()
        });
        console.log('Token FCM salvo:', token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return null;
    }
  }

  // Escuta notificações quando app está aberto
  static escutarNotificacoes(callback: (payload: any) => void) {
    onMessage(messaging, (payload) => {
      console.log('Notificação recebida:', payload);
      callback(payload);
      
      // Mostra notificação mesmo com app aberto
      if (payload.notification) {
        new Notification(payload.notification.title || 'FretoGo', {
          body: payload.notification.body,
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    });
  }

  // Remove token ao fazer logout
  static async removerToken(userId: string, tipo: 'motorista' | 'cliente') {
    try {
      const colecao = tipo === 'motorista' ? 'motoristas' : 'clientes';
      await updateDoc(doc(db, colecao, userId), {
        fcmToken: null,
        notificacoesAtivas: false
      });
    } catch (error) {
      console.error('Erro ao remover token:', error);
    }
  }
}
