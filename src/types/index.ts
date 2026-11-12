export type UnitType = 'Adet' | 'Koli' | 'Paket' | 'Kg' | 'Metre' | 'Litre';

export interface Product {
  id?: number;
  barcode: string;
  name: string;
  category: string;
  shelfLocation: string; // Örn: A-12, B-3, Zemin-1
  currentStock: number;
  minStock: number; // Kritik stok sınırı
  unit: UnitType;
  lastCountDate: string; // ISO String
  updatedAt: string;
}

export type MovementType = 'count' | 'in' | 'out' | 'adjust';

export interface StockMovement {
  id?: number;
  productId: number;
  productName: string;
  barcode: string;
  type: MovementType;
  previousStock: number;
  newStock: number;
  delta: number;
  timestamp: string;
  note?: string;
  isSynced: boolean; // Çevrimdışı senkronizasyon takibi
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
  recentSyncedCount?: number; // Az önce eşitlenen sayı (ör: 2 Eklendi)
}
