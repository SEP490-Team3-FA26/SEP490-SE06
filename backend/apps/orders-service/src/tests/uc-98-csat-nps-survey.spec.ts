// backend/apps/orders-service/src/tests/uc-98-csat-nps-survey.spec.ts
/// <reference types="jest" />

/**
 * =========================================================================
 * USE CASE: [UC-98] POST-PURCHASE CSAT & NPS SURVEY (KHẢO SÁT HÀI LÒNG)
 * Tham chiếu: Report 5 (Feature F02)
 * Phân loại Test Case: Normal, Boundary, Abnormal
 * =========================================================================
 */

describe('[UC-98] Post-Purchase CSAT & NPS Survey (Khảo sát CSAT & NPS)', () => {
  const calculateNpsAndCsat = (survey: { npsScore: number; csatScore: number }) => {
    if (survey.npsScore < 0 || survey.npsScore > 10) {
      throw new Error('Thang điểm NPS bắt buộc từ 0 đến 10!');
    }
    if (survey.csatScore < 1 || survey.csatScore > 5) {
      throw new Error('Thang điểm CSAT bắt buộc từ 1 đến 5 sao!');
    }

    let npsCategory = '';
    if (survey.npsScore >= 9) npsCategory = 'PROMOTER';
    else if (survey.npsScore >= 7) npsCategory = 'PASSIVE';
    else npsCategory = 'DETRACTOR';

    return {
      npsScore: survey.npsScore,
      npsCategory,
      csatScore: survey.csatScore,
      csatSatisfied: survey.csatScore >= 4,
    };
  };

  describe('1. [Normal Values] Khách hàng đánh giá bình thường', () => {
    it('TC-UC98-NORM-01: Phân loại đúng nhóm Promoter và CSAT Hài lòng (NPS = 10, CSAT = 5 sao)', () => {
      const result = calculateNpsAndCsat({ npsScore: 10, csatScore: 5 });

      expect(result.npsCategory).toBe('PROMOTER');
      expect(result.csatSatisfied).toBe(true);
    });

    it('TC-UC98-NORM-02: Phân loại đúng nhóm Detractor và CSAT Không hài lòng (NPS = 3, CSAT = 2 sao)', () => {
      const result = calculateNpsAndCsat({ npsScore: 3, csatScore: 2 });

      expect(result.npsCategory).toBe('DETRACTOR');
      expect(result.csatSatisfied).toBe(false);
    });
  });

  describe('2. [Boundary Values] Mốc biên điểm 0, 7, 9, 10 và 1-5 sao', () => {
    it('TC-UC98-BOUND-01: [Biên điểm 9 và 7] Chuyển đổi giữa Promoter (>=9) và Passive (7-8)', () => {
      expect(calculateNpsAndCsat({ npsScore: 9, csatScore: 4 }).npsCategory).toBe('PROMOTER');
      expect(calculateNpsAndCsat({ npsScore: 8, csatScore: 4 }).npsCategory).toBe('PASSIVE');
      expect(calculateNpsAndCsat({ npsScore: 7, csatScore: 4 }).npsCategory).toBe('PASSIVE');
      expect(calculateNpsAndCsat({ npsScore: 6, csatScore: 4 }).npsCategory).toBe('DETRACTOR');
    });

    it('TC-UC98-BOUND-02: [Biên điểm cực trị 0 và 10] Điểm NPS thấp nhất 0 và cao nhất 10', () => {
      expect(calculateNpsAndCsat({ npsScore: 0, csatScore: 1 }).npsCategory).toBe('DETRACTOR');
      expect(calculateNpsAndCsat({ npsScore: 10, csatScore: 5 }).npsCategory).toBe('PROMOTER');
    });
  });

  describe('3. [Abnormal Values] Điểm đánh giá vượt quá thang đo chuẩn', () => {
    it('TC-UC98-ABNORM-01: Ném lỗi khi điểm NPS vượt quá 10 (ví dụ 11 điểm)', () => {
      expect(() => calculateNpsAndCsat({ npsScore: 11, csatScore: 5 })).toThrow(/từ 0 đến 10/);
    });

    it('TC-UC98-ABNORM-02: Ném lỗi khi điểm CSAT nhỏ hơn 1 sao (ví dụ 0 sao)', () => {
      expect(() => calculateNpsAndCsat({ npsScore: 8, csatScore: 0 })).toThrow(/từ 1 đến 5 sao/);
    });
  });
});
