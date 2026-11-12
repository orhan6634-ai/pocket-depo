# 📦 Pocket-Depo (Offline-First Mobil Stok ve Sayım Asistanı)

İnternet bağlantısının olmadığı veya zayıf olduğu depolarda, bodrum katlarda ve sanayi hangarlarında kesintisiz çalışan, el terminali konseptinde mobil odaklı stok ve sayım uygulaması.

---

## 🚀 Öne Çıkan Özellikler (MVP)

1. **Tamamen Çevrimdışı (Offline-First) Mimari:**
   - Veriler doğrudan tarayıcının yerel **IndexedDB (Dexie.js)** motorunda saklanır.
   - İnternet tamamen kesilse bile sayım yapabilir, stok artırıp azaltabilir ve yeni ürün tanımlayabilirsiniz.
   - İnternet geri geldiğinde bekleyen tüm işlemler tek tıkla veya otomatik olarak senkronize edilir.

2. **Kamera ile Hızlı Barkod Sayım Modu:**
   - Telefon kamerasıyla EAN-13, EAN-8, Code 128, QR kodları anında okur.
   - Her başarılı barkod okumada **endüstriyel terminal "bip" sesi ve titreşim (haptic feedback)** verir.
   - Hızlı adım tuşları (`+1`, `+5`, `+10`, `-1`, `-5`, `-10`) veya doğrudan sayı girme kutusu.

3. **Stok Listesi & Excel / CSV Entegrasyonu:**
   - Mevcut stoğu UTF-8 uyumlu CSV olarak dışa aktarma (Excel'de Türkçe karakter sorunu yaşamaz).
   - Mevcut CSV dosyasını tek tıkla yükleyerek toplu ürün içeri aktarma.
   - Azalan ürünleri anında yakalayan **Kritik Stok Uyarısı**.

4. **PWA (Progressive Web App):**
   - Telefondan açıldığında *"Ana Ekrana Ekle"* diyerek tıpkı yerel bir mobil uygulama (iOS/Android App) gibi tam ekran çalışır.

---

## 💻 Nasıl Çalıştırılır?

### Yöntem 1 (En Kolay — Çift Tıkla):
Klasördeki `start.bat` dosyasına çift tıklayın.

### Yöntem 2 (Terminalden):
```bash
cd "C:\Users\orhan şahin\Desktop\Projelerim\pocket-depo"
npm run dev
```

Uygulama açıldığında:
* **Bilgisayardan test etmek için:** `http://localhost:5173`
* **Kendi cep telefonunuzdan test etmek için:** Aynı Wi-Fi ağına bağlıyken terminalde görünen `Network: http://192.168.x.x:5173` adresini telefonunuzun Safari/Chrome tarayıcısına yazın.

---

## 📁 Proje Dizin Yapısı
```
pocket-depo/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx         # Üst bar & canlı çevrimdışı durumu
│   │   ├── BottomNav.tsx      # Mobil alt menü (Sayım, Liste, Geçmiş)
│   │   ├── CountMode.tsx      # Hızlı barkod sayım ekranı
│   │   ├── StockList.tsx      # Stok listesi, arama ve CSV aktarma
│   │   ├── ScannerModal.tsx   # Kamera barkod okuyucu (html5-qrcode)
│   │   ├── QuickAddModal.tsx  # Hızlı ürün ekleme
│   │   └── HistoryView.tsx    # Sayım ve hareket logları
│   ├── db/
│   │   └── index.ts           # Dexie.js veritabanı & tohum demo veriler
│   ├── services/
│   │   ├── sound.ts           # Bip sesi ve titreşim motoru
│   │   └── csv.ts             # Excel/CSV aktarma araçları
│   ├── types/
│   │   └── index.ts           # Veri tipleri
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts             # PWA ve Vite ayarları
```
