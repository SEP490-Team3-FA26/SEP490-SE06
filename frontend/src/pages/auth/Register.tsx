import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { authService } from "../../services/auth/auth.service";

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await authService.register(fullName, email, password);

      if (res?.data?.access_token) {
        setSuccess("Đăng ký thành công! Đang chuyển hướng vào hệ thống...");
        const role = res.data.user?.role || "user";
        setTimeout(() => {
          if (role === "admin" || role === "head_branch") navigate("/admin");
          else if (role === "warehouse") navigate("/warehouse");
          else if (role === "branch") navigate("/branch");
          else if (role === "pharmacist") navigate("/pharmacist");
          else navigate("/customer");
        }, 1200);
      } else {
        setSuccess("Đăng ký thành công! Vui lòng đăng nhập.");
        setTimeout(() => {
          navigate("/auth/login");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8 text-center mt-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Đăng ký để sử dụng hệ thống quản lý nhà thuốc</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Họ và tên</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Email liên hệ</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Địa chỉ Email của bạn"
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tạo mật khẩu an toàn (tối thiểu 6 ký tự)"
              minLength={6}
              className="w-full pl-11 pr-12 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm font-medium text-center bg-red-50 border border-red-100 py-2.5 px-3 rounded-xl">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-emerald-700 text-sm font-medium text-center bg-emerald-50 border border-emerald-100 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {success}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#0057cd] hover:bg-[#00419e] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-8 text-center text-sm font-medium border-t border-slate-200/60 pt-6">
        <span className="text-slate-400">Đã có tài khoản? </span>
        <Link to="/auth/login" className="font-bold text-[#0057cd] hover:text-[#00419e] transition-colors hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </>
  );
}
