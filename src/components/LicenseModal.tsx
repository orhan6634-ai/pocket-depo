import React, { useState } from 'react';
import { X, Crown, Check, MessageCircle, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { isProLicense, getActiveLicenseKey, activateLicense, getTrialInfo } from '../services/license';
import { playSuccessBeep, playErrorBuzzer } from '../services/sound';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProductCount: number;
  onLicenseActivated?: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  currentProductCount,
  onLicenseActivated
}) => {
  const [inputKey, setInputKey] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPro = isProLicense();
  const trial = getTrialInfo();
  const activeKey = getActiveLicenseKey();

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = activateLicense(inputKey);
    if (result.success) {
      playSuccessBeep();
      setSuccessMessage(result.message);
      setInputKey('');
      if (onLicenseActivated) onLicenseActivated();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } else {
      playErrorBuzzer();
      setErrorMessage(result.message);
    }
  };

  // WhatsApp Satış & Sipariş Linki
  const handleOpenPurchase = () => {
    const text = encodeURIComponent(
      `Merhaba, Pocket-Depo uygulaması için Sınırsız PRO Lisansı satın almak istiyorum. Bilgi alabilir miyim?`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Üst Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isPro
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : trial.isExpired
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {isPro
                ? '👑 PRO Lisans Aktif'
                : trial.isExpired
                ? '⚠️ Deneme Süresi Doldu'
                : `7 Günlük Deneme (${trial.daysRemaining} Gün Kaldı)`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isPro ? (
            /* Zaten PRO ise */
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Sınırsız PRO Lisansınız Aktif!</h3>
                <p className="text-xs text-slate-400">
                  Tüm özellikler kilitlenmeden, sınırsız ürün ve çevrimdışı sayım yetkisiyle süresiz kullanıma açık.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-left">
                <p className="text-[11px] text-slate-400 font-medium">Lisans Anahtarınız:</p>
                <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5 tracking-wider">
                  {activeKey}
                </p>
              </div>
            </div>
          ) : (
            /* Ücretsiz Deneme Sürümünde veya Süresi Dolmuş ise */
            <>
              {/* Başlık & Sayaç */}
              <div className="text-center space-y-2">
                <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-slate-950 shadow-lg mb-2 ${
                  trial.isExpired
                    ? 'bg-gradient-to-tr from-rose-500 to-amber-500 shadow-rose-500/20 text-white'
                    : 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-amber-500/20'
                }`}>
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {trial.isExpired ? 'Deneme Süresi Doldu — PRO Lisans Edinin' : "Pocket-Depo PRO'ya Yükseltin"}
                </h3>
                <p className="text-xs text-slate-400">
                  {trial.isExpired ? (
                    <span className="text-rose-400 font-medium">
                      7 günlük tam erişim süreniz doldu. Mevcut {currentProductCount} ürününüz korunuyor, yeni eklemeler için PRO lisans gereklidir.
                    </span>
                  ) : (
                    <span>
                      7 Günlük Ücretsiz Deneme modundasınız:{' '}
                      <strong className="text-amber-400">{trial.daysRemaining} gün kaldı</strong>. Mevcut {currentProductCount} ürün kayıtlı.
                    </span>
                  )}
                </p>
              </div>

              {/* PRO Avantajları */}
              <div className="space-y-2.5">
                {[
                  {
                    title: 'Sınırsız Ürün ve Depo Sayımı',
                    desc: 'Hiçbir süre veya adet kısıtlaması olmadan yüz binlerce ürünü anında sayın.'
                  },
                  {
                    title: 'Sınırsız Excel / CSV Aktarımı',
                    desc: 'Tüm sayım sonuçlarını tek tıkla Excel tablosu olarak indirin ve yükleyin.'
                  },
                  {
                    title: '%100 Kesintisiz Çevrimdışı Çalışma',
                    desc: 'İnternet kesintisi olmadan sahada personelinize tam yetki verin.'
                  },
                  {
                    title: 'Tam Sistem Yedeği & Veri Güvenliği',
                    desc: 'Tüm deponuzu güvenle .json olarak yedekleyin ve sıfır riskle koruyun.'
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800"
                  >
                    <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Satın Al Butonu */}
              <button
                type="button"
                onClick={handleOpenPurchase}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 active:scale-98 transition-all shadow-lg shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Lisans Satın Al / Bilgi Al (WhatsApp)</span>
              </button>

              {/* Lisans Kodu Girme Kutusu */}
              <form onSubmit={handleActivate} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Lisans Kodunuz Var mı?</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="POCKET-PRO-XXXX"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs active:scale-95 transition-all shadow-md shadow-amber-500/20 shrink-0"
                  >
                    Etkinleştir
                  </button>
                </div>

                {errorMessage && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5 animate-shake">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </p>
                )}

                {successMessage && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{successMessage}</span>
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Alt Kapat Butonu */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/90">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Pencereyi Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
