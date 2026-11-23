export interface ParsedBarcodeResult {
  /** Veritabanında ürün eşleştirmek için kullanılacak temiz barkod (GTIN-13/14 veya ham kod) */
  barcode: string;
  /** GS1 / ÜTS (Sağlık Bakanlığı Ürün Takip Sistemi) karekodundan ayrıştırıldı mı? */
  isGs1: boolean;
  /** Varsa tekil seri numarası (AI 21) */
  serial?: string;
  /** Varsa parti / lot numarası (AI 10) */
  lot?: string;
  /** Varsa son kullanma tarihi YYMMDD (AI 17) */
  expiry?: string;
  /** Debounce kontrolü için ham kod (aynı modelin farklı seri numaralarını peş peşe okuyabilmek için) */
  rawKey: string;
}

const GS_CHAR = '\u001d';

function normalizeGtin(gtin14: string): string {
  // GS1 DataMatrix'te 13 haneli EAN barkodlar başına '0' eklenerek 14 haneye tamamlanır.
  // Kutu üzerindeki 1D EAN-13 barkodla eşleşmesi için baştaki '0' kaldırılır.
  if (gtin14.length === 14 && gtin14.startsWith('0')) {
    return gtin14.slice(1);
  }
  return gtin14;
}

function stripSymbologyPrefix(text: string): string {
  // Bazı okuyucular başına ]d2, ]Q3, ]C1, ]e0 gibi ISO/IEC 15424 ön eki ekler
  return text.replace(/^\][dQcCeE][0-9]/, '').replace(/^\u001d+/, '');
}

/**
 * Okunan barkod veya ÜTS/GS1 DataMatrix metnini ayrıştırır.
 * - Normal 1D barkodları ve standart QR kodları olduğu gibi döndürür.
 * - Sağlık Bakanlığı ÜTS / GS1 DataMatrix kodlarından 01 (GTIN) ana ürün barkodunu çıkarır.
 */
export function parseScannedCode(rawText: string): ParsedBarcodeResult {
  const trimmed = rawText.trim();
  const cleaned = stripSymbologyPrefix(trimmed);
  const rawKey = cleaned.replace(/[\r\n]/g, '');

  // 1) Parantezli insan-okunur GS1 formatı: (01)0869...(21)SERI...(17)YYMMDD(10)LOT
  const parenMatch = cleaned.match(/^\(01\)(\d{14})(.*)$/);
  if (parenMatch) {
    const gtin14 = parenMatch[1];
    const rest = parenMatch[2] || '';
    const serialMatch = rest.match(/\(21\)([^(]+)/);
    const expiryMatch = rest.match(/\(17\)(\d{6})/);
    const lotMatch = rest.match(/\(10\)([^(]+)/);

    return {
      barcode: normalizeGtin(gtin14),
      isGs1: true,
      serial: serialMatch?.[1]?.trim(),
      expiry: expiryMatch?.[1]?.trim(),
      lot: lotMatch?.[1]?.trim(),
      rawKey
    };
  }

  // 2) Ham GS1 / ÜTS DataMatrix formatı: 01 + 14 hane GTIN + (21|17|10|11|<GS>)...
  const rawGs1Match = cleaned.match(/^01(\d{14})(.*)$/);
  if (rawGs1Match) {
    const gtin14 = rawGs1Match[1];
    let rest = rawGs1Match[2] || '';

    // Sadece 01+14 hane veya devamında bilinen GS1 AI (21, 17, 10, 11, <GS>) varsa GS1 kabul et
    const looksLikeGs1 =
      rest.length === 0 ||
      rest.startsWith(GS_CHAR) ||
      /^(21|17|10|11)/.test(rest);

    if (looksLikeGs1) {
      let serial: string | undefined;
      let expiry: string | undefined;
      let lot: string | undefined;

      // GS karakterine göre parçalara ayırıp AI'ları oku
      const segments = rest.split(GS_CHAR).filter(Boolean);
      for (const seg of segments) {
        if (seg.startsWith('21') && !serial) {
          // AI 21 değişken uzunlukludur; bazen aynı segmentte 17YYMMDD veya 10LOT ile bitişik olabilir
          serial = seg.slice(2).trim();
        } else if (seg.startsWith('17') && seg.length >= 8 && !expiry) {
          expiry = seg.slice(2, 8);
          const tail = seg.slice(8);
          if (tail.startsWith('10') && !lot) {
            lot = tail.slice(2).trim();
          } else if (tail.startsWith('21') && !serial) {
            serial = tail.slice(2).trim();
          }
        } else if (seg.startsWith('10') && !lot) {
          lot = seg.slice(2).trim();
        }
      }

      return {
        barcode: normalizeGtin(gtin14),
        isGs1: true,
        serial,
        expiry,
        lot,
        rawKey
      };
    }
  }

  // 3) Standart 1D barkod veya düz QR kod
  return {
    barcode: cleaned.replace(/[\u001d\r\n]/g, '').trim(),
    isGs1: false,
    rawKey
  };
}
