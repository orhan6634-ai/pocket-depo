import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ScanBarcode,
  Crown,
  ShieldAlert,
  FileText,
  Edit2,
  Trash2,
  PackageOpen,
  Sparkles,
  Camera,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink
} from 'lucide-react';
import { Product } from '../types';
import { db, seedInitialData } from '../db';
import {
  exportProductsToCSV,
  exportProductsToXLSX,
  importProductsFromCSV,
  shareStockListWhatsApp,
  copyStockListToClipboard
} from '../services/csv';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';
import { isProLicense, getTrialInfo } from '../services/license';
import { requestNotificationPermission } from '../services/notification';

interface StockListProps {
  products: Product[];
  onOpenAddModal: () => void;
  onEditProduct?: (product: Product) => void;
  onSelectForCount: (product: Product) => void;
  onOpenLicense?: () => void;
  onOpenReportModal?: () => void;
  onOpenBackupModal?: () => void;
  onOpenScanner?: () => void;
}

export const StockList: React.FC<StockListProps> = ({
  products,
  onOpenAddModal,
  onEditProduct,
  onSelectForCount,
  onOpenLicense,
  onOpenReportModal,
  onOpenBackupModal,
  onOpenScanner
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    type?: 'warning' | 'info' | 'error';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (title: string, message: string, type: 'warning' | 'info' | 'error' = 'warning') => {
    setAlertModal({ title, message, type });
  };

  // Kategorileri dinamik çıkar
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtreleme
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.shelfLocation.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesCritical = !onlyCritical || p.currentStock <= p.minStock;

    return matchesSearch && matchesCategory && matchesCritical;
  });

  // Metrikler
  const totalStockCount = products.reduce((sum, p) => sum + p.currentStock, 0);
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);
  const criticalCount = criticalProducts.length;

  const isPro = isProLicense();
  const trial = getTrialInfo();

  const handleExportClick = () => {
    if (products.length === 0) {
      showAlert(
        'Deponuz Henüz Boş',
        'İndirilecek kayıtlı ürün bulunmuyor. Lütfen önce "Yükle" butonundan Excel listenizi içeri aktarın veya "+ Yeni Ürün Ekle" ile ürün tanımlayın.',
        'warning'
      );
      return;
    }
    setExportNotice(null);
    setCopiedSuccess(false);
    setIsExportModalOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      const res = await exportProductsToXLSX();
      if (res.success) {
        playSuccessBeep();
        setExportNotice('İndirme / Paylaşma komutu verildi. Eğer telefonunuzda otomatik kayıt penceresi açılmadıysa yeni v1.0.3 APK yüklü olmayabilir; aşağıdaki WhatsApp ile Gönder seçeneğini kullanabilirsiniz.');
      }
    } catch {
      showAlert('İndirme Hatası', 'Excel dosyası indirilirken bir sorun oluştu.', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await exportProductsToCSV();
      if (res.success) {
        playSuccessBeep();
        setExportNotice('İndirme / Paylaşma komutu verildi. Eğer otomatik pencere açılmadıysa aşağıdaki WhatsApp veya Kopyala seçeneklerini kullanabilirsiniz.');
      }
    } catch {
      showAlert('İndirme Hatası', 'CSV dosyası indirilirken bir sorun oluştu.', 'error');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      await shareStockListWhatsApp();
      playSuccessBeep();
    } catch {
      showAlert('Paylaşım Hatası', 'WhatsApp paylaşımı başlatılamadı.', 'error');
    }
  };

  const handleCopyClipboard = async () => {
    try {
      await copyStockListToClipboard();
      playSuccessBeep();
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 4000);
    } catch {
      showAlert('Kopyalama Hatası', 'Panoya kopyalama başarısız oldu.', 'error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importProductsFromCSV(file);
      playSuccessBeep();

      if (res.hitLimit) {
        setImportStatus(`İçe aktarıldı: ${res.added} yeni eklendi, ${res.updated} güncellendi. (Dikkat: 7 Günlük Deneme Süresi bittiği için bazı ürünler eklenemedi)`);
      } else {
        setImportStatus(`İçe aktarıldı: ${res.added} yeni eklendi, ${res.updated} güncellendi.`);
      }

      setTimeout(() => setImportStatus(null), 5000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      showAlert('Yükleme Hatası', 'CSV/Excel dosyası içe aktarılırken hata oluştu. Dosya formatını kontrol edin.', 'error');
    }
  };

  // Tek Ürün Silme
  const handleDeleteProduct = async (product: Product) => {
    if (!product.id) return;
    try {
      await db.products.delete(product.id);
      playSuccessBeep();
      setProductToDelete(null);
    } catch {
      playErrorBuzzer();
      showAlert('Silme Hatası', 'Ürün silinirken bir hata oluştu.', 'error');
    }
  };

  // Tüm Depoyu Sıfırla (Temiz Başlangıç)
  const handleResetWarehouse = async () => {
    try {
      await db.products.clear();
      await db.movements.clear();
      playSuccessBeep();
      setShowResetConfirm(false);
    } catch {
      playErrorBuzzer();
      showAlert('Hata', 'Depo sıfırlanırken hata oluştu.', 'error');
    }
  };

  // Örnek Veri Yükle
  const handleLoadDemoData = async () => {
    try {
      await seedInitialData();
      playSuccessBeep();
    } catch {
      showAlert('Hata', 'Örnek veriler yüklenemedi.', 'error');
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Gizli Dosya Yükleyici (.csv ve .xlsx destekli) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* İçe Aktarma Durum Bildirimi */}
      {importStatus && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs font-medium">
          {importStatus}
        </div>
      )}

      {/* 7 GÜNLÜK ÜCRETSİZ DENEME / PRO DURUM ÇUBUĞU */}
      {!isPro && onOpenLicense && (
        <div
          onClick={onOpenLicense}
          className={`cursor-pointer border p-3 rounded-xl flex items-center justify-between transition-all shadow-sm ${
            trial.isExpired
              ? 'bg-rose-950/40 border-rose-500/40 hover:border-rose-500/60'
              : 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${trial.isExpired ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-xs font-bold ${trial.isExpired ? 'text-rose-300' : 'text-amber-300'}`}>
                {trial.isExpired
                  ? '7 Günlük Deneme Süresi Doldu!'
                  : `7 Günlük Ücretsiz Deneme: ${trial.daysRemaining} Gün Kaldı`}
              </p>
              <p className="text-[10px] text-slate-400">
                {trial.isExpired
                  ? 'Ürün eklemeye devam etmek için PRO lisans alın'
                  : 'Tüm özellikler kilitlenmeden sınırsız kullanımda'}
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
            trial.isExpired
              ? 'bg-rose-600 text-white'
              : 'bg-amber-400 text-slate-950'
          }`}>
            {trial.isExpired ? 'Lisans Al' : "PRO'ya Geç"}
          </span>
        </div>
      )}

      {/* KRİTİK STOK ÖZEL UYARI BANDI */}
      {criticalCount > 0 && (
        <div
          onClick={() => {
            setOnlyCritical(!onlyCritical);
            requestNotificationPermission();
          }}
          className="cursor-pointer bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-rose-950/60 border border-rose-500/50 p-3 rounded-xl flex items-center justify-between shadow-lg shadow-rose-950/30 animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-200">
                {criticalCount} Kalem Ürün Kritik Stok Altında!
              </div>
              <div className="text-[10px] text-rose-300/80">
                {onlyCritical ? 'Tüm ürünleri göstermek için dokunun' : 'Sadece kritik ürünleri listelemek için dokunun'}
              </div>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-rose-600 text-white shadow-sm">
            {onlyCritical ? 'Filtreyi Kaldır' : 'Filtrele'}
          </span>
        </div>
      )}

      {/* Özet Metrik Kartları */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
          <div className="text-[11px] text-slate-400">Toplam Kalem</div>
          <div className="text-lg font-bold text-white mt-0.5">{products.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
          <div className="text-[11px] text-slate-400">Toplam Miktar</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{totalStockCount}</div>
        </div>
        <div
          onClick={() => setOnlyCritical(!onlyCritical)}
          className={`border p-3 rounded-xl text-center cursor-pointer transition-all ${
            onlyCritical
              ? 'bg-rose-500/25 border-rose-500 text-rose-200 shadow-md shadow-rose-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="text-[11px] flex items-center justify-center gap-1 font-semibold">
            <AlertTriangle className={`w-3 h-3 ${criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Kritik</span>
          </div>
          <div className={`text-lg font-bold mt-0.5 ${criticalCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {criticalCount}
          </div>
        </div>
      </div>

      {/* Birincil Aksiyon: Yeni Ürün Ekle + Depoyu Sıfırla */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAddModal}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Ürün Ekle</span>
        </button>

        {products.length > 0 && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="py-3 px-3 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0"
            title="Tüm Depoyu ve Sayımları Temizle"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Depoyu Sıfırla</span>
          </button>
        )}
      </div>

      {/* İkincil Araçlar Şeridi (Kompakt 4 Buton: Rapor, Yedek, Excel İndir, Excel Yükle) */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={onOpenReportModal}
          className="py-2 px-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Rapor</span>
        </button>

        <button
          type="button"
          onClick={onOpenBackupModal}
          className="py-2 px-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Yedek</span>
        </button>

        <button
          type="button"
          onClick={handleExportClick}
          className="py-2 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
          title="Excel veya CSV Olarak İndir"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>İndir</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="py-2 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-[11px] rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Yükle</span>
        </button>
      </div>

      {/* Arama Çubuğu */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, barkod veya rafa göre süz..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Kategori Filtre Butonları */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'Tümü' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Ürün Listesi veya Boş Depo Karşılama Ekranı */}
      <div className="space-y-2">
        {products.length === 0 ? (
          /* TEMİZ VE SADE BOŞ DEPO KARŞILAMA ALANI */
          <div className="py-12 px-6 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <PackageOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Deponuz Henüz Boş</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Yukarıdaki butonları kullanarak yeni ürün ekleyebilir veya Excel listenizi yükleyebilirsiniz.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm bg-slate-900/50 border border-slate-800/80 rounded-2xl">
            Aramanıza uygun ürün bulunamadı.
          </div>
        ) : (
          filtered.map((product) => {
            const isLow = product.currentStock <= product.minStock;
            return (
              <div
                key={product.id}
                className={`border p-3.5 rounded-xl flex items-center justify-between transition-all ${
                  isLow
                    ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-rose-950/30 ring-1 ring-rose-500/30 shadow-md shadow-rose-950/20'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="space-y-1 max-w-[55%]">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-sm leading-tight ${isLow ? 'text-rose-100 font-bold' : 'text-white'}`}>
                      {product.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-emerald-400 text-[11px]">{product.barcode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-slate-300">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {product.shelfLocation}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Son: {new Date(product.lastCountDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <div className={`text-base font-bold ${isLow ? 'text-rose-400 font-black' : 'text-white'}`}>
                      {product.currentStock}{' '}
                      <span className="text-xs font-normal text-slate-400">{product.unit}</span>
                    </div>
                    {isLow && (
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 rounded-full flex items-center justify-end gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Min: {product.minStock}
                      </span>
                    )}
                  </div>

                  {/* Sayım Yap Tuşu */}
                  <button
                    onClick={() => onSelectForCount(product)}
                    className={`p-2.5 border rounded-xl active:scale-95 transition-all ${
                      isLow
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-200'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    }`}
                    title="İşlem Yap / Say"
                  >
                    <ScanBarcode className="w-4 h-4" />
                  </button>

                  {/* Düzenle Tuşu */}
                  {onEditProduct && (
                    <button
                      onClick={() => onEditProduct(product)}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl active:scale-95 transition-all"
                      title="Ürünü Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Sil Tuşu */}
                  <button
                    onClick={() => setProductToDelete(product)}
                    className="p-2.5 bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl active:scale-95 transition-all"
                    title="Ürünü Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tek Ürün Silme Onay Modalı */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Ürünü Sil</h4>
                <p className="text-xs text-slate-400 mt-0.5">Bu ürünü depodan kaldırmak istediğinize emin misiniz?</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <p className="font-bold text-white">{productToDelete.name}</p>
              <p className="text-slate-400 font-mono mt-0.5">{productToDelete.barcode} • Mevcut Stok: {productToDelete.currentStock} {productToDelete.unit}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(productToDelete)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tüm Depoyu Sıfırla Onay Modalı */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Tüm Depoyu Sıfırla?</h4>
                <p className="text-xs text-rose-300 mt-0.5">Tüm ürünler ve geçmiş sayım hareketleri tamamen silinecektir!</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Bu işlem geri alınamaz. Kendi gerçek deponuzu sıfırdan kurmak istiyorsanız onaylayın.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleResetWarehouse}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20"
              >
                Depoyu Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İndirme / Dışa Aktarma Seçenekleri Modalı */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Stok Listesini İndir / Paylaş</h4>
                <p className="text-xs text-slate-400 mt-0.5">{products.length} kayıtlı ürün dışa aktarılacak</p>
              </div>
            </div>

            {/* Bildirim Durum Kutusu */}
            {exportNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed animate-fade-in flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{exportNotice}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              {/* 1. Excel İndir */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-lg shadow-emerald-500/20 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-200" />
                  <div className="text-left">
                    <div className="font-bold text-white">Excel Olarak İndir (.xlsx)</div>
                    <div className="text-[10px] text-emerald-100/80">Microsoft Excel & Google E-Tablolar</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded font-bold">Önerilen</span>
              </button>

              {/* 2. CSV İndir */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full py-2 px-3.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-bold text-xs rounded-xl flex items-center justify-between border border-slate-700 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <div className="font-bold">CSV Olarak İndir (.csv)</div>
                    <div className="text-[10px] text-slate-400">Virgüllü düz metin formatı</div>
                  </div>
                </div>
              </button>

              {/* 3. WhatsApp Paylaşımı (Telefonlar için en garantili yöntem) */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-md shadow-emerald-500/20 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-emerald-200" />
                  <div className="text-left">
                    <div className="font-bold">WhatsApp ile Listeyi Gönder</div>
                    <div className="text-[10px] text-emerald-100/80">Formatlı tablo olarak anında paylaşır</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-700/60 px-2 py-0.5 rounded font-bold">Pratik</span>
              </button>

              {/* 4. Panoya Kopyala */}
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="w-full py-2 px-3.5 bg-slate-800/80 hover:bg-slate-700 active:scale-[0.98] text-slate-300 font-bold text-xs rounded-xl flex items-center justify-between border border-slate-700/80 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  {copiedSuccess ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                  <div className="text-left">
                    <div className="font-bold">{copiedSuccess ? 'Panoya Kopyalandı!' : 'Listeyi Panoya Kopyala'}</div>
                    <div className="text-[10px] text-slate-400">Telefonda Excel / E-Tablolar'a yapıştırın</div>
                  </div>
                </div>
              </button>

              {/* 5. Tarayıcıda Doğrudan İndir (Chrome) */}
              <button
                type="button"
                onClick={() => {
                  window.open('https://orhan6634-ai.github.io/pocket-depo/', '_blank');
                }}
                className="w-full py-2 px-3.5 bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] text-blue-300 font-bold text-xs rounded-xl flex items-center justify-between border border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <div className="font-bold">Chrome Tarayıcısında Aç & İndir</div>
                    <div className="text-[10px] text-blue-200/70">Android İndirilenler klasörüne doğrudan kaydeder</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsExportModalOpen(false);
                  setExportNotice(null);
                }}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şık Özel Bilgilendirme / Uyarı Modalı (Android Tarayıcı alert'ini engeller) */}
      {alertModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  alertModal.type === 'error'
                    ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                    : 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                }`}
              >
                {alertModal.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm">{alertModal.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{alertModal.message}</p>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
