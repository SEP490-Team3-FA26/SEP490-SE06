import React, { useState, useEffect } from 'react';
import {
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
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/core/api';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

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

export function CustomerProfile() {
  const navigate = useNavigate();

  // Profile User State
  const [user, setUser] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loyaltyPoints: 0,
  });

  // Loyalty & Tier State
  const [loyalty, setLoyalty] = useState<LoyaltyData>({
    points: 0,
    accumulatedPoints: 0,
    tier: 'Bronze',
    multiplier: 1.0,
    conversionRate: 1,
  });

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

  // Change Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch full user and loyalty details
  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Lấy thông tin user profile
      const userRes = await api.get('/api/auth/profile');
      let pointsFromProfile = 0;

      if (userRes && userRes.data) {
        pointsFromProfile = userRes.data.points || userRes.data.loyaltyPoints || 0;
        setUser({
          fullName: userRes.data.fullName || userRes.data.name || 'Người dùng',
          phone: userRes.data.phone || 'Chưa cập nhật',
          email: userRes.data.email || '',
          address: userRes.data.address || 'Chưa cập nhật',
          loyaltyPoints: pointsFromProfile,
        });
      }

      // 2. Lấy thông tin Loyalty chính xác theo chuẩn v2.0
      try {
        const loyaltyRes = await api.get('/api/users/loyalty');
        if (loyaltyRes && loyaltyRes.data && !loyaltyRes.data.error) {
          const lData = loyaltyRes.data;
          setLoyalty({
            userId: lData.userId,
            fullName: lData.fullName || userRes?.data?.fullName,
            phone: lData.phone || userRes?.data?.phone,
            email: lData.email || userRes?.data?.email,
            points: lData.points ?? pointsFromProfile,
            accumulatedPoints: lData.accumulatedPoints ?? lData.points ?? pointsFromProfile,
            tier: lData.tier || 'Bronze',
            multiplier: lData.multiplier || 1.0,
            conversionRate: lData.conversionRate || 1,
          });

          // Đồng bộ lại loyaltyPoints hiển thị
          if (lData.points !== undefined) {
            setUser((prev) => ({ ...prev, loyaltyPoints: lData.points }));
          }
        }
      } catch (err) {
        console.warn('Could not fetch /api/users/loyalty, using profile data fallback:', err);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
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

  const handleOpenEditModal = () => {
    setEditFullName(user.fullName === 'Người dùng' ? '' : user.fullName);
    setEditPhone(user.phone === 'Chưa cập nhật' ? '' : user.phone);
    setEditAddress(user.address === 'Chưa cập nhật' ? '' : user.address);
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editFullName.trim()) {
      setEditError('Họ và tên không được để trống.');
      return;
    }
    if (!editAddress.trim()) {
      setEditError('Vui lòng nhập địa chỉ nhận hàng cụ thể để giao thuốc chính xác.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await api.put('/api/users/profile', {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });

      setEditSuccess('Cập nhật thông tin và địa chỉ vào cơ sở dữ liệu thành công!');
      window.dispatchEvent(new Event('loyaltyUpdated'));
      await fetchProfileData();
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);
    } catch (error: any) {
      setEditError(error.response?.data?.message || error.message || 'Không thể lưu thông tin hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
      });

      setPasswordSuccess('Đổi mật khẩu thành công! Bạn sẽ được đăng xuất để đăng nhập lại...');

      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        notifyAuthTokenChanged();
        navigate('/auth/login');
      }, 2500);
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Tính toán tiến trình thăng hạng
  const accPts = loyalty.accumulatedPoints || loyalty.points || 0;
  let currentTierName = loyalty.tier || 'Bronze';
  let nextTierName = 'Silver';
  let tierMin = 0;
  let tierMax = 1000;
  let tierProgress = 0;
  let pointsNeeded = 0;

  if (accPts >= 10000) {
    currentTierName = 'Diamond';
    nextTierName = 'Tối Đa (Max)';
    tierMin = 10000;
    tierMax = 10000;
    tierProgress = 100;
    pointsNeeded = 0;
  } else if (accPts >= 5000) {
    currentTierName = 'Gold';
    nextTierName = 'Diamond';
    tierMin = 5000;
    tierMax = 10000;
    tierProgress = Math.min(100, Math.round(((accPts - 5000) / 5000) * 100));
    pointsNeeded = 10000 - accPts;
  } else if (accPts >= 1000) {
    currentTierName = 'Silver';
    nextTierName = 'Gold';
    tierMin = 1000;
    tierMax = 5000;
    tierProgress = Math.min(100, Math.round(((accPts - 1000) / 4000) * 100));
    pointsNeeded = 5000 - accPts;
  } else {
    currentTierName = 'Bronze';
    nextTierName = 'Silver';
    tierMin = 0;
    tierMax = 1000;
    tierProgress = Math.min(100, Math.round((accPts / 1000) * 100));
    pointsNeeded = 1000 - accPts;
  }

  // Danh mục vouchers cá nhân (bao gồm voucher thưởng CSKH 5k)
  const vouchers = [
    {
      code: 'CSKH5K',
      title: 'Voucher Tri Ân Đánh Giá CSKH',
      discount: '5.000đ',
      minOrder: '50.000đ',
      desc: 'Quà tặng cảm ơn đã đánh giá chất lượng phục vụ & Dược sĩ tư vấn chi nhánh.',
      badge: 'Quà tặng Đánh Giá',
      badgeColor: 'bg-emerald-500 text-white',
      expiry: 'Còn 30 ngày',
    },
    {
      code: 'FREESHIP50K',
      title: 'Miễn Phí Giao Thuốc Tận Nơi',
      discount: '100% Phí ship',
      minOrder: '150.000đ',
      desc: 'Áp dụng cho mọi đơn hàng online giao hỏa tốc trong nội thành.',
      badge: 'Freeship',
      badgeColor: 'bg-blue-600 text-white',
      expiry: 'Còn 15 ngày',
    },
    {
      code: 'VIPMEMBER',
      title: 'Ưu Đãi Đặc Quyền Hội Viên Bạc',
      discount: '10.000đ',
      minOrder: '200.000đ',
      desc: 'Chiết khấu trực tiếp dành riêng cho khách hàng đạt cấp bậc Silver trở lên.',
      badge: 'Hạng Bạc',
      badgeColor: 'bg-amber-600 text-white',
      expiry: 'Hạn dùng: 31/12/2026',
    },
  ];

  return (
    <div className="flex flex-col gap-8 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* ============================================================ */}
      {/* 1. PREMIUM HERO BANNER (Đồng bộ format như CustomerShop.tsx) */}
      {/* ============================================================ */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white p-8 sm:p-12 shadow-xl border border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/20 via-sky-400/15 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black tracking-widest uppercase self-start text-blue-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-400" />
            Hồ Sơ Hội Viên & CSKH ABC Pharma
          </span>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            Hồ Sơ Khách Hàng <br className="hidden sm:block" />
            Đặc Quyền Thành Viên VIP
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold max-w-2xl">
            Quản lý thông tin cá nhân, tích lũy điểm thưởng khi mua thuốc tại quầy hoặc online, đổi voucher ưu đãi và tham gia đánh giá dịch vụ chi nhánh để nhận quà tặng tri ân.
          </p>

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Điểm Khả Dụng</span>
              <span className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
                {(loyalty.points || user.loyaltyPoints || 0).toLocaleString()}đ
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Hạng Thành Viên</span>
              <span className="text-lg sm:text-xl font-black text-sky-300 mt-0.5 uppercase">
                {currentTierName}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Hệ Số Tích Điểm</span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                x{loyalty.multiplier || 1.0}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Voucher Quà Tặng</span>
              <span className="text-lg sm:text-xl font-black text-pink-300 mt-0.5">
                {vouchers.length} Mã
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. BANNER KÊU GỌI TRẢI NGHIỆM KHÁCH HÀNG & ĐÁNH GIÁ DỊCH VỤ    */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white p-6 sm:p-8 shadow-lg border border-emerald-400/20">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Gift size={28} className="text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                <Star size={13} className="fill-amber-300 text-amber-300" /> Trải Nghiệm Khách Hàng & CSKH
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                Bạn vừa mua thuốc tại chi nhánh hoặc nhận đơn online?
              </h3>
              <p className="text-emerald-50 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Chia sẻ đánh giá chất lượng phục vụ & Dược sĩ tư vấn để nhận ngay{' '}
                <strong className="text-amber-300 font-black">+1.000đ – +2.000đ Điểm Thưởng</strong> và{' '}
                <strong className="text-white font-black underline decoration-amber-300 decoration-2">Voucher 5.000đ</strong> cho đơn kế tiếp!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto shrink-0">
            <Link
              to="/feedback"
              className="flex-1 sm:flex-none px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
            >
              <Star size={16} className="fill-slate-900" />
              Đánh Giá Dịch Vụ Ngay
            </Link>
            <Link
              to="/customer/orders"
              className="flex-1 sm:flex-none px-5 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all border border-white/20 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <ShoppingBag size={16} />
              Xem Đơn Hàng Cần Đánh Giá
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. KHỐI THẺ HỘI VIÊN VIP & TIẾN TRÌNH THĂNG HẠNG (METAL CARD) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: VIP Membership Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Award className="text-blue-600" size={20} />
              Thẻ Thành Viên Điện Tử
            </h2>
            <span className="text-[11px] font-bold text-slate-500">Tỷ lệ 1đ = 1 point</span>
          </div>

          {/* Virtual VIP Metal Card */}
          <div
            className={`relative rounded-3xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden border transition-all duration-300 ${
              currentTierName === 'Diamond'
                ? 'bg-gradient-to-tr from-slate-950 via-cyan-950 to-indigo-950 border-cyan-400/40 shadow-cyan-900/30'
                : currentTierName === 'Gold'
                ? 'bg-gradient-to-tr from-amber-950 via-yellow-900 to-amber-900 border-amber-400/40 shadow-amber-900/30'
                : currentTierName === 'Silver'
                ? 'bg-gradient-to-tr from-slate-900 via-slate-800 to-zinc-800 border-slate-400/40 shadow-slate-900/30'
                : 'bg-gradient-to-tr from-stone-900 via-amber-950 to-stone-900 border-amber-700/40 shadow-stone-900/30'
            }`}
          >
            {/* Shimmer metallic effect */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Card Header */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs shadow-inner">
                  ABC
                </div>
                <span className="font-black text-xs tracking-wider uppercase">Pharma VIP</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={12} />
                Hạng {currentTierName}
              </div>
            </div>

            {/* Smart EMV Chip simulation */}
            <div className="my-6 relative z-10 flex items-center gap-4">
              <div className="w-11 h-8 rounded-lg bg-gradient-to-r from-amber-200 to-yellow-400 shadow-md border border-amber-300/60 flex items-center justify-center">
                <div className="w-8 h-5 border border-amber-600/40 rounded flex flex-col justify-around py-0.5">
                  <div className="h-[1px] bg-amber-600/40 w-full"></div>
                  <div className="h-[1px] bg-amber-600/40 w-full"></div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-300 tracking-widest">
                •••• •••• •••• {(user.phone && user.phone !== 'Chưa cập nhật') ? user.phone.slice(-4) : '8888'}
              </span>
            </div>

            {/* Points Balance */}
            <div className="relative z-10 mb-4">
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">
                Số Dư Điểm Thưởng Khả Dụng
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {(loyalty.points || user.loyaltyPoints || 0).toLocaleString()}
                </span>
                <span className="text-sm font-extrabold text-amber-300 uppercase">PTS</span>
                <span className="text-xs text-slate-300 font-semibold ml-1">
                  (= {(loyalty.points || user.loyaltyPoints || 0).toLocaleString()}đ)
                </span>
              </div>
            </div>

            {/* Card Footer: Name & Multiplier */}
            <div className="pt-4 border-t border-white/15 flex justify-between items-end relative z-10 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Chủ Tài Khoản</span>
                <span className="font-extrabold text-slate-100 uppercase tracking-wide truncate max-w-[200px] block">
                  {user.fullName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Hệ Số Tích</span>
                <span className="font-black text-emerald-300">x{loyalty.multiplier || 1.0}</span>
              </div>
            </div>
          </div>

          {/* Tier Progress Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <TrendingUp size={15} className="text-blue-600" />
                Tiến trình thăng hạng
              </span>
              <span className="font-black text-blue-600">{tierProgress}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${tierProgress}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold">
              <span>Hạng {currentTierName} ({accPts.toLocaleString()}đ)</span>
              <span>{nextTierName === 'Tối Đa (Max)' ? 'Đã đạt cấp tối đa' : `Hạng ${nextTierName} (${tierMax.toLocaleString()}đ)`}</span>
            </div>

            {pointsNeeded > 0 && (
              <p className="text-xs text-slate-600 bg-blue-50/70 p-3 rounded-2xl border border-blue-100 font-medium">
                💡 Cần tích lũy thêm <strong className="text-blue-700 font-bold">{pointsNeeded.toLocaleString()} điểm</strong> để nâng cấp lên thành viên{' '}
                <strong className="text-slate-800 font-bold uppercase">{nextTierName}</strong> và hưởng tỷ lệ tích điểm cao hơn!
              </p>
            )}

            {/* 4 Tiers Comparison */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentTierName === 'Bronze' ? 'bg-amber-100/70 text-amber-900 border border-amber-300' : 'bg-slate-50 text-slate-500'}`}>
                <div>Đồng</div>
                <div className="font-black mt-0.5">x1.0</div>
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentTierName === 'Silver' ? 'bg-slate-200 text-slate-900 border border-slate-400 font-black' : 'bg-slate-50 text-slate-500'}`}>
                <div>Bạc</div>
                <div className="font-black mt-0.5">x1.2</div>
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentTierName === 'Gold' ? 'bg-yellow-100 text-yellow-900 border border-yellow-400 font-black' : 'bg-slate-50 text-slate-500'}`}>
                <div>Vàng</div>
                <div className="font-black mt-0.5">x1.5</div>
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-bold ${currentTierName === 'Diamond' ? 'bg-cyan-100 text-cyan-900 border border-cyan-400 font-black' : 'bg-slate-50 text-slate-500'}`}>
                <div>Kim Cương</div>
                <div className="font-black mt-0.5">x2.0</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Details & Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Thông tin tài khoản Box */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-[#0d6efd] to-sky-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shadow-blue-500/20">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    {user.fullName}
                  </h2>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Tài khoản khách hàng chính thức
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleOpenPasswordModal}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  <Lock size={14} className="text-slate-500" />
                  Đổi mật khẩu
                </button>
                <button
                  onClick={handleOpenEditModal}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95"
                >
                  <Edit2 size={14} />
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
              <div className="group">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Họ và Tên
                </label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 transition-colors group-hover:bg-white group-hover:border-blue-400">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                    <User size={18} />
                  </div>
                  <span className="text-sm truncate">{user.fullName}</span>
                </div>
              </div>

              <div className="group">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Số điện thoại
                </label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 transition-colors group-hover:bg-white group-hover:border-blue-400">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                    <Phone size={18} />
                  </div>
                  <span className="text-sm font-mono">{user.phone}</span>
                </div>
              </div>

              <div className="group">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Địa chỉ Email
                </label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 transition-colors group-hover:bg-white group-hover:border-blue-400">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-slate-400 group-hover:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  <span className="text-sm truncate">{user.email}</span>
                </div>
              </div>

              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Địa chỉ nhận hàng thực tế
                  </label>
                  {user.address === 'Chưa cập nhật' && (
                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Chưa có địa chỉ
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-3 text-slate-800 font-bold bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 transition-colors group-hover:bg-white group-hover:border-blue-400">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1">
                    <span className="leading-snug text-xs sm:text-sm block">{user.address}</span>
                    {user.address === 'Chưa cập nhật' && (
                      <button
                        onClick={handleOpenEditModal}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold mt-1 inline-flex items-center gap-1"
                      >
                        + Bấm vào đây để thêm địa chỉ giao hàng ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 4. KHO VOUCHER CỦA TÔI & MÃ ƯU ĐÃI CSKH (MY VOUCHERS)          */}
          {/* ============================================================ */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Tag className="text-pink-600" size={18} />
                  Kho Voucher & Quà Tặng Khách Hàng
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Các mã giảm giá đang sẵn sàng áp dụng khi thanh toán đơn thuốc
                </p>
              </div>
              <Link
                to="/customer/shop"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Mua sắm ngay <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {vouchers.map((vc) => (
                <div
                  key={vc.code}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/60 p-4 flex flex-col justify-between relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${vc.badgeColor}`}>
                      {vc.badge}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{vc.expiry}</span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-800 text-xs sm:text-sm line-clamp-1">{vc.title}</h4>
                    <div className="text-base sm:text-lg font-black text-rose-600 my-1">{vc.discount}</div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{vc.desc}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex justify-between items-center">
                    <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                      {vc.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(vc.code)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      {copiedCode === vc.code ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. MODAL CHỈNH SỬA THÔNG TIN & ĐỊA CHỈ HỒ SƠ                   */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isSavingProfile && setIsEditModalOpen(false)}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </div>
                Cập nhật thông tin & Địa chỉ giao hàng
              </h3>
              <button
                onClick={() => !isSavingProfile && setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors focus:outline-none"
                disabled={isSavingProfile}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {editSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-800 mb-2">Đã lưu thành công!</h4>
                  <p className="text-sm text-emerald-600 font-medium leading-relaxed">{editSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {editError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{editError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Họ và tên người nhận
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ví dụ: Nguyễn Văn An"
                      required
                      disabled={isSavingProfile}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Ví dụ: 0987654321"
                      required
                      disabled={isSavingProfile}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Địa chỉ nhận hàng chi tiết (Lưu vào Database)
                    </label>
                    <textarea
                      rows={3}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP (VD: Số 45 Tràng Tiền, Hoàn Kiếm, Hà Nội)"
                      required
                      disabled={isSavingProfile}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      📍 Địa chỉ này sẽ được hệ thống dùng để định vị chi nhánh gần nhất và giao thuốc hỏa tốc.
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full flex justify-center items-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isSavingProfile ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Đang lưu vào Database...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Lưu thông tin & Địa chỉ
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL ĐỔI MẬT KHẨU                                        */}
      {/* ============================================================ */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Lock className="w-4 h-4" />
                </div>
                Đổi mật khẩu
              </h3>
              <button
                onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors focus:outline-none"
                disabled={isChangingPassword}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {passwordSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-800 mb-2">Thành công!</h4>
                  <p className="text-sm text-emerald-600 font-medium leading-relaxed">{passwordSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-5">
                  {passwordError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{passwordError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                        placeholder="Nhập mật khẩu hiện tại"
                        required
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                        placeholder="Tối thiểu 6 ký tự"
                        minLength={6}
                        required
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                          : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                      } rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400`}
                      placeholder="Nhập lại mật khẩu mới"
                      minLength={6}
                      required
                      disabled={isChangingPassword}
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full flex justify-center items-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Đang xử lý...
                        </>
                      ) : (
                        'Cập nhật mật khẩu'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
