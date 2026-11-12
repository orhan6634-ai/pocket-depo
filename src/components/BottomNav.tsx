import React from 'react';
import { ScanBarcode, Boxes, History } from 'lucide-react';

export type TabType = 'count' | 'stock' | 'history';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        <button
          onClick={() => onTabChange('count')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
            activeTab === 'count'
              ? 'text-emerald-400 bg-emerald-500/10 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScanBarcode className="w-5 h-5 mb-1" />
          <span className="text-xs">Hızlı Sayım</span>
        </button>

        <button
          onClick={() => onTabChange('stock')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
            activeTab === 'stock'
              ? 'text-emerald-400 bg-emerald-500/10 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-5 h-5 mb-1" />
          <span className="text-xs">Stok Listesi</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
            activeTab === 'history'
              ? 'text-emerald-400 bg-emerald-500/10 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5 mb-1" />
          <span className="text-xs">Hareketler</span>
        </button>
      </div>
    </nav>
  );
};
