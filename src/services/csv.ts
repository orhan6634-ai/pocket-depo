import * as XLSX from 'xlsx';
import { db } from '../db';
import { Product, UnitType } from '../types';
import { canAddMoreProducts, getTrialInfo } from './license';

/**
 * Android WebView ve tarayıcılarda dosya indirmesini zorlayan güvenli tetikleyici
 */
function triggerDownloadViaLink(href: string, fileName: string) {
  try {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // ignore
      }
    }, 1500);
  } catch (err) {
    console.warn('triggerDownloadViaLink hatası:', err);
  }
}

/**
 * Tüm ürünleri CSV formatında dışa aktarma yeteneği (Data URI + Blob)
 */
export async function exportProductsToCSV(): Promise<{ success: boolean; count: number }> {
  const products = await db.products.toArray();
  if (products.length === 0) {
    return { success: false, count: 0 };
  }

  const headers = ['Barkod', 'Ürün Adı', 'Kategori', 'Raf Konumu', 'Mevcut Stok', 'Birim', 'Kritik Stok', 'Son Sayım Tarihi'];
  
  const rows = products.map((p) => [
    `"${p.barcode}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.category}"`,
    `"${p.shelfLocation}"`,
    p.currentStock,
    `"${p.unit}"`,
    p.minStock,
    `"${new Date(p.lastCountDate).toLocaleString('tr-TR')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `pocket-depo-stok-listesi_${dateStr}.csv`;

  // 1. Data URI yöntemi (Android WebView için en güvenilir yöntem)
  const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  triggerDownloadViaLink(encodedUri, fileName);

  // 2. Blob fallback
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    triggerDownloadViaLink(blobUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (e) {
    console.debug('CSV Blob fallback hatası:', e);
  }

  return { success: true, count: products.length };
}

/**
 * Tüm ürünleri Microsoft Excel (.xlsx) formatında dışa aktarma yeteneği (Base64 Data URI + Blob)
 */
export async function exportProductsToXLSX(): Promise<{ success: boolean; count: number }> {
  const products = await db.products.toArray();
  if (products.length === 0) {
    return { success: false, count: 0 };
  }

  const data = products.map((p) => ({
    'Barkod': p.barcode,
    'Ürün Adı': p.name,
    'Kategori': p.category,
    'Raf Konumu': p.shelfLocation,
    'Mevcut Stok': p.currentStock,
    'Birim': p.unit,
    'Kritik Stok': p.minStock,
    'Son Sayım Tarihi': new Date(p.lastCountDate).toLocaleString('tr-TR')
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Listesi');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `pocket-depo-stok-listesi_${dateStr}.xlsx`;
  
  // 1. Base64 Data URI (Android WebView'de dosya indirmeyi başlatan en garantili yöntem)
  const b64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const dataUri = `data:application/octet-stream;base64,${b64}`;
  triggerDownloadViaLink(dataUri, fileName);

  // 2. Blob URL fallback
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const blobUrl = URL.createObjectURL(blob);
    triggerDownloadViaLink(blobUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (e) {
    console.debug('Excel Blob fallback hatası:', e);
  }

  return { success: true, count: products.length };
}

/**
 * Tüm stok listesini düzenli formatta WhatsApp veya telefon paylaşım menüsüne aktarır
 */
export async function shareStockListWhatsApp(): Promise<boolean> {
  const products = await db.products.toArray();
  if (products.length === 0) return false;

  let text = `📦 *POCKET-DEPO GÜNCEL STOK LİSTESİ*\n📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n📊 Toplam Kalem: ${products.length}\n\n`;

  products.forEach((p, i) => {
    text += `${i + 1}. *${p.name}*\n   Barkod: ${p.barcode} | Stok: *${p.currentStock} ${p.unit}* | Raf: ${p.shelfLocation || '-'}\n`;
  });

  text += `\n_Pocket-Depo Mobil Stok & Sayım_`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'Pocket-Depo Stok Listesi',
        text: text
      });
      return true;
    } catch {
      // Abort veya share yoksa WhatsApp URL'e geç
    }
  }

  const encoded = encodeURIComponent(text);
  window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  return true;
}

/**
 * Tüm listeyi Excel ve Google E-Tablolar ile tam uyumlu hücre formatında panoya kopyalar
 */
export async function copyStockListToClipboard(): Promise<boolean> {
  const products = await db.products.toArray();
  if (products.length === 0) return false;

  const header = ['Barkod', 'Ürün Adı', 'Kategori', 'Raf Konumu', 'Mevcut Stok', 'Birim', 'Kritik Stok'].join('\t');
  const rows = products.map((p) => [
    p.barcode,
    p.name,
    p.category,
    p.shelfLocation,
    p.currentStock,
    p.unit,
    p.minStock
  ].join('\t'));

  const fullText = [header, ...rows].join('\n');
  await navigator.clipboard.writeText(fullText);
  return true;
}

/**
 * Kullanıcının yüklediği Excel (.xlsx, .xls) veya CSV dosyasını okuyup Dexie veritabanına aktarır
 */
export async function importProductsFromFile(file: File): Promise<{ added: number; updated: number; hitLimit: boolean }> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    return importFromExcelBuffer(file);
  } else {
    return importFromCSVText(file);
  }
}

// Geriye uyumluluk için alias
export const importProductsFromCSV = importProductsFromFile;

async function importFromExcelBuffer(file: File): Promise<{ added: number; updated: number; hitLimit: boolean }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

  return processRawProductRows(rawRows);
}

async function importFromCSVText(file: File): Promise<{ added: number; updated: number; hitLimit: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return resolve({ added: 0, updated: 0, hitLimit: false });

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) return resolve({ added: 0, updated: 0, hitLimit: false });

        const delimiter = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

        const rawRows: Record<string, unknown>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
          const rowObj: Record<string, unknown> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
          });
          rawRows.push(rowObj);
        }

        const res = await processRawProductRows(rawRows);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function processRawProductRows(rows: Record<string, unknown>[]): Promise<{ added: number; updated: number; hitLimit: boolean }> {
  let added = 0;
  let updated = 0;
  let hitLimit = false;
  const now = new Date().toISOString();
  const _trial = getTrialInfo();
  void _trial;

  for (const row of rows) {
    let barcode = '';
    let name = '';
    let category = 'Genel';
    let shelf = 'Depo';
    let stock = 0;
    let unit: UnitType = 'Adet';
    let minStock = 10;

    for (const [key, val] of Object.entries(row)) {
      const k = normalizeKey(key);
      const strVal = String(val ?? '').trim();

      if (k.includes('barkod') || k.includes('barcode') || k.includes('ean') || k.includes('kod')) {
        barcode = strVal;
      } else if (k.includes('urun') || k.includes('ad') || k.includes('name') || k.includes('tanim') || k.includes('baslik')) {
        name = strVal;
      } else if (k.includes('kategori') || k.includes('category') || k.includes('grup')) {
        category = strVal || 'Genel';
      } else if (k.includes('raf') || k.includes('konum') || k.includes('location') || k.includes('shelf')) {
        shelf = strVal || 'Depo';
      } else if (k.includes('stok') || k.includes('miktar') || k.includes('adet') || k.includes('stock') || k.includes('qty')) {
        stock = parseInt(strVal, 10) || 0;
      } else if (k.includes('birim') || k.includes('unit')) {
        unit = (strVal as UnitType) || 'Adet';
      } else if (k.includes('kritik') || k.includes('min')) {
        minStock = parseInt(strVal, 10) || 10;
      }
    }

    if (!barcode || !name) continue;

    const existing = await db.products.where('barcode').equals(barcode).first();
    if (existing) {
      await db.products.update(existing.id!, {
        name,
        category,
        shelfLocation: shelf,
        currentStock: stock,
        unit,
        minStock,
        updatedAt: now
      });
      updated++;
    } else {
      if (!canAddMoreProducts()) {
        hitLimit = true;
        continue;
      }

      await db.products.add({
        barcode,
        name,
        category,
        shelfLocation: shelf,
        currentStock: stock,
        minStock,
        unit,
        lastCountDate: now,
        updatedAt: now
      });
      added++;
    }
  }

  return { added, updated, hitLimit };
}
