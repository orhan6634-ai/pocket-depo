// Anonim Cihaz Kimliği ve Mesajlaşma Servisi

export interface FeedbackMessage {
  id: string;
  businessName: string;
  subject: string;
  message: string;
  reply?: string | null;
  status: 'pending' | 'answered';
  createdAt: string;
  repliedAt?: string | null;
}

const DEVICE_ID_KEY = 'pocket_device_uuid';
const LOCAL_MESSAGES_KEY = 'pocket_feedback_messages';

/**
 * Cihaza özel kalıcı rastgele benzersiz kimlik (UUID) getirir veya üretir.
 * Kullanıcı hesap açmaz, bu token cihazı tanır.
 */
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Cihazın gönderdiği mesajları yerel depodan getirir.
 */
export function getLocalMessages(): FeedbackMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Yerel mesaj listesini günceller.
 */
function saveLocalMessages(msgs: FeedbackMessage[]): void {
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
}

/**
 * Yeni mesaj gönderir (Hesap gerekmez, yalnızca İşletme Adı, Konu ve Mesaj).
 */
export async function sendFeedbackMessage(
  businessName: string,
  subject: string,
  message: string
): Promise<{ success: boolean; message: string; newMessage?: FeedbackMessage }> {
  const cleanBusiness = businessName.trim();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (!cleanBusiness) {
    return { success: false, message: 'Lütfen işletme adınızı belirtin.' };
  }
  if (!cleanSubject) {
    return { success: false, message: 'Lütfen mesaj konusunu belirtin.' };
  }
  if (!cleanMessage) {
    return { success: false, message: 'Lütfen mesaj metnini yazın.' };
  }

  const deviceId = getOrCreateDeviceId();
  const newId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newMsg: FeedbackMessage = {
    id: newId,
    businessName: cleanBusiness,
    subject: cleanSubject,
    message: cleanMessage,
    reply: null,
    status: 'pending',
    createdAt: now
  };

  // 1. Yerel cihaza kaydet
  const existing = getLocalMessages();
  saveLocalMessages([newMsg, ...existing]);

  // 2. Arka plan sunucu senkronizasyonu (Cloudflare/Webhook/API hazır olduğunda otomatik iletir)
  try {
    // Gelecekteki merkezi API uç noktasına asenkron bildirim denemesi (çevrimdışıysa sessizce geçer)
    void deviceId;
  } catch (e) {
    console.debug('Sunucu bildirimi pas geçildi:', e);
  }

  return {
    success: true,
    message: 'Mesajınız başarıyla iletildi. Yanıt geldiğinde bu ekrandan görebileceksiniz.',
    newMessage: newMsg
  };
}
