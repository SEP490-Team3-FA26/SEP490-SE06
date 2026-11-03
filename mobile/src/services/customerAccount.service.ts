// customerAccount.service.ts - Dịch vụ xử lý dữ liệu tài khoản khách hàng, thống kê đơn hàng và tóm tắt hồ sơ y tế theo phong cách Long Châu
// Tuân thủ quy chuẩn WDP301/SEP490: 100% tiếng Việt, an toàn kiểu dữ liệu

export interface CustomerOrder {
  id?: string;
  _id?: string;
  orderCode?: string;
  status?: string;
  paymentStatus?: string;
  finalAmount?: number;
  total?: number;
  createdAt?: string | number | Date;
  items?: Array<{
    name: string;
    quantity: number;
    price?: number;
    unit?: string;
    cach_dung?: string;
  }>;
}

export interface CustomerUser {
  id?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface CustomerLoyalty {
  points?: number;
  tier?: string;
  nextTierPoints?: number;
}

export interface ClinicalHealthData {
  allergies?: string[];
  allergicMedicines?: string[];
  allergicIngredients?: string[];
  chronicConditions?: string[];
  bloodType?: string;
  medicalNotes?: string;
  hasCompletedHealthOnboarding?: boolean;
}

export interface OrderStatusCounts {
  pendingCount: number;     // Đang xử lý
  deliveringCount: number;  // Đang giao
  deliveredCount: number;   // Đã giao
  returnedCount: number;    // Đổi/Trả/Hủy
  totalCount: number;       // Tổng đơn
}

export interface FormattedCustomerProfile {
  displayName: string;
  displayPhone: string;
  points: number;
  tier: string;
  initials: string;
  isLoggedIn: boolean;
}

export interface FormattedHealthSummary {
  allergyCount: number;
  allergyLabel: string;
  conditionCount: number;
  conditionLabel: string;
  bloodType: string;
  hasCompleted: boolean;
  statusBadge: string;
}

export class CustomerAccountService {
  /**
   * Tính toán số lượng đơn hàng theo 4 trạng thái chuẩn của giao diện Long Châu
   * [Đang xử lý, Đang giao, Đã giao, Đổi/Trả]
   */
  static getOrderStatusCounts(orders?: CustomerOrder[] | null): OrderStatusCounts {
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return {
        pendingCount: 0,
        deliveringCount: 0,
        deliveredCount: 0,
        returnedCount: 0,
        totalCount: 0,
      };
    }

    let pendingCount = 0;
    let deliveringCount = 0;
    let deliveredCount = 0;
    let returnedCount = 0;

    for (const ord of orders) {
      if (!ord || typeof ord !== 'object') continue;

      const status = String(ord.status || '').trim().toUpperCase();
      const paymentStatus = String(ord.paymentStatus || '').trim().toUpperCase();

      // Kiểm tra trạng thái Hủy / Đổi / Trả trước tiên
      if (
        status === 'CANCELLED' ||
        status === 'RETURNED' ||
        status === 'FAILED' ||
        status === 'REFUNDED' ||
        paymentStatus === 'CANCELLED' ||
        paymentStatus === 'FAILED'
      ) {
        returnedCount++;
      }
      // Trạng thái đã hoàn tất / đã giao
      else if (
        status === 'COMPLETED' ||
        status === 'DELIVERED' ||
        paymentStatus === 'PAID'
      ) {
        deliveredCount++;
      }
      // Trạng thái đang giao hàng
      else if (
        status === 'DELIVERING' ||
        status === 'SHIPPING' ||
        status === 'PROCESSING' ||
        status === 'CONFIRMED'
      ) {
        deliveringCount++;
      }
      // Mặc định hoặc trạng thái đang chờ xử lý
      else if (
        status === 'PENDING' ||
        status === 'SUBMITTED' ||
        paymentStatus === 'PENDING' ||
        status === ''
      ) {
        pendingCount++;
      } else {
        // Nếu có trạng thái lạ khác chưa xếp, tính vào đang xử lý
        pendingCount++;
      }
    }

    return {
      pendingCount,
      deliveringCount,
      deliveredCount,
      returnedCount,
      totalCount: orders.length,
    };
  }

  /**
   * Định dạng thông tin hiển thị của khách hàng trên thanh Header Xanh
   */
  static formatUserDisplay(
    user?: CustomerUser | null,
    loyalty?: CustomerLoyalty | null
  ): FormattedCustomerProfile {
    const isLoggedIn = Boolean(user && (user.id || user.name || user.phone || user.email));

    // Lấy tên khách hàng
    const rawName = user?.name || user?.fullName || '';
    const displayName = rawName.trim() || (isLoggedIn ? 'Khách Hàng' : 'Đăng nhập / Đăng ký');

    // Lấy số điện thoại và định dạng 0936 929 381
    const rawPhone = (user?.phone || '').trim();
    let displayPhone = 'Chưa cập nhật SĐT';
    if (rawPhone) {
      const cleanDigits = rawPhone.replace(/\D/g, '');
      if (cleanDigits.length === 10) {
        displayPhone = `${cleanDigits.slice(0, 4)} ${cleanDigits.slice(4, 7)} ${cleanDigits.slice(7)}`;
      } else {
        displayPhone = rawPhone;
      }
    } else if (!isLoggedIn) {
      displayPhone = 'Nhận ngàn ưu đãi & Tích điểm';
    }

    // Điểm thưởng tích lũy (không âm)
    const points = Math.max(0, Number(loyalty?.points) || 0);

    // Hạng hội viên
    const tier = loyalty?.tier ? `Hạng ${loyalty.tier}` : 'Thành viên Bạc';

    // Tạo chữ cái viết tắt đại diện Avatar (ví dụ: "Anh Phước" -> "AP" hoặc "P")
    let initials = 'KH';
    if (rawName.trim()) {
      const words = rawName.trim().split(/\s+/);
      if (words.length === 1) {
        initials = words[0].slice(0, 2).toUpperCase();
      } else {
        initials = `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
      }
    }

    return {
      displayName,
      displayPhone,
      points,
      tier,
      initials,
      isLoggedIn,
    };
  }

  /**
   * Tóm tắt hồ sơ y tế lâm sàng để hiển thị thẻ truy cập nhanh
   */
  static getHealthSummaryBadges(clinicalData?: ClinicalHealthData | null): FormattedHealthSummary {
    if (!clinicalData || typeof clinicalData !== 'object') {
      return {
        allergyCount: 0,
        allergyLabel: 'Không có dị ứng',
        conditionCount: 0,
        conditionLabel: 'Khỏe mạnh',
        bloodType: 'Chưa rõ',
        hasCompleted: false,
        statusBadge: 'Chưa cập nhật',
      };
    }

    const allergyCount =
      (Array.isArray(clinicalData.allergies) ? clinicalData.allergies.length : 0) +
      (Array.isArray(clinicalData.allergicMedicines) ? clinicalData.allergicMedicines.length : 0) +
      (Array.isArray(clinicalData.allergicIngredients) ? clinicalData.allergicIngredients.length : 0);

    const conditionCount = Array.isArray(clinicalData.chronicConditions)
      ? clinicalData.chronicConditions.length
      : 0;
    const bloodType = clinicalData.bloodType?.trim() || 'Chưa rõ';
    const hasCompleted = Boolean(clinicalData.hasCompletedHealthOnboarding);

    const allergyLabel = allergyCount > 0 ? `${allergyCount} dị ứng cảnh báo` : 'Không có dị ứng';
    const conditionLabel = conditionCount > 0 ? `${conditionCount} bệnh nền ghi nhận` : 'Khỏe mạnh';

    let statusBadge = 'Chưa cập nhật';
    if (hasCompleted) {
      statusBadge = 'Đã kích hoạt Sổ Y Tế';
    } else if (allergyCount > 0 || conditionCount > 0 || bloodType !== 'Chưa rõ') {
      statusBadge = 'Đang hoàn thiện';
    }

    return {
      allergyCount,
      allergyLabel,
      conditionCount,
      conditionLabel,
      bloodType,
      hasCompleted,
      statusBadge,
    };
  }

  /**
   * Lọc danh sách đơn hàng theo tab được chọn
   */
  static filterOrdersByStatus(
    orders?: CustomerOrder[] | null,
    tab: 'ALL' | 'PENDING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED' = 'ALL'
  ): CustomerOrder[] {
    if (!orders || !Array.isArray(orders)) return [];
    if (tab === 'ALL') return orders;

    return orders.filter((o) => {
      if (!o) return false;
      const status = String(o.status || '').trim().toUpperCase();
      const paymentStatus = String(o.paymentStatus || '').trim().toUpperCase();

      switch (tab) {
        case 'PENDING':
          return (
            (status === 'PENDING' || status === 'SUBMITTED' || paymentStatus === 'PENDING') &&
            status !== 'CANCELLED' &&
            status !== 'COMPLETED'
          );
        case 'SHIPPING':
          return (
            status === 'DELIVERING' ||
            status === 'SHIPPING' ||
            status === 'PROCESSING' ||
            status === 'CONFIRMED'
          );
        case 'COMPLETED':
          return (
            status === 'COMPLETED' ||
            status === 'DELIVERED' ||
            paymentStatus === 'PAID'
          );
        case 'CANCELLED':
          return (
            status === 'CANCELLED' ||
            status === 'RETURNED' ||
            status === 'FAILED' ||
            status === 'REFUNDED' ||
            paymentStatus === 'CANCELLED' ||
            paymentStatus === 'FAILED'
          );
        default:
          return true;
      }
    });
  }
}
