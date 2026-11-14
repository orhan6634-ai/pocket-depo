import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet,
  WifiOff,
  ScanLine,
  Sparkles,
  ShieldCheck,
  Camera,
  Package,
  PlusCircle,
  Download,
  HardDrive,
  RefreshCw,
  EyeOff
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
  onOpenAddModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenBackupModal?: () => void;
  onToggleOnlineOffline?: () => void;
  onNavigateTab?: (tab: 'count' | 'stock' | 'history') => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenScanner,
  onOpenAddModal,
  onOpenExportModal,
  onOpenBackupModal,
  onToggleOnlineOffline,
  onNavigateTab
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const steps = [
    {
      stepIndex: 0,
      badge: 'Adım 1 / 5 • Barkod Sayımı',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      title: 'Kamera ile Barkod Okuma & Sayım',
      subtitle: 'Telefonun kamerasını barkoda tutun, saniyeler içinde sayın',
      icon: <ScanLine className="w-10 h-10 text-emerald-400" />,
      features: [
        {
          title: 'Işık Hızında Otomatik Tanıma',
          desc: 'Kamerayı barkoda tuttuğunuz an sesli (BİP) ve titreşimli onay alırsınız.'
        },
        {
          title: 'Bilinmeyen Barkod Sihirbazı',
          desc: 'Depoda henüz olmayan bir barkod okutursanız, anında yeni ürün kayıt ekranı açılır.'
        }
      ],
      actionText: 'Kamerayı Aç ve Şimdi Dene',
      actionIcon: <Camera className="w-4 h-4" />,
      actionColor: 'from-emerald-600 to-teal-500 text-white shadow-emerald-500/25',
      onAction: () => {
        handleSavePreferenceAndClose();
        onNavigateTab?.('count');
        setTimeout(() => onOpenScanner?.(), 250);
      }
    },
    {
      stepIndex: 1,
      badge: 'Adım 2 / 5 • Ürün Yönetimi',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      title: 'Stok Listesi & Seri Ürün Ekleme',
      subtitle: 'Tüm ürünlerinizi, raf konumlarını ve kritik stokları yönetin',
      icon: <Package className="w-10 h-10 text-blue-400" />,
      features: [
        {
          title: 'Yeni Ürün Ekleme Sihirbazı',
          desc: 'Barkod, ürün adı, raf konumu, birim ve kritik stok sınırını saniyeler içinde tanımlayın.'
        },
        {
          title: 'Hızlı Arama & Filtreleme',
          desc: 'İsim, barkod veya rafa göre anında filtreleyin, kritik seviyedeki ürünleri tek tıkla listeleyin.'
        }
      ],
      actionText: 'Yeni Ürün Ekleme Penceresini Aç',
      actionIcon: <PlusCircle className="w-4 h-4" />,
      actionColor: 'from-blue-600 to-indigo-600 text-white shadow-blue-500/25',
      onAction: () => {
        handleSavePreferenceAndClose();
        onNavigateTab?.('stock');
        setTimeout(() => onOpenAddModal?.(), 250);
      }
    },
    {
      stepIndex: 2,
      badge: 'Adım 3 / 5 • Dışa Aktarma',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      title: 'Excel / CSV İndirme & WhatsApp Paylaşımı',
      subtitle: 'Sayım sonuçlarını doğrudan telefonunuza indirin veya paylaşın',
      icon: <FileSpreadsheet className="w-10 h-10 text-emerald-400" />,
      features: [
        {
          title: 'Android Yerel Dosya Kaydı (.xlsx & .csv)',
          desc: 'Hazırlanan stok tablosu doğrudan telefonunuzun İndirilenler klasörüne nizami kaydedilir.'
        },
        {
          title: 'WhatsApp Formatlı Tablo',
          desc: 'Bilgisayara gerek kalmadan güncel stok tablosunu WhatsApp ile anında amirinize veya ekibe iletin.'
        }
      ],
      actionText: 'İndirme / Paylaşma Menüsünü Aç & Dene',
      actionIcon: <Download className="w-4 h-4" />,
      actionColor: 'from-emerald-600 to-green-600 text-white shadow-emerald-500/25',
      onAction: () => {
        handleSavePreferenceAndClose();
        onNavigateTab?.('stock');
        setTimeout(() => onOpenExportModal?.(), 250);
      }
    },
    {
      stepIndex: 3,
      badge: 'Adım 4 / 5 • Veri Güvenliği',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      title: 'Sıfır Risk: Tam Sistem Yedeği (.json)',
      subtitle: 'Deponuzu güvenceye alın, telefon değişse bile verileriniz kaybolmaz',
      icon: <ShieldCheck className="w-10 h-10 text-purple-400" />,
      features: [
        {
          title: 'Tek Tıkla Tam Depo Yedeği Al',
          desc: 'Tüm ürünleriniz ve geçmiş sayım hareketleriniz tek bir güvenli .json dosyası olarak saklanır.'
        },
        {
          title: 'Google Drive veya Hafızadan Geri Yükle',
          desc: 'Yeni bir cihaza geçtiğinizde aldığınız yedeği seçerek 3 saniyede tüm deponuzu geri getirin.'
        }
      ],
      actionText: 'Yedekleme & Geri Yükleme Ekranını Aç',
      actionIcon: <HardDrive className="w-4 h-4" />,
      actionColor: 'from-purple-600 to-indigo-600 text-white shadow-purple-500/25',
      onAction: () => {
        handleSavePreferenceAndClose();
        setTimeout(() => onOpenBackupModal?.(), 250);
      }
    },
    {
      stepIndex: 4,
      badge: 'Adım 5 / 5 • Kesintisiz Çalışma',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      title: '%100 Çevrimdışı (Offline) Mod & Senkronizasyon',
      subtitle: 'İnternetin çekmediği bodrumlarda ve depolarda kesintisiz sayım',
      icon: <WifiOff className="w-10 h-10 text-amber-400" />,
      features: [
        {
          title: 'Telefonun Yerel Hafızasına Kayıt',
          desc: 'İnternet kopsa dahi sayımlar telefon donanımına kaydedilir, hiçbir sayım kaybolmaz.'
        },
        {
          title: 'Otomatik Eşitleme (Sync)',
          desc: 'İnternet geri geldiğinde arka planda otomatik olarak merkeze eşitlenir.'
        }
      ],
      actionText: 'Çevrimdışı / Çevrimiçi Modu Test Et',
      actionIcon: <RefreshCw className="w-4 h-4" />,
      actionColor: 'from-amber-600 to-orange-600 text-white shadow-amber-500/25',
      onAction: () => {
        handleSavePreferenceAndClose();
        onToggleOnlineOffline?.();
      }
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSavePreferenceAndClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('pocket_dont_show_guide', 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleNeverShowAgain = () => {
    try {
      localStorage.setItem('pocket_dont_show_guide', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleComplete = () => {
    handleSavePreferenceAndClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Üst Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${step.badgeColor}`}>
              {step.badge}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* İkon & Başlık */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner mb-1">
              {step.icon}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight leading-snug">{step.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">{step.subtitle}</p>
          </div>

          {/* Özellik Maddeleri */}
          <div className="space-y-2.5">
            {step.features.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-left"
              >
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Canlı Etkileşimli Deneme Butonu (Kullanıcı Tıklayıp Denesin) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={step.onAction}
              className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${step.actionColor} font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}
            >
              {step.actionIcon}
              <span>{step.actionText}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </div>

        {/* Alt Adım İndikatörü & Aksiyonlar */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-900/90 space-y-3.5">
          {/* Noktalar */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Aksiyon Butonları (Geri / İleri) */}
          <div className="flex items-center gap-2.5">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                className="flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Geri</span>
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                Atla
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 active:scale-98 transition-all shadow-md shadow-emerald-500/20"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Anladım, Depoya Başla!</span>
                </>
              ) : (
                <>
                  <span>Sonraki Adım</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Bir Daha Gösterme Butonu & Onay Seçeneği */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Açılışta bir daha gösterme</span>
            </label>

            <button
              type="button"
              onClick={handleNeverShowAgain}
              className="text-slate-500 hover:text-rose-400 font-medium transition-colors flex items-center gap-1"
            >
              <EyeOff className="w-3 h-3" />
              <span>Bir Daha Gösterme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
