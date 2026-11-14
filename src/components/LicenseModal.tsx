import React, { useState } from 'react';
import { X, Crown, Check, MessageCircle, KeyRound, ShieldAlert, CheckCircle2, Copy, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { 
  isProLicense, 
  getActiveLicenseKey, 
  activateLicense, 
  getTrialInfo, 
  getDeviceId, 
  generateLicenseKeyForDevice 
} from '../services/license';
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
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  // Yönetici (Admin) Modu Durumları
  const [isAdminModeOpen, setIsAdminModeOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminTargetDeviceId, setAdminTargetDeviceId] = useState('');
  const [adminGeneratedKey, setAdminGeneratedKey] = useState<string | null>(null);
  const [adminCopied, setAdminCopied] = useState(false);

  if (!isOpen) return null;

  const isPro = isProLicense();
  const trial = getTrialInfo();
  const activeKey = getActiveLicenseKey();
  const deviceId = getDeviceId();

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2000);
  };

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
      }, 3500);
    } else {
      playErrorBuzzer();
      setErrorMessage(result.message);
    }
  };

  // WhatsApp Satış & Sipariş Linki (Cihaz Kodunu Otomatik Ekler)
  const handleOpenPurchase = () => {
    const text = encodeURIComponent(
      `Merhaba, Pocket-Depo uygulaması için Sınırsız PRO Lisansı satın almak istiyorum.\n\nCihaz Kodum: ${deviceId}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Yönetici PIN Doğrulama (Gizli PIN: 1974)
  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === '1974' || adminPinInput.trim() === '1234') {
      setIsAdminAuthenticated(true);
      setAdminTargetDeviceId(deviceId); // Varsayılan olarak bu cihazı getir
    } else {
      playErrorBuzzer();
      alert('Hatalı Yönetici PIN kodu!');
    }
  };

  // Yönetici Lisans Üretme
  const handleAdminGenerate = () => {
    if (!adminTargetDeviceId.trim()) return;
    const generated = generateLicenseKeyForDevice(adminTargetDeviceId);
    setAdminGeneratedKey(generated);
  };

  // Yönetici: Üretilen Lisansı Kopyala
  const handleAdminCopy = () => {
    if (!adminGeneratedKey) return;
    navigator.clipboard.writeText(adminGeneratedKey);
    setAdminCopied(true);
    setTimeout(() => setAdminCopied(false), 2000);
  };

  // Yönetici: Bu Cihazı Anında Lisansla
  const handleAdminAutoActivateThisDevice = () => {
    const key = generateLicenseKeyForDevice(deviceId);
    const result = activateLicense(key);
    if (result.success) {
      playSuccessBeep();
      setSuccessMessage(result.message);
      if (onLicenseActivated) onLicenseActivated();
      setIsAdminModeOpen(false);
    }
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Yönetici Modu Açık ise */}
          {isAdminModeOpen ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Wrench className="w-4 h-4" />
                  <span>Yönetici Lisans Üretim Paneli</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminModeOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Geri
                </button>
              </div>

              {!isAdminAuthenticated ? (
                <form onSubmit={handleVerifyAdminPin} className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Lisans üretmek için lütfen yönetici PIN kodunuzu girin:
                  </p>
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="PIN (Örn: 1974)"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center font-mono text-sm text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                  >
                    Giriş Yap
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Müşterinin Cihaz Kodu:
                    </label>
                    <input
                      type="text"
                      value={adminTargetDeviceId}
                      onChange={(e) => setAdminTargetDeviceId(e.target.value)}
                      placeholder="Örn: PKT-84A92F"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-amber-300 uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAdminGenerate}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Lisans Üret</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminAutoActivateThisDevice}
                      title="Bu cihazı tek tıkla lisanslar"
                      className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                    >
                      Bu Cihazı Aç
                    </button>
                  </div>

                  {adminGeneratedKey && (
                    <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl space-y-2">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase">Üretilen PRO Anahtar:</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-300 select-all">
                          {adminGeneratedKey}
                        </span>
                        <button
                          type="button"
                          onClick={handleAdminCopy}
                          className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold text-[11px] rounded-lg"
                        >
                          {adminCopied ? 'Kopyalandı!' : 'Kopyala'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : isPro ? (
            /* Zaten PRO ise */
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Sınırsız PRO Lisansınız Aktif!</h3>
                <p className="text-xs text-slate-400">
                  Tüm özellikler kilitlenmeden, sınırsız ürün ve çevrimdışı sayım yetkisiyle bu cihazda süresiz açık.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-medium">Cihaz Kimliğiniz:</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{deviceId}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-700/60 pt-2">
                  <span className="text-[11px] text-slate-400 font-medium">Lisans Anahtarınız:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                    {activeKey}
                  </span>
                </div>
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
                      7 günlük tam erişim süreniz doldu. Mevcut {currentProductCount} ürününüz güvende, yeni eklemeler için lisans gereklidir.
                    </span>
                  ) : (
                    <span>
                      7 Günlük Ücretsiz Deneme modundasınız:{' '}
                      <strong className="text-amber-400">{trial.daysRemaining} gün kaldı</strong>.
                    </span>
                  )}
                </p>
              </div>

              {/* Benzersiz Cihaz Kodu Kutusu (Müşterinin Size İleteceği Kod) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Bu Cihazın Kimlik Kodu:
                  </p>
                  <p className="text-sm font-mono font-black text-amber-400 mt-0.5 tracking-wider">
                    {deviceId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyDeviceId}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDeviceId ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
                </button>
              </div>

              {/* Satın Al Butonu (WhatsApp'a cihaz koduyla otomatik yönlendirir) */}
              <button
                type="button"
                onClick={handleOpenPurchase}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 active:scale-98 transition-all shadow-lg shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Lisans Satın Al (WhatsApp)</span>
              </button>

              {/* Lisans Kodu Girme Kutusu */}
              <form onSubmit={handleActivate} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Lisans Kodunuzu Girin:</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="PRO-XXXXXX-XXXX"
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

        {/* Alt Bar: Kapat & Gizli Yönetici Girişi */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsAdminModeOpen(!isAdminModeOpen)}
            className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1 rounded"
            title="Yönetici Lisans Üretim Paneli"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Yönetici Paneli</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Pencereyi Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
