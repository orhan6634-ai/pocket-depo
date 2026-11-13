import React from 'react';
import { Package, Wifi, WifiOff, RefreshCw, HelpCircle, Crown, Check, MessageSquare } from 'lucide-react';
import { SyncStatus } from '../types';
import { isProLicense } from '../services/license';

interface NavbarProps {
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
  onToggleOnlineOffline: () => void;
  onOpenGuide: () => void;
  onOpenLicense: () => void;
  onOpenFeedback?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  syncStatus,
  onTriggerSync,
  onToggleOnlineOffline,
  onOpenGuide,
  onOpenLicense,
  onOpenFeedback
}) => {
  const isPro = isProLicense();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Sol Alan: Logo & İsim */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base text-white tracking-tight leading-none">
                Pocket-Depo
              </h1>
              <button
                type="button"
                onClick={onOpenLicense}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border transition-all active:scale-95 ${
                  isPro
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
                title="Lisans Durumu"
              >
                <Crown className="w-2.5 h-2.5 text-amber-400" />
                <span>{isPro ? 'PRO' : 'v1.0'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Mobil Sayım & Stok</p>
          </div>
        </div>

        {/* Sağ Alan: Destek İkonu + Rehber İkonu + Akıllı Durum Rozeti */}
        <div className="flex items-center gap-2">
          {/* Destek & Mesajlaşma İkonu */}
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="w-8 h-8 rounded-xl border border-slate-700 bg-slate-800/80 text-teal-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              title="Destek & Mesaj Gönder"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {/* Rehber İkonu */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="w-8 h-8 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
            title="Kullanım Rehberi"
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
          </button>

          {/* AKILLI DURUM BUTONU: Çevrimiçi / Çevrimdışı / Eşitleme TEK BUTONDA BİRLEŞTİRİLDİ */}
          <button
            type="button"
            onClick={() => {
              if (syncStatus.isOnline && syncStatus.pendingCount > 0) {
                // Bekleyen sayım varsa tıklandığında anında eşitle
                onTriggerSync();
              } else {
                // Diğer durumlarda modu değiştir (Çevrimiçi / Çevrimdışı)
                onToggleOnlineOffline();
              }
            }}
            disabled={syncStatus.isSyncing}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border active:scale-95 transition-all shadow-sm select-none ${
              syncStatus.isSyncing
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 cursor-wait'
                : !syncStatus.isOnline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-2 ring-amber-500/20'
                : (syncStatus.recentSyncedCount && syncStatus.recentSyncedCount > 0)
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 ring-2 ring-emerald-500/40 shadow-emerald-500/20 animate-bounce'
                : syncStatus.pendingCount > 0
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
            }`}
            title="Ağ Durumu / Dokunarak Değiştir veya Senkronize Et"
          >
            {syncStatus.isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                <span className="text-[11px]">Eşitleniyor...</span>
              </>
            ) : !syncStatus.isOnline ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">Çevrimdışı</span>
              </>
            ) : (syncStatus.recentSyncedCount && syncStatus.recentSyncedCount > 0) ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                <span className="text-[11px] font-black text-emerald-300">
                  {syncStatus.recentSyncedCount} Eklendi ✓
                </span>
              </>
            ) : syncStatus.pendingCount > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-[11px] font-black">{syncStatus.pendingCount} Bekliyor</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">Çevrimiçi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
