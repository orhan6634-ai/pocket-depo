/**
 * Pocket-Depo Telefon & Tarayıcı Kritik Stok Bildirim Servisi
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Bildirim izni istenirken hata:', e);
      return false;
    }
  }

  return false;
}

export function sendCriticalStockNotification(
  productName: string,
  currentStock: number,
  minStock: number,
  unit: string
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const title = `⚠️ Kritik Stok Uyarısı: ${productName}`;
      const options: NotificationOptions = {
        body: `Mevcut Stok: ${currentStock} ${unit} (Kritik Sınır: ${minStock} ${unit}). Lütfen sipariş verin!`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><path d="M12 2L1 21h22L12 2zm0 3.5l8.5 14.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><path d="M12 2L1 21h22L12 2z"/></svg>',
        tag: `critical-stock-${productName}`,
        silent: false
      };

      new Notification(title, options);
    } catch (e) {
      console.debug('Bildirim gönderilemedi:', e);
    }
  }
}
