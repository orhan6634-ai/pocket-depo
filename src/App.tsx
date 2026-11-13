import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { Navbar } from './components/Navbar';
import { CountMode } from './components/CountMode';
import { StockList } from './components/StockList';
import { HistoryView } from './components/HistoryView';
import { BottomNav } from './components/BottomNav';
import { ScannerModal } from './components/ScannerModal';
import { QuickAddModal } from './components/QuickAddModal';
import { OnboardingModal } from './components/OnboardingModal';
import { LicenseModal } from './components/LicenseModal';
import { DiscrepancyReportModal } from './components/DiscrepancyReportModal';
import { BackupModal } from './components/BackupModal';
import { FeedbackModal } from './components/FeedbackModal';
import { Product, SyncStatus } from './types';
import { playSuccessBeep, playErrorBuzzer } from './services/sound';
import { networkService } from './services/network';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'count' | 'stock' | 'history'>('count');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [scannedBarcodeForAdd, setScannedBarcodeForAdd] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // 1. Canlı Ping Destekli Sağlam Ağ Durumu (Android yalan söyleyemez)
  const [isOnline, setIsOnline] = useState<boolean>(() => networkService.getStatus());

  useEffect(() => {
    const unsubscribe = networkService.subscribe((online) => {
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  // Dexie Reaktif Verileri (useLiveQuery ile anlık UI senkronizasyonu)
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const movements = useLiveQuery(() => db.movements.orderBy('id').reverse().toArray(), []) || [];

  // Bekleyen senkronizasyon adedi
  const pendingMovements = movements.filter((m) => !m.isSynced);

  // Senkronizasyon Durum Değişkenleri
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [recentSyncedCount, setRecentSyncedCount] = useState<number>(0);

  // SyncStatus Nesnesi (Doğrudan hesaplanır)
  const syncStatus: SyncStatus = useMemo(
    () => ({
      isOnline,
      pendingCount: pendingMovements.length,
      lastSyncTime,
      isSyncing,
      recentSyncedCount
    }),
    [isOnline, pendingMovements.length, lastSyncTime, isSyncing, recentSyncedCount]
  );

  // Senkronizasyon Motoru (IndexedDB'deki bekleyenleri eşitler)
  const triggerAutoSync = useCallback(async (silentParam?: boolean | unknown) => {
    const isSilent = silentParam === true;
    setIsSyncing(true);

    try {
      const allMovements = await db.movements.toArray();
      const freshPending = allMovements.filter((m) => !m.isSynced);

      if (freshPending.length > 0) {
        // Kullanıcının eşitlenme sürecini net görebilmesi için kısa bir akıcı gecikme
        await new Promise((resolve) => setTimeout(resolve, 600));

        for (const m of freshPending) {
          if (m.id !== undefined) {
            await db.movements.update(m.id, { isSynced: true });
          }
        }

        const count = freshPending.length;
        setRecentSyncedCount(count);
        setTimeout(() => {
          setRecentSyncedCount(0);
        }, 3500);

        playSuccessBeep();
        setSyncToastMessage(`✓ ${count} adet çevrimdışı sayım başarıyla eklendi ve eşitlendi!`);
        setTimeout(() => setSyncToastMessage(null), 3500);
      } else if (!isSilent) {
        playSuccessBeep();
        setSyncToastMessage(`✓ Sistem Çevrimiçi: Tüm ${allMovements.length} sayım güncel ve senkronize!`);
        setTimeout(() => setSyncToastMessage(null), 3000);
      }

      const syncTime = new Date().toLocaleTimeString('tr-TR');
      setLastSyncTime(syncTime);
    } catch (e) {
      console.error('Senkronizasyon hatası:', e);
      if (!isSilent) {
        playErrorBuzzer();
        setSyncToastMessage('Senkronizasyon sırasında hata oluştu.');
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Tuşa tıklandığında manuel senkronizasyon
  const handleManualSync = () => {
    if (!isOnline) {
      playErrorBuzzer();
      setSyncToastMessage('⚠️ Şu anda Çevrimdışı moddasınız. Senkronize etmek için interneti açın veya Çevrimiçi moda geçin.');
      setTimeout(() => setSyncToastMessage(null), 3500);
      return;
    }
    triggerAutoSync(false);
  };

  // Çevrimiçi / Çevrimdışı Tuşuna Dokunulduğunda
  const handleToggleOnlineOffline = () => {
    const isNowOffline = networkService.getIsManualOffline();
    if (!isNowOffline && isOnline) {
      // Çevrimdışına zorla
      networkService.setManualOffline(true);
      playErrorBuzzer();
      setSyncToastMessage('📵 Çevrimdışı Moda Geçildi: Sayımlar yerel hafızada saklanacak.');
      setTimeout(() => setSyncToastMessage(null), 3000);
    } else {
      // Çevrimiçine dön
      networkService.setManualOffline(false);
      playSuccessBeep();
      setSyncToastMessage('📶 Çevrimiçi Moda Geçildi! Eşitleme kontrol ediliyor...');
      setTimeout(() => setSyncToastMessage(null), 3000);
      setTimeout(() => {
        triggerAutoSync(false);
      }, 400);
    }
  };

  // Otomatik Arka Plan Senkronizasyonu (SADECE gerçekten çevrimiçiyken ve bekleyen varsa)
  useEffect(() => {
    if (isOnline && pendingMovements.length > 0 && !isSyncing) {
      const timer = setTimeout(() => {
        triggerAutoSync(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingMovements.length, isSyncing, triggerAutoSync]);

  // Barkod Okunduğunda (Doğrudan IndexedDB'den kesin eşleşme)
  const handleBarcodeScanned = async (barcode: string) => {
    const cleanCode = barcode.trim();
    const matched = await db.products.where('barcode').equals(cleanCode).first();

    if (matched) {
      setSelectedProduct(matched);
      setActiveTab('count');
      playSuccessBeep();
    } else {
      playErrorBuzzer();
      setEditingProduct(null);
      setScannedBarcodeForAdd(cleanCode);
      setIsAddModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Üst Çubuk */}
      <Navbar
        syncStatus={syncStatus}
        onTriggerSync={handleManualSync}
        onToggleOnlineOffline={handleToggleOnlineOffline}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenLicense={() => setIsLicenseOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
      />

      {/* Tost Bildirimi */}
      {syncToastMessage && (
        <div
          className={`px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-fade-in z-30 ${
            syncToastMessage.includes('📵') || syncToastMessage.includes('⚠️')
              ? 'bg-amber-500 text-slate-950'
              : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {syncToastMessage.includes('📵') || syncToastMessage.includes('⚠️') ? (
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-slate-950 shrink-0" />
          )}
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Çevrimdışı Mod İkaz Çubuğu */}
      {!isOnline && (
        <div className="sticky top-[61px] z-30 bg-amber-500/15 backdrop-blur-md border-b border-amber-500/30 px-4 py-2 text-center text-amber-300 text-xs flex items-center justify-center gap-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-bold">Çevrimdışı Mod Aktif:</span>
          <span className="text-amber-200/90">
            Sayımlar telefon hafızasında kaydediliyor.
          </span>
        </div>
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-28">
        {activeTab === 'count' && (
          <CountMode
            products={products}
            onOpenScanner={() => setIsScannerOpen(true)}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            isOnline={isOnline}
          />
        )}

        {activeTab === 'stock' && (
          <StockList
            products={products}
            onOpenAddModal={() => {
              setEditingProduct(null);
              setScannedBarcodeForAdd('');
              setIsAddModalOpen(true);
            }}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setScannedBarcodeForAdd('');
              setIsAddModalOpen(true);
            }}
            onSelectForCount={(p) => {
              setSelectedProduct(p);
              setActiveTab('count');
            }}
            onOpenLicense={() => setIsLicenseOpen(true)}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            movements={movements}
            onTriggerSync={handleManualSync}
            isSyncing={isSyncing}
            isOnline={isOnline}
          />
        )}
      </main>

      {/* Alt Mobil Gezinme Barı */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Kamera Barkod Tarayıcı Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        isOnline={isOnline}
      />

      {/* Hızlı Yeni Ürün Ekle / Düzenle Modal */}
      <QuickAddModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        defaultBarcode={scannedBarcodeForAdd}
        editingProduct={editingProduct}
        onOpenLicense={() => setIsLicenseOpen(true)}
        isOnline={isOnline}
        onProductAdded={() => {
          setTimeout(async () => {
            if (scannedBarcodeForAdd) {
              const p = await db.products.where('barcode').equals(scannedBarcodeForAdd).first();
              if (p) {
                setSelectedProduct(p);
                setActiveTab('count');
              }
            }
          }, 100);
        }}
      />

      {/* İlk Kurulum / Rehber Modal */}
      <OnboardingModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Lisans Yönetim Modal */}
      <LicenseModal
        isOpen={isLicenseOpen}
        onClose={() => setIsLicenseOpen(false)}
        currentProductCount={products.length}
      />

      {/* Sayım & Uyuşmazlık Raporu Modalı (WhatsApp & Excel) */}
      <DiscrepancyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        products={products}
        movements={movements}
      />

      {/* Veri Güvenliği & JSON Yedekleme Modalı */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        productCount={products.length}
        movementCount={movements.length}
        onRestoreSuccess={() => {
          playSuccessBeep();
          setSyncToastMessage('✓ Depo yedeği başarıyla geri yüklendi!');
          setTimeout(() => setSyncToastMessage(null), 3500);
        }}
      />

      {/* Anonim Destek & Geri Bildirim Modalı */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
}
