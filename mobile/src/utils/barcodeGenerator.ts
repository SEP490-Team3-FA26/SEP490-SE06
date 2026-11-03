/**
 * barcodeGenerator.ts - GS1 EAN-13 Math & Vector Module for React Native
 * Chuẩn mã vạch GS1 quốc tế (tiền tố 893 Việt Nam), thuật toán Modulo 10 Checksum.
 */

// EAN-13 Parity tables
const L_CODE = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const G_CODE = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const R_CODE = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];

const PARITY_MAP = [
  'LLLLLL', // 0
  'LLGLGG', // 1
  'LLGGLG', // 2
  'LLGGGL', // 3
  'LGLLGG', // 4
  'LGGLLG', // 5
  'LGGGLL', // 6
  'LGLGLG', // 7
  'LGLGGL', // 8
  'LGGLGL', // 9
];

/**
 * Tính Checksum Modulo 10 chuẩn GS1 cho 12 chữ số đầu của EAN-13
 */
export function calculateEAN13Checksum(code12: string): number {
  if (code12.length < 12) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10) || 0;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Kiểm tra mã vạch 13 số có đúng chuẩn Checksum EAN-13 hay không
 */
export function isValidEAN13(barcode: string): boolean {
  if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) return false;
  const code12 = barcode.substring(0, 12);
  const check = parseInt(barcode[12], 10);
  return calculateEAN13Checksum(code12) === check;
}

/**
 * Tạo chuỗi nhị phân 95 modules (0/1) biểu diễn các vạch đen trắng của EAN-13
 */
export function encodeEAN13(barcode: string): { binary: string; displayCode: string } {
  let clean = (barcode || '').replace(/\D/g, '');
  if (clean.length < 12) {
    clean = clean.padStart(12, '0');
  }
  if (clean.length === 12) {
    clean = clean + calculateEAN13Checksum(clean);
  } else if (clean.length > 13) {
    clean = clean.substring(0, 13);
  }

  const firstDigit = parseInt(clean[0], 10) || 0;
  const parity = PARITY_MAP[firstDigit] || 'LLLLLL';

  let binary = '101'; // Start guard (3 modules)

  // Left 6 digits (42 modules)
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(clean[i], 10) || 0;
    const mode = parity[i - 1];
    binary += mode === 'L' ? L_CODE[digit] : G_CODE[digit];
  }

  binary += '01010'; // Center guard (5 modules)

  // Right 6 digits (including checksum, 42 modules)
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(clean[i], 10) || 0;
    binary += R_CODE[digit];
  }

  binary += '101'; // End guard (3 modules)

  return { binary, displayCode: clean };
}

/**
 * Tính toán danh sách tọa độ các thanh vạch đen để vẽ trực tiếp bằng React Native SVG
 */
export function getEAN13BarRects(
  barcode: string,
  width: number = 220,
  height: number = 70,
  showText: boolean = true,
  fontSize: number = 13
): {
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  displayCode: string;
  totalWidth: number;
  totalHeight: number;
} {
  const { binary, displayCode } = encodeEAN13(barcode);
  const totalModules = binary.length; // 95
  const quietZone = 6;
  const totalUnits = totalModules + quietZone * 2;
  const unitWidth = width / totalUnits;
  const barHeight = showText ? height - fontSize - 6 : height;

  const rects: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      const x = (quietZone + i) * unitWidth;
      rects.push({
        x,
        y: 0,
        width: unitWidth + 0.2, // Small overlap to avoid subpixel antialiasing gaps
        height: barHeight,
      });
    }
  }

  return {
    rects,
    displayCode,
    totalWidth: width,
    totalHeight: height,
  };
}
