// customerAccount.service.spec.ts - Bộ kiểm thử đơn vị cho CustomerAccountService
// Tuân thủ quy chuẩn WDP301/SEP490: 100% tiếng Việt, phân loại đủ 3 nhóm chuẩn:
// 1. [Normal Values]
// 2. [Boundary Values]
// 3. [Abnormal Values]

import {
  CustomerAccountService,
  CustomerOrder,
  CustomerUser,
  CustomerLoyalty,
  ClinicalHealthData,
} from './customerAccount.service';

describe('CustomerAccountService', () => {
  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values] - Luồng nghiệp vụ chuẩn', () => {
    it('Phân loại chính xác 4 nhóm trạng thái đơn hàng Long Châu từ danh sách thực tế', () => {
      const mockOrders: CustomerOrder[] = [
        { id: '1', status: 'PENDING', paymentStatus: 'PENDING' },
        { id: '2', status: 'SUBMITTED', paymentStatus: 'PENDING' },
        { id: '3', status: 'CONFIRMED', paymentStatus: 'PENDING' },
        { id: '4', status: 'DELIVERING', paymentStatus: 'PENDING' },
        { id: '5', status: 'SHIPPING', paymentStatus: 'PENDING' },
        { id: '6', status: 'COMPLETED', paymentStatus: 'PAID' },
        { id: '7', status: 'DELIVERED', paymentStatus: 'PAID' },
        { id: '8', status: 'CANCELLED', paymentStatus: 'CANCELLED' },
        { id: '9', status: 'RETURNED', paymentStatus: 'REFUNDED' },
      ];

      const counts = CustomerAccountService.getOrderStatusCounts(mockOrders);

      // Đang xử lý: PENDING, SUBMITTED (2)
      // Đang giao: CONFIRMED, DELIVERING, SHIPPING (3)
      // Đã giao: COMPLETED, DELIVERED (2)
      // Đổi/Trả/Hủy: CANCELLED, RETURNED (2)
      expect(counts.pendingCount).toBe(2);
      expect(counts.deliveringCount).toBe(3);
      expect(counts.deliveredCount).toBe(2);
      expect(counts.returnedCount).toBe(2);
      expect(counts.totalCount).toBe(9);
    });

    it('Định dạng đầy đủ thông tin người dùng có số điện thoại chuẩn 10 chữ số và điểm thưởng', () => {
      const mockUser: CustomerUser = {
        id: 'u123',
        name: 'Trần Hồng Phước',
        phone: '0936929381',
        email: 'phuoc@example.com',
      };
      const mockLoyalty: CustomerLoyalty = {
        points: 250,
        tier: 'Vàng',
      };

      const profile = CustomerAccountService.formatUserDisplay(mockUser, mockLoyalty);

      expect(profile.displayName).toBe('Trần Hồng Phước');
      expect(profile.displayPhone).toBe('0936 929 381');
      expect(profile.points).toBe(250);
      expect(profile.tier).toBe('Hạng Vàng');
      expect(profile.initials).toBe('TP');
      expect(profile.isLoggedIn).toBe(true);
    });

    it('Trích xuất tóm tắt hồ sơ y tế lâm sàng chuẩn GPP với dị ứng, bệnh nền và nhóm máu', () => {
      const mockClinical: ClinicalHealthData = {
        allergies: ['Penicillin'],
        allergicMedicines: ['Augmentin'],
        allergicIngredients: ['Amoxicillin'],
        chronicConditions: ['Viêm loét dạ dày', 'Tăng huyết áp'],
        bloodType: 'O+',
        hasCompletedHealthOnboarding: true,
      };

      const summary = CustomerAccountService.getHealthSummaryBadges(mockClinical);

      expect(summary.allergyCount).toBe(3);
      expect(summary.allergyLabel).toBe('3 dị ứng cảnh báo');
      expect(summary.conditionCount).toBe(2);
      expect(summary.conditionLabel).toBe('2 bệnh nền ghi nhận');
      expect(summary.bloodType).toBe('O+');
      expect(summary.hasCompleted).toBe(true);
      expect(summary.statusBadge).toBe('Đã kích hoạt Sổ Y Tế');
    });

    it('Lọc chính xác đơn hàng theo từng tab trạng thái', () => {
      const mockOrders: CustomerOrder[] = [
        { id: '1', status: 'PENDING', paymentStatus: 'PENDING' },
        { id: '2', status: 'DELIVERING' },
        { id: '3', status: 'COMPLETED', paymentStatus: 'PAID' },
        { id: '4', status: 'CANCELLED' },
      ];

      const pendingOrders = CustomerAccountService.filterOrdersByStatus(mockOrders, 'PENDING');
      const shippingOrders = CustomerAccountService.filterOrdersByStatus(mockOrders, 'SHIPPING');
      const completedOrders = CustomerAccountService.filterOrdersByStatus(mockOrders, 'COMPLETED');
      const cancelledOrders = CustomerAccountService.filterOrdersByStatus(mockOrders, 'CANCELLED');

      expect(pendingOrders.length).toBe(1);
      expect(pendingOrders[0].id).toBe('1');
      expect(shippingOrders.length).toBe(1);
      expect(shippingOrders[0].id).toBe('2');
      expect(completedOrders.length).toBe(1);
      expect(completedOrders[0].id).toBe('3');
      expect(cancelledOrders.length).toBe(1);
      expect(cancelledOrders[0].id).toBe('4');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, tối thiểu, tối đa, 0, 1 phần tử
  // =========================================================================
  describe('[Boundary Values] - Giá trị biên và cực trị', () => {
    it('Xử lý an toàn khi danh sách đơn hàng hoàn toàn rỗng []', () => {
      const counts = CustomerAccountService.getOrderStatusCounts([]);
      expect(counts).toEqual({
        pendingCount: 0,
        deliveringCount: 0,
        deliveredCount: 0,
        returnedCount: 0,
        totalCount: 0,
      });

      const filtered = CustomerAccountService.filterOrdersByStatus([], 'COMPLETED');
      expect(filtered).toEqual([]);
    });

    it('Xử lý chính xác danh sách chỉ có đúng 1 đơn hàng duy nhất', () => {
      const singleOrder: CustomerOrder[] = [
        { id: 'only-1', status: 'DELIVERING' },
      ];
      const counts = CustomerAccountService.getOrderStatusCounts(singleOrder);

      expect(counts.pendingCount).toBe(0);
      expect(counts.deliveringCount).toBe(1);
      expect(counts.deliveredCount).toBe(0);
      expect(counts.returnedCount).toBe(0);
      expect(counts.totalCount).toBe(1);
    });

    it('Xử lý điểm thưởng biên bằng 0 hoặc âm, giữ mức an toàn không âm', () => {
      const mockUser: CustomerUser = { name: 'Nguyễn Văn A' };
      const zeroLoyalty: CustomerLoyalty = { points: 0 };
      const negativeLoyalty: CustomerLoyalty = { points: -50 };

      const resZero = CustomerAccountService.formatUserDisplay(mockUser, zeroLoyalty);
      expect(resZero.points).toBe(0);

      const resNeg = CustomerAccountService.formatUserDisplay(mockUser, negativeLoyalty);
      expect(resNeg.points).toBe(0);
    });

    it('Tên chỉ gồm 1 từ hoặc có nhiều khoảng trắng thừa', () => {
      const mockUserSingleWord: CustomerUser = { name: '   Phước   ' };
      const profile = CustomerAccountService.formatUserDisplay(mockUserSingleWord, null);

      expect(profile.displayName).toBe('Phước');
      expect(profile.initials).toBe('PH');
    });

    it('Hồ sơ y tế không có dị ứng hoặc bệnh nền nhưng đã kích hoạt', () => {
      const emptyClinical: ClinicalHealthData = {
        allergies: [],
        chronicConditions: [],
        bloodType: '',
        hasCompletedHealthOnboarding: true,
      };

      const summary = CustomerAccountService.getHealthSummaryBadges(emptyClinical);

      expect(summary.allergyCount).toBe(0);
      expect(summary.allergyLabel).toBe('Không có dị ứng');
      expect(summary.conditionCount).toBe(0);
      expect(summary.conditionLabel).toBe('Khỏe mạnh');
      expect(summary.bloodType).toBe('Chưa rõ');
      expect(summary.statusBadge).toBe('Đã kích hoạt Sổ Y Tế');
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, rỗng, sai định dạng, ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] - Ngoại lệ và dữ liệu dị thường', () => {
    it('Xử lý an toàn khi truyền null hoặc undefined vào các hàm tính toán', () => {
      const countsNull = CustomerAccountService.getOrderStatusCounts(null);
      expect(countsNull.totalCount).toBe(0);

      const countsUndefined = CustomerAccountService.getOrderStatusCounts(undefined);
      expect(countsUndefined.totalCount).toBe(0);

      const profileNull = CustomerAccountService.formatUserDisplay(null, null);
      expect(profileNull.displayName).toBe('Đăng nhập / Đăng ký');
      expect(profileNull.isLoggedIn).toBe(false);

      const healthNull = CustomerAccountService.getHealthSummaryBadges(null);
      expect(healthNull.statusBadge).toBe('Chưa cập nhật');

      const filterNull = CustomerAccountService.filterOrdersByStatus(null, 'ALL');
      expect(filterNull).toEqual([]);
    });

    it('Xử lý an toàn khi mảng đơn hàng chứa các phần tử rác hoặc null/undefined', () => {
      const corruptOrders: any = [
        null,
        undefined,
        {},
        { status: null, paymentStatus: undefined },
        { status: 'DELIVERING' },
      ];

      const counts = CustomerAccountService.getOrderStatusCounts(corruptOrders);
      expect(counts.totalCount).toBe(5);
      expect(counts.deliveringCount).toBe(1);
    });

    it('Xử lý số điện thoại chứa ký tự đặc biệt hoặc chữ cái không hợp lệ', () => {
      const mockUserMessyPhone: CustomerUser = {
        name: 'Khách Hàng',
        phone: '+84 (093) 692-9381!',
      };

      const profile = CustomerAccountService.formatUserDisplay(mockUserMessyPhone, null);
      // Khi loại bỏ các ký tự phi số, nếu không đúng 10 số (do có +84 thành 11 số) thì giữ nguyên an toàn
      expect(profile.displayPhone).toBeDefined();
      expect(profile.displayPhone.length).toBeGreaterThan(0);
    });

    it('Xử lý đối tượng lâm sàng bị hỏng cấu trúc mảng', () => {
      const malformedClinical: any = {
        allergies: 'không phải mảng',
        chronicConditions: 12345,
        bloodType: null,
      };

      const summary = CustomerAccountService.getHealthSummaryBadges(malformedClinical);
      expect(summary.allergyCount).toBe(0);
      expect(summary.conditionCount).toBe(0);
      expect(summary.bloodType).toBe('Chưa rõ');
    });
  });
});

