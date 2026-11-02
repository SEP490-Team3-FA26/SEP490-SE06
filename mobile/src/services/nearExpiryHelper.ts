/**
 * nearExpiryHelper.ts - Tiện ích hỗ trợ quản lý dược phẩm cận hạn & quá hạn dùng theo chuẩn GSP/GDP
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

export interface ExpiryBadgeInfo {
  label: string;
  isExpired: boolean;
  severity: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'SAFE';
  bg: string;
  text: string;
  border: string;
  icon: 'alert-circle' | 'time' | 'hourglass-outline' | 'checkmark-circle-outline';
}

/**
 * Định dạng nhãn hiển thị số ngày còn lại của thuốc
 * Xử lý chính xác các trường hợp quá hạn (số âm), hôm nay (0) và cận hạn (dương)
 */
export function formatDaysLeftLabel(daysLeft: number | undefined | null): ExpiryBadgeInfo {
  if (daysLeft === undefined || daysLeft === null || isNaN(daysLeft)) {
    return {
      label: 'Chưa có HSD',
      isExpired: false,
      severity: 'SAFE',
      bg: '#F1F5F9',
      text: '#64748B',
      border: '#CBD5E1',
      icon: 'hourglass-outline',
    };
  }

  // Trường hợp đã quá hạn sử dụng
  if (daysLeft < 0) {
    const absDays = Math.abs(daysLeft);
    return {
      label: `Quá ${absDays} ngày`,
      isExpired: true,
      severity: 'EXPIRED',
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#FECACA',
      icon: 'alert-circle',
    };
  }

  // Trường hợp hết hạn đúng ngày hôm nay
  if (daysLeft === 0) {
    return {
      label: 'Hết hạn hôm nay',
      isExpired: true,
      severity: 'EXPIRED',
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#FECACA',
      icon: 'alert-circle',
    };
  }

  // Trường hợp khẩn cấp: Cận hạn trong vòng 30 ngày
  if (daysLeft <= 30) {
    return {
      label: `Còn ${daysLeft} ngày`,
      isExpired: false,
      severity: 'CRITICAL',
      bg: '#FEF3C7',
      text: '#D97706',
      border: '#FDE68A',
      icon: 'time',
    };
  }

  // Trường hợp cảnh báo: Cận hạn trong vòng 90 ngày
  if (daysLeft <= 90) {
    return {
      label: `Còn ${daysLeft} ngày`,
      isExpired: false,
      severity: 'WARNING',
      bg: '#E0F2FE',
      text: '#0284C7',
      border: '#BAE6FD',
      icon: 'hourglass-outline',
    };
  }

  // Hạn dùng an toàn (> 90 ngày)
  return {
    label: `Còn ${daysLeft} ngày`,
    isExpired: false,
    severity: 'SAFE',
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    icon: 'checkmark-circle-outline',
  };
}

/**
 * Bộ lọc danh sách thuốc cận hạn theo nhóm phân loại
 */
export function filterNearExpiryList(
  list: any[] | undefined | null,
  filterType: 'ALL' | 'EXPIRED' | 'UNDER_30' | 'UNDER_90'
): any[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  return list.filter((item) => {
    const days = typeof item?.daysLeft === 'number' ? item.daysLeft : 999;
    switch (filterType) {
      case 'EXPIRED':
        return days <= 0;
      case 'UNDER_30':
        return days > 0 && days <= 30;
      case 'UNDER_90':
        return days > 30 && days <= 90;
      case 'ALL':
      default:
        return true;
    }
  });
}

/**
 * Đề xuất hành động điều phối kho GSP theo nguyên tắc FEFO
 */
export function getFefoPriorityRecommendation(item: any): {
  levelTitle: string;
  actionText: string;
  urgencyColor: string;
} {
  const days = typeof item?.daysLeft === 'number' ? item.daysLeft : 999;

  if (days <= 0) {
    return {
      levelTitle: 'NGHIÊM CẤM CẤP PHÁT XUẤT BÁN',
      actionText: 'Lập biên bản niêm phong hủy thuốc hoặc xuất trả nhà cung cấp GDP theo hợp đồng hoàn tiền.',
      urgencyColor: '#DC2626',
    };
  }

  if (days <= 30) {
    return {
      levelTitle: 'ƯU TIÊN ĐIỀU CHUYỂN KHẨN CẤP (FEFO CẤP 1)',
      actionText: 'Điều phối ngay sang các nhà thuốc chi nhánh trung tâm có doanh số bán nhanh trong chu kỳ 7 ngày.',
      urgencyColor: '#D97706',
    };
  }

  if (days <= 90) {
    return {
      levelTitle: 'CẢNH BÁO CẬN HẠN DÙNG (FEFO CẤP 2)',
      actionText: 'Tự động gắn cờ ưu tiên xuất bán trước cho các đơn hàng B2C và điều phối liên chi nhánh.',
      urgencyColor: '#0284C7',
    };
  }

  return {
    levelTitle: 'TỒN KHO AN TOÀN THEO CHUẨN GSP',
    actionText: 'Lưu trữ theo đúng điều kiện nhiệt độ và độ ẩm tiêu chuẩn của kho tổng.',
    urgencyColor: '#059669',
  };
}

