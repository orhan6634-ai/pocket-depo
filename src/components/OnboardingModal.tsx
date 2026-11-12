import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, FileSpreadsheet, WifiOff, ScanLine, Sparkles, ShieldCheck } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Adım 1 / 3 • Kurulum',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      title: 'Hızlı Kurulum & Excel Entegrasyonu',
      subtitle: 'Sıfır karmaşa, 1 dakikada deponuzu hazır edin',
      icon: <FileSpreadsheet className="w-12 h-12 text-emerald-400" />,
      features: [
        {
          title: 'Mevcut Listenizi Yükleyin',
          desc: 'Eski Excel veya CSV ürün listenizi tek tuşla sisteme aktarın.'
        },
        {
          title: 'Sıfırdan Ürün Ekleyin',
          desc: 'Listeniz yoksa ürünün barkodunu okutup hemen ismini girerek başlayın.'
        },
        {
          title: 'Sıfır Donanım Maliyeti',
          desc: 'Pahalı el terminallerine gerek yok, personelin cep telefonu yeterlidir.'
        }
      ]
    },
    {
      badge: 'Adım 2 / 3 • Çevrimdışı Güvence',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      title: '%100 Çevrimdışı (Offline) Mod',
      subtitle: 'Bodrumda veya internet kesintisinde kesintisiz çalışma',
      icon: <WifiOff className="w-12 h-12 text-amber-400" />,
      features: [
        {
          title: 'İnternetsiz Sayım Güvencesi',
          desc: 'İnternet kopsa dahi sayım ve stok güncellemeleri telefonun yerel hafızasına yazılır.'
        },
        {
          title: 'Turuncu Uyarı Rozeti',
          desc: 'İnternet yokken ekranın üstünde "Çevrimdışı Mod" rozeti yanar; endişe etmeyin, veriniz güvendedir.'
        },
        {
          title: 'Otomatik Bulut Eşitleme',
          desc: 'İnternet geri geldiğinde hiçbir butona basmadan tüm sayımlar merkeze aktarılır.'
        }
      ]
    },
    {
      badge: 'Adım 3 / 3 • Sayım Hızı',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      title: 'Kamera ile Işık Hızında Barkod Sayımı',
      subtitle: 'Telefonun kamerasını tutun, saniyeler içinde sayın',
      icon: <ScanLine className="w-12 h-12 text-blue-400" />,
      features: [
        {
          title: 'BİP ve Titreşim Onayı',
          desc: 'Barkodu okuttuğunuz an endüstriyel ses ve titreşimle geri bildirim alırsınız.'
        },
        {
          title: 'Hızlı Adet Girişi',
          desc: 'Ekrandan sayılan adedi girin, "Sayımı Onayla" tuşuna basın. Yeşil ışıkla onaylanır.'
        },
        {
          title: 'Sonuçları Excel Olarak Alın',
          desc: 'Sayım tamamlandığında güncel stok raporunu tek tıkla Excel/CSV olarak bilgisayarınıza çekin.'
        }
      ]
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

  const handleComplete = () => {
    localStorage.setItem('pocket_has_seen_guide', 'true');
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Üst Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${step.badgeColor}`}>
              {step.badge}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* İkon & Başlık */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner mb-2">
              {step.icon}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{step.title}</h2>
            <p className="text-xs text-slate-400">{step.subtitle}</p>
          </div>

          {/* Özellik Maddeleri */}
          <div className="space-y-3">
            {step.features.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-left"
              >
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt Adım İndikatörü & Butonlar */}
        <div className="p-6 border-t border-slate-800/80 bg-slate-900/90 space-y-4">
          {/* Noktalar */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center gap-3">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Geri</span>
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-4 py-3 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Atla
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 active:scale-98 transition-all shadow-lg shadow-emerald-500/20"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Anladım, Depoya Başla!</span>
                </>
              ) : (
                <>
                  <span>İleri</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
