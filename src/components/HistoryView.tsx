import React, { useState } from 'react';
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { StockMovement } from '../types';
import { db } from '../db';
import { playSuccessBeep } from '../services/sound';

interface HistoryViewProps {
  movements: StockMovement[];
  onTriggerSync?: () => void;
  isSyncing?: boolean;
  isOnline?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  movements,
  onTriggerSync,
  isSyncing,
  isOnline = true
}) => {
  const pendingCount = movements.filter((m) => !m.isSynced).length;

  // Tekil silme / geri alma onayı için seçili hareket
  const [selectedForDelete, setSelectedForDelete] = useState<StockMovement | null>(null);
  // Tümünü temizle onay modalı
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Tekil hareketi sil (isteğe bağlı olarak stoğu geri al)
  const handleDeleteMovement = async (revertStock: boolean) => {
    if (!selectedForDelete || selectedForDelete.id === undefined) return;

    try {
      if (revertStock) {
        const product = await db.products.get(selectedForDelete.productId);
        if (product && product.id !== undefined) {
          const revertedStock = Math.max(0, product.currentStock - selectedForDelete.delta);
          await db.products.update(product.id, {
            currentStock: revertedStock,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await db.movements.delete(selectedForDelete.id);
      playSuccessBeep();
    } catch (err) {
      console.error('Hareket silinemedi:', err);
    } finally {
      setSelectedForDelete(null);
    }
  };

  // Tüm hareket günlüğünü temizle (ürün stoklarına dokunmaz)
  const handleClearAllHistory = async () => {
    try {
      await db.movements.clear();
      playSuccessBeep();
    } catch (err) {
      console.error('Geçmiş temizlenemedi:', err);
    } finally {
      setIsClearAllOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Üst Başlık & Günlüğü Temizle Butonu */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Sayım & Hareketler</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tüm giriş, çıkış ve sayım günlüğü</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {movements.length} Kayıt
          </span>

          {movements.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Tüm Hareket Geçmişini Temizle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Temizle</span>
            </button>
          )}
        </div>
      </div>

      {/* Bekleyen Senkronizasyon Aksiyon Kartı */}
      {pendingCount > 0 && !isOnline && onTriggerSync && (
        <div className="bg-amber-500/15 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div>
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{pendingCount} Adet Çevrimdışı Hareket Cihazda Güvende</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              İnternet bağlantısı geldiğinde otomatik eşitlenecektir.
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Aktarılıyor...' : 'Şimdi Aktar'}</span>
          </button>
        </div>
      )}

      {/* Hareket Listesi */}
      <div className="space-y-2">
        {movements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
            Henüz yapılmış bir stok hareketi yok.
          </div>
        ) : (
          movements.map((m) => {
            const isPositive = m.delta > 0;
            const isZero = m.delta === 0;

            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm truncate">{m.productName}</span>
                    {m.type === 'in' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 shrink-0">
                        <ArrowDownToLine className="w-2.5 h-2.5" /> GİRİŞ
                      </span>
                    ) : m.type === 'out' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0">
                        <ArrowUpFromLine className="w-2.5 h-2.5" /> ÇIKIŞ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-0.5 shrink-0">
                        <RotateCcw className="w-2.5 h-2.5" /> SAYIM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-slate-400 text-[11px]">{m.barcode}</span>
                    <span>•</span>
                    <span className="text-slate-400">
                      {new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {m.note && <div className="text-[11px] text-slate-500 truncate">{m.note}</div>}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right flex flex-col items-end gap-1">
                    <div
                      className={`text-sm font-bold flex items-center gap-1 ${
                        isZero ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {!isZero && (isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />)}
                      <span>
                        {isZero ? '0' : `${isPositive ? '+' : ''}${m.delta}`}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      {m.previousStock} ➔ <span className="font-semibold text-slate-300">{m.newStock}</span>
                    </div>

                    <div>
                      {m.isSynced ? (
                        <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Senkronize
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 flex items-center gap-1 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-400" /> Yerelde Bekliyor
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tekil Silme / Geri Alma İkonu */}
                  <button
                    type="button"
                    onClick={() => setSelectedForDelete(m)}
                    className="p-2 rounded-xl bg-slate-800/70 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 active:scale-95 transition-all"
                    title="Kaydı Sil veya Geri Al"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tekil Silme / Geri Alma Onay Modalı */}
      {selectedForDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Hareket Kaydını Sil</h3>
                  <p className="text-[11px] text-slate-400">{selectedForDelete.productName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForDelete(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1">
              <div>
                İşlem Miktarı:{' '}
                <strong className={selectedForDelete.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {selectedForDelete.delta >= 0 ? `+${selectedForDelete.delta}` : selectedForDelete.delta}
                </strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Bu kaydı silerken mevcut stok adedini eski haline geri almak ister misiniz?
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDeleteMovement(true)}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>İşlemi Geri Al (Stoğu Düzelt) & Sil</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMovement(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs active:scale-95 transition-all border border-slate-700"
              >
                Sadece Kaydı Sil (Stoğa Dokunma)
              </button>

              <button
                type="button"
                onClick={() => setSelectedForDelete(null)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tüm Geçmişi Temizle Onay Modalı */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tüm Hareketleri Temizle</h3>
                  <p className="text-[11px] text-slate-400">{movements.length} adet kayıt silinecek</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tüm geçmiş hareket günlüğü temizlenecektir. <strong className="text-emerald-400">Ürünlerinizin mevcut stok adetleri korunacaktır.</strong> Onaylıyor musunuz?
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs active:scale-95 transition-all"
              >
                Evet, Temizle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
