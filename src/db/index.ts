import Dexie, { type Table } from 'dexie';
import { Product, StockMovement } from '../types';

export class PocketDepoDatabase extends Dexie {
  products!: Table<Product, number>;
  movements!: Table<StockMovement, number>;

  constructor() {
    super('PocketDepoDB');
    this.version(1).stores({
      products: '++id, &barcode, name, category, shelfLocation, currentStock, minStock, updatedAt',
      movements: '++id, productId, timestamp, isSynced, type, barcode'
    });
    // Sürüm 2: isSynced indeksini kaldır (IndexedDB boolean indeks kısıtlamasını çözer)
    this.version(2).stores({
      products: '++id, &barcode, name, category, shelfLocation, currentStock, minStock, updatedAt',
      movements: '++id, productId, timestamp, type, barcode'
    });
  }
}

export const db = new PocketDepoDatabase();

// İsteğe bağlı örnek veri yükleyici (Kullanıcı boş depoda "Örnek Verilerle Dene" derse çalışır)
export async function seedInitialData() {
  const count = await db.products.count();
  if (count === 0) {
    const now = new Date().toISOString();
    const demoProducts: Omit<Product, 'id'>[] = [
      {
        barcode: '8690123456789',
        name: 'Koli Bandı Şeffaf 45x100m',
        category: 'Paketleme',
        shelfLocation: 'Raf A-1',
        currentStock: 48,
        minStock: 20,
        unit: 'Adet',
        lastCountDate: now,
        updatedAt: now
      },
      {
        barcode: '8690987654321',
        name: 'Streç Film Palet Tipi 50cm',
        category: 'Paketleme',
        shelfLocation: 'Raf A-2',
        currentStock: 14,
        minStock: 15, // Kritik stok
        unit: 'Koli',
        lastCountDate: now,
        updatedAt: now
      },
      {
        barcode: '8681234567890',
        name: 'Çelik Cıvata M8x30mm Galvaniz',
        category: 'Hırdavat',
        shelfLocation: 'Çekmece B-04',
        currentStock: 350,
        minStock: 100,
        unit: 'Adet',
        lastCountDate: now,
        updatedAt: now
      },
      {
        barcode: '8689876543210',
        name: 'HSS Kobalt Matkap Ucu 6mm',
        category: 'Hırdavat',
        shelfLocation: 'Çekmece B-08',
        currentStock: 6,
        minStock: 10, // Kritik stok
        unit: 'Paket',
        lastCountDate: now,
        updatedAt: now
      },
      {
        barcode: '8695554443322',
        name: 'Nitril Kaplı İş Eldiveni No:10',
        category: 'İş Güvenliği',
        shelfLocation: 'Kabin C-1',
        currentStock: 85,
        minStock: 30,
        unit: 'Paket',
        lastCountDate: now,
        updatedAt: now
      },
      {
        barcode: '8697778889900',
        name: 'WD-40 Pas Sökücü Sprey 400ml',
        category: 'Kimyasal',
        shelfLocation: 'Raf D-3',
        currentStock: 22,
        minStock: 12,
        unit: 'Adet',
        lastCountDate: now,
        updatedAt: now
      }
    ];

    await db.products.bulkAdd(demoProducts as Product[]);

    // İlk hareket kayıtları
    const products = await db.products.toArray();
    const movements: Omit<StockMovement, 'id'>[] = products.map((p) => ({
      productId: p.id!,
      productName: p.name,
      barcode: p.barcode,
      type: 'count',
      previousStock: 0,
      newStock: p.currentStock,
      delta: p.currentStock,
      timestamp: now,
      note: 'İlk Sistem Açılış Sayımı',
      isSynced: true
    }));
    await db.movements.bulkAdd(movements as StockMovement[]);
  }
}
