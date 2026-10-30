// backend/apps/inventory-service/src/tests/uc-102-restricted-narcotic-log.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-102] RESTRICTED & NARCOTIC DRUG COMPLIANCE (SỔ THUỐC GÂY NGHIỆN)
 * Tham chiếu: Report 5 (Feature F08)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-102] Restricted & Narcotic Drug Compliance (Thuốc gây nghiện)', () => {
  const dispenseNarcoticDrug = (prescription: {
    drugName: string;
    quantity: number;
    patientIdNumber: string;
    doctorLicense: string;
    maxDaysPrescribed: number; // Quy định tối đa 7 hoặc 30 ngày
  }) => {
    if (!prescription.patientIdNumber || prescription.patientIdNumber.trim().length < 9) {
      throw new Error('Vi phạm quy định Bộ Y Tế: Bắt buộc phải có số CMND/CCCD hợp lệ của bệnh nhân!');
    }
    if (!prescription.doctorLicense || !prescription.doctorLicense.startsWith('CCHN')) {
      throw new Error('Vi phạm quy định: Bác sĩ kê đơn phải có Chứng chỉ hành nghề (CCHN) hợp lệ!');
    }
    if (prescription.maxDaysPrescribed > 7) {
      return {
        allowed: false,
        reason: 'Thuốc gây nghiện Schedule II không được phép kê đơn quá 7 ngày điều trị ngoại trú!',
      };
    }

    return {
      allowed: true,
      loggedToMohAuditBook: true,
      recordId: `NARCOTIC-LOG-${Date.now()}`,
      patientIdNumber: prescription.patientIdNumber,
    };
  };

  describe('1. [Normal Values] Xuất bán thuốc gây nghiện đầy đủ giấy tờ hợp pháp', () => {
    it('TC-UC102-NORM-01: Cho phép xuất bán và lưu vào Sổ theo dõi BYT khi đủ CCCD và CCHN bác sĩ', () => {
      const payload = {
        drugName: 'Morphine 10mg',
        quantity: 14,
        patientIdNumber: '079099001122',
        doctorLicense: 'CCHN-BYT-8899',
        maxDaysPrescribed: 7,
      };

      const result = dispenseNarcoticDrug(payload);

      expect(result.allowed).toBe(true);
      expect(result.loggedToMohAuditBook).toBe(true);
    });
  });

  describe('2. [Boundary Values] Mốc biên 7 ngày điều trị tối đa', () => {
    it('TC-UC102-BOUND-01: [Biên tối đa 7 ngày] Kê đơn đúng 7 ngày được chấp thuận', () => {
      const payload = {
        drugName: 'Morphine 10mg',
        quantity: 14,
        patientIdNumber: '079099001122',
        doctorLicense: 'CCHN-BYT-8899',
        maxDaysPrescribed: 7,
      };

      const result = dispenseNarcoticDrug(payload);
      expect(result.allowed).toBe(true);
    });

    it('TC-UC102-BOUND-02: [Vượt biên 1 ngày] Kê đơn 8 ngày bị từ chối xuất bán', () => {
      const payload = {
        drugName: 'Morphine 10mg',
        quantity: 16,
        patientIdNumber: '079099001122',
        doctorLicense: 'CCHN-BYT-8899',
        maxDaysPrescribed: 8,
      };

      const result = dispenseNarcoticDrug(payload);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('không được phép kê đơn quá 7 ngày');
    });
  });

  describe('3. [Abnormal Values] Thiếu CCCD hoặc CCHN bác sĩ không hợp lệ', () => {
    it('TC-UC102-ABNORM-01: Ném lỗi khi thiếu số CCCD của bệnh nhân', () => {
      const invalidPayload = {
        drugName: 'Morphine',
        quantity: 5,
        patientIdNumber: '',
        doctorLicense: 'CCHN-01',
        maxDaysPrescribed: 3,
      };

      expect(() => dispenseNarcoticDrug(invalidPayload)).toThrow(/Bắt buộc phải có số CMND\/CCCD/);
    });

    it('TC-UC102-ABNORM-02: Ném lỗi khi mã chứng chỉ hành nghề bác sĩ không đúng định dạng', () => {
      const invalidDoctor = {
        drugName: 'Morphine',
        quantity: 5,
        patientIdNumber: '079099001122',
        doctorLicense: 'INVALID-CODE',
        maxDaysPrescribed: 3,
      };

      expect(() => dispenseNarcoticDrug(invalidDoctor)).toThrow(/Chứng chỉ hành nghề/);
    });
  });
});
