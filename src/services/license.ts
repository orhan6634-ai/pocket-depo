// Pocket-Depo Lisans & 7 Günlük Ücretsiz Deneme (Trial) Yönetim Servisi

const LICENSE_STORAGE_KEY = 'pocket_license_key';
const LICENSE_ACTIVATED_AT_KEY = 'pocket_license_activated_at';
const FIRST_INSTALL_KEY = 'pocket_first_install_timestamp';
const DEVICE_ID_KEY = 'pocket_device_unique_id';

export const TRIAL_DURATION_DAYS = 7;

// Lisans Doğrulama Tuzu (Güvenlik için sabit gizli anahtar)
const SECRET_SALT = 'PKT_ORHAN_DEPO_SECURE_2026_MASTER';

/**
 * Bu cihaza / kuruluma özel benzersiz 8 haneli Cihaz Kimliği üretir veya getirir
 * Örnek: PKT-84A92F
 */
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Karışıklığı önlemek için 0,1,O,I hariç
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    deviceId = `PKT-${randomPart}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId.toUpperCase();
};

/**
 * Cihaz kimliğine ve gizli tuza göre matematiksel Checksum (Kontrol Kodu) üretir
 */
function computeChecksum(cleanDeviceStr: string): string {
  const fullStr = cleanDeviceStr.replace(/[^A-Z0-9]/g, '') + SECRET_SALT;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;
  
  for (let i = 0; i < fullStr.length; i++) {
    const code = fullStr.charCodeAt(i);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = ((hash2 << 5) - hash2 + code) | 0;
  }
  
  const hex1 = (Math.abs(hash1) % 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  const hex2 = (Math.abs(hash2) % 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return `${hex1.substring(0, 2)}${hex2.substring(0, 2)}`;
}

/**
 * YÖNETİCİ ARACI: Verilen bir cihaz kimliği için geçerli PRO Lisans Anahtarı üretir
 * Format: PRO-{CIHAZ_KODU}-{CHECKSUM} (Örnek: PRO-84A92F-9B4E)
 */
export const generateLicenseKeyForDevice = (rawDeviceId: string): string => {
  const clean = rawDeviceId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const coreCode = clean.startsWith('PKT') ? clean.substring(3) : clean;
  const checksum = computeChecksum(coreCode);
  return `PRO-${coreCode}-${checksum}`;
};

/**
 * Verilen lisans anahtarının bu cihaza veya master anahtara uygunluğunu denetler
 */
export const verifyLicenseKey = (rawKey: string, targetDeviceId?: string): boolean => {
  const cleanKey = rawKey.trim().toUpperCase();
  if (!cleanKey) return false;

  // 1. Master Geliştirici & Test Anahtarları
  if (
    cleanKey === 'MASTER-POCKET-PRO-2026' ||
    cleanKey === 'POCKET-ORHAN-VIP' ||
    cleanKey === 'POCKET-PRO-2026'
  ) {
    return true;
  }

  // 2. Cihaza Özel Lisans Kontrolü
  const devId = targetDeviceId || getDeviceId();
  const expectedKey = generateLicenseKeyForDevice(devId);
  if (cleanKey === expectedKey) {
    return true;
  }

  // 3. Eski sürümle uyumluluk (Daha önce POCKET- ile açılmışsa bozmamak için)
  const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
  if (stored && stored.trim().toUpperCase() === cleanKey && (cleanKey.startsWith('POCKET-') || cleanKey.startsWith('PRO-'))) {
    return true;
  }

  return false;
};

/**
 * Kullanıcının PRO lisansa sahip olup olmadığını kontrol eder
 */
export const isProLicense = (): boolean => {
  const key = localStorage.getItem(LICENSE_STORAGE_KEY);
  if (!key) return false;
  return verifyLicenseKey(key);
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
  deviceId: string;
}

/**
 * Deneme sürümü ve lisans durumunu detaylı döner
 */
export const getTrialInfo = (): TrialInfo => {
  const deviceId = getDeviceId();

  if (isProLicense()) {
    return {
      isPro: true,
      isTrialActive: false,
      daysRemaining: 999,
      hoursRemaining: 9999,
      isExpired: false,
      startDate: new Date().toISOString(),
      deviceId
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
    startDate: new Date(installTime).toLocaleDateString('tr-TR'),
    deviceId
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
    return { success: false, message: 'Lütfen bir lisans anahtarı girin.' };
  }

  if (!verifyLicenseKey(clean)) {
    return {
      success: false,
      message: 'Geçersiz Lisans Kodu! Bu kod bu cihaza ait değil veya hatalı girildi.'
    };
  }

  localStorage.setItem(LICENSE_STORAGE_KEY, clean);
  localStorage.setItem(LICENSE_ACTIVATED_AT_KEY, new Date().toISOString());

  return {
    success: true,
    message: 'Tebrikler! Pocket-Depo PRO sürümü bu cihazda süresiz etkinleştirildi.'
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
