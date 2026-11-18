/**
 * Bộ hàm lọc độ tin cậy và khử khung hình chồng lấn Non-Maximum Suppression (NMS) cho AI Vision trên Mobile.
 * Đảm bảo mỗi hộp thuốc chỉ được đếm đúng 1 lần, không bị nhân bản khi có nhiều bounding box đè lên nhau.
 */

export interface MobileVisionPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  class?: string;
  [key: string]: any;
}

function toCorners(p: MobileVisionPrediction): [number, number, number, number] {
  const x = Number(p.x) || 0;
  const y = Number(p.y) || 0;
  const w = Math.max(0, Number(p.width) || 0);
  const h = Math.max(0, Number(p.height) || 0);
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}

export function computeVisionBoxOverlap(
  boxA: MobileVisionPrediction,
  boxB: MobileVisionPrediction,
): { iou: number; containment: number } {
  const [ax1, ay1, ax2, ay2] = toCorners(boxA);
  const [bx1, by1, bx2, by2] = toCorners(boxB);

  const interW = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const interH = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const interArea = interW * interH;

  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);

  if (areaA <= 0 || areaB <= 0 || interArea <= 0) {
    return { iou: 0, containment: 0 };
  }

  const unionArea = areaA + areaB - interArea;
  const iou = unionArea > 0 ? interArea / unionArea : 0;
  const containment = interArea / Math.min(areaA, areaB);

  return { iou, containment };
}

/**
 * Lọc ngưỡng tin cậy và loại bỏ các khung trùng lặp theo thuật toán NMS.
 */
export function filterAndDeduplicateVisionPredictions<T extends MobileVisionPrediction>(
  predictions: T[],
  minConfidence = 0.35,
  iouThreshold = 0.45,
  containmentThreshold = 0.75,
): T[] {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return [];
  }

  const valid = predictions.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const w = Number(p.width);
    const h = Number(p.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;
    const conf = typeof p.confidence === 'number' ? p.confidence : 1;
    return Number.isFinite(conf) && conf >= minConfidence;
  });

  const sorted = [...valid].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));

  const kept: T[] = [];
  for (const candidate of sorted) {
    let isDuplicate = false;
    for (const selected of kept) {
      const { iou, containment } = computeVisionBoxOverlap(candidate, selected);
      if (iou >= iouThreshold || containment >= containmentThreshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}
