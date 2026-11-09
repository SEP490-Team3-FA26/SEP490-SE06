// roboflow_vision_service.spec.ts - Bài test kẹp chuẩn Test-Coupled Mandate cho RoboflowVisionService
// Phân chia đầy đủ 3 nhóm giá trị chuẩn Guideline: [Normal Values], [Boundary Values], [Abnormal Values]

import { RoboflowVisionService, RoboflowCountResult } from '../../src/services/purchase/roboflowVision.service';

describe('RoboflowVisionService - Phân tích Computer Vision & Đếm Hộp Thuốc', () => {

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] - Xử lý kết quả nhận diện chuẩn từ Roboflow API', () => {
    it('1.1. Bóc tách chính xác 10 hộp thuốc Advagraf kèm bounding boxes và độ tin cậy trung bình', () => {
      const mockRoboflowResponse = {
        outputs: [
          {
            annotated_image: {
              type: 'base64',
              value: 'MOCK_ANNOTATED_BASE64_STRING',
            },
            predictions: {
              image: { width: 1080, height: 810 },
              predictions: [
                { x: 449, y: 341, width: 116, height: 45, confidence: 0.85, class: 'Medicine' },
                { x: 452, y: 215, width: 106, height: 40, confidence: 0.83, class: 'Medicine' },
                { x: 451, y: 255, width: 111, height: 40, confidence: 0.80, class: 'Medicine' },
                { x: 450, y: 297, width: 113, height: 44, confidence: 0.84, class: 'Medicine' },
                { x: 564, y: 251, width: 111, height: 37, confidence: 0.83, class: 'Medicine' },
                { x: 455, y: 178, width: 105, height: 35, confidence: 0.84, class: 'Medicine' },
                { x: 568, y: 338, width: 118, height: 44, confidence: 0.85, class: 'Medicine' },
                { x: 566, y: 294, width: 115, height: 42, confidence: 0.85, class: 'Medicine' },
                { x: 562, y: 213, width: 108, height: 37, confidence: 0.84, class: 'Medicine' },
                { x: 562, y: 175, width: 105, height: 36, confidence: 0.86, class: 'Medicine' },
              ],
            },
          },
        ],
      };

      const result: RoboflowCountResult = RoboflowVisionService.parseRoboflowOutput(mockRoboflowResponse);

      // Phải đếm đúng 10 hộp
      expect(result.detectedCount).toBe(10);
      // Độ tin cậy trung bình nằm trong khoảng 83% - 85%
      expect(result.confidence).toBeGreaterThanOrEqual(83);
      expect(result.confidence).toBeLessThanOrEqual(85);
      // Bounding boxes phải đủ 10 phần tử
      expect(result.boxes).toHaveLength(10);
      // Kiểm tra nhãn và tọa độ box đầu tiên
      expect(result.boxes[0].label).toBe('Hộp 1 • 85%');
      expect(result.boxes[0].left).toBeGreaterThan(0);
      expect(result.boxes[0].top).toBeGreaterThan(0);
      expect(result.annotatedImage).toContain('data:image/jpeg;base64,');
    });

    it('1.2. Chuyển đổi DataURL base64 có prefix sang chuỗi base64 thuần', async () => {
      const dataUrl = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=';
      const clean = await RoboflowVisionService.toCleanBase64(dataUrl);
      expect(clean).toBe('SGVsbG8gV29ybGQ=');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, tối thiểu, tối đa, 0, 1 đơn vị
  // =========================================================================
  describe('[Boundary Values] - Xử lý trường hợp biên rỗng hoặc chỉ có 1 hộp', () => {
    it('2.1. Ảnh rỗng không có hộp thuốc nào: detectedCount = 0, boxes = []', () => {
      const emptyResponse = {
        outputs: [
          {
            annotated_image: { type: 'base64', value: '' },
            predictions: {
              image: { width: 1000, height: 1000 },
              predictions: [],
            },
          },
        ],
      };

      const result = RoboflowVisionService.parseRoboflowOutput(emptyResponse);
      expect(result.detectedCount).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.boxes).toHaveLength(0);
    });

    it('2.2. Biên 1 hộp duy nhất: tính toán tọa độ và phần trăm chính xác', () => {
      const singleBoxResponse = {
        outputs: [
          {
            predictions: {
              image: { width: 1000, height: 500 },
              predictions: [
                { x: 500, y: 250, width: 200, height: 100, confidence: 0.99, class: 'Medicine' },
              ],
            },
          },
        ],
      };

      const result = RoboflowVisionService.parseRoboflowOutput(singleBoxResponse);
      expect(result.detectedCount).toBe(1);
      expect(result.confidence).toBe(99);
      expect(result.boxes).toHaveLength(1);
      // Tọa độ tâm (500, 250) trên khung (1000, 500) -> left = (500-100)/1000 = 40%, top = (250-50)/500 = 40%
      expect(result.boxes[0].left).toBe(40);
      expect(result.boxes[0].top).toBe(40);
      expect(result.boxes[0].width).toBe(20);
      expect(result.boxes[0].height).toBe(20);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, rỗng, sai định dạng, ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] - Xử lý lỗi ngoại lệ và dữ liệu dị thường (Zero Fake Data)', () => {
    it('3.1. Ném ngoại lệ khi outputs rỗng hoặc không có cấu trúc hợp lệ', () => {
      expect(() => RoboflowVisionService.parseRoboflowOutput({})).toThrow(
        'Dịch vụ Roboflow không trả về kết quả hợp lệ'
      );
      expect(() => RoboflowVisionService.parseRoboflowOutput({ outputs: [] })).toThrow(
        'Dịch vụ Roboflow không trả về kết quả hợp lệ'
      );
    });

    it('3.2. Không được tự ý gán số lượng giả định khi dữ liệu rỗng', async () => {
      await expect(RoboflowVisionService.toCleanBase64('')).resolves.toBe('');
    });
  });
});

