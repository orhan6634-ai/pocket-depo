import React, { useState, useEffect } from 'react';
import {
  Search,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Package
} from 'lucide-react';
import { Product } from '../types';
import { db } from '../db';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';
import { sendCriticalStockNotification } from '../services/notification';

interface CountModeProps {
  products: Product[];
  onOpenScanner: () => void;
  selectedProduct: Product | null;
  onSelectProduct: (p: Product | null) => void;
  isOnline?: boolean;
}

export type OperationType = 'in' | 'out' | 'count';

export const CountMode: React.FC<CountModeProps> = ({
  products,
  onOpenScanner,
  selectedProduct,
  onSelectProduct,
  isOnline = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // İşlem Modu: 'in' = Mal Girişi, 'out' = Mal Çıkışı, 'count' = Fiziki Sayım
  const [opType, setOpType] = useState<OperationType>('in');
  // Girilen miktar
  const [quantity, setQuantity] = useState<number>(1);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSavedFlash, setIsSavedFlash] = useState<boolean>(false);

  // Mevcut ürünün sırası
  const currentIndex = selectedProduct ? products.findIndex((p) => p.id === selectedProduct.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < products.length - 1;

  // Ürün seçildiğinde
  const handleSelect = (product: Product, initialOp: OperationType = opType) => {
    onSelectProduct(product);
    setOpType(initialOp);
    if (initialOp === 'count') {
      setQuantity(product.currentStock);
    } else {
      setQuantity(1);
    }
    playSuccessBeep();
  };

  // Mod değiştirme
  const handleSwitchMode = (mode: OperationType) => {
    setOpType(mode);
    if (!selectedProduct) return;
    if (mode === 'count') {
      setQuantity(selectedProduct.currentStock);
    } else {
      setQuantity(1);
    }
  };

  // Hızlı miktar artır/azalt
  const handleQuickAdjust = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Sayım modu ayarı
  const handleCountAdjust = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  // İleri / Geri Navigasyon
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < products.length) {
      const targetProduct = products[targetIndex];
      onSelectProduct(targetProduct);
      if (opType === 'count') {
        setQuantity(targetProduct.currentStock);
      } else {
        setQuantity(1);
      }
      playSuccessBeep();
    }
  };

  // Hareketi Kaydetme Motoru (Offline-First: Doğrudan IndexedDB'ye yazar)
  const handleSaveTransaction = async (goToNextAfterSave = false) => {
    if (!selectedProduct || selectedProduct.id === undefined) return;

    const previousStock = selectedProduct.currentStock;
    let newStock = previousStock;
    let delta = 0;
    let note = '';

    if (opType === 'in') {
      delta = Math.max(1, quantity);
      newStock = previousStock + delta;
      note = `Mal Girişi (+${delta})`;
    } else if (opType === 'out') {
      delta = -Math.max(1, quantity);
      newStock = Math.max(0, previousStock + delta);
      note = `Mal Çıkışı (${delta})`;
    } else {
      newStock = Math.max(0, quantity);
      delta = newStock - previousStock;
      note = `Fiziki Sayım (${delta >= 0 ? '+' : ''}${delta})`;
    }

    const now = new Date().toISOString();

    try {
      // 1. Ürün stoğunu güncelle
      await db.products.update(selectedProduct.id, {
        currentStock: newStock,
        lastCountDate: now,
        updatedAt: now
      });

      // 2. Hareket kaydını IndexedDB'ye ekle
      await db.movements.add({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        barcode: selectedProduct.barcode,
        type: opType,
        previousStock,
        newStock,
        delta,
        timestamp: now,
        note,
        isSynced: isOnline
      });

      playSuccessBeep();
      setIsSavedFlash(true);
      setTimeout(() => setIsSavedFlash(false), 600);

      // Kritik Stok Bildirimi
      if (newStock <= selectedProduct.minStock) {
        sendCriticalStockNotification(
          selectedProduct.name,
          newStock,
          selectedProduct.minStock,
          selectedProduct.unit
        );
      }

      setSaveSuccessMessage(
        `${selectedProduct.name}: Stok güncellendi (${newStock} ${selectedProduct.unit})`
      );
      setTimeout(() => setSaveSuccessMessage(null), 2500);

      // Otomatik sonraki ürüne geç veya miktarı sıfırla
      if (goToNextAfterSave && hasNext) {
        handleNavigate('next');
      } else {
        if (opType === 'count') {
          setQuantity(newStock);
        } else {
          setQuantity(1);
        }
      }
    } catch (err) {
      console.error('İşlem kaydedilemedi:', err);
      playErrorBuzzer();
    }
  };

  // Arama filtrelemesi
  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode.includes(searchQuery) ||
          p.shelfLocation.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Başarı Bildirimi Toast */}
      {saveSuccessMessage && (
        <div
          className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xl border ${
            isOnline
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
          }`}
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* SEÇİLİ ÜRÜN YOKSA: TEMİZ, DEV BARKOD TARA & ARAMA ALANI */}
      {!selectedProduct ? (
        <div className="space-y-4">
          {/* 1. Odak Noktası: Dev Başparmak Dostu Barkod Tara Butonu */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-110 active:scale-[0.98] text-white rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-3 border border-emerald-400/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-base tracking-wide flex items-center gap-2">
                <span>BARKOD TARA</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Kamera</span>
              </div>
              <div className="text-xs text-emerald-100/80">Raflardaki ürünleri anında okutun</div>
            </div>
          </button>

          {/* 2. Odak Noktası: Temiz Arama Çubuğu */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün adı, barkod veya raf konumu ara..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* 3. Odak Noktası: Kolay Dokunulan Ürün Listesi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
              <span>{searchQuery.trim() ? 'Arama Sonuçları' : 'Kayıtlı Ürünler'}</span>
              <span>{(searchQuery.trim() ? filteredProducts : products).length} Çeşit</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80 shadow-lg">
              {(searchQuery.trim() ? filteredProducts : products).map((p) => {
                const isCritical = p.currentStock <= p.minStock;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full min-h-[64px] p-4 text-left flex items-center justify-between transition-all active:bg-slate-800 ${
                      isCritical
                        ? 'bg-rose-950/20 hover:bg-rose-900/30 border-l-4 border-l-rose-500'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className={`font-bold text-sm ${isCritical ? 'text-rose-200' : 'text-white'}`}>
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-emerald-400">{p.barcode}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {p.shelfLocation}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-black text-base ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {p.currentStock}{' '}
                        <span className="text-xs font-normal text-slate-400">{p.unit}</span>
                      </div>
                      {isCritical && (
                        <span className="text-[10px] text-rose-300 font-bold block mt-0.5">
                          ⚠️ Min: {p.minStock}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* SEÇİLİ ÜRÜN EKRANI: SADELEŞTİRİLMİŞ, MİNİMALİST VE TEK ELLE KULLANIM */
        <div className="space-y-3">
          <div
            className={`bg-slate-900 border rounded-2xl p-4 shadow-2xl relative overflow-hidden transition-all duration-300 ${
              isSavedFlash
                ? 'border-emerald-400 ring-4 ring-emerald-400/30 scale-[1.01]'
                : opType === 'in'
                ? 'border-emerald-500/40'
                : opType === 'out'
                ? 'border-rose-500/40'
                : 'border-teal-500/40'
            }`}
          >
            {/* Üst Başlık & Kapatma Butonu */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {selectedProduct.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentIndex + 1} / {products.length}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1 leading-snug">
                  {selectedProduct.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-emerald-400">{selectedProduct.barcode}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-slate-300">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {selectedProduct.shelfLocation}
                  </span>
                </div>
              </div>

              {/* Kapat ve Listeye Dön */}
              <button
                type="button"
                onClick={() => onSelectProduct(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center shrink-0 active:scale-95"
                title="Ürün Listesine Dön"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SADE SEGMENT MOD SEÇİCİ (3 Kaba Kutu Yerine Modern Sekme) */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 my-3">
              <button
                type="button"
                onClick={() => handleSwitchMode('in')}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  opType === 'in'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>+ Giriş</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('out')}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  opType === 'out'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                <span>- Çıkış</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('count')}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  opType === 'count'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>☷ Sayım</span>
              </button>
            </div>

            {/* ODAK STOK GÖSTERGESİ (Net ve Ferah) */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-around text-center mb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Mevcut Stok</span>
                <span className="text-xl font-black text-slate-200">
                  {selectedProduct.currentStock}{' '}
                  <span className="text-xs font-normal text-slate-400">{selectedProduct.unit}</span>
                </span>
              </div>

              <div className="w-[1px] h-8 bg-slate-800" />

              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  {opType === 'in' ? 'Giriş Sonrası' : opType === 'out' ? 'Kalan Stok' : 'Yeni Sayım'}
                </span>
                <span
                  className={`text-xl font-black flex items-center justify-center gap-1 ${
                    opType === 'in'
                      ? 'text-emerald-400'
                      : opType === 'out'
                      ? 'text-rose-400'
                      : 'text-teal-300'
                  }`}
                >
                  {opType === 'in'
                    ? selectedProduct.currentStock + quantity
                    : opType === 'out'
                    ? Math.max(0, selectedProduct.currentStock - quantity)
                    : quantity}
                  <span className="text-xs font-normal text-slate-400">{selectedProduct.unit}</span>
                </span>
              </div>
            </div>

            {/* MİKTAR STEPPER & HIZLI HAP BUTONLAR (Büyük Dokunma Alanları) */}
            <div className="space-y-2.5">
              {/* Hızlı Miktar Hapları (Moda göre + / - uyumlu) */}
              {opType === 'count' ? (
                <div className="grid grid-cols-4 gap-2">
                  {[-10, -5, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleCountAdjust(val)}
                      className={`py-2 rounded-xl active:scale-95 font-bold text-xs border transition-all ${
                        val < 0
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setQuantity((prev) => prev + val)}
                      className={`py-2 rounded-xl active:scale-95 font-bold text-xs border transition-all ${
                        opType === 'out'
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {opType === 'out' ? `-${val}` : `+${val}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Büyük Stepper (+ / - ve Miktar) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    opType === 'count' ? handleCountAdjust(-1) : handleQuickAdjust(-1)
                  }
                  className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-2xl flex items-center justify-center border border-slate-700 shrink-0"
                >
                  -
                </button>

                <input
                  type="number"
                  min={opType === 'count' ? 0 : 1}
                  value={quantity === 0 && opType !== 'count' ? '' : quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setQuantity(opType === 'count' ? Math.max(0, v) : Math.max(1, v));
                  }}
                  className="flex-1 h-14 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl text-center text-2xl font-black text-white focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() =>
                    opType === 'count' ? handleCountAdjust(1) : handleQuickAdjust(1)
                  }
                  className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-2xl flex items-center justify-center border border-slate-700 shrink-0"
                >
                  +
                </button>
              </div>

              {/* TEK BÜYÜK ONAY BUTONU */}
              <button
                type="button"
                onClick={() => handleSaveTransaction(hasNext)}
                className={`w-full min-h-[56px] rounded-2xl text-white font-black text-base shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                  opType === 'in'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-950/50'
                    : opType === 'out'
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 shadow-rose-950/50'
                    : 'bg-gradient-to-r from-teal-600 to-blue-600 shadow-teal-950/50'
                }`}
              >
                <Check className="w-5 h-5" />
                <span>
                  {opType === 'in'
                    ? `Girişi Onayla (+${quantity} ${selectedProduct.unit})`
                    : opType === 'out'
                    ? `Çıkışı Onayla (-${quantity} ${selectedProduct.unit})`
                    : `Sayımı Kaydet (${quantity} ${selectedProduct.unit})`}
                </span>
              </button>

              {/* İleri / Geri Navigasyon Butonları */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('prev')}
                  disabled={!hasPrev}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-xs font-semibold text-slate-300 disabled:opacity-30 active:scale-95 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Önceki Ürün</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('next')}
                  disabled={!hasNext}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-xs font-semibold text-slate-300 disabled:opacity-30 active:scale-95 flex items-center gap-1"
                >
                  <span>Sonraki Ürün</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
