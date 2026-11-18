/**
 * Bộ hàm tiện ích lọc ngưỡng độ tin cậy (Confidence Filter) và Khử khung hình trùng lặp
 * bằng thuật toán Non-Maximum Suppression (NMS - IoU & Containment) cho Computer Vision đếm hộp thuốc.
 * Triệt tiêu triệt để lỗi đếm nhân bản 1 hộp thành nhiều hộp khi nhiều bounding box đè lên nhau.
 */

export interface RawVisionPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  class?: string;
  [key: string]: any;
}

/**
 * Chuyển đổi tọa độ tâm (x, y, width, height) sang khung chữ nhật [x1, y1, x2, y2].
 */
function toCorners(p: RawVisionPrediction): [number, number, number, number] {
  const x = Number(p.x) || 0;
  const y = Number(p.y) || 0;
  const w = Math.max(0, Number(p.width) || 0);
  const h = Math.max(0, Number(p.height) || 0);
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}

/**
 * Tính tỷ lệ chồng lấn IoU (Intersection over Union) và tỷ lệ lọt lòng (Containment) giữa 2 khung hình.
 */
export function computeBoxOverlap(
  boxA: RawVisionPrediction,
  boxB: RawVisionPrediction,
): { iou: number; containment: number } {
  const [ax1, ay1, ax2, ay2] = toCorners(boxA);
  const [bx1, by1, bx2, by2] = toCorners(boxB);

  const interX1 = Math.max(ax1, bx1);
  const interY1 = Math.max(ay1, by1);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  const interW = Math.max(0, interX2 - interX1);
  const interH = Math.max(0, interY2 - interY1);
  const interArea = interW * interH;

  const areaA = Math.max(0, ax2 - ax1) * Math.max(0, ay2 - ay1);
  const areaB = Math.max(0, bx2 - bx1) * Math.max(0, by2 - by1);

  if (areaA <= 0 || areaB <= 0 || interArea <= 0) {
    return { iou: 0, containment: 0 };
  }

  const unionArea = areaA + areaB - interArea;
  const iou = unionArea > 0 ? interArea / unionArea : 0;
  const minArea = Math.min(areaA, areaB);
  const containment = minArea > 0 ? interArea / minArea : 0;

  return { iou, containment };
}

/**
 * Lọc danh sách dự đoán từ Roboflow bằng ngưỡng tin cậy và thuật toán NMS.
 *
 * @param predictions Danh sách predictions thô trả về từ Roboflow
 * @param minConfidence Ngưỡng độ tin cậy tối thiểu (mặc định 0.35 = 35%)
 * @param iouThreshold Ngưỡng chồng lấn IoU tối đa cho phép (mặc định 0.45)
 * @param containmentThreshold Ngưỡng lọt lòng tối đa cho phép (mặc định 0.75)
 */
export function filterAndDeduplicatePredictions<T extends RawVisionPrediction>(
  predictions: T[],
  minConfidence = 0.35,
  iouThreshold = 0.45,
  containmentThreshold = 0.75,
): T[] {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return [];
  }

  // Bước 1: Loại bỏ các khung lỗi kích thước (<= 0) hoặc độ tin cậy thấp hơn ngưỡng
  const valid = predictions.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const w = Number(p.width);
    const h = Number(p.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;

    const conf = typeof p.confidence === 'number' ? p.confidence : 1;
    return Number.isFinite(conf) && conf >= minConfidence;
  });

  // Bước 2: Sắp xếp giảm dần theo độ tin cậy để luôn ưu tiên giữ lại khung hình rõ nét nhất
  const sorted = [...valid].sort((a, b) => (b.confidence ?? 1) - (a.confidence ?? 1));

  // Bước 3: Áp dụng Non-Maximum Suppression (NMS) để loại bỏ khung trùng lặp đè lên cùng 1 hộp thuốc
  const kept: T[] = [];
  for (const candidate of sorted) {
    let isDuplicate = false;
    for (const selected of kept) {
      const { iou, containment } = computeBoxOverlap(candidate, selected);
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
