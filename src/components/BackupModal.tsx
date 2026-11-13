import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FileJson,
  HardDrive
} from 'lucide-react';
import { exportDatabaseBackup, importDatabaseBackup } from '../services/backup';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  productCount: number;
  movementCount: number;
  onRestoreSuccess?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  productCount,
  movementCount,
  onRestoreSuccess
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Yedeği İndir
  const handleDownloadBackup = async () => {
    try {
      setIsProcessing(true);
      const res = await exportDatabaseBackup();
      playSuccessBeep();
      setStatusMessage({
        type: 'success',
        text: res.message
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      playErrorBuzzer();
      setStatusMessage({
        type: 'error',
        text: 'Hata: ' + (err?.message || 'Yedek alınırken bir hata oluştu.')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Dosya Seçildiğinde
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatusMessage(null);
    }
  };

  // Geri Yüklemeyi Başlat
  const handleStartRestore = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      const res = await importDatabaseBackup(selectedFile, restoreMode);

      if (res.success) {
        playSuccessBeep();
        setStatusMessage({
          type: 'success',
          text: res.message
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (onRestoreSuccess) onRestoreSuccess();
      } else {
        playErrorBuzzer();
        setStatusMessage({
          type: 'error',
          text: res.message
        });
      }
    } catch (err: unknown) {
      playErrorBuzzer();
      setStatusMessage({
        type: 'error',
        text: 'Dosya okunurken hata oluştu: ' + ((err as Error).message || '')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Üst Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Veri Güvenliği & Yedek</h3>
              <p className="text-[11px] text-slate-400">Deponuzu sıfır riskle koruyun</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Bildirim Kartı */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Mevcut Durum */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-around text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Kayıtlı Ürün</span>
              <span className="text-lg font-black text-white block mt-0.5">{productCount} Kalem</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Geçmiş Hareket</span>
              <span className="text-lg font-black text-emerald-400 block mt-0.5">{movementCount} Kayıt</span>
            </div>
          </div>

          {/* 1. Aksiyon: Tam Yedek Al (Download) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">Tam Sistem Yedeği Al</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tüm ürün listeniz, stok adetleriniz ve geçmiş sayım hareketleriniz tek bir güvenli dosya (`.json`) olarak cihazınıza indirilir. WhatsApp'ınıza veya bilgisayarınıza kolayca gönderebilirsiniz.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Yedek Dosyasını İndir (.json)</span>
            </button>
          </div>

          {/* 2. Aksiyon: Yedekten Geri Yükle (Restore) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-slate-200">Yedekten Geri Yükle</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Daha önce aldığınız yedek dosyasını seçerek deponuzu anında geri yükleyin.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>{selectedFile ? `Seçildi: ${selectedFile.name}` : 'Yedek Dosyası Seç (.json)'}</span>
            </button>

            {selectedFile && (
              <div className="space-y-3 pt-2 border-t border-slate-700/60 animate-fade-in">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Geri Yükleme Yöntemi:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        restoreMode === 'merge'
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Mevcutla Birleştir
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        restoreMode === 'replace'
                          ? 'bg-rose-600 text-white border-rose-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Depoyu Sıfırla & Kur
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartRestore}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isProcessing ? 'Geri Yükleniyor...' : 'Geri Yüklemeyi Başlat'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Google Drive / Bulut Bilgilendirmesi */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-2.5">
            <Cloud className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-400 leading-snug">
              <span className="font-bold text-slate-200">Google Drive & Bulut Güvencesi:</span> İndirdiğiniz `.json` dosyasını telefonunuzun Google Drive veya dosya yöneticisi klasörüne atarak telefonunuz bozulsa veya değişse dahi verilerinizi 5 saniyede geri kurtarabilirsiniz.
            </div>
          </div>
        </div>

        {/* Alt Kapat */}
        <div className="pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs rounded-xl transition-all"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
