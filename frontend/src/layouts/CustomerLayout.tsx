import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, BrainCircuit, HeartPulse, Menu, X, LogOut, ShieldAlert, User, MapPin, ClipboardList, ChevronDown } from "lucide-react";
import api from "../services/core/api";
import { notifyAuthTokenChanged } from "../utils/authEvents";
import { authService } from "../services/auth/auth.service";
import { MascotLogoIcon } from "../components/ui/Logo";

export function CustomerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; fullName?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const fetchLoyaltyInfo = async () => {
    try {
      const role = localStorage.getItem("userRole") || "";
      setUserRole(role);
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await api.get("/api/users/loyalty");
      if (res.data && !res.data.error) {
        setLoyalty(res.data);
      }
    } catch (err) {
      console.error("Error reading loyalty info:", err);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    notifyAuthTokenChanged();
    navigate("/auth/login");
  };

  const updateCartCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
        return;
      }

      const res = await api.get("/api/users/cart");
      const data = res.data;
      if (data && data.items) {
        const count = data.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
      }
    } catch (err) {
      console.error("Error reading cart count:", err);
    }
  };

  useEffect(() => {
    updateCartCount();
    fetchLoyaltyInfo();

    // Listen for custom event when items are added to cart
    window.addEventListener("cartUpdated", updateCartCount);
    window.addEventListener("loyaltyUpdated", fetchLoyaltyInfo);
    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
      window.removeEventListener("loyaltyUpdated", fetchLoyaltyInfo);
    };
  }, []);

  const hasToken = !!localStorage.getItem("token");
  const navItems = [
    { name: "Cửa Hàng Dược Phẩm", href: "/customer/shop", icon: <ShoppingCart size={18} /> },
    { name: "Tư Vấn AI (Giọng Nói)", href: "/customer/ai-consult", icon: <BrainCircuit size={18} /> },
    { name: "Tương Tác Thuốc AI", href: "/customer/interactions", icon: <ShieldAlert size={18} /> },
  ].filter(Boolean) as any[];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Premium Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <MascotLogoIcon size="md" />
            <div className="flex flex-col">
              <span className="font-black text-[18px] text-slate-800 tracking-tight leading-none group-hover:text-[#0d6efd] transition-colors"> ABC Pharma</span>
              <span className="text-[10px] font-bold text-[#0d6efd] uppercase tracking-wider mt-1">Cổng Khách Hàng / Customer</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${isActive
                    ? "bg-[#f2f3ff] text-[#0d6efd] font-black"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Actions: Cart & Profile & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Cart Icon Button */}
            <Link
              to="/customer/cart"
              className="relative p-3 bg-slate-100 text-slate-600 hover:text-[#0d6efd] hover:bg-[#f2f3ff] rounded-xl transition-all flex items-center justify-center"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5.5 h-5.5 bg-[#ba1a1a] text-white text-[10px] font-black flex items-center justify-center rounded-full px-1 shadow border-2 border-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Profile / Login */}
            {hasToken ? (
              <div className="relative border-l border-slate-200 pl-2">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 rounded-xl transition-all cursor-pointer text-left focus:outline-none"
                >
                  <div className={`w-9 h-9 rounded-full ${userRole && userRole !== 'user' ? 'bg-indigo-600 text-white' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-black text-xs uppercase shadow-inner`}>
                    {userRole && userRole !== 'user' ? userRole.substring(0, 2).toUpperCase() : (loyalty?.tier?.substring(0, 2) || "KH")}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{loyalty?.fullName || (userRole && userRole !== 'user' ? `Quản trị (${userRole.toUpperCase()})` : "Khách Hàng")}</span>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      {userRole && userRole !== 'user' ? (
                        <span className="text-indigo-600 font-black uppercase">Tài khoản Quản trị</span>
                      ) : (
                        <>Hạng {loyalty?.tier || "Bronze"} • <span className="text-blue-600">{loyalty?.points?.toLocaleString() || 0}đ</span></>
                      )}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl border border-slate-100 shadow-xl py-2 z-50 animate-fade-in text-left">
                      <div className="px-4 py-2 border-b border-slate-50 mb-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tài khoản</span>
                        <span className="text-xs font-extrabold text-slate-800 truncate block">{loyalty?.fullName || (userRole && userRole !== 'user' ? `Tài khoản ${userRole.toUpperCase()}` : "Khách Hàng")}</span>
                      </div>

                      {userRole && userRole !== 'user' && (
                        <Link
                          to={userRole === 'director' || userRole === 'head_branch' ? '/director' : userRole === 'admin' ? '/admin' : userRole === 'warehouse' ? '/warehouse' : userRole === 'branch' ? '/branch' : userRole === 'pharmacist' ? '/pharmacist' : '/admin'}
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-black text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all mb-1"
                        >
                          <User size={15} className="text-indigo-600" />
                          <span>Vào Bảng Quản Trị ({userRole.toUpperCase()})</span>
                        </Link>
                      )}

                      <Link
                        to="/customer/profile"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all"
                      >
                        <User size={15} />
                        <span>Thông tin cá nhân & Điểm</span>
                      </Link>
                      <Link
                        to="/customer/orders"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all"
                      >
                        <ClipboardList size={15} />
                        <span>Đơn hàng & Toa thuốc</span>
                      </Link>
                      <div className="border-t border-slate-50 mt-1.5 pt-1.5">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-left"
                        >
                          <LogOut size={15} />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="bg-gradient-to-r from-[#0d6efd] to-[#0b5ed7] hover:from-[#0b5ed7] hover:to-[#0d6efd] text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/15"
              >
                Đăng Nhập
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-600 hover:text-slate-900 md:hidden rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2.5 animate-slide-in-top">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all ${isActive
                    ? "bg-[#f2f3ff] text-[#0d6efd]"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
            {hasToken ? (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link to="/customer/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    KH
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Khách Hàng</span>
                    <span className="text-[10px] text-blue-500 font-medium">Hồ sơ & Lịch sử</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-[#0d6efd] hover:bg-[#0b5ed7] text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Đăng Nhập
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <Outlet />
      </main>

      {/* Simple compliant footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SmartPharma AI. Cổng mua sắm & Kê đơn AI an toàn.</p>
          <div className="flex gap-4">
            <span className="text-emerald-500 font-bold">● Đạt chuẩn GPP</span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-400">AI-driven prescription</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

