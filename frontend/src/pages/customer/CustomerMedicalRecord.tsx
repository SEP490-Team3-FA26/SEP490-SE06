import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Pill,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  Loader2,
  Droplet,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Mail,
  FileText,
  QrCode,
  Maximize2,
  X,
  Building2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCustomerMedicalRecord } from '../../hooks/useCustomerMedicalRecord';
import { MedicalTagInput } from '../../components/health/MedicalTagInput';
import { MedicalRecordOverview } from '../../components/health/MedicalRecordOverview';
import { SafeDrugRecommendations } from '../../components/health/SafeDrugRecommendations';
import { CustomerAccountSidebar } from '../../components/customer/CustomerAccountSidebar';

/**
 * Trang Sổ Sức Khỏe & Bệnh Án Điện Tử Khách Hàng (UC-106 & UC-107)
 * Tinh gọn và phân rã module theo chuẩn FE-ARCH (3-Tier) & FE-COMPONENT của abc-frontend-skill
 * Đồng bộ bố cục Hub 2 cột với CustomerProfile để dễ theo dõi
 */
export function CustomerMedicalRecord() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const {
    profile,
    currentUser,
    isLoggedIn,
    loading,
    isEditing,
    setIsEditing,
    saving,
    successMsg,
    errorMsg,
    hasAllergies,
    hasConditions,
    editAllergies,
    editAllergicMeds,
    editAllergicIngredients,
    editConditions,
    editBloodType,
    setEditBloodType,
    editNotes,
    setEditNotes,
    addTag,
    removeTag,
    handleSave,
    resetForm,
  } = useCustomerMedicalRecord({ autoEditIfIncomplete: isOnboarding });

  const [showQrModal, setShowQrModal] = useState(false);

  // Tạo payload chuẩn hóa cho Hộ Chiếu Sức Khỏe Số (Digital Health Passport QR)
  const healthPassportQrPayload = JSON.stringify({
    type: 'HEALTH_PASSPORT',
    id: profile.userId || currentUser?.id || currentUser?._id,
    phone: profile.phone || currentUser?.phone,
    name: profile.fullName || currentUser?.fullName,
    blood: profile.bloodType || 'Chưa rõ',
  });

  useEffect(() => {
    if (isOnboarding && successMsg) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnboarding, successMsg, navigate]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto w-full py-16 px-4 flex flex-col items-center justify-center text-slate-500">
        <Loader2 size={36} className="text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-bold">Đang tải Sổ sức khỏe điện tử...</p>
      </div>
    );
  }

  // Màn hình yêu cầu đăng nhập nếu người dùng chưa có phiên làm việc
  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
          <HeartPulse size={36} className="text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Sổ Sức Khỏe & Bệnh Án Điện Tử</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Hồ sơ y khoa chứa thông tin tiền sử dị ứng thuốc và bệnh nền cá nhân. Vui lòng đăng nhập để truy cập và nhận cảnh báo an toàn dùng thuốc AI.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/auth/login?redirect=/customer/medical-record')}
            className="px-6 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
          >
            Đăng nhập tài khoản
          </button>
          <button
            type="button"
            onClick={() => navigate('/auth/register')}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Đăng ký thành viên mới
          </button>
        </div>
      </div>
    );
  }

  // Thông tin user phục vụ Sidebar
  const sidebarUser = {
    id: profile.userId || currentUser?.id || currentUser?._id,
    fullName: profile.fullName || currentUser?.fullName || 'Khách hàng',
    phone: profile.phone || currentUser?.phone || 'Chưa cập nhật SĐT',
    email: profile.email || currentUser?.email || '',
    address: currentUser?.address || '',
  };

  const missingItems: string[] = [];
  if (!profile.hasCompletedHealthOnboarding) missingItems.push('Khai báo y tế');
  if (!sidebarUser.phone || sidebarUser.phone === 'Chưa cập nhật SĐT') missingItems.push('Số điện thoại');
  const completionPercentage = profile.hasCompletedHealthOnboarding ? 100 : 70;

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
            <Link to="/customer/profile" className="hover:text-blue-600 transition-colors">
              Tài khoản của tôi
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Sổ sức khỏe số & Bệnh án</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sổ Sức Khỏe Số & Bệnh Án Điện Tử
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/customer/profile"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <User size={14} className="text-slate-500" />
            <span>Về hồ sơ cá nhân</span>
          </Link>
          <Link
            to="/customer/orders"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText size={14} className="text-slate-500" />
            <span>Đơn hàng của tôi</span>
          </Link>
        </div>
      </div>

      {/* ================= BANNER CHÀO MỪNG THÀNH VIÊN MỚI (NẾU ONBOARDING) ================= */}
      {isOnboarding && (
        <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Sparkles size={22} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black">Chào mừng bạn gia nhập ABC Pharmacy! 🎉</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Vui lòng hoàn tất Hồ sơ Sức khỏe & Tiền sử Dị ứng bên dưới để hệ thống AI bảo vệ an toàn dùng thuốc mỗi khi bạn mua sắm.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Bỏ qua & Về trang chủ</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* BỐ CỤC 2 CỘT ĐỒNG NHẤT: SIDEBAR (TRÁI) & BỆNH ÁN (PHẢI)      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: SIDEBAR QUẢN LÝ TÀI KHOẢN (ACTIVE: medical-record) */}
        <div className="lg:col-span-4">
          <CustomerAccountSidebar
            activeItem="medical-record"
            user={sidebarUser}
            tierName={currentUser?.tier || 'Bronze'}
            completionPercentage={completionPercentage}
            missingItems={missingItems}
            loyaltyPoints={currentUser?.points || 0}
          />
        </div>

        {/* CỘT PHẢI: KHUNG NỘI DUNG SỔ SỨC KHỎE SỐ                      */}
        <div className="lg:col-span-8 space-y-6">
          {/* ================= BANNER TIÊU ĐỀ & TRẠNG THÁI ================= */}
          <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-blue-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-teal-200 uppercase tracking-wider mb-2">
                  <ShieldCheck size={14} className="text-sky-400" />
                  <span>Sổ Sức Khỏe Điện Tử 3.0</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Hồ Sơ Y Tế & Tiền Sử Dị Ứng
                </h2>
                <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
                  Hệ thống tự động bảo vệ bạn trước nguy cơ dị ứng thuốc và chống chỉ định nguy hiểm mỗi khi mua sắm tại mọi chi nhánh ABC Pharmacy.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2.5 bg-white text-teal-900 hover:bg-teal-50 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 size={14} /> Chỉnh sửa hồ sơ
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        resetForm();
                      }}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Trạng thái bảo vệ y tế */}
            <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>AI Cross-Check: Đang kích hoạt</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md">
                <Droplet size={13} className="text-rose-300" />
                <span>Nhóm máu: {profile.bloodType || 'Chưa cập nhật'}</span>
              </div>
              {profile.hasCompletedHealthOnboarding ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  <CheckCircle2 size={13} />
                  <span>Đã hoàn tất khai báo y tế</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/30">
                  <AlertTriangle size={13} />
                  <span>Chưa hoàn tất khai báo ban đầu</span>
                </div>
              )}
            </div>
          </div>

          {/* ================= HỘ CHIẾU SỨC KHỎE SỐ ĐA NHÀ THUỐC (DIGITAL HEALTH PASSPORT) ================= */}
          <div className="bg-gradient-to-br from-white via-teal-50/30 to-blue-50/40 rounded-3xl p-6 border-2 border-teal-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full sm:w-auto">
              {/* Khung QR Code mini có thể click để phóng to */}
              <div
                onClick={() => setShowQrModal(true)}
                className="p-3 bg-white rounded-2xl border-2 border-teal-500/30 shadow-md flex flex-col items-center justify-center cursor-pointer group hover:scale-105 transition-all shrink-0"
                title="Bấm để phóng to mã QR Sức Khỏe Số"
              >
                <QRCodeSVG
                  value={healthPassportQrPayload}
                  size={96}
                  level="M"
                  includeMargin={false}
                  className="rounded-lg"
                />
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-teal-700 uppercase tracking-wider group-hover:text-blue-600">
                  <Maximize2 size={11} />
                  <span>Phóng to QR</span>
                </div>
              </div>

              {/* Thông tin định danh bệnh nhân */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white uppercase tracking-wider">
                    <Building2 size={11} />
                    <span>Liên thông đa nhà thuốc</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    {profile.tier || currentUser?.tier || 'Thành viên'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                    Nhóm máu: {profile.bloodType || 'Chưa rõ'}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {profile.fullName || currentUser?.fullName || 'Khách hàng'}
                </h3>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1">
                    <FileText size={13} className="text-teal-600" />
                    <span className="font-bold text-slate-700">Mã Bệnh Án:</span>
                    <span className="font-mono text-teal-800 font-black">
                      #MED-{(profile.userId || currentUser?.id || currentUser?._id || 'PATIENT').slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    <span>{profile.phone || currentUser?.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
                  💡 <strong>Hộ chiếu sức khỏe điện tử:</strong> Xuất trình mã QR này tại bất kỳ quầy thu ngân / quầy dược sĩ nào trong chuỗi ABC Pharmacy để Dược sĩ đối soát tiền sử dị ứng và chống chỉ định qua AI.
                </p>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex sm:flex-col items-center gap-2.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode size={15} />
                <span>Mở QR Quét Tại Quầy</span>
              </button>
            </div>
          </div>

          {/* ================= MODAL PHÓNG TO MÃ QR DIGITAL HEALTH PASSPORT ================= */}
          {showQrModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-center p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-700 uppercase tracking-wider">
                    <Building2 size={14} />
                    <span>Thẻ Sức Khỏe Đa Nhà Thuốc</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-800">
                    {profile.fullName || currentUser?.fullName || 'Khách hàng'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    #MED-{(profile.userId || currentUser?.id || currentUser?._id || 'PATIENT').slice(-6).toUpperCase()} • SĐT: {profile.phone || currentUser?.phone}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-teal-300 flex items-center justify-center">
                  <QRCodeSVG
                    value={healthPassportQrPayload}
                    size={200}
                    level="H"
                    includeMargin={true}
                    className="rounded-xl shadow-inner"
                  />
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed bg-teal-50/60 p-3 rounded-xl border border-teal-100">
                  Dược sĩ tại quầy chỉ cần dùng máy quét mã vạch quét mã QR này để tự động nạp hồ sơ bệnh án và kiểm tra tương tác thuốc AI.
                </div>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* Thông báo nếu hồ sơ y tế còn hoàn toàn trống */}
          {!hasAllergies && !hasConditions && !isEditing && (
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-900">Hồ sơ y tế của bạn hiện đang trống</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Vui lòng cập nhật các nhóm thuốc bạn từng dị ứng hoặc bệnh mãn tính để hệ thống tự động kiểm tra chéo (Cross-Check) bảo vệ bạn khi mua thuốc.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm shrink-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 size={13} />
                <span>Khai báo y tế ngay</span>
              </button>
            </div>
          )}

          {/* Thông báo kết quả thao tác */}
          {successMsg && (
            <div className="p-4 bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-sky-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= CHẾ ĐỘ XEM HOẶC CHỈNH SỬA ================= */}
          {!isEditing ? (
            <MedicalRecordOverview
              profile={profile}
              hasAllergies={hasAllergies}
              hasConditions={hasConditions}
            />
          ) : (
            /* Form Chỉnh sửa Hồ sơ Y khoa */
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-800">Cập Nhật Thông Tin Sức Khỏe</h3>
                <span className="text-xs text-slate-400 font-medium">* Bấm Enter hoặc nút Thêm để tạo tag</span>
              </div>

              <MedicalTagInput
                label="Tiền sử dị ứng nhóm thuốc / Dị nguyên:"
                placeholder="Nhập nhóm dị ứng (VD: Penicillin, Cephalosporin, NSAID, Hải sản...)"
                tags={editAllergies}
                onAddTag={(tag) => addTag('allergies', tag)}
                onRemoveTag={(tag) => removeTag('allergies', tag)}
                colorScheme="rose"
                disabled={saving}
              />

              <MedicalTagInput
                label="Biệt dược cụ thể từng bị dị ứng:"
                placeholder="VD: Augmentin, Klamentin, Panadol Extra, Aspirin..."
                tags={editAllergicMeds}
                onAddTag={(tag) => addTag('meds', tag)}
                onRemoveTag={(tag) => removeTag('meds', tag)}
                colorScheme="amber"
                icon={<Pill size={12} />}
                disabled={saving}
              />

              <MedicalTagInput
                label="Hoạt chất dị ứng:"
                placeholder="VD: Amoxicillin, Ibuprofen, Sulfamethoxazole..."
                tags={editAllergicIngredients}
                onAddTag={(tag) => addTag('ingredients', tag)}
                onRemoveTag={(tag) => removeTag('ingredients', tag)}
                colorScheme="purple"
                disabled={saving}
              />

              <MedicalTagInput
                label="Bệnh nền / Bệnh lý mãn tính:"
                placeholder="VD: Viêm loét dạ dày, Tăng huyết áp, Đái tháo đường, Hen suyễn..."
                tags={editConditions}
                onAddTag={(tag) => addTag('conditions', tag)}
                onRemoveTag={(tag) => removeTag('conditions', tag)}
                colorScheme="teal"
                icon={<HeartPulse size={12} />}
                disabled={saving}
              />

              {/* Nhóm máu & Ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nhóm máu</label>
                  <select
                    value={editBloodType}
                    onChange={(e) => setEditBloodType(e.target.value)}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Chưa rõ">Chưa rõ / Chưa xét nghiệm</option>
                    <option value="A+">Nhóm máu A (Rh+)</option>
                    <option value="A-">Nhóm máu A (Rh-)</option>
                    <option value="B+">Nhóm máu B (Rh+)</option>
                    <option value="B-">Nhóm máu B (Rh-)</option>
                    <option value="AB+">Nhóm máu AB (Rh+)</option>
                    <option value="AB-">Nhóm máu AB (Rh-)</option>
                    <option value="O+">Nhóm máu O (Rh+)</option>
                    <option value="O-">Nhóm máu O (Rh-)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú y tế</label>
                  <input
                    type="text"
                    placeholder="Ghi chú điều trị đặc biệt..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    disabled={saving}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    resetForm();
                  }}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Lưu hồ sơ bệnh án</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= GỢI Ý THUỐC AN TOÀN THEO THỂ TRẠNG (UC-107) ================= */}
          <SafeDrugRecommendations profile={profile} />
        </div>
      </div>
    </div>
  );
}

export default CustomerMedicalRecord;
