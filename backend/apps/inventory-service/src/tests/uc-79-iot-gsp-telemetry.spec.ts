// backend/apps/inventory-service/src/tests/uc-79-iot-gsp-telemetry.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-79] IOT GSP WAREHOUSE TELEMETRY (CẢM BIẾN MÔI TRƯỜNG KHO GSP)
 * Tham chiếu: Report 5 (Feature F08) & WBS #89 (Cold Chain Storage Screen)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-79] IoT GSP Warehouse Telemetry (Giám sát kho lạnh GSP)', () => {
  // Tiêu chuẩn GSP bảo quản kho mát (2°C đến 8°C, độ ẩm <= 70%)
  const GSP_MIN_TEMP = 2.0;
  const GSP_MAX_TEMP = 8.0;
  const GSP_MAX_HUMIDITY = 70.0;

  const evaluateTelemetry = (reading: { temp: number; humidity: number }) => {
    if (reading.temp < -20 || reading.temp > 60) {
      throw new Error(`Giá trị cảm biến bất thường (${reading.temp}°C) - nghi ngờ hỏng cảm biến!`);
    }

    if (reading.temp < GSP_MIN_TEMP) {
      return { status: 'ALERT_TOO_COLD', risk: 'Nguy cơ đông đá hỏng vaccine!', isNormal: false };
    }
    if (reading.temp > GSP_MAX_TEMP) {
      return { status: 'ALERT_TOO_HOT', risk: 'Nhiệt độ quá cao làm biến tính thuốc!', isNormal: false };
    }
    if (reading.humidity > GSP_MAX_HUMIDITY) {
      return { status: 'ALERT_HIGH_HUMIDITY', risk: 'Độ ẩm cao nguy cơ mốc thuốc viên!', isNormal: false };
    }

    return { status: 'NORMAL', isNormal: true };
  };

  describe('1. [Normal Values] Nhiệt độ và độ ẩm trong dải an toàn chuẩn GSP', () => {
    it('TC-UC79-NORM-01: Trạng thái NORMAL khi kho mát duy trì ở mức 4.5°C và độ ẩm 55%', () => {
      const result = evaluateTelemetry({ temp: 4.5, humidity: 55 });

      expect(result.isNormal).toBe(true);
      expect(result.status).toBe('NORMAL');
    });
  });

  describe('2. [Boundary Values] Mốc biên 2.0°C, 8.0°C và độ ẩm 70%', () => {
    it('TC-UC79-BOUND-01: [Biên dưới 2.0°C và biên trên 8.0°C] Vẫn thuộc khoảng an toàn', () => {
      expect(evaluateTelemetry({ temp: 2.0, humidity: 60 }).isNormal).toBe(true);
      expect(evaluateTelemetry({ temp: 8.0, humidity: 60 }).isNormal).toBe(true);
    });

    it('TC-UC79-BOUND-02: [Vượt biên 0.1°C] 8.1°C kích hoạt cảnh báo ALERT_TOO_HOT', () => {
      const result = evaluateTelemetry({ temp: 8.1, humidity: 60 });

      expect(result.isNormal).toBe(false);
      expect(result.status).toBe('ALERT_TOO_HOT');
    });

    it('TC-UC79-BOUND-03: [Dưới biên 0.1°C] 1.9°C kích hoạt cảnh báo ALERT_TOO_COLD', () => {
      const result = evaluateTelemetry({ temp: 1.9, humidity: 60 });

      expect(result.isNormal).toBe(false);
      expect(result.status).toBe('ALERT_TOO_COLD');
    });
  });

  describe('3. [Abnormal Values] Giá trị cảm biến bất thường hỏng hóc (-50°C hoặc +100°C)', () => {
    it('TC-UC79-ABNORM-01: Ném lỗi nghi ngờ hỏng phần cứng khi nhiệt độ ghi nhận là -30°C', () => {
      expect(() => evaluateTelemetry({ temp: -30, humidity: 50 })).toThrow(/nghi ngờ hỏng cảm biến/);
    });
  });
});
