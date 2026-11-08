import React from 'react';
import {
  User,
  MapPin,
  Award,
  HeartPulse,
  ShoppingBag,
  Lock,
  LogOut,
  ChevronRight,
  Edit2,
  Phone,
  Mail,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

export type AccountSidebarItem =
  | 'profile'
  | 'address'
  | 'loyalty'
  | 'medical-record'
  | 'orders'
  | 'security';

interface CustomerAccountSidebarProps {
  activeItem: AccountSidebarItem;
  user: {
    id?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  tierName?: string;
  completionPercentage?: number;
  missingItems?: string[];
  loyaltyPoints?: number;
  onOpenEditModal?: () => void;
  onSelectTab?: (tab: 'profile' | 'address' | 'loyalty' | 'security') => void;
}

/**
 * Menu Quản Lý Tài Khoản Khách Hàng (Customer Account Sidebar Hub)
 * Chuẩn hóa 100% theo /abc-frontend-skill (FE-ARCH, FE-DESIGN, FE-COMPONENT)
 * Đáp ứng tiêu chí 01 (Khu vực Profile rõ ràng) và tiêu chí 02 (Menu quản lý tài khoản riêng biệt)
 */
export const CustomerAccountSidebar: React.FC<CustomerAccountSidebarProps> = ({
  activeItem,
  user,
  tierName = 'Bronze',
  completionPercentage = 75,
  missingItems = [],
  loyaltyPoints = 0,
  onOpenEditModal,
  onSelectTab,
}) => {
  const navigate = useNavigate();

  // Xử lý chuyển đổi giữa các tab nội bộ hoặc điều hướng trang
  const handleItemClick = (item: AccountSidebarItem) => {
    if (item === 'medical-record') {
      navigate('/customer/medical-record');
      return;
    }
    if (item === 'orders') {
      navigate('/customer/orders');
      return;
    }

    // Nếu có callback onSelectTab (khi đang ở CustomerProfile)
    if (onSelectTab) {
      onSelectTab(item as 'profile' | 'address' | 'loyalty' | 'security');
    } else {
      // Khi đang ở các trang khác (ví dụ: CustomerMedicalRecord), điều hướng về CustomerProfile kèm tab
      navigate(`/customer/profile?tab=${item}`);
    }
  };

  // Đăng xuất tài khoản an toàn
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất tài khoản không?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('user');
      notifyAuthTokenChanged();
      navigate('/auth/login');
    }
  };

  const displayName = user.fullName && user.fullName !== 'Người dùng' ? user.fullName : 'Khách hàng';
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* 01. KHU VỰC PROFILE RÕ RÀNG                                    */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* Avatar tròn với chữ cái đầu */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {displayInitial}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 truncate" title={displayName}>
                {displayName}
              </h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                Hạng {tierName}
              </span>
            </div>
          </div>

          {/* Nút Chỉnh sửa hồ sơ nhanh */}
          {onOpenEditModal ? (
            <button
              type="button"
              onClick={onOpenEditModal}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Chỉnh sửa thông tin hồ sơ"
              aria-label="Chỉnh sửa hồ sơ"
            >
              <Edit2 size={16} />
            </button>
          ) : (
            <Link
              to="/customer/profile?tab=profile&edit=true"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Chỉnh sửa thông tin hồ sơ"
              aria-label="Chỉnh sửa hồ sơ"
            >
              <Edit2 size={16} />
            </Link>
          )}
        </div>

        {/* Thông tin liên hệ cơ bản */}
        <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2.5">
            <Phone size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{user.phone || 'Chưa cập nhật SĐT'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{user.email || 'Chưa cập nhật email'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
            <span className="text-sky-700 font-bold">Tài khoản đã kích hoạt GPP</span>
          </div>
        </div>

        {/* Trạng thái hoàn thiện hồ sơ (Tiêu chí 01) */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Mức độ hoàn thiện:</span>
            <span className="font-black text-blue-600">{completionPercentage}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          {missingItems.length > 0 ? (
            <p className="text-[11px] text-slate-500 leading-tight">
              <span className="text-amber-600 font-bold">Chưa bổ sung: </span>
              {missingItems.join(', ')}
            </p>
          ) : (
            <p className="text-[11px] text-sky-600 font-bold flex items-center gap-1">
              <Check size={12} />
              <span>Hồ sơ đã hoàn tất 100%!</span>
            </p>
          )}
        </div>

        {/* Nút bấm chỉnh sửa hồ sơ to rõ */}
        {onOpenEditModal ? (
          <button
            type="button"
            onClick={onOpenEditModal}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Edit2 size={14} />
            <span>Chỉnh sửa hồ sơ cá nhân</span>
          </button>
        ) : (
          <Link
            to="/customer/profile?tab=profile&edit=true"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Edit2 size={14} />
            <span>Chỉnh sửa hồ sơ cá nhân</span>
          </Link>
        )}
      </div>

      {/* ============================================================ */}
      {/* 02. BỔ SUNG MENU QUẢN LÝ TÀI KHOẢN (TIÊU CHÍ 02)              */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div className="space-y-1 pb-1">
          {/* Mục 1: Hồ sơ cá nhân */}
          <button
            type="button"
            onClick={() => handleItemClick('profile')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'profile'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <User size={16} className={activeItem === 'profile' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Hồ sơ cá nhân</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>

          {/* Mục 2: Sổ địa chỉ giao hàng */}
          <button
            type="button"
            onClick={() => handleItemClick('address')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'address'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin size={16} className={activeItem === 'address' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Sổ địa chỉ giao hàng</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>

          {/* Mục 3: Đơn hàng của tôi */}
          <button
            type="button"
            onClick={() => handleItemClick('orders')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'orders'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={16} className={activeItem === 'orders' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Đơn hàng của tôi</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>

          {/* Mục 4: Sổ sức khỏe / Hồ sơ bệnh án */}
          <button
            type="button"
            onClick={() => handleItemClick('medical-record')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'medical-record'
                ? 'bg-teal-50 text-teal-800 shadow-xs'
                : 'text-teal-800 hover:bg-teal-50/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <HeartPulse size={16} className={activeItem === 'medical-record' ? 'text-teal-600' : 'text-teal-600/70'} />
              <span>Sổ sức khỏe / Hồ sơ bệnh án</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 uppercase">
              AI Safe
            </span>
          </button>

          {/* Mục 5: Voucher và điểm thưởng */}
          <button
            type="button"
            onClick={() => handleItemClick('loyalty')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'loyalty'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Award size={16} className={activeItem === 'loyalty' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Voucher và điểm thưởng</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 font-mono">
              {(loyaltyPoints || 0).toLocaleString()}đ
            </span>
          </button>

          {/* Mục 6: Bảo mật, đổi mật khẩu */}
          <button
            type="button"
            onClick={() => handleItemClick('security')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeItem === 'security'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Lock size={16} className={activeItem === 'security' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Bảo mật, đổi mật khẩu</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>
        </div>

        {/* Mục 7: Đăng xuất */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
          >
            <LogOut size={16} />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccountSidebar;

