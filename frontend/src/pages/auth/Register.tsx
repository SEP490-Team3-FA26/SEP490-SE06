// frontend/src/pages/auth/Register.tsx
/**
 * =========================================================================
 * TRANG ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG MỚI (TỐI GIẢN - RỘNG RÃI - DỄ NHÌN)
 * - Tích hợp mục "Quy định bảo mật thông tin người dùng" (Nghị định 13/2023/NĐ-CP & GPP)
 * - Modal xem chi tiết chính sách bảo mật dữ liệu y tế & hồ sơ sức khỏe
 * - Đo độ mạnh mật khẩu trực quan, hỗ trợ ẩn/hiện mật khẩu
 * - Tự động cấp phiên và chuyển hướng đến Onboarding Sổ Sức Khỏe Số (UC-106)
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { authService } from "../../services/auth/auth.service";
import { PrivacyPolicyModal } from "../../components/common/PrivacyPolicyModal";

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Tính toán độ an toàn mật khẩu một cách trực quan
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Rất an toàn"];
  const strengthColors = ["bg-slate-200", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Ràng buộc bảo vệ dữ liệu: Bắt buộc người dùng đồng ý quy định bảo mật
    if (!agreePrivacy) {
      setError("Vui lòng đọc và tích chọn đồng ý với Quy định bảo mật thông tin để hoàn tất đăng ký.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự để đảm bảo an toàn.");
      return;
    }

    setLoading(true);

    try {
      const res = await authService.register(fullName.trim(), email.trim(), password);
      const token = res?.access_token || res?.data?.access_token;
      const user = res?.user || res?.data?.user;

      if (token) {
        const role = user?.role || "user";
        if (role === "user") {
          setSuccess("Đăng ký thành công! Đang chuyển đến trang hoàn thiện Hồ sơ Sức khỏe & Bệnh án...");
          setTimeout(() => {
            navigate("/customer/medical-record?onboarding=true");
          }, 800);
        } else {
          setSuccess("Đăng ký thành công! Đang chuyển hướng...");
          setTimeout(() => {
            if (role === "admin") navigate("/admin");
            else if (role === "director" || role === "head_branch") navigate("/director");
            else if (role === "warehouse") navigate("/warehouse");
            else if (role === "branch") navigate("/branch");
            else if (role === "pharmacist") navigate("/pharmacist");
            else navigate("/");
          }, 800);
        }
      } else {
        setSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
        setTimeout(() => {
          navigate("/auth/login");
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Tiêu đề & Giới thiệu form đăng ký (Rộng rãi, dễ nhìn) */}
      <div className="mb-7 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-3">
          <ShieldCheck size={14} className="text-blue-600" />
          <span>Bảo mật chuẩn Y tế GPP & Nghị định 13</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Tạo tài khoản mới
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          Đăng ký thành viên ABC Pharmacy để quản lý đơn thuốc và nhận cảnh báo tương tác thuốc an toàn
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Trường 1: Họ và tên */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all shadow-2xs"
              required
              minLength={2}
            />
          </div>
        </div>

        {/* Trường 2: Email liên hệ */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
            Địa chỉ Email <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@gmail.com"
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all shadow-2xs"
              required
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 pl-1">
            Email dùng để nhận hóa đơn điện tử và thông báo tình trạng đơn thuốc
          </p>
        </div>

        {/* Trường 3: Mật khẩu & Thanh đo độ mạnh */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
            Mật khẩu an toàn <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              minLength={6}
              className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-blue-500/15 transition-all shadow-2xs"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Thanh đo độ an toàn mật khẩu (Tối giản & Tinh tế) */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      passwordStrength >= step
                        ? strengthColors[passwordStrength]
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                <span>Độ an toàn:</span>
                <span className="font-semibold text-slate-700">
                  {strengthLabels[passwordStrength]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* MỤC QUY ĐỊNH BẢO MẬT THÔNG TIN NGƯỜI DÙNG (YÊU CẦU NGHIỆP VỤ)  */}
        {/* ============================================================ */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 transition-all hover:border-slate-300">
          <div className="flex items-start gap-3">
            <input
              id="privacy-policy-agree"
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
              required
            />
            <div className="flex-1 text-xs sm:text-xs leading-relaxed text-slate-700">
              <label
                htmlFor="privacy-policy-agree"
                className="cursor-pointer select-none font-medium block"
              >
                Tôi đồng ý với{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacyModal(true);
                  }}
                  className="font-bold text-[#0057cd] hover:text-[#00419e] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileText size={12} className="inline" />
                  <span>Quy định bảo mật thông tin</span>
                </button>{" "}
                và bảo vệ dữ liệu y tế cá nhân.
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                🔒 Thông tin sức khỏe và tiền sử dị ứng được bảo mật tuyệt đối, không chia sẻ cho bên thứ ba.
              </p>
            </div>
          </div>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="text-red-700 text-xs sm:text-sm font-medium bg-red-50 border border-red-200 py-3 px-4 rounded-xl flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {success && (
          <div className="text-sky-800 text-xs sm:text-sm font-medium bg-sky-50 border border-sky-200 py-3 px-4 rounded-xl flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 size={18} className="text-sky-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{success}</span>
          </div>
        )}

        {/* Nút Hoàn Tất Đăng Ký */}
        <button
          type="submit"
          disabled={loading || !agreePrivacy}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-5 mt-6 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0057cd] hover:bg-[#00419e] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <span>Đang khởi tạo tài khoản...</span>
          ) : (
            <>
              <span>Hoàn tất đăng ký</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Chân trang chuyển hướng sang Đăng nhập */}
      <div className="mt-8 text-center text-xs sm:text-sm font-medium border-t border-slate-200/60 pt-5">
        <span className="text-slate-500">Đã có tài khoản thành viên? </span>
        <Link
          to="/auth/login"
          className="font-bold text-[#0057cd] hover:text-[#00419e] transition-colors hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </div>

      {/* Modal Xem Chi Tiết Quy Định Bảo Mật Thông Tin */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAgreePrivacy(true)}
      />
    </div>
  );
}

export default Register;
