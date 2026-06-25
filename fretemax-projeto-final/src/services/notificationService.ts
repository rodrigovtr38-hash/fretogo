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

  // Envia WhatsApp de aprovação/rejeição
  static enviarWhatsAppAprovacao(telefone: string, nome: string, status: 'aprovado' | 'rejeitado') {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (!telefoneLimpo) {
      console.error('Telefone inválido');
      return;
    }

    const mensagemAprovado = `🚚 *FRETOGO - Cadastro Aprovado!*\n\nParabéns ${nome}! Seu cadastro foi aprovado.\n\n✅ Acesse agora: https://app.fretogo.com.br/motorista\n\n📲 Baixe o app e entre no grupo VIP para receber as primeiras cargas da inauguração.\n\nDúvidas? Responda aqui.`;
    
    const mensagemRejeitado = `⚠️ *FRETOGO - Cadastro Pendente*\n\nOlá ${nome}, seu cadastro precisa de ajustes:\n\n📸 Envie novamente:\n• Foto da CNH (frente e verso legível)\n• Selfie segurando CNH\n• Documento do veículo\n\n🔗 Acesse: https://app.fretogo.com.br/motorista\n\nReenvie as fotos e aprovamos em minutos.`;

    const mensagem = status === 'aprovado' ? mensagemAprovado : mensagemRejeitado;
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(url, '_blank');
    console.log(`WhatsApp ${status} enviado para ${nome}`);
  }
}
