import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  EyeOff,
  Sparkles,
  Camera,
  Download,
  HardDrive,
  PlusCircle,
  Wifi,
  Play,
  Pause
} from 'lucide-react';

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'count' | 'stock' | 'history';
  setActiveTab: (tab: 'count' | 'stock' | 'history') => void;
  setIsScannerOpen: (open: boolean) => void;
  setIsAddModalOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsBackupModalOpen: (open: boolean) => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  setActiveTab,
  setIsScannerOpen,
  setIsAddModalOpen,
  setIsExportModalOpen,
  setIsBackupModalOpen
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [timerProgress, setTimerProgress] = useState(0);

  // Tur Adımları ve Gerçek Uygulama Durumları
  const steps = [
    {
      title: 'Kamera ile Barkod Sayımı',
      subtitle: 'Kamerayı barkoda tuttuğunuzda BİP sesiyle anında tanır. Şimdi deneyebilirsiniz!',
      icon: <Camera className="w-5 h-5 text-emerald-400" />,
      badge: 'Adım 1 / 4 • Kamera Sayımı',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      setup: () => {
        setActiveTab('count');
        setIsExportModalOpen(false);
        setIsBackupModalOpen(false);
        setIsAddModalOpen(false);
        setIsScannerOpen(true);
      }
    },
    {
      title: 'Excel / CSV İndir & Paylaş',
      subtitle: 'Stok listenizi Excel (.xlsx) olarak cihazınıza kaydedin veya WhatsApp ile paylaşın.',
      icon: <Download className="w-5 h-5 text-blue-400" />,
      badge: 'Adım 2 / 4 • Excel & Paylaşım',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      setup: () => {
        setIsScannerOpen(false);
        setIsBackupModalOpen(false);
        setIsAddModalOpen(false);
        setActiveTab('stock');
        setIsExportModalOpen(true);
      }
    },
    {
      title: 'Veri Güvenliği & Sistem Yedeği',
      subtitle: 'Tüm deponuzu tek tuşla .json olarak yedekleyin, telefon değişse de Google Drive\'dan geri yükleyin.',
      icon: <HardDrive className="w-5 h-5 text-purple-400" />,
      badge: 'Adım 3 / 4 • Yedekleme (.json)',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      setup: () => {
        setIsScannerOpen(false);
        setIsExportModalOpen(false);
        setIsAddModalOpen(false);
        setActiveTab('stock');
        setIsBackupModalOpen(true);
      }
    },
    {
      title: 'Yeni Ürün Ekleme Sihirbazı',
      subtitle: 'Barkod, raf konumu ve kritik stok sınırını belirleyerek kolayca yeni ürün tanımlayın.',
      icon: <PlusCircle className="w-5 h-5 text-amber-400" />,
      badge: 'Adım 4 / 4 • Ürün Sihirbazı',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      setup: () => {
        setIsScannerOpen(false);
        setIsExportModalOpen(false);
        setIsBackupModalOpen(false);
        setActiveTab('stock');
        setIsAddModalOpen(true);
      }
    }
  ];

  // Adım değiştiğinde ilgili ekranı/özelliği otomatik kur
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (step) {
      step.setup();
    }
    setTimerProgress(0);
  }, [currentStep, isOpen]);

  // Otomatik İlerleme Zamanlayıcısı (Her adımda 8 saniye kalır, kullanıcı dilediğinde durdurabilir)
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) return;

    const interval = 100; // 100ms
    const totalDuration = 8000; // 8 saniye
    const stepIncrement = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setTimerProgress((prev) => {
        if (prev >= 100) {
          if (currentStep < steps.length - 1) {
            setCurrentStep((s) => s + 1);
          } else {
            handleCompleteTour();
          }
          return 0;
        }
        return prev + stepIncrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isAutoPlaying, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    setIsAutoPlaying(false);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const cleanUpModals = () => {
    setIsScannerOpen(false);
    setIsExportModalOpen(false);
    setIsBackupModalOpen(false);
    setIsAddModalOpen(false);
  };

  const handleCompleteTour = () => {
    cleanUpModals();
    onClose();
  };

  const handleNeverShowAgain = () => {
    try {
      localStorage.setItem('pocket_dont_show_guide', 'true');
      localStorage.setItem('pocket_dont_show_tour', 'true');
    } catch {
      // ignore
    }
    cleanUpModals();
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] select-none">
      {/* Üst Vurgu Rozeti */}
      <div className="absolute top-3 left-4 right-4 pointer-events-auto flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white tracking-wide">
            Canlı Tanıtım Turu: {step.badge}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNeverShowAgain}
          className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1 shadow-lg active:scale-95 transition-all"
          title="Tanıtımı Kapat ve Bir Daha Gösterme"
        >
          <X className="w-3.5 h-3.5" />
          <span>Kapat</span>
        </button>
      </div>

      {/* Alt Yüzen Akıllı Tanıtım Kartı (Kullanıcının ekranı denemesine izin verir) */}
      <div className="absolute bottom-20 left-4 right-4 max-w-md mx-auto pointer-events-auto animate-fade-in">
        <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-4 shadow-2xl space-y-3 ring-1 ring-emerald-500/30">
          
          {/* Otomatik İlerleme Çubuğu */}
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-100 ease-linear"
              style={{ width: `${timerProgress}%` }}
            />
          </div>

          {/* Başlık ve İkon */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>{step.title}</span>
                  <span className="text-[10px] text-emerald-400 font-normal">● Canlı Ekran</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {step.subtitle}
                </p>
              </div>
            </div>

            {/* Otomatik Oynat / Duraklat Butonu */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
              title={isAutoPlaying ? 'Otomatik geçişi duraklat' : 'Otomatik geçişi başlat'}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Kontrol Butonları & Bir Daha Gösterme */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2">
            {/* Sol: Bir Daha Gösterme Tuşu */}
            <button
              type="button"
              onClick={handleNeverShowAgain}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-medium flex items-center gap-1 transition-colors px-1 py-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Bir Daha Gösterme</span>
            </button>

            {/* Sağ: Geri / İleri Butonları */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Geri</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <span>Turu Bitir</span>
                    <Sparkles className="w-3.5 h-3.5 ml-0.5" />
                  </>
                ) : (
                  <>
                    <span>Sonraki</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
