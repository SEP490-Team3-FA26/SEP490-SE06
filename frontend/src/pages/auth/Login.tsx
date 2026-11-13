import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail, Phone, Lock, Eye, EyeOff, PackageSearch, Store, Pill, ShieldCheck, CheckCircle2, Users, AlertCircle, Loader2, LogOut, LayoutDashboard, Store as StoreIcon, Briefcase, Building2, Code2, Sparkles, UserCheck } from "lucide-react";
import { authService } from "../../services/auth/auth.service";
import { requestNotificationPermission } from "../../utils/notificationPermission";

export function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Chỉ cho phép Developer Test Accounts ở môi trường phát triển (DEV) hoặc khi có cờ VITE_ENABLE_DEV_LOGIN rõ ràng
  const isDevAllowed = Boolean(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true');

  // Kiểm tra cờ dev trong URL (?dev=true hoặc ?mode=dev)
  const isDevParam = isDevAllowed && (searchParams.get('dev') === 'true' || searchParams.get('mode') === 'dev' || searchParams.get('developer') === 'true');
  const [isDevMode, setIsDevMode] = useState<boolean>(isDevParam);

  const [role, setRole] = useState(isDevParam ? "admin" : "user");
  const [email, setEmail] = useState(isDevParam ? "admin@vinapharmacy.com" : "");
  const [password, setPassword] = useState(isDevParam ? "123456" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSessionUser, setActiveSessionUser] = useState<any>(null);

  useEffect(() => {
    if (isDevParam) {
      setIsDevMode(true);
      if (!email) {
        setEmail("admin@vinapharmacy.com");
        setPassword("123456");
      }
    }
  }, [isDevParam]);

  const handleToggleDevMode = (dev: boolean) => {
    if (dev && !isDevAllowed) return;
    setIsDevMode(dev && isDevAllowed);
    setError("");
    if (dev && isDevAllowed) {
      setRole("admin");
      setEmail("admin@vinapharmacy.com");
      setPassword("123456");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('dev', 'true');
        return next;
      });
    } else {
      setRole("user");
      setEmail("");
      setPassword("");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('dev');
        next.delete('mode');
        next.delete('developer');
        return next;
      });
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      const u = authService.getCurrentUser();
      if (u) {
        setActiveSessionUser(u);
      }
    }

    // Handle session expired query param
    if (searchParams.get('sessionExpired') === 'true') {
      setSessionExpiredNotice(true);
    }

    // Handle Google login return token
    const googleToken = searchParams.get('token');
    const urlError = searchParams.get('error');

    if (googleToken) {
      try {
        const base64Url = googleToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        const userObj = {
          id: decoded.sub,
          email: decoded.email,
          fullName: decoded.fullName || "Người dùng Google",
          role: decoded.role || "user",
          branchId: decoded.branchId || null,
          branchName: decoded.branchName || null,
        };

        authService.setSession(googleToken, userObj);
        navigate(redirectByRole(decoded.role || "user"));
      } catch (err) {
        console.error("Lỗi parse Google token:", err);
        localStorage.setItem("token", googleToken);
        localStorage.setItem("userRole", "user");
        navigate('/');
      }
    }

    if (urlError) {
      setError(urlError);
    }
  }, [searchParams, navigate]);

  const roles = [
    { id: "admin", label: "Admin Tổng", subLabel: "Hệ thống", email: "admin@vinapharmacy.com", icon: <ShieldCheck size={20} />, activeColor: "bg-rose-50 border-rose-200 text-rose-700", iconColor: "text-rose-500" },
    { id: "director", label: "Giám Đốc", subLabel: "Điều hành", email: "director@vinapharmacy.com", icon: <Briefcase size={20} />, activeColor: "bg-indigo-50 border-indigo-200 text-indigo-700", iconColor: "text-indigo-600" },
    { id: "warehouse", label: "Quản lý kho", subLabel: "Kho vận", email: "warehouse@vinapharmacy.com", icon: <PackageSearch size={20} />, activeColor: "bg-amber-50 border-amber-200 text-amber-700", iconColor: "text-amber-500" },
    { id: "branch", label: "QL Chi nhánh", subLabel: "Cơ sở", email: "manager@vinapharmacy.com", icon: <Store size={20} />, activeColor: "bg-sky-50 border-sky-200 text-sky-700", iconColor: "text-sky-500" },
    { id: "pharmacist", label: "Thuốc / Bán", subLabel: "Dược sĩ", email: "pharmacist@vinapharmacy.com", icon: <Pill size={20} />, activeColor: "bg-blue-50 border-blue-200 text-blue-700", iconColor: "text-[#0057cd]" },
    { id: "user", label: "Người dùng", subLabel: "Khách hàng", email: "user@vinapharmacy.com", icon: <Users size={20} />, activeColor: "bg-purple-50 border-purple-200 text-purple-700", iconColor: "text-purple-500" },
  ];

  const handleRoleSelect = (selectedRole: any) => {
    // If selecting a different role than the active session, clear old session to avoid interface conflicts
    if (activeSessionUser && activeSessionUser.role?.toLowerCase() !== selectedRole.id.toLowerCase()) {
      authService.clearSession();
      setActiveSessionUser(null);
    }
    setRole(selectedRole.id);
    setEmail(selectedRole.email);
    setPassword(selectedRole.password || "123456");
    setError("");
  };

  const redirectByRole = (userRole: string) => {
    switch (userRole?.toLowerCase()) {
      case "admin":
        return "/admin";
      case "director":
      case "head_branch":
        return "/director";
      case "warehouse":
        return "/warehouse";
      case "branch":
        return "/branch";
      case "pharmacist":
        return "/pharmacist";
      case "moh_inspector":
        return "/inspector/gpp-sync";
      case "user":
      default:
        return "/";
    }
  };

  const redirectParam = searchParams.get('redirect');
  const getDestinationUrl = (fallbackRole: string) => {
    if (redirectParam) {
      try {
        return decodeURIComponent(redirectParam);
      } catch {
        return redirectParam;
      }
    }
    return redirectByRole(fallbackRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nhận diện thông minh: nếu ở môi trường dev và người dùng gõ "dev" hoặc "developer" vào ô email, tự động kích hoạt Chế độ Nhà phát triển
    const trimmedEmail = email.trim().toLowerCase();
    if (isDevAllowed && (trimmedEmail === "dev" || trimmedEmail === "developer")) {
      setError("");
      handleToggleDevMode(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authService.login(email, password);

      // Request notification permission (don't block login)
      requestNotificationPermission().catch(err => {
        console.warn('Failed to request notification permission:', err);
      });

      // Prioritize redirecting to return URL (Deep Linking), otherwise redirect to role-specific dashboard
      navigate(getDestinationUrl(data.user?.role || "admin"));
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 text-center mt-2">
        {isDevMode ? (
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold mb-2">
              <Code2 size={13} className="text-purple-600" />
              <span>CHẾ ĐỘ NHÀ PHÁT TRIỂN / TESTER</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Developer Login</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Chọn nhanh vai trò để tự điền tài khoản kiểm thử hệ thống</p>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => handleToggleDevMode(false)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                ← Quay lại đăng nhập người dùng thông thường
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Đăng nhập</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Truy cập hệ thống quản trị ABC Pharmacy</p>
          </div>
        )}
      </div>

      {/* Active Session Prompt */}
      {activeSessionUser && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-left flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0057cd] text-white flex items-center justify-center font-black text-sm uppercase shadow-sm">
                {activeSessionUser.role ? activeSessionUser.role.substring(0, 2).toUpperCase() : "US"}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-tight">
                  {activeSessionUser.fullName || activeSessionUser.name || activeSessionUser.email}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Đang đăng nhập vai trò: <strong className="text-[#0057cd] uppercase font-bold">{activeSessionUser.role || 'User'}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                authService.clearSession();
                setActiveSessionUser(null);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Đổi tài khoản
            </button>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => navigate(getDestinationUrl(activeSessionUser.role || 'admin'))}
              className="flex-1 py-2.5 bg-[#0057cd] hover:bg-[#0a58ca] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <LayoutDashboard size={14} />
              <span>Tiếp tục vào Không gian làm việc →</span>
            </button>
            <Link
              to="/"
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center"
              title="Về trang chủ"
            >
              <StoreIcon size={14} />
            </Link>
          </div>
        </div>
      )}

      {sessionExpiredNotice && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Chỉ hiển thị khối Chọn chức vụ khi bật Developer Mode */}
        {isDevMode && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-slate-700">Chọn chức vụ để tự điền Test Account</label>
              <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Click để tự điền</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roles.map((r) => {
                const isActive = role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleRoleSelect(r)}
                    className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2 ${isActive
                      ? `${r.activeColor} shadow-sm scale-[1.02]`
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`${isActive ? r.iconColor : 'text-slate-400'} transition-colors`}>
                      {r.icon}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${isActive ? '' : 'text-slate-700'}`}>{r.label}</div>
                      <div className="text-[10px] uppercase font-bold opacity-70 tracking-wider mt-0.5">{r.subLabel}</div>
                    </div>
                    {isActive && (
                      <div className={`absolute -top-2 -right-2 bg-white rounded-full ${r.iconColor}`}>
                        <CheckCircle2 size={18} className="fill-current text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={isDevMode ? "border-t border-slate-100 pt-5" : ""}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Email hoặc Số điện thoại</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  {/^[0-9+]/.test(email.trim()) ? <Phone size={18} className="text-blue-600" /> : <Mail size={18} />}
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              {/* Gợi ý kích hoạt Dev Mode ngay nếu người dùng gõ dev hoặc developer (chỉ cho phép ở môi trường dev) */}
              {isDevAllowed && !isDevMode && (email.trim().toLowerCase() === "dev" || email.trim().toLowerCase() === "developer") && (
                <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-700 animate-in fade-in">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Code2 size={14} className="text-purple-600 shrink-0" />
                    Phát hiện từ khóa Developer!
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleDevMode(true)}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    Bật Dev Mode ngay
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-[#0057cd] hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs font-semibold text-center bg-red-50 border border-red-200 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#0057cd] hover:bg-[#0a58ca] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <span>Truy cập hệ thống</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Hoặc tiếp tục với</span>
          </div>
        </div>

        <a
          href="/api/auth/google"
          className="w-full flex justify-center items-center gap-3 py-3.5 px-4 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Đăng nhập với Google
        </a>
      </form>

      <div className="mt-8 text-center text-sm font-medium border-t border-slate-200/60 pt-6 space-y-3">
        <div>
          <span className="text-slate-400">Chưa có tài khoản? </span>
          <Link to="/register" className="font-bold text-[#0057cd] hover:text-[#00419e] transition-colors hover:underline">
            Đăng ký ngay
          </Link>
        </div>

        {/* Nút chuyển sang chế độ developer khi đang ở chế độ bình thường (chỉ cho phép ở môi trường dev) */}
        {isDevAllowed && !isDevMode && (
          <div>
            <button
              type="button"
              onClick={() => handleToggleDevMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Code2 size={13} className="text-slate-400" />
              <span>Chế độ Nhà phát triển (Developer Test Accounts)</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
