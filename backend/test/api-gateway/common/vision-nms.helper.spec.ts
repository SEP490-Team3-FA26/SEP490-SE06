/// <reference types="jest" />
import {
  computeBoxOverlap,
  filterAndDeduplicatePredictions,
} from '../../../apps/api-gateway/src/common/vision-nms.helper';

/**
 * vision-nms.helper.spec.ts
 * Bộ kiểm thử đơn vị cho thuật toán Non-Maximum Suppression (NMS) & lọc độ tin cậy
 * chống đếm nhân bản hộp thuốc từ Roboflow Computer Vision.
 * Tuân thủ Test-Coupled Mandate: Đủ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values].
 */
describe('Vision NMS Helper - Chống Đếm Trùng Hộp Thuốc (AI Vision)', () => {
  // =========================================================================
  // 1. [Normal Values]: Kịch bản thực tế 6 hộp thuốc bị chồng 30 khung -> trả đúng 6 hộp
  // =========================================================================
  describe('1. [Normal Values] Khử trùng khung chồng lấn & giữ đúng số lượng hộp thực tế', () => {
    it('TC-NMS-NORM-01: 6 hộp Advagraf (2 cột x 3 hàng) bị nhận diện trùng 5 nhãn/hộp (30 predictions) -> sau NMS còn đúng 6 hộp', () => {
      const sixBoxCenters = [
        { x: 250, y: 200 },
        { x: 650, y: 200 },
        { x: 250, y: 420 },
        { x: 650, y: 420 },
        { x: 250, y: 640 },
        { x: 650, y: 640 },
      ];

      // Mô phỏng 5 class đồng nghĩa đè lên cùng mỗi hộp thuốc (tổng 30 predictions)
      const overlappingPreds = sixBoxCenters.flatMap((center, idx) => [
        { x: center.x, y: center.y, width: 320, height: 150, confidence: 0.94, class: 'Medicine', id: `m-${idx}` },
        { x: center.x + 4, y: center.y - 3, width: 315, height: 148, confidence: 0.89, class: 'medicine box' },
        { x: center.x - 3, y: center.y + 2, width: 325, height: 152, confidence: 0.85, class: 'box' },
        { x: center.x + 2, y: center.y + 2, width: 310, height: 145, confidence: 0.81, class: 'package' },
        { x: center.x - 2, y: center.y - 2, width: 318, height: 149, confidence: 0.78, class: 'carton' },
      ]);

      expect(overlappingPreds).toHaveLength(30);

      const deduped = filterAndDeduplicatePredictions(overlappingPreds, 0.35, 0.45, 0.75);
      expect(deduped).toHaveLength(6);
      // Luôn giữ lại prediction có độ tin cậy cao nhất (0.94) cho mỗi hộp
      expect(deduped.every((p) => p.confidence === 0.94)).toBe(true);
    });

    it('TC-NMS-NORM-02: Các hộp thuốc xếp sát cạnh nhau (không đè quá ngưỡng IoU 0.45) được giữ nguyên đủ số lượng', () => {
      const adjacentBoxes = [
        { x: 100, y: 100, width: 100, height: 100, confidence: 0.92 },
        { x: 200, y: 100, width: 100, height: 100, confidence: 0.91 },
        { x: 300, y: 100, width: 100, height: 100, confidence: 0.90 },
      ];

      const kept = filterAndDeduplicatePredictions(adjacentBoxes);
      expect(kept).toHaveLength(3);
    });
  });

  // =========================================================================
  // 2. [Boundary Values]: Các mốc biên ngưỡng confidence, IoU và lọt lòng (containment)
  // =========================================================================
  describe('2. [Boundary Values] Mốc biên ngưỡng Confidence, IoU & Containment', () => {
    it('TC-NMS-BOUND-01: Khung có confidence đúng bằng ngưỡng 0.35 được giữ, dưới ngưỡng (0.349) bị loại', () => {
      const preds = [
        { x: 100, y: 100, width: 80, height: 80, confidence: 0.35 },
        { x: 300, y: 100, width: 80, height: 80, confidence: 0.349 },
      ];

      const kept = filterAndDeduplicatePredictions(preds, 0.35);
      expect(kept).toHaveLength(1);
      expect(kept[0].confidence).toBe(0.35);
    });

    it('TC-NMS-BOUND-02: Khung nhỏ nằm lọt hoàn toàn bên trong khung hộp lớn (containment >= 0.75) bị loại tránh đếm nhãn chữ thành hộp mới', () => {
      const preds = [
        { x: 200, y: 200, width: 300, height: 150, confidence: 0.93 }, // Hộp thuốc
        { x: 180, y: 200, width: 80, height: 50, confidence: 0.70 },  // Nhãn phụ bên trong hộp
      ];

      const overlap = computeBoxOverlap(preds[0], preds[1]);
      expect(overlap.containment).toBe(1);

      const kept = filterAndDeduplicatePredictions(preds);
      expect(kept).toHaveLength(1);
      expect(kept[0].width).toBe(300);
    });

    it('TC-NMS-BOUND-03: Danh sách rỗng trả về mảng rỗng (0 hộp), tuyệt đối không bịa số lượng', () => {
      expect(filterAndDeduplicatePredictions([])).toEqual([]);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values]: Dữ liệu dị thường, width/height <= 0, NaN, null
  // =========================================================================
  describe('3. [Abnormal Values] Chống dữ liệu dị thường & khung kích thước lỗi', () => {
    it('TC-NMS-ABNORM-01: Bỏ qua an toàn các prediction null, width/height âm hoặc 0, NaN', () => {
      const dirtyPreds: any[] = [
        null,
        undefined,
        { x: 100, y: 100, width: 0, height: 100, confidence: 0.9 },
        { x: 100, y: 100, width: -50, height: 100, confidence: 0.9 },
        { x: 100, y: 100, width: NaN, height: 100, confidence: 0.9 },
        { x: 400, y: 400, width: 120, height: 80, confidence: 0.88 },
      ];

      const kept = filterAndDeduplicatePredictions(dirtyPreds);
      expect(kept).toHaveLength(1);
      expect(kept[0].x).toBe(400);
    });

    it('TC-NMS-ABNORM-02: computeBoxOverlap với 2 khung tách rời hoàn toàn trả về iou = 0, containment = 0', () => {
      const res = computeBoxOverlap(
        { x: 50, y: 50, width: 40, height: 40 },
        { x: 500, y: 500, width: 40, height: 40 },
      );
      expect(res).toEqual({ iou: 0, containment: 0 });
    });
  });
});
