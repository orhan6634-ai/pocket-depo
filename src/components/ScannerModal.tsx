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
  AlertTriangle
} from 'lucide-react';
import { db } from '../db';
import { Product } from '../types';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';

export type BatchOpType = 'in' | 'out';

export interface BatchItemSummary {
  productId: number;
  productName: string;
  barcode: string;
  count: number;
  unit: string;
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
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchOp, setBatchOp] = useState<BatchOpType>('in');
  const [batchCount, setBatchCount] = useState<number>(0);
  const [batchItems, setBatchItems] = useState<Record<string, BatchItemSummary>>({});
  const [batchFeedback, setBatchFeedback] = useState<{
    type: 'success' | 'unknown' | 'error';
    title: string;
    detail: string;
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

  // Seri Modda Okunan Barkodu Arka Planda Doğrudan İşleme Motoru
  const handleBatchProcessBarcode = async (rawBarcode: string) => {
    const cleanCode = rawBarcode.trim();
    if (!cleanCode) return;

    try {
      const product = await db.products.where('barcode').equals(cleanCode).first();

      if (!product || product.id === undefined) {
        // Ürün depoda bulunamadı -> Kamera KAPANMAZ! Sesli ikaz ve geri bildirim
        playErrorBuzzer();
        setBatchFeedback({
          type: 'unknown',
          title: 'Kayıtsız Barkod!',
          detail: `${cleanCode} sistemde tanımlı değil.`
        });
        setTimeout(() => setBatchFeedback(null), 2500);
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

          // Seri modda aynı barkodun 1.2 saniye içinde art arda tetiklenmesini önle
          if (isBatchMode) {
            if (lastScannedCodeRef.current === cleanCode && now - lastScanTimeRef.current < 1200) {
              return;
            }
            lastScanTimeRef.current = now;
            lastScannedCodeRef.current = cleanCode;

            // Arka planda doğrudan stoka işle (Kamera açık kalır!)
            await handleBatchProcessBarcode(cleanCode);
          } else {
            // Normal mod: Kapat ve ana ekrana aktar
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
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      safeStopScanner();
    };
  }, [isOpen, isBatchMode]);

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

    if (isBatchMode) {
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
            {isBatchMode ? 'Seri Stok Okuyucu' : 'Barkod Okuyucu'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Seri Okuma Aç/Kapat Butonu */}
          <button
            type="button"
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              setBatchFeedback(null);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              isBatchMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Seri / Kesintisiz Okuma Modu"
          >
            <Zap className={`w-3.5 h-3.5 ${isBatchMode ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
            <span>{isBatchMode ? `Seri Aktif: ${batchCount}` : 'Seri Mod'}</span>
          </button>

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

      {/* Seri Mod Açıkken Giriş/Çıkış Yön Seçici */}
      {isBatchMode && (
        <div className="z-10 mt-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex items-center justify-between gap-2 max-w-md mx-auto w-full">
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
              <div className={`absolute left-2 right-2 h-0.5 shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2 ${isBatchMode ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' : 'bg-red-500'}`} />
            </div>
          </div>
        )}

        {/* Seri Modda Anlık Okundu / Kayıtsız Bildirim Kartı */}
        {batchFeedback && (
          <div
            className={`absolute top-4 inset-x-4 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce z-20 border ${
              batchFeedback.type === 'success'
                ? 'bg-emerald-600/95 border-emerald-400 text-white'
                : batchFeedback.type === 'unknown'
                ? 'bg-amber-500/95 border-amber-300 text-slate-950'
                : 'bg-rose-600/95 border-rose-400 text-white'
            }`}
          >
            {batchFeedback.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 shrink-0" />
            ) : batchFeedback.type === 'unknown' ? (
              <AlertTriangle className="w-6 h-6 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs truncate leading-tight">{batchFeedback.title}</div>
              <div className="text-[11px] opacity-90 truncate mt-0.5">{batchFeedback.detail}</div>
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

      {/* Alt Bilgi & Seri Mod Özeti */}
      <div className="text-center pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        {isBatchMode ? (
          <div className="space-y-1">
            <p className="text-xs text-amber-300 font-bold">
              ⚡ Seri Mod Açık: Barkodları arka arkaya okutun ({batchCount} adet okundu).
            </p>
            <p className="text-[11px] text-slate-400">
              Kayıtlı ürünler doğrudan stoka işlenir, kamera asla kapanmaz.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Barkodu çerçeve içine hizalayın. Anında otomatik okunacaktır.</p>
        )}
      </div>
    </div>
  );
};
