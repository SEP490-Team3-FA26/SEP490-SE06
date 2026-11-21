/**
 * gs1Parser.ts - Tiện ích bóc tách mã QR Khay, Giỏ Tote và Mã Vạch GS1 DataMatrix / EAN-13
 * Tuân thủ Mục 5.4 tài liệu xuất kho:
 * - Bóc tách AI (01) GTIN-14 (tự chuẩn hóa EAN-13), (10) Số lô, (17) Hạn dùng YYMMDD.
 * - Ngày '00' trong AI (17) tự động chuyển thành ngày cuối cùng của tháng (kể cả năm nhuận).
 */

export interface ParsedGS1Result {
  valid: boolean;
  format: 'GS1_DATAMATRIX' | 'EAN13' | 'CODE128' | 'UNKNOWN';
  raw: string;
  gtin14?: string;
  gtin13?: string;
  batchNo?: string;
  rawExpDate?: string;
  expDateISO?: string;
  isExpired?: boolean;
  error?: string;
}

export interface ParsedBinQR {
  valid: boolean;
  binCode?: string;
  zone?: string;
  rack?: string;
  shelf?: number;
  bin?: number;
  error?: string;
}

export interface ParsedToteQR {
  valid: boolean;
  toteCode?: string;
  error?: string;
}

/**
 * Chuẩn hóa ngày hết hạn GS1 YYMMDD sang YYYY-MM-DD.
 * Nếu ngày là '00' -> tự động tính ngày cuối cùng của tháng đó theo quy chuẩn GS1 quốc tế.
 */
export function normalizeGS1ExpiryYYMMDD(
  yymmdd: string,
  referenceDate: Date = new Date(),
): { iso: string; isExpired: boolean } | null {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return null;

  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);

  if (mm < 1 || mm > 12) return null;

  // GS1 dùng mốc 2000 + yy cho dược phẩm hiện hành
  const fullYear = 2000 + yy;
  const lastDayOfMonth = new Date(Date.UTC(fullYear, mm, 0)).getUTCDate();

  let actualDay = dd;
  if (dd === 0) {
    actualDay = lastDayOfMonth;
  } else if (dd > lastDayOfMonth) {
    return null;
  }

  const mmStr = String(mm).padStart(2, '0');
  const ddStr = String(actualDay).padStart(2, '0');
  const iso = `${fullYear}-${mmStr}-${ddStr}`;

  // So sánh theo mốc cuối ngày hết hạn (23:59:59 UTC) hoặc ngày hiện tại theo lịch
  const todayISO = referenceDate.toISOString().slice(0, 10);
  const isExpired = iso <= todayISO;

  return { iso, isExpired };
}

/**
 * Chuẩn hóa chuỗi thô trước khi bóc tách: hỗ trợ cả dấu ngoặc (...) lẫn ký tự ngăn cách FNC1 (\x1D)
 */
export function parseGS1DataMatrix(rawInput: string, referenceDate: Date = new Date()): ParsedGS1Result {
  const raw = typeof rawInput === 'string' ? rawInput.trim() : '';
  if (!raw) {
    return { valid: false, format: 'UNKNOWN', raw: '', error: 'Mã quét rỗng.' };
  }

  // Trường hợp quét chuỗi JSON từ nhãn nội bộ hệ thống
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      if (obj.gtin || obj.barcode || obj.batchNo) {
        const gtinRaw = String(obj.gtin || obj.barcode || '').trim();
        const expISO = obj.expDate ? String(obj.expDate).slice(0, 10) : undefined;
        const todayISO = referenceDate.toISOString().slice(0, 10);
        return {
          valid: true,
          format: 'GS1_DATAMATRIX',
          raw,
          gtin14: gtinRaw.length === 13 ? `0${gtinRaw}` : gtinRaw || undefined,
          gtin13: gtinRaw.length === 14 && gtinRaw.startsWith('0') ? gtinRaw.slice(1) : gtinRaw || undefined,
          batchNo: obj.batchNo ? String(obj.batchNo).trim() : undefined,
          expDateISO: expISO,
          isExpired: expISO ? expISO <= todayISO : undefined,
        };
      }
    } catch {
      // Nếu không phải JSON hợp lệ thì tiếp tục parse theo chuỗi GS1
    }
  }

  // 1. Trường hợp chuỗi có dấu ngoặc tường minh: (01)123...(17)261200(10)LOT01
  if (raw.includes('(01)') || raw.includes('(10)') || raw.includes('(17)')) {
    const gtinMatch = raw.match(/\(01\)(\d{14})/);
    const expMatch = raw.match(/\(17\)(\d{6})/);
    const lotMatch = raw.match(/\(10\)([^\(\x1D]+)/);

    const gtin14 = gtinMatch?.[1];
    const gtin13 = gtin14 && gtin14.startsWith('0') ? gtin14.slice(1) : gtin14;
    const rawExp = expMatch?.[1];
    const parsedExp = rawExp ? normalizeGS1ExpiryYYMMDD(rawExp, referenceDate) : null;
    const batchNo = lotMatch?.[1]?.trim();

    if (rawExp && !parsedExp) {
      return {
        valid: false,
        format: 'GS1_DATAMATRIX',
        raw,
        gtin14,
        gtin13,
        batchNo,
        rawExpDate: rawExp,
        error: `Ngày hết hạn GS1 "${rawExp}" không hợp lệ.`,
      };
    }

    if (gtin14 || batchNo) {
      return {
        valid: true,
        format: 'GS1_DATAMATRIX',
        raw,
        gtin14,
        gtin13,
        batchNo,
        rawExpDate: rawExp,
        expDateISO: parsedExp?.iso,
        isExpired: parsedExp?.isExpired,
      };
    }
  }

  // 2. Trường hợp chuỗi GS1 DataMatrix không có ngoặc (dùng ký tự FNC1 \u001D hoặc ghép cố định 01 + 17 + 10)
  const cleanGs1 = raw.replace(/^\]d2|^\]C1/i, ''); // Loại bỏ Symbology Identifier nếu máy quét trả kèm
  if (cleanGs1.startsWith('01') && /^01\d{14}/.test(cleanGs1)) {
    let cursor = 0;
    let gtin14: string | undefined;
    let rawExp: string | undefined;
    let batchNo: string | undefined;

    while (cursor < cleanGs1.length) {
      // Bỏ qua ký tự ngăn cách FNC1 (\x1D)
      if (cleanGs1[cursor] === '\u001d' || cleanGs1[cursor] === '\x1D') {
        cursor += 1;
        continue;
      }

      const ai2 = cleanGs1.slice(cursor, cursor + 2);
      if (ai2 === '01' && /^\d{14}/.test(cleanGs1.slice(cursor + 2, cursor + 16))) {
        gtin14 = cleanGs1.slice(cursor + 2, cursor + 16);
        cursor += 16;
      } else if (ai2 === '17' && /^\d{6}/.test(cleanGs1.slice(cursor + 2, cursor + 8))) {
        rawExp = cleanGs1.slice(cursor + 2, cursor + 8);
        cursor += 8;
      } else if (ai2 === '11' && /^\d{6}/.test(cleanGs1.slice(cursor + 2, cursor + 8))) {
        // Ngày sản xuất (bỏ qua 6 ký tự)
        cursor += 8;
      } else if (ai2 === '10') {
        // AI (10) độ dài biến thiên, kết thúc ở ký tự \x1D hoặc hết chuỗi
        const nextFnc1 = cleanGs1.indexOf('\u001d', cursor + 2);
        if (nextFnc1 !== -1) {
          batchNo = cleanGs1.slice(cursor + 2, nextFnc1).trim();
          cursor = nextFnc1 + 1;
        } else {
          batchNo = cleanGs1.slice(cursor + 2).trim();
          cursor = cleanGs1.length;
        }
      } else if (ai2 === '21') {
        // AI (21) Số sê-ri biến thiên -> đọc đến FNC1 hoặc hết chuỗi
        const nextFnc1 = cleanGs1.indexOf('\u001d', cursor + 2);
        cursor = nextFnc1 !== -1 ? nextFnc1 + 1 : cleanGs1.length;
      } else {
        break;
      }
    }

    const gtin13 = gtin14 && gtin14.startsWith('0') ? gtin14.slice(1) : gtin14;
    const parsedExp = rawExp ? normalizeGS1ExpiryYYMMDD(rawExp, referenceDate) : null;

    if (rawExp && !parsedExp) {
      return {
        valid: false,
        format: 'GS1_DATAMATRIX',
        raw,
        gtin14,
        gtin13,
        batchNo,
        rawExpDate: rawExp,
        error: `Ngày hết hạn GS1 "${rawExp}" không hợp lệ.`,
      };
    }

    return {
      valid: true,
      format: 'GS1_DATAMATRIX',
      raw,
      gtin14,
      gtin13,
      batchNo,
      rawExpDate: rawExp,
      expDateISO: parsedExp?.iso,
      isExpired: parsedExp?.isExpired,
    };
  }

  // 3. Fallback cho mã vạch 1D EAN-13 hoặc Code-128 đơn thuần trên hộp thuốc cũ
  if (/^\d{13}$/.test(raw) || /^\d{8}$/.test(raw)) {
    return {
      valid: true,
      format: 'EAN13',
      raw,
      gtin13: raw,
      gtin14: raw.length === 13 ? `0${raw}` : raw,
    };
  }

  if (/^[A-Za-z0-9._-]{3,64}$/.test(raw)) {
    return {
      valid: true,
      format: 'CODE128',
      raw,
      gtin13: raw,
    };
  }

  return {
    valid: false,
    format: 'UNKNOWN',
    raw,
    error: 'Không nhận diện được định dạng mã vạch GS1 hoặc EAN-13 hợp lệ.',
  };
}

/**
 * Bóc tách mã QR của khay kệ kho: BIN-{zone}-{rack}-S{shelf}-B{bin} hoặc JSON { type: 'BIN', zone, rack, shelf, bin }
 */
export function parseBinQRCode(rawInput: string): ParsedBinQR {
  const raw = typeof rawInput === 'string' ? rawInput.trim() : '';
  if (!raw) {
    return { valid: false, error: 'Mã QR khay không được để trống.' };
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      if (obj.zone && obj.rack && obj.shelf && obj.bin) {
        const zone = String(obj.zone).trim().toUpperCase();
        const rack = String(obj.rack).trim().toUpperCase();
        const shelf = Number(obj.shelf);
        const bin = Number(obj.bin);
        return {
          valid: true,
          zone,
          rack,
          shelf,
          bin,
          binCode: `BIN-${zone}-${rack}-S${shelf}-B${bin}`,
        };
      }
    } catch {
      return { valid: false, error: 'Dữ liệu QR khay JSON bị lỗi cấu trúc.' };
    }
  }

  const match = raw.toUpperCase().match(/^BIN-([A-Z0-9]+)-([A-Z0-9]+)-S(\d+)-B(\d+)$/);
  if (!match) {
    return {
      valid: false,
      error: 'Mã khay không đúng chuẩn BIN-{Zone}-{Rack}-S{Shelf}-B{Bin}.',
    };
  }

  return {
    valid: true,
    binCode: match[0],
    zone: match[1],
    rack: match[2],
    shelf: Number(match[3]),
    bin: Number(match[4]),
  };
}

/**
 * Bóc tách mã QR của giỏ gom hàng (Tote): TOTE-01 hoặc JSON { type: 'TOTE', toteCode }
 */
export function parseToteQRCode(rawInput: string): ParsedToteQR {
  const raw = typeof rawInput === 'string' ? rawInput.trim() : '';
  if (!raw) {
    return { valid: false, error: 'Mã Tote không được để trống.' };
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw);
      if (obj.toteCode) {
        const toteCode = String(obj.toteCode).trim().toUpperCase();
        return { valid: true, toteCode };
      }
    } catch {
      return { valid: false, error: 'Dữ liệu QR giỏ Tote JSON không hợp lệ.' };
    }
  }

  const upper = raw.toUpperCase();
  if (!/^TOTE-[A-Z0-9-]+$/.test(upper)) {
    return { valid: false, error: 'Mã Tote không đúng định dạng (VD: TOTE-01).' };
  }
  return { valid: true, toteCode: upper };
}
