/**
 * medicineImageHelper.ts - Tiện Ích Adapter Tương Thích Ngược
 * Chuyển tiếp tới MedicineImageService (Tầng Dịch Vụ - Service Layer).
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import { MedicineImageService } from '../services/medicineImage.service';

export const MEDICINE_CATEGORY_FALLBACKS = MedicineImageService.CATEGORY_FALLBACK_MAP;

export function getCategoryFallbackImage(category?: string | null): string {
  return MedicineImageService.getFallbackByCategory(category);
}

export function getSafeMedicineImageUri(uri?: string | null, category?: string | null): string {
  return MedicineImageService.resolveSafeUri(uri, category);
}

export function getMedicineImageHeaders(): Record<string, string> {
  return MedicineImageService.getCdnHeaders();
}
