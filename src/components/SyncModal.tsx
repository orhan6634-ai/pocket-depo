import React from 'react';
import { X, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, ShieldCheck, Database } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isManualOffline: boolean;
  onToggleManualOffline: (value: boolean) => void;
  pendingCount: number;
  totalMovements: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onTriggerSync: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  isManualOffline,
  onToggleManualOffline,
  pendingCount,
  totalMovements,
  lastSyncTime,
  isSyncing,
  onTriggerSync
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Bağlantı & Senkronizasyon</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canlı Durum Kartı */}
        <div className="mt-4 p-3.5 rounded-xl border flex items-center justify-between transition-all bg-slate-950 border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isOnline ? 'Çevrimiçi (Aktif)' : 'Çevrimdışı (Kesinti)'}</span>
                {isManualOffline && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                    Test
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isOnline ? 'Sayım verileri anında eşlenir' : 'Sayım verileri yerel hafızada saklanır'}
              </div>
            </div>
          </div>
        </div>

        {/* Çalışma Modu Seçimi (Kullanıcının Test Edebilmesi İçin) */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-400 block mb-2">Çalışma Modu Testi:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleManualOffline(false)}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                !isManualOffline
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>Normal Çevrimiçi</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleManualOffline(true)}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                isManualOffline
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <WifiOff className="w-4 h-4" />
              <span>Çevrimdışı Modu Test Et</span>
            </button>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="text-[10px] text-slate-400">Bekleyen Sayım</div>
            <div className={`text-base font-bold mt-0.5 ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pendingCount} Adet
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-center">
            <div className="text-[10px] text-slate-400">Toplam Hareket</div>
            <div className="text-base font-bold text-white mt-0.5">{totalMovements} Kayıt</div>
          </div>
        </div>

        {/* Son Eşitleme Zamanı */}
        <div className="text-center text-[11px] text-slate-400 mb-4 flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Son Başarılı Eşitleme: <strong>{lastSyncTime || 'Henüz yapılmadı'}</strong></span>
        </div>

        {/* Şimdi Senkronize Et Butonu */}
        <button
          type="button"
          onClick={() => {
            onTriggerSync();
          }}
          disabled={isSyncing}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Eşitleniyor...' : 'Şimdi Senkronize Et'}</span>
        </button>

        {/* Güvence Açıklaması */}
        <div className="mt-3 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Pocket-Depo çift katmanlıdır: İnternet kopsa dahi veriler telefonunuzun IndexedDB çip hafızasında tutulur, hiçbir sayım kaybolmaz.</span>
        </div>
      </div>
    </div>
  );
};
