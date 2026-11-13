import React from 'react';
import { X, FileText, Share2, Download, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Package } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { exportProductsToCSV, exportProductsToXLSX } from '../services/csv';
import { playSuccessBeep } from '../services/sound';

interface DiscrepancyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  movements: StockMovement[];
}

export const DiscrepancyReportModal: React.FC<DiscrepancyReportModalProps> = ({
  isOpen,
  onClose,
  products,
  movements
}) => {
  const [downloadNotice, setDownloadNotice] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const totalStock = products.reduce((acc, p) => acc + p.currentStock, 0);
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);

  // Giriş ve Çıkış istatistikleri
  const totalIn = movements.filter((m) => m.type === 'in' || m.delta > 0).reduce((acc, m) => acc + Math.abs(m.delta), 0);
  const totalOut = movements.filter((m) => m.type === 'out' || m.delta < 0).reduce((acc, m) => acc + Math.abs(m.delta), 0);

  // WhatsApp Paylaşım Metni Oluşturucu
  const handleShareWhatsApp = () => {
    playSuccessBeep();
    const dateStr = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let text = `📦 *POCKET-DEPO RESMİ STOK RAPORU*\n`;
    text += `📅 *Tarih:* ${dateStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *GENEL ÖZET:*\n`;
    text += `• Toplam Kalem: *${products.length} Çeşit*\n`;
    text += `• Toplam Fiziki Stok: *${totalStock} Adet*\n`;
    text += `• Toplam Giriş: *+${totalIn}*\n`;
    text += `• Toplam Çıkış/Satış: *-${totalOut}*\n`;
    text += `• Kritik Stok Kalemi: *${criticalProducts.length} Ürün*\n\n`;

    if (criticalProducts.length > 0) {
      text += `🚨 *ACİL SİPARİŞ / KRİTİK LİSTE:*\n`;
      criticalProducts.forEach((p) => {
        text += `⚠️ *${p.name}* ➔ Kalan: ${p.currentStock} ${p.unit} (Kritik Sınır: ${p.minStock})\n`;
      });
      text += `\n`;
    }

    text += `📋 *DETAYLI ÜRÜN LİSTESİ:*\n`;
    products.slice(0, 15).forEach((p, idx) => {
      text += `${idx + 1}. ${p.name}: *${p.currentStock} ${p.unit}* [${p.shelfLocation}]\n`;
    });

    if (products.length > 15) {
      text += `... ve ${products.length - 15} ürün daha.\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Pocket-Depo Mobil Stok Asistanı ile oluşturuldu._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadExcel = async () => {
    try {
      await exportProductsToXLSX();
      playSuccessBeep();
      setDownloadNotice('✅ Excel raporunuz cihazınıza gönderildi! İndirilenler klasörünü ve üst bildirim çubuğunu kontrol edin.');
    } catch {
      await exportProductsToCSV();
      playSuccessBeep();
      setDownloadNotice('✅ CSV raporunuz hazırlandı!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Üst Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sayım & Envanter Raporu</h3>
              <p className="text-[11px] text-slate-400">Kayıp, çıkış ve kritik stok analizi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kaydırılabilir İçerik Alanı */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Toplam Fiziki Stok</div>
              <div className="text-xl font-black text-white mt-0.5">{totalStock}</div>
              <div className="text-[10px] text-slate-500">{products.length} farklı kalem</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20">
              <div className="text-[11px] text-rose-300">Kritik Stok Uyarısı</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">{criticalProducts.length}</div>
              <div className="text-[10px] text-rose-300/80">Acil sipariş gerekli</div>
            </div>
          </div>

          {/* Giriş vs Çıkış İstatistiği */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Girişler:</span>
              </span>
              <span className="font-bold text-white font-mono">+{totalIn}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-300 font-semibold">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Çıkışlar:</span>
              </span>
              <span className="font-bold text-white font-mono">-{totalOut}</span>
            </div>
          </div>

          {/* Kritik Stok Listesi (Varsa) */}
          {criticalProducts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Kritik Seviyedeki Ürünler ({criticalProducts.length})</span>
              </div>

              <div className="bg-slate-950 border border-rose-500/30 rounded-xl divide-y divide-rose-500/20 overflow-hidden">
                {criticalProducts.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-rose-100">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.shelfLocation} • {p.barcode}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-400 text-sm">{p.currentStock}</span>
                      <span className="text-[10px] text-slate-400 block">Min: {p.minStock} {p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son Hareketler Özeti */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>Son Sayım Hareketleri</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/80 overflow-hidden max-h-40 overflow-y-auto">
              {movements.slice(0, 5).map((m) => (
                <div key={m.id} className="p-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-medium">{m.productName}</span>
                    <span className="text-[10px] text-slate-500 block">{m.note || 'İşlem'}</span>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      m.delta > 0 ? 'text-emerald-400' : m.delta < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alt Butonlar: WhatsApp Paylaşımı & Excel İndirme */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {downloadNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-fade-in">
              {downloadNotice}
            </div>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:brightness-110 active:scale-95 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Raporu WhatsApp ile Paylaş</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel / CSV Formatında İndir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
