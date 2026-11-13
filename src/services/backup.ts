import { db } from '../db';
import { Product, StockMovement } from '../types';

export interface BackupData {
  version: number;
  appName: string;
  createdAt: string;
  productCount: number;
  movementCount: number;
  products: Product[];
  movements: StockMovement[];
}

export interface RestoreResult {
  success: boolean;
  message: string;
  productsRestored: number;
  movementsRestored: number;
}

/**
 * Tüm veritabanını (ürünler ve hareketler) şifreli/yapılandırılmış JSON yedeği olarak indirir.
 */
export async function exportDatabaseBackup(): Promise<void> {
  const products = await db.products.toArray();
  const movements = await db.movements.toArray();

  const backup: BackupData = {
    version: 1,
    appName: 'Pocket-Depo',
    createdAt: new Date().toISOString(),
    productCount: products.length,
    movementCount: movements.length,
    products,
    movements
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `pocket-depo-yedek_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Kullanıcının seçtiği JSON yedek dosyasını doğrular ve veritabanına geri yükler.
 * @param file Kullanıcının yüklediği .json dosyası
 * @param mode 'merge' = mevcut verilerin üzerine ekle/güncelle, 'replace' = depoyu tamamen sil ve yedekten kur
 */
export async function importDatabaseBackup(
  file: File,
  mode: 'merge' | 'replace' = 'merge'
): Promise<RestoreResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          return resolve({
            success: false,
            message: 'Yedek dosyası boş.',
            productsRestored: 0,
            movementsRestored: 0
          });
        }

        const data: BackupData = JSON.parse(text);

        if (!data.appName || data.appName !== 'Pocket-Depo' || !Array.isArray(data.products)) {
          return resolve({
            success: false,
            message: 'Geçersiz yedek dosyası! Bu dosya Pocket-Depo yedeği değil.',
            productsRestored: 0,
            movementsRestored: 0
          });
        }

        let pCount = 0;
        let mCount = 0;

        await db.transaction('rw', db.products, db.movements, async () => {
          if (mode === 'replace') {
            await db.products.clear();
            await db.movements.clear();
          }

          // Ürünleri aktar
          for (const item of data.products) {
            const cleanBarcode = item.barcode?.trim();
            if (!cleanBarcode || !item.name) continue;

            const existing = await db.products.where('barcode').equals(cleanBarcode).first();
            if (existing && existing.id !== undefined) {
              await db.products.update(existing.id, {
                name: item.name,
                category: item.category || 'Genel',
                shelfLocation: item.shelfLocation || 'Depo',
                currentStock: item.currentStock || 0,
                minStock: item.minStock || 10,
                unit: item.unit || 'Adet',
                lastCountDate: item.lastCountDate || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            } else {
              // id'yi temizleyip yeniden ekle
              const { id: _, ...rest } = item;
              void _;
              await db.products.add(rest);
            }
            pCount++;
          }

          // Hareketleri aktar
          if (Array.isArray(data.movements)) {
            for (const mov of data.movements) {
              const { id: _, ...restMov } = mov;
              void _;
              await db.movements.add(restMov);
              mCount++;
            }
          }
        });

        resolve({
          success: true,
          message: `${pCount} ürün ve ${mCount} hareket kaydı başarıyla geri yüklendi.`,
          productsRestored: pCount,
          movementsRestored: mCount
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsText(file, 'utf-8');
  });
}
