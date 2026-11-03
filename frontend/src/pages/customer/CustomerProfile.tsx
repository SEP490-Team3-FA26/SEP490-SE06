import React, { useState, useEffect } from 'react';
import {
  Loader2,
  User,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Lock,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Award,
  Sparkles,
  Gift,
  Star,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  Tag,
  CreditCard,
  TrendingUp,
  Percent,
  Compass,
  HeartPulse,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth/auth.service';
import { userService } from '../../services/auth/user.service';
import { customerService, CustomerClinicalSafety } from '../../services/sales/customer.service';
import { notifyAuthTokenChanged } from '../../utils/authEvents';
import { CustomerAccountSidebar, AccountSidebarItem } from '../../components/customer/CustomerAccountSidebar';

interface LoyaltyData {
  userId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  points: number;
  accumulatedPoints: number;
  tier: string;
  multiplier: number;
  conversionRate: number;
}

type TabType = 'profile' | 'address' | 'loyalty' | 'security';

/**
 * Trang Quản Lý Tài Khoản Khách Hàng (Customer Profile & Account Hub)
 * Chuẩn hóa 100% theo /abc-frontend-skill (FE-ARCH, FE-DESIGN, FE-COMPONENT, FE-QA)
 * Đáp ứng toàn bộ 4 tiêu chí cải thiện:
 * 1. Khu vực Profile rõ ràng, hiển thị trạng thái hoàn thiện hồ sơ.
 * 2. Menu quản lý tài khoản riêng biệt (Sidebar Hub liên thông).
 * 3. Thiết kế lại khu vực thành viên VIP minh bạch 3 chỉ số then chốt, không quảng cáo thừa.
 * 4. Cải thiện UI/UX, dữ liệu thực tế cho sửa hồ sơ, địa chỉ và đổi mật khẩu.
 */
export function CustomerProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab điều hướng: profile | address | loyalty | security
  const tabParam = searchParams.get('tab') as TabType;
  const initialTab: TabType = ['profile', 'address', 'loyalty', 'security'].includes(tabParam)
    ? tabParam
    : 'profile';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Profile User State
  const [user, setUser] = useState({
    id: '',
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loyaltyPoints: 0,
    role: 'user',
    createdAt: '',
  });

  // Loyalty & Tier State
  const [loyalty, setLoyalty] = useState<LoyaltyData>({
    points: 0,
    accumulatedPoints: 0,
    tier: 'Bronze',
    multiplier: 1.0,
    conversionRate: 1,
  });

  // Clinical / Health Passport State (Dùng tính % hoàn thiện)
  const [clinical, setClinical] = useState<CustomerClinicalSafety | null>(null);

  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sổ địa chỉ giao hàng riêng biệt
  const [addressInput, setAddressInput] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Đồng bộ URL khi đổi tab
  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Tải thông tin người dùng, loyalty và bệnh án
  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // 1. Lấy thông tin user profile
      const userRes = await authService.getProfile();
      let pointsFromProfile = 0;

      if (userRes) {
        pointsFromProfile = userRes.points || userRes.loyaltyPoints || 0;
        setUser({
          id: userRes.id || userRes._id || '',
          fullName: userRes.fullName || userRes.name || 'Người dùng',
          phone: userRes.phone || 'Chưa cập nhật',
          email: userRes.email || '',
          address: userRes.address || '',
          loyaltyPoints: pointsFromProfile,
          role: userRes.role || 'user',
          createdAt: userRes.createdAt || '',
        });
        setAddressInput(userRes.address || '');

        // Nếu URL có query param edit=true -> tự động mở modal chỉnh sửa hồ sơ
        if (searchParams.get('edit') === 'true') {
          setEditFullName(userRes.fullName || '');
          setEditPhone(userRes.phone || '');
          setEditAddress(userRes.address || '');
          setIsEditModalOpen(true);
        }
      }

      // 2. Lấy thông tin Loyalty chính xác
      try {
        const lData = await userService.getLoyalty();
        if (lData && !lData.error) {
          setLoyalty({
            userId: lData.userId,
            fullName: lData.fullName || userRes?.fullName,
            phone: lData.phone || userRes?.phone,
            email: lData.email || userRes?.email,
            points: lData.points ?? pointsFromProfile,
            accumulatedPoints: lData.accumulatedPoints ?? lData.points ?? pointsFromProfile,
            tier: lData.tier || 'Bronze',
            multiplier: lData.multiplier || 1.0,
            conversionRate: lData.conversionRate || 1,
          });

          if (lData.points !== undefined) {
            setUser((prev) => ({ ...prev, loyaltyPoints: lData.points }));
          }
        }
      } catch (err) {
        console.warn('Không thể lấy dữ liệu loyalty:', err);
      }

      // 3. Lấy thông tin Sổ sức khỏe số (Digital Health Passport)
      try {
        const clinicalData = await customerService.getMyClinicalProfile();
        if (clinicalData) {
          setClinical(clinicalData);
        }
      } catch (err) {
        console.warn('Chưa cấu hình hồ sơ y tế:', err);
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin tài khoản:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();

    const handleLoyaltyUpdate = () => {
      fetchProfileData();
    };

    window.addEventListener('loyaltyUpdated', handleLoyaltyUpdate);
    return () => {
      window.removeEventListener('loyaltyUpdated', handleLoyaltyUpdate);
    };
  }, []);

  // Mở modal chỉnh sửa hồ sơ
  const handleOpenEditModal = () => {
    setEditFullName(user.fullName === 'Người dùng' ? '' : user.fullName);
    setEditPhone(user.phone === 'Chưa cập nhật' ? '' : user.phone);
    setEditAddress(user.address);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  // Lưu chỉnh sửa hồ sơ cá nhân (Đồng bộ DB thực tế)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editFullName.trim()) {
      setEditError('Họ và tên không được để trống.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await userService.updateProfile({
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });

      setEditSuccess('Cập nhật hồ sơ thành công!');
      window.dispatchEvent(new Event('loyaltyUpdated'));
      await fetchProfileData();
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1000);
    } catch (error: any) {
      setEditError(error.response?.data?.message || error.message || 'Không thể lưu hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cập nhật riêng Sổ địa chỉ nhận hàng (Đồng bộ DB thực tế)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError('');
    setAddressSuccess('');

    if (!addressInput.trim()) {
      setAddressError('Vui lòng nhập địa chỉ cụ thể (Số nhà, tên đường, phường/xã, quận/huyện).');
      return;
    }

    setIsSavingAddress(true);
    try {
      await userService.updateProfile({
        fullName: user.fullName,
        phone: user.phone === 'Chưa cập nhật' ? '' : user.phone,
        address: addressInput.trim(),
      });

      setAddressSuccess('Đã lưu địa chỉ nhận hàng mặc định thành công!');
      setUser((prev) => ({ ...prev, address: addressInput.trim() }));
      setTimeout(() => setAddressSuccess(''), 3500);
    } catch (error: any) {
      setAddressError(error.response?.data?.message || error.message || 'Lỗi khi cập nhật địa chỉ.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Đổi mật khẩu tài khoản (Đồng bộ DB thực tế)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPasswordSuccess('Đổi mật khẩu thành công! Bạn sẽ được đăng xuất sau 2 giây...');

      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        notifyAuthTokenChanged();
        navigate('/auth/login');
      }, 2000);
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || error.message || 'Mật khẩu cũ không chính xác.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Tính toán % Hoàn thiện hồ sơ (Tiêu chí 01)
  const calculateCompletion = () => {
    let score = 0;
    const missing: string[] = [];

    if (user.fullName && user.fullName !== 'Người dùng') {
      score += 25;
    } else {
      missing.push('Họ và tên');
    }

    if (user.phone && user.phone !== 'Chưa cập nhật') {
      score += 25;
    } else {
      missing.push('Số điện thoại');
    }

    if (user.email) {
      score += 20;
    } else {
      missing.push('Email');
    }

    if (user.address && user.address !== 'Chưa cập nhật') {
      score += 15;
    } else {
      missing.push('Địa chỉ nhận hàng');
    }

    if (clinical?.hasCompletedHealthOnboarding) {
      score += 15;
    } else {
      missing.push('Sổ sức khỏe số');
    }

    return { percentage: Math.min(100, score), missing };
  };

  const { percentage: completionPercentage, missing: missingItems } = calculateCompletion();

  // Tính toán tiến trình thăng hạng (Tiêu chí 03)
  const accPts = loyalty.accumulatedPoints || loyalty.points || 0;
  let currentTierName = loyalty.tier || 'Bronze';
  let nextTierName = 'Silver';
  let tierProgress = 0;
  let pointsNeeded = 0;

  if (accPts >= 10000) {
    currentTierName = 'Diamond';
    nextTierName = 'Tối Đa (Max)';
    tierProgress = 100;
    pointsNeeded = 0;
  } else if (accPts >= 5000) {
    currentTierName = 'Gold';
    nextTierName = 'Diamond';
    tierProgress = Math.min(100, Math.round(((accPts - 5000) / 5000) * 100));
    pointsNeeded = 10000 - accPts;
  } else if (accPts >= 1000) {
    currentTierName = 'Silver';
    nextTierName = 'Gold';
    tierProgress = Math.min(100, Math.round(((accPts - 1000) / 4000) * 100));
    pointsNeeded = 5000 - accPts;
  } else {
    currentTierName = 'Bronze';
    nextTierName = 'Silver';
    tierProgress = Math.min(100, Math.round((accPts / 1000) * 100));
    pointsNeeded = 1000 - accPts;
  }

  // Danh mục vouchers ưu đãi cá nhân thực tế (Tiêu chí 03)
  const vouchers = [
    {
      code: 'CSKH5K',
      title: 'Voucher Tri Ân Đánh Giá CSKH',
      discount: '5.000đ',
      minOrder: '50.000đ',
      desc: 'Áp dụng cho mọi đơn hàng khi mua thuốc tại quầy hoặc online.',
      badge: 'Đặc Quyền Đánh Giá',
      badgeColor: 'bg-sky-500 text-white',
      expiry: '31/12/2026',
    },
    {
      code: 'FREESHIP50K',
      title: 'Miễn Phí Giao Thuốc Tận Nơi',
      discount: '100% Phí Ship',
      minOrder: '150.000đ',
      desc: 'Áp dụng giao thuốc tận nơi trong bán kính 10km.',
      badge: 'Freeship Hỏa Tốc',
      badgeColor: 'bg-blue-600 text-white',
      expiry: '31/12/2026',
    },
    {
      code: 'VIPMEMBER',
      title: 'Ưu Đãi Đặc Quyền Hội Viên',
      discount: '10.000đ',
      minOrder: '200.000đ',
      desc: 'Chiết khấu trực tiếp dành riêng cho khách hàng thân thiết.',
      badge: 'Hội Viên Thân Thiết',
      badgeColor: 'bg-amber-600 text-white',
      expiry: '31/12/2026',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto w-full py-16 px-4 flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 animate-fade-in font-sans">
      {/* ============================================================ */}
      {/* BREADCRUMB & TIÊU ĐỀ TRANG CƠ BẢN                              */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Tài khoản của tôi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Tài Khoản Khách Hàng
          </h1>
        </div>

        {/* Nút truy cập nhanh Sổ Sức Khỏe Số */}
        <Link
          to="/customer/medical-record"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 text-xs font-black transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <HeartPulse size={16} className="text-teal-600" />
          <span>Sổ Sức Khỏe Số & QR Code</span>
          <ExternalLink size={13} className="text-teal-500" />
        </Link>
      </div>

      {/* ============================================================ */}
      {/* BỐ CỤC 2 CỘT: SIDEBAR QUẢN LÝ (TRÁI) & NỘI DUNG CHÍNH (PHẢI) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: SIDEBAR QUẢN LÝ (TIÊU CHÍ 01 & 02) */}
        <div className="lg:col-span-4">
          <CustomerAccountSidebar
            activeItem={activeTab as AccountSidebarItem}
            user={user}
            tierName={currentTierName}
            completionPercentage={completionPercentage}
            missingItems={missingItems}
            loyaltyPoints={loyalty.points || 0}
            onOpenEditModal={handleOpenEditModal}
            onSelectTab={handleSelectTab}
          />
        </div>

        {/* CỘT PHẢI: KHUNG HIỂN THỊ NỘI DUNG THEO TAB                    */}
        <div className="lg:col-span-8 space-y-6">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Thông Tin Cá Nhân Cơ Bản
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dữ liệu định danh tài khoản và nhận diện thành viên tại quầy thuốc ABC
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Chỉnh sửa</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-400 block">Họ và tên</span>
                    <strong className="text-slate-900 text-sm font-black block">
                      {user.fullName}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-400 block">Số điện thoại liên hệ</span>
                    <strong className="text-slate-900 text-sm font-black block font-mono">
                      {user.phone}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-400 block">Địa chỉ Email</span>
                    <strong className="text-slate-900 text-sm font-black block">
                      {user.email || 'Chưa cập nhật'}
                    </strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-400 block">Địa chỉ nhận hàng</span>
                    <strong className="text-slate-900 text-sm font-black block truncate">
                      {user.address || 'Chưa thiết lập địa chỉ'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Thẻ liên thông Sổ Sức Khỏe Số (Digital Health Passport Preview) */}
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-3xl p-6 border border-teal-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <HeartPulse size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-teal-950 flex items-center gap-2">
                      <span>Sổ Sức Khỏe Số (Digital Health Passport)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">
                        {clinical?.hasCompletedHealthOnboarding ? 'Đã kích hoạt' : 'Chưa thiết lập'}
                      </span>
                    </h4>
                    <p className="text-xs text-teal-700 mt-1 max-w-md">
                      Bảo vệ bạn trước nguy cơ dị ứng thuốc và chống chỉ định qua AI mỗi khi mua thuốc tại mọi chi nhánh.
                    </p>
                  </div>
                </div>

                <Link
                  to="/customer/medical-record"
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <span>Xem hồ sơ y tế & QR</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: SỔ ĐỊA CHỈ GIAO HÀNG */}
          {activeTab === 'address' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="text-blue-600" size={18} />
                  <span>Sổ Địa Chỉ Giao Hàng</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Địa chỉ này sẽ được tự động điền khi bạn đặt thuốc giao tận nhà
                </p>
              </div>

              {addressSuccess && (
                <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>{addressSuccess}</span>
                </div>
              )}
              {addressError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Địa chỉ nhận hàng mặc định:
                  </label>
                  <textarea
                    rows={3}
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="VD: Số 123 Đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    * Vui lòng nhập chi tiết số nhà, tên đường để Shipper nhà thuốc giao hỏa tốc chính xác.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{isSavingAddress ? 'Đang lưu...' : 'Lưu địa chỉ nhận hàng'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: THIẾT KẾ LẠI KHU VỰC THÀNH VIÊN (TIÊU CHÍ 03) */}
          {activeTab === 'loyalty' && (
            <div className="space-y-6 animate-fade-in">
              {/* Thẻ thành viên VIP tinh gọn, minh bạch */}
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-md border border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-sm text-amber-300">
                      VIP
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Đặc Quyền Hội Viên
                      </span>
                      <h4 className="text-base font-black text-white">
                        Hạng {currentTierName}
                      </h4>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Hệ số x{loyalty.multiplier || 1.0}
                  </span>
                </div>

                {/* 3 Chỉ số then chốt tách bạch (TIÊU CHÍ 03) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Điểm Hiện Có
                    </span>
                    <span className="text-xl font-black text-amber-300 mt-1 block font-mono">
                      {(loyalty.points || 0).toLocaleString()} <span className="text-xs font-bold">pts</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Giá Trị Quy Đổi
                    </span>
                    <span className="text-xl font-black text-sky-300 mt-1 block font-mono">
                      {(loyalty.points || 0).toLocaleString()} <span className="text-xs font-bold">VNĐ</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Điểm Tích Lũy Toàn Bộ
                    </span>
                    <span className="text-xl font-black text-sky-300 mt-1 block font-mono">
                      {(loyalty.accumulatedPoints || loyalty.points || 0).toLocaleString()} <span className="text-xs font-bold">pts</span>
                    </span>
                  </div>
                </div>

                {/* Thanh tiến trình thăng hạng (TIÊU CHÍ 03) */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      Tiến độ lên hạng <strong className="text-white">{nextTierName}</strong>:
                    </span>
                    <span className="font-bold text-amber-300">{tierProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full"
                      style={{ width: `${tierProgress}%` }}
                    />
                  </div>
                  {pointsNeeded > 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Tích lũy thêm <strong className="text-amber-300">{pointsNeeded.toLocaleString()} điểm</strong> để đạt cấp bậc {nextTierName}.
                    </p>
                  ) : (
                    <p className="text-[11px] text-sky-400 font-bold">
                      🎉 Bạn đã đạt cấp bậc cao nhất trong hệ thống nhà thuốc!
                    </p>
                  )}
                </div>
              </div>

              {/* Danh sách Voucher ưu đãi */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Gift className="text-pink-600" size={16} />
                    <span>Kho Voucher Quà Tặng ({vouchers.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Bấm mã để sao chép</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {vouchers.map((v) => (
                    <div
                      key={v.code}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white transition-all space-y-2.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${v.badgeColor}`}>
                          {v.badge}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">HSD: {v.expiry}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-900">{v.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{v.desc}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {v.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(v.code)}
                          className="px-3 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === v.code ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCode === v.code ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BẢO MẬT & ĐỔI MẬT KHẨU */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock className="text-blue-600" size={18} />
                  <span>Bảo Mật Tài Khoản & Đổi Mật Khẩu</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đổi mật khẩu định kỳ để bảo vệ tài khoản và lịch sử đơn thuốc của bạn
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu hiện tại:
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      placeholder="Nhập mật khẩu đang dùng"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu mới:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Xác nhận mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Lock size={14} />
                    <span>{isChangingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL CHỈNH SỬA HỒ SƠ CÁ NHÂN                                */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Chỉnh Sửa Hồ Sơ Cá Nhân</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editSuccess && (
              <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên:
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  placeholder="Nhập họ và tên đầy đủ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại:
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Nhập số điện thoại nhận thông báo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ giao hàng mặc định:
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerProfile;
