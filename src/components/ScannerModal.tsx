import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Flashlight,
  Camera,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Package,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Plus,
  Sparkles,
  Layers,
  MapPin,
  Tag
} from 'lucide-react';
import { db } from '../db';
import { Product, UnitType } from '../types';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';
import { canAddMoreProducts } from '../services/license';

export type BatchOpType = 'in' | 'out';
export type ScannerMode = 'single' | 'batch_count' | 'batch_add';

export interface BatchItemSummary {
  productId: number;
  productName: string;
  barcode: string;
  count: number;
  unit: string;
}

export interface QuickAddFormState {
  barcode: string;
  name: string;
  currentStock: number;
  unit: UnitType;
  category: string;
  shelfLocation: string;
  minStock: number;
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  isOnline?: boolean;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  isOnline = true
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // Seri Tarama Modu Durumları
  const [scannerMode, setScannerMode] = useState<ScannerMode>('single');
  const [batchOp, setBatchOp] = useState<BatchOpType>('in');
  const [batchCount, setBatchCount] = useState<number>(0);
  const [newProductsCount, setNewProductsCount] = useState<number>(0);
  const [quickAdd, setQuickAdd] = useState<QuickAddFormState | null>(null);
  const quickAddRef = useRef<QuickAddFormState | null>(null);
  const scannerModeRef = useRef<ScannerMode>('single');

  const [batchItems, setBatchItems] = useState<Record<string, BatchItemSummary>>({});
  const [batchFeedback, setBatchFeedback] = useState<{
    type: 'success' | 'unknown' | 'error';
    title: string;
    detail: string;
    rawCode?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const containerId = 'interactive-barcode-reader';

  const safeStopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const instance = scannerRef.current;
    scannerRef.current = null;

    if (instance) {
      try {
        if (isScanningRef.current) {
          isScanningRef.current = false;
          await instance.stop();
        }
      } catch (err) {
        console.debug('Scanner stop yutuldu:', err);
      }

      try {
        await instance.clear();
      } catch (err) {
        console.debug('Scanner clear yutuldu:', err);
      }
    }

    isScanningRef.current = false;
    isStoppingRef.current = false;
  };

  const handleClose = () => {
    try {
      onClose();
    } catch (e) {
      console.warn('onClose hatası:', e);
    }
    safeStopScanner();
  };

  // Hızlı Yeni Ürün Tanımlama Penceresini Başlat
  const handleStartQuickAdd = (barcodeToRegister: string) => {
    const initialForm: QuickAddFormState = {
      barcode: barcodeToRegister.trim(),
      name: '',
      currentStock: 1,
      unit: 'Adet',
      category: 'Genel',
      shelfLocation: '',
      minStock: 5
    };
    setQuickAdd(initialForm);
    quickAddRef.current = initialForm;
    playSuccessBeep();
  };

  // Yeni Ürün Tanımlama Formunu Kaydet ve Sıradakine Geç
  const handleSaveQuickAddProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickAdd) return;

    const cleanName = quickAdd.name.trim();
    if (!cleanName) {
      alert('Lütfen ürün adını yazın.');
      return;
    }

    const canAdd = await canAddMoreProducts();
    if (!canAdd) {
      playErrorBuzzer();
      alert('Ürün ekleme limitine ulaşıldı veya 7 günlük deneme süresi doldu.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const newProduct: Omit<Product, 'id'> = {
        barcode: quickAdd.barcode,
        name: cleanName,
        category: quickAdd.category.trim() || 'Genel',
        shelfLocation: quickAdd.shelfLocation.trim() || 'Raf-1',
        currentStock: Number(quickAdd.currentStock) || 1,
        minStock: Number(quickAdd.minStock) || 5,
        unit: quickAdd.unit,
        lastCountDate: now,
        updatedAt: now
      };

      const newId = await db.products.add(newProduct as Product);

      // İlk mal kabul giriş hareketi
      await db.movements.add({
        productId: newId as number,
        productName: cleanName,
        barcode: quickAdd.barcode,
        type: 'in',
        previousStock: 0,
        newStock: Number(quickAdd.currentStock) || 1,
        delta: Number(quickAdd.currentStock) || 1,
        timestamp: now,
        note: 'Seri Yeni Ürün Girişi',
        isSynced: isOnline
      });

      playSuccessBeep();
      setBatchCount((prev) => prev + 1);
      setNewProductsCount((prev) => prev + 1);

      setBatchFeedback({
        type: 'success',
        title: `✅ ${cleanName} Depoya Eklendi!`,
        detail: `Stok: ${quickAdd.currentStock} ${quickAdd.unit} | Barkod: ${quickAdd.barcode}`
      });
      setTimeout(() => setBatchFeedback(null), 2500);

      // Formu kapat, kamera açık bekler!
      setQuickAdd(null);
      quickAddRef.current = null;
    } catch (err) {
      console.error('Ürün kaydedilemedi:', err);
      playErrorBuzzer();
      alert('Ürün kaydedilirken bir hata oluştu.');
    }
  };

  // Seri Yeni Ürün Girişi Modunda Barkod İşleme
  const handleProcessBatchAdd = async (rawBarcode: string) => {
    const cleanCode = rawBarcode.trim();
    if (!cleanCode) return;

    try {
      const existingProduct = await db.products.where('barcode').equals(cleanCode).first();

      if (existingProduct && existingProduct.id !== undefined) {
        // Ürün zaten kayıtlı -> Stoğunu artır
        const previousStock = existingProduct.currentStock;
        const newStock = previousStock + 1;
        const now = new Date().toISOString();

        await db.products.update(existingProduct.id, {
          currentStock: newStock,
          lastCountDate: now,
          updatedAt: now
        });

        await db.movements.add({
          productId: existingProduct.id,
          productName: existingProduct.name,
          barcode: existingProduct.barcode,
          type: 'in',
          previousStock,
          newStock,
          delta: 1,
          timestamp: now,
          note: 'Seri Giriş (+1 Mevcut Ürün)',
          isSynced: isOnline
        });

        playSuccessBeep();
        setBatchCount((prev) => prev + 1);
        setBatchFeedback({
          type: 'success',
          title: `${existingProduct.name} (Zaten Kayıtlı: +1)`,
          detail: `Stok: ${previousStock} ➔ ${newStock} ${existingProduct.unit}`
        });
        setTimeout(() => setBatchFeedback(null), 2200);
      } else {
        // Ürün depoda YOK -> Hemen mini tanımlama penceresi açılır!
        handleStartQuickAdd(cleanCode);
      }
    } catch (err) {
      console.error('Seri ürün ekleme kontrol hatası:', err);
    }
  };

  // Seri Sayım Modunda Okunan Barkodu Arka Planda Doğrudan İşleme Motoru
  const handleBatchProcessBarcode = async (rawBarcode: string) => {
    const cleanCode = rawBarcode.trim();
    if (!cleanCode) return;

    try {
      const product = await db.products.where('barcode').equals(cleanCode).first();

      if (!product || product.id === undefined) {
        // Ürün depoda bulunamadı -> Kamera KAPANMAZ! Sesli ikaz ve "Hemen Tanımla" seçeneği
        playErrorBuzzer();
        setBatchFeedback({
          type: 'unknown',
          title: 'Kayıtsız Barkod!',
          detail: `${cleanCode} sistemde tanımlı değil.`,
          rawCode: cleanCode
        });
        setTimeout(() => setBatchFeedback(null), 3500);
        return;
      }

      // Ürün bulundu -> Seçili operasyona göre (in/out) +1 veya -1 stok hareketi
      const delta = batchOp === 'in' ? 1 : -1;
      const previousStock = product.currentStock;
      const newStock = Math.max(0, previousStock + delta);
      const now = new Date().toISOString();

      // 1. Ürün stoğunu güncelle
      await db.products.update(product.id, {
        currentStock: newStock,
        lastCountDate: now,
        updatedAt: now
      });

      // 2. Hareket kaydını logla
      await db.movements.add({
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        type: batchOp,
        previousStock,
        newStock,
        delta,
        timestamp: now,
        note: `Seri Okuma (${batchOp === 'in' ? '+1' : '-1'})`,
        isSynced: isOnline
      });

      playSuccessBeep();

      // Seri sayaç ve özet güncellemesi
      setBatchCount((prev) => prev + 1);
      setBatchItems((prev) => {
        const existing = prev[cleanCode];
        const updatedCount = (existing ? existing.count : 0) + (batchOp === 'in' ? 1 : -1);
        return {
          ...prev,
          [cleanCode]: {
            productId: product.id!,
            productName: product.name,
            barcode: cleanCode,
            count: updatedCount,
            unit: product.unit
          }
        };
      });

      // Ekranda yeşil bildirim
      setBatchFeedback({
        type: 'success',
        title: `${product.name} (${batchOp === 'in' ? '+1' : '-1'} ${product.unit})`,
        detail: `Eski: ${previousStock} ➔ Yeni Stok: ${newStock} ${product.unit}`
      });
      setTimeout(() => setBatchFeedback(null), 2200);
    } catch (err) {
      console.error('Seri okuma işlemi sırasında hata:', err);
      playErrorBuzzer();
      setBatchFeedback({
        type: 'error',
        title: 'İşlem Başarısız',
        detail: 'Stok güncellenirken bir hata oluştu.'
      });
      setTimeout(() => setBatchFeedback(null), 2500);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      await safeStopScanner();

      // Kamera iznini doğrudan tetikle
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          testStream.getTracks().forEach((track) => track.stop());
        } catch (permErr) {
          console.warn('getUserMedia ön izin uyarısı:', permErr);
        }
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const w = Math.min(viewfinderWidth * 0.85, 300);
            const h = Math.min(viewfinderHeight * 0.45, 170);
            return { width: Math.floor(w), height: Math.floor(h) };
          }
        },
        async (decodedText) => {
          const now = Date.now();
          const cleanCode = decodedText.trim();

          // Eğer kullanıcı şu anda yeni ürün adı yazıyorsa yeni barkod tetikleme
          if (quickAddRef.current) {
            return;
          }

          const currentMode = scannerModeRef.current;

          // Seri modlarda debounce kontrolü
          if (currentMode !== 'single') {
            if (lastScannedCodeRef.current === cleanCode && now - lastScanTimeRef.current < 1400) {
              return;
            }
            lastScanTimeRef.current = now;
            lastScannedCodeRef.current = cleanCode;

            if (currentMode === 'batch_add') {
              // Seri Yeni Ürün Girişi
              await handleProcessBatchAdd(cleanCode);
            } else {
              // Seri Sayım (+1/-1)
              await handleBatchProcessBarcode(cleanCode);
            }
          } else {
            // Tekli Normal Mod: Kapat ve ana ekrana aktar
            handleClose();
            onScanSuccess(cleanCode);
          }
        },
        () => {
          // Frame scan error - sessizce devam
        }
      );
      isScanningRef.current = true;
    } catch (err) {
      console.error('Kamera başlatılamadı:', err);
      playErrorBuzzer();
      isScanningRef.current = false;
      setCameraError('Kamera izni verilmedi veya cihazda uygun kamera bulunamadı.');
    }
  };

  useEffect(() => {
    scannerModeRef.current = scannerMode;
  }, [scannerMode]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      safeStopScanner();
    };
  }, [isOpen, scannerMode]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanningRef.current) return;
    try {
      const applyTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: applyTorch } as unknown as MediaTrackConstraintSet]
      });
      setTorchOn(applyTorch);
    } catch (e) {
      console.debug('Flaş desteklenmiyor:', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    setManualCode('');

    if (scannerMode === 'batch_add') {
      handleProcessBatchAdd(code);
    } else if (scannerMode === 'batch_count') {
      handleBatchProcessBarcode(code);
    } else {
      handleClose();
      onScanSuccess(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-fade-in select-none">
      {/* Üst Bar */}
      <div className="flex items-center justify-between z-10 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">
            {scannerMode === 'batch_add'
              ? '⚡ Seri Ürün Girişi'
              : scannerMode === 'batch_count'
              ? 'Seri Stok Sayımı'
              : 'Barkod Okuyucu'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Flaş */}
          <button
            type="button"
            onClick={toggleTorch}
            className={`p-2.5 rounded-full border transition-all ${
              torchOn ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-white border-slate-700'
            }`}
            title="Flaş Aç/Kapat"
          >
            <Flashlight className="w-4 h-4" />
          </button>

          {/* Kapat */}
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 rounded-full bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3'lü Mod Seçici Şerit: Tekli / Seri Sayım / Seri Ürün Girişi */}
      <div className="z-10 mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl p-1 grid grid-cols-3 gap-1 max-w-md mx-auto w-full shadow-lg">
        <button
          type="button"
          onClick={() => {
            setScannerMode('single');
            setBatchFeedback(null);
            setQuickAdd(null);
          }}
          className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
            scannerMode === 'single'
              ? 'bg-slate-700 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Tekli</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScannerMode('batch_count');
            setBatchFeedback(null);
            setQuickAdd(null);
          }}
          className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
            scannerMode === 'batch_count'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Seri Sayım</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScannerMode('batch_add');
            setBatchFeedback(null);
            setQuickAdd(null);
          }}
          className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 ${
            scannerMode === 'batch_add'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-emerald-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ Ürün Girişi</span>
        </button>
      </div>

      {/* Seri Sayım Modunda Giriş/Çıkış Yön Seçici (+1/-1) */}
      {scannerMode === 'batch_count' && (
        <div className="z-10 mt-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 flex items-center justify-between gap-1.5 max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => setBatchOp('in')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              batchOp === 'in'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Giriş Yap (+1)</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchOp('out')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              batchOp === 'out'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Çıkış Yap (-1)</span>
          </button>
        </div>
      )}

      {/* Kamera Alanı & Hedef Vizörü */}
      <div className="relative flex-1 flex items-center justify-center my-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-1">
        <div id={containerId} className="w-full max-w-md max-h-[65vh] rounded-2xl overflow-hidden flex items-center justify-center" />

        {/* Lazer Tarama Çizgisi Animasyonu */}
        {!cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[280px] h-[170px] border-2 border-emerald-500/80 rounded-xl relative shadow-[0_0_25px_rgba(16,185,129,0.25)]">
              {/* Köşe Vurguları */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />

              {/* Lazer Çizgisi */}
              <div
                className={`absolute left-2 right-2 h-0.5 animate-pulse top-1/2 -translate-y-1/2 ${
                  scannerMode === 'batch_add'
                    ? 'bg-emerald-400 shadow-[0_0_14px_#10b981]'
                    : scannerMode === 'batch_count'
                    ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                    : 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                }`}
              />
            </div>
          </div>
        )}

        {/* Seri Modda Anlık Okundu / Kayıtsız Bildirim Kartı */}
        {batchFeedback && (
          <div
            className={`absolute top-4 inset-x-4 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce z-20 border ${
              batchFeedback.type === 'success'
                ? 'bg-emerald-600/95 border-emerald-400 text-white'
                : batchFeedback.type === 'unknown'
                ? 'bg-amber-500/95 border-amber-300 text-slate-950'
                : 'bg-rose-600/95 border-rose-400 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {batchFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : batchFeedback.type === 'unknown' ? (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs truncate leading-tight">{batchFeedback.title}</div>
                <div className="text-[11px] opacity-90 truncate mt-0.5">{batchFeedback.detail}</div>
              </div>
            </div>

            {/* Kayıtsız barkod ise hemen hızlı tanımlama butonu */}
            {batchFeedback.type === 'unknown' && batchFeedback.rawCode && (
              <button
                type="button"
                onClick={() => handleStartQuickAdd(batchFeedback.rawCode!)}
                className="py-1.5 px-3 bg-slate-950 text-amber-300 font-bold text-xs rounded-xl border border-amber-300/40 active:scale-95 shrink-0 shadow"
              >
                Tanımla
              </button>
            )}
          </div>
        )}

        {/* HIZLI SERİ YENİ ÜRÜN TANIMLAMA MİNİ FORMU */}
        {quickAdd && (
          <div className="absolute inset-x-3 bottom-3 top-3 z-30 bg-slate-900/98 border border-emerald-500/50 rounded-3xl p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between animate-fade-in overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Seri Yeni Ürün Girişi</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAdd(null);
                    quickAddRef.current = null;
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Okunan Barkod Rozeti */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Okunan Barkod:</span>
                <span className="font-mono font-bold text-emerald-300 text-sm tracking-wide">{quickAdd.barcode}</span>
              </div>

              {/* Ürün Adı */}
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickAdd.name}
                  onChange={(e) => setQuickAdd({ ...quickAdd, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveQuickAddProduct();
                    }
                  }}
                  placeholder="Örn: 10'luk Çelik Dübel, M8 Civata..."
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Miktar & Birim Yan Yana */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-300 font-bold block mb-1">
                    Giriş Miktarı *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quickAdd.currentStock}
                    onChange={(e) => setQuickAdd({ ...quickAdd, currentStock: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold text-center focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-bold block mb-1">
                    Birim
                  </label>
                  <select
                    value={quickAdd.unit}
                    onChange={(e) => setQuickAdd({ ...quickAdd, unit: e.target.value as UnitType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Paket">Paket</option>
                    <option value="Koli">Koli</option>
                    <option value="Kg">Kg</option>
                    <option value="Metre">Metre</option>
                    <option value="Litre">Litre</option>
                  </select>
                </div>
              </div>

              {/* Raf & Kategori (Hızlı) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Raf Konumu (Opsiyonel)</label>
                  <input
                    type="text"
                    value={quickAdd.shelfLocation}
                    onChange={(e) => setQuickAdd({ ...quickAdd, shelfLocation: e.target.value })}
                    placeholder="Örn: A-1, Raf-2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={quickAdd.category}
                    onChange={(e) => setQuickAdd({ ...quickAdd, category: e.target.value })}
                    placeholder="Örn: Hırdavat, Civata"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Butonlar: Kaydet & Sıradakine Geç */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => handleSaveQuickAddProduct()}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Kaydet & Sıradaki Barkoda Geç</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuickAdd(null);
                  quickAddRef.current = null;
                }}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-medium"
              >
                Bu Ürünü Atla (İptal)
              </button>
            </div>
          </div>
        )}

        {/* Hata Bildirimi & Manuel Barkod Giriş Kutusu */}
        {cameraError && (
          <div className="absolute inset-x-4 bg-slate-900/95 border border-red-500/40 p-5 rounded-2xl text-center shadow-2xl backdrop-blur-md">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-200">{cameraError}</p>

            <div className="my-3 p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-[11px] text-slate-300 flex items-start gap-2 text-left">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Tarayıcıda kilit simgesine veya telefon ayarlarından <strong>Kamera İzni</strong>'ne izin verin.
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">Veya barkod numarasını elle yazabilirsiniz:</p>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Örn: 8690504031234"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>İşle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={startScanner}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-red-300 rounded-xl text-xs font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alt Bilgi & Mod Özeti */}
      <div className="text-center pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        {scannerMode === 'batch_add' ? (
          <div className="space-y-0.5">
            <p className="text-xs text-emerald-300 font-bold">
              ⚡ Seri Ürün Girişi: Barkodu okutun, adını yazıp kaydedin ({newProductsCount} yeni ürün eklendi).
            </p>
            <p className="text-[10px] text-slate-400">
              Kamera kesintisiz açık kalır, masadaki tüm ürünleri sırayla depoya yükleyebilirsiniz.
            </p>
          </div>
        ) : scannerMode === 'batch_count' ? (
          <div className="space-y-0.5">
            <p className="text-xs text-amber-300 font-bold">
              ⚡ Seri Sayım: Barkodları arka arkaya okutun ({batchCount} adet işlendi).
            </p>
            <p className="text-[10px] text-slate-400">
              Kayıtlı ürünlerin stoğu anında güncellenir.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Barkodu çerçeve içine hizalayın. Anında otomatik okunacaktır.</p>
        )}
      </div>
    </div>
  );
};
