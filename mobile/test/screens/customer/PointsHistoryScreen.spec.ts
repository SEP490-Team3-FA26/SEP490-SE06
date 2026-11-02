/**
 * PointsHistoryScreen.spec.ts - Bộ Kiểm Thử Đơn Vị Màn Hình Lịch Sử Điểm Thưởng
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Hiển thị tổng điểm, lọc theo 4 tab (Tất cả, Tích điểm, Sử dụng, Hết hạn), hiển thị icon và ngày giờ.
 * 2. [Boundary Values]: Điểm bằng 0, danh sách rỗng (Empty State), 1 giao dịch duy nhất.
 * 3. [Abnormal Values]: Dữ liệu giao dịch null/undefined, điểm âm không hợp lệ, dữ liệu thiếu trường.
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import {
  filterPointsHistory,
  formatPointsDisplay,
  PointsHistoryItem,
  DEFAULT_POINTS_HISTORY,
} from '../../../src/services/loyaltyRewards.service';

describe('PointsHistoryScreen - Kiểm Thử Màn Hình Lịch Sử Điểm Thưởng FPT Long Châu', () => {
  const sampleTransactions: PointsHistoryItem[] = [
    {
      id: 'TX-1',
      title: 'Tích điểm đơn hàng tại quầy POS',
      orderCode: '#HD-20261028-091',
      date: '28/10/2026 14:35',
      points: 150,
      type: 'EARN',
    },
    {
      id: 'TX-2',
      title: 'Đổi quà: Mặt nạ Pax Moly Super Aqua',
      date: '24/10/2026 16:45',
      points: -1500,
      type: 'USE',
    },
    {
      id: 'TX-3',
      title: 'Thưởng thăng hạng Hạng Vàng',
      date: '15/10/2026 08:00',
      points: 500,
      type: 'BONUS',
    },
    {
      id: 'TX-4',
      title: 'Điểm hết hạn định kỳ năm 2025',
      date: '31/12/2025 23:59',
      points: -50,
      type: 'EXPIRE',
    },
  ];

  // =========================================================================
  // 1. [NORMAL VALUES] - LUỒNG NGHIỆP VỤ CHUẨN
  // =========================================================================
  describe('[Normal Values] Luồng hiển thị và phân loại chuẩn FPT Long Châu', () => {
    it('Phải hiển thị tổng điểm định dạng đẹp có dấu phân cách nghìn', () => {
      expect(formatPointsDisplay(7838)).toBe('7.838');
      expect(formatPointsDisplay(1500)).toBe('1.500');
    });

    it('Phải lọc đầy đủ tất cả 4 giao dịch khi chọn tab Tất cả (ALL)', () => {
      const all = filterPointsHistory(sampleTransactions, 'ALL');
      expect(all).toHaveLength(4);
    });

    it('Phải lọc đúng 2 giao dịch cộng điểm khi chọn tab Tích điểm (EARN)', () => {
      const earned = filterPointsHistory(sampleTransactions, 'EARN');
      expect(earned).toHaveLength(2);
      expect(earned.map(e => e.id)).toEqual(['TX-1', 'TX-3']);
      expect(earned.every(e => e.points > 0)).toBe(true);
    });

    it('Phải lọc đúng 1 giao dịch đổi quà khi chọn tab Sử dụng (USE)', () => {
      const used = filterPointsHistory(sampleTransactions, 'USE');
      expect(used).toHaveLength(1);
      expect(used[0].id).toBe('TX-2');
      expect(used[0].points).toBe(-1500);
    });

    it('Phải lọc đúng 1 giao dịch hết hạn khi chọn tab Hết hạn (EXPIRE)', () => {
      const expired = filterPointsHistory(sampleTransactions, 'EXPIRE');
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('TX-4');
    });

    it('Bộ dữ liệu mẫu mặc định DEFAULT_POINTS_HISTORY phải hợp lệ và có đầy đủ các trường', () => {
      expect(DEFAULT_POINTS_HISTORY.length).toBeGreaterThan(0);
      DEFAULT_POINTS_HISTORY.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.date).toBeDefined();
        expect(typeof item.points).toBe('number');
      });
    });
  });

  // =========================================================================
  // 2. [BOUNDARY VALUES] - GIÁ TRỊ BIÊN VÀ GIỚI HẠN
  // =========================================================================
  describe('[Boundary Values] Giá trị biên, số dư 0 và danh sách rỗng', () => {
    it('Phải hiển thị "0" điểm khi số dư điểm hiện có là 0 (giống ảnh Long Châu user gửi)', () => {
      expect(formatPointsDisplay(0)).toBe('0');
    });

    it('Phải trả về mảng rỗng khi danh sách giao dịch không có phần tử nào', () => {
      const emptyList: PointsHistoryItem[] = [];
      expect(filterPointsHistory(emptyList, 'ALL')).toEqual([]);
      expect(filterPointsHistory(emptyList, 'EARN')).toEqual([]);
    });

    it('Phải xử lý chính xác khi chỉ có duy nhất 1 giao dịch trong lịch sử', () => {
      const singleItem: PointsHistoryItem[] = [
        { id: 'TX-ONLY', title: 'Tích điểm đơn đầu tiên', date: '01/11', points: 100, type: 'EARN' },
      ];
      expect(filterPointsHistory(singleItem, 'ALL')).toHaveLength(1);
      expect(filterPointsHistory(singleItem, 'USE')).toHaveLength(0);
      expect(filterPointsHistory(singleItem, 'EARN')).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. [ABNORMAL VALUES] - GIÁ TRỊ DỊ THƯỜNG VÀ NGOẠI LỆ
  // =========================================================================
  describe('[Abnormal Values] Dữ liệu dị thường, null, undefined và ngoại lệ', () => {
    it('Phải trả về "0" an toàn khi số điểm là null, undefined hoặc số âm', () => {
      expect(formatPointsDisplay(null)).toBe('0');
      expect(formatPointsDisplay(undefined)).toBe('0');
      expect(formatPointsDisplay(-100)).toBe('0');
      expect(formatPointsDisplay(NaN)).toBe('0');
    });

    it('Phải trả về mảng rỗng an toàn khi danh sách truyền vào là null hoặc undefined', () => {
      expect(filterPointsHistory(null as any, 'ALL')).toEqual([]);
      expect(filterPointsHistory(undefined as any, 'EARN')).toEqual([]);
    });

    it('Phải giữ nguyên danh sách an toàn khi tab truyền vào không thuộc nhóm hợp lệ', () => {
      const res = filterPointsHistory(sampleTransactions, 'INVALID_TAB' as any);
      expect(res).toEqual(sampleTransactions);
    });
  });
});

