// Pocket-Depo Lisans & 7 Günlük Ücretsiz Deneme (Trial) Yönetim Servisi

const LICENSE_STORAGE_KEY = 'pocket_license_key';
const LICENSE_ACTIVATED_AT_KEY = 'pocket_license_activated_at';
const FIRST_INSTALL_KEY = 'pocket_first_install_timestamp';

export const TRIAL_DURATION_DAYS = 7;

/**
 * Kullanıcının PRO lisansa sahip olup olmadığını kontrol eder
 */
export const isProLicense = (): boolean => {
  const key = localStorage.getItem(LICENSE_STORAGE_KEY);
  if (!key) return false;
  
  const cleanKey = key.trim().toUpperCase();
  return cleanKey.startsWith('POCKET-') || cleanKey.startsWith('PRO-') || cleanKey.length >= 10;
};

/**
 * İlk kurulum / kullanım zamanını getirir veya başlatır
 */
export const getInstallTimestamp = (): number => {
  const stored = localStorage.getItem(FIRST_INSTALL_KEY);
  if (stored) {
    const val = parseInt(stored, 10);
    if (!isNaN(val)) return val;
  }
  const now = Date.now();
  localStorage.setItem(FIRST_INSTALL_KEY, now.toString());
  return now;
};

export interface TrialInfo {
  isPro: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  startDate: string;
}

/**
 * Deneme sürümü ve lisans durumunu detaylı döner
 */
export const getTrialInfo = (): TrialInfo => {
  if (isProLicense()) {
    return {
      isPro: true,
      isTrialActive: false,
      daysRemaining: 999,
      hoursRemaining: 9999,
      isExpired: false,
      startDate: new Date().toISOString()
    };
  }

  const installTime = getInstallTimestamp();
  const now = Date.now();
  const trialMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, now - installTime);
  const remainingMs = Math.max(0, trialMs - elapsedMs);

  const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.ceil(remainingMs / (60 * 60 * 1000));
  const isExpired = remainingMs <= 0;

  return {
    isPro: false,
    isTrialActive: !isExpired,
    daysRemaining,
    hoursRemaining,
    isExpired,
    startDate: new Date(installTime).toLocaleDateString('tr-TR')
  };
};

/**
 * Kayıtlı lisans anahtarını getirir
 */
export const getActiveLicenseKey = (): string | null => {
  return localStorage.getItem(LICENSE_STORAGE_KEY);
};

/**
 * Lisans anahtarını etkinleştirir
 */
export const activateLicense = (rawKey: string): { success: boolean; message: string } => {
  const clean = rawKey.trim().toUpperCase();

  if (!clean) {
    return { success: false, message: 'Lütfen geçerli bir lisans anahtarı girin.' };
  }

  // Geçerli anahtar formatları: POCKET-PRO-XXXX, DEMO-PRO, veya en az 6 haneli kod
  if (clean.length < 6) {
    return { success: false, message: 'Lisans anahtarı en az 6 karakter olmalıdır.' };
  }

  localStorage.setItem(LICENSE_STORAGE_KEY, clean);
  localStorage.setItem(LICENSE_ACTIVATED_AT_KEY, new Date().toISOString());

  return {
    success: true,
    message: 'Tebrikler! Pocket-Depo PRO sürümü süresiz olarak etkinleştirildi.'
  };
};

/**
 * Lisansı kaldırır (test için)
 */
export const deactivateLicense = (): void => {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
  localStorage.removeItem(LICENSE_ACTIVATED_AT_KEY);
};

/**
 * Yeni ürün ekleme iznini kontrol eder (7 gün boyunca SINIRSIZ)
 */
export const canAddMoreProducts = (): boolean => {
  if (isProLicense()) return true;
  const trial = getTrialInfo();
  return !trial.isExpired;
};
