import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Barcode, MapPin, Tag, Package, Crown, Upload, Save } from 'lucide-react';
import { db } from '../db';
import { Product, UnitType } from '../types';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';
import { canAddMoreProducts, getTrialInfo } from '../services/license';
import { importProductsFromFile } from '../services/csv';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBarcode?: string;
  editingProduct?: Product | null;
  onProductAdded?: () => void;
  onOpenLicense?: () => void;
  isOnline?: boolean;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  defaultBarcode = '',
  editingProduct = null,
  onProductAdded,
  onOpenLicense,
  isOnline = true
}) => {
  const [barcode, setBarcode] = useState(defaultBarcode);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Genel');
  const [shelfLocation, setShelfLocation] = useState('Raf A-1');
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [unit, setUnit] = useState<UnitType>('Adet');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editingProduct) {
        setBarcode(editingProduct.barcode);
        setName(editingProduct.name);
        setCategory(editingProduct.category);
        setShelfLocation(editingProduct.shelfLocation);
        setInitialStock(editingProduct.currentStock);
        setMinStock(editingProduct.minStock);
        setUnit(editingProduct.unit);
      } else {
        setBarcode(defaultBarcode || '');
        setName('');
        setCategory('Genel');
        setShelfLocation('Raf A-1');
        setInitialStock(0);
        setMinStock(10);
        setUnit('Adet');
      }
    }
  }, [isOpen, defaultBarcode, editingProduct]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importProductsFromFile(file);
      playSuccessBeep();
      if (onProductAdded) onProductAdded();
      onClose();
    } catch (err) {
      setError('Excel / CSV dosyası işlenirken hata oluştu: ' + ((err as Error).message || ''));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!barcode.trim() || !name.trim()) {
      setError('Barkod ve ürün adı zorunludur.');
      return;
    }

    try {
      const now = new Date().toISOString();

      if (editingProduct && editingProduct.id) {
        // ÜRÜN GÜNCELLEME (DÜZENLEME)
        // Barkod değiştiyse başka üründe var mı kontrolü
        if (barcode.trim() !== editingProduct.barcode) {
          const duplicate = await db.products.where('barcode').equals(barcode.trim()).first();
          if (duplicate && duplicate.id !== editingProduct.id) {
            setError('Bu barkod başka bir üründe zaten kayıtlı!');
            return;
          }
        }

        const stockDiff = initialStock - editingProduct.currentStock;

        await db.products.update(editingProduct.id, {
          barcode: barcode.trim(),
          name: name.trim(),
          category: category.trim() || 'Genel',
          shelfLocation: shelfLocation.trim() || 'Depo',
          currentStock: initialStock,
          minStock,
          unit,
          updatedAt: now
        });

        if (stockDiff !== 0) {
          await db.movements.add({
            productId: editingProduct.id,
            productName: name.trim(),
            barcode: barcode.trim(),
            type: stockDiff > 0 ? 'in' : 'out',
            previousStock: editingProduct.currentStock,
            newStock: initialStock,
            delta: Math.abs(stockDiff),
            timestamp: now,
            note: 'Ürün Düzenleme ile Stok Düzeltildi',
            isSynced: isOnline
          });
        }

        playSuccessBeep();
        if (onProductAdded) onProductAdded();
        onClose();
        return;
      }

      // YENİ ÜRÜN EKLEME
      // 7 Günlük Deneme / PRO Kontrolü
      if (!canAddMoreProducts()) {
        playErrorBuzzer();
        const trial = getTrialInfo();
        setError('7 günlük ücretsiz deneme süreniz sona erdi. Sınırsız ürün eklemeye devam etmek için lütfen PRO lisansınızı etkinleştirin.');
        return;
      }

      // Barkod çakışma kontrolü
      const existing = await db.products.where('barcode').equals(barcode.trim()).first();
      if (existing) {
        setError('Bu barkod zaten sistemde kayıtlı!');
        return;
      }

      const newId = await db.products.add({
        barcode: barcode.trim(),
        name: name.trim(),
        category: category.trim() || 'Genel',
        shelfLocation: shelfLocation.trim() || 'Depo',
        currentStock: initialStock,
        minStock,
        unit,
        lastCountDate: now,
        updatedAt: now
      });

      // İlk hareket kaydı
      await db.movements.add({
        productId: newId,
        productName: name.trim(),
        barcode: barcode.trim(),
        type: 'in',
        previousStock: 0,
        newStock: initialStock,
        delta: initialStock,
        timestamp: now,
        note: 'Yeni Ürün Tanımlandı',
        isSynced: isOnline
      });

      playSuccessBeep();
      if (onProductAdded) onProductAdded();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Ürün kaydedilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              {editingProduct ? 'Ürünü Düzenle' : 'Hızlı Ürün Tanımla'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gizli Dosya Girişi */}
        {!editingProduct && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Toplu Excel Yükleme Butonu */}
            <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-xl flex items-center justify-between">
              <div className="text-[11px] text-blue-200">
                <span className="font-bold">Toplu Yükleme:</span> Excel veya CSV listeniz var mı?
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Dosya Seç</span>
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col gap-2">
            <span>{error}</span>
            {error.includes('PRO') && onOpenLicense && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLicense();
                }}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Lisans Satın Al / Etkinleştir</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-xs">
          <div>
            <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
              <Barcode className="w-3.5 h-3.5" /> Barkod / EAN No *
            </label>
            <input
              type="text"
              required
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Örn: 8690123456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
              <Package className="w-3.5 h-3.5" /> Ürün Adı *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Koli Bandı Şeffaf 45x100m"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <Tag className="w-3.5 h-3.5" /> Kategori
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Örn: Hırdavat"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                <MapPin className="w-3.5 h-3.5" /> Raf Konumu
              </label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="Örn: Raf B-2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-400 mb-1 block font-medium">
                {editingProduct ? 'Mevcut Stok' : 'Başlangıç Stok'}
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-center font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block font-medium">Birim</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Adet">Adet</option>
                <option value="Koli">Koli</option>
                <option value="Paket">Paket</option>
                <option value="Kg">Kg</option>
                <option value="Metre">Metre</option>
                <option value="Litre">Litre</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 mb-1 block font-medium">Kritik Sınır</label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-center focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              {editingProduct ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingProduct ? 'Değişiklikleri Kaydet' : 'Ürünü Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
