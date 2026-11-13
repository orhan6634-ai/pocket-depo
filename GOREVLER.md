# Pocket-Depo Proje Görevleri ve Kodlama Kuralları

## 🇹🇷 Türkçe Karakter ve Encoding Kuralları (KESİN PROTOKOL)
- **Base64 Dönüşümleri:** Türkçe karakter (`ç, ğ, ı, ö, ş, ü, İ, vb.`) içeren JSON veya metinler Base64'e çevrilirken asla doğrudan `btoa()` veya `unescape()` kullanılmayacak. Her zaman `TextEncoder` tabanlı `utf8ToBase64()` kullanılacak.
- **Dosya İsimleri:** İndirilen tüm dosya isimleri daima ASCII güvenli tutulacak (ör. `pocket-depo-stok-listesi.xlsx`, `pocket-depo-yedek.json`).
- **CSV Dışa Aktarımı:** Türkçe karakterlerin Excel'de bozulmaması için dosya başına UTF-8 BOM (`\uFEFF`) eklenmesi zorunludur.

## 📱 Yerel Köprü ve Dosya İndirme Kuralları
- **Expo SDK 58+ FileSystem:** Her zaman `expo-file-system/legacy` üzerinden import edilecek.
- **Paylaşım / Kaydetme:** Dosyalar `FileSystem.cacheDirectory` içine yazılacak ve `expo-sharing` (`Sharing.shareAsync`) ile yerel Android intent'ine gönderilecek.
- **PWA Service Worker:** Yeni derlemelerin anında aktif olması için `workbox` ayarlarında `skipWaiting: true`, `clientsClaim: true` ve `cleanupOutdatedCaches: true` korunacak.
