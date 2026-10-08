import { History, Search, LogOut, Menu, X, Store, ExternalLink } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

/** Decode JWT stored in localStorage to extract user display name and role */
function getUserFromToken(): { name: string; role: string } {
  try {
    const token = localStorage.getItem("token");
    if (!token) return { name: "", role: "" };
    // Decode base64url → UTF-8 (handles Vietnamese & unicode characters)
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return {
      name: payload.fullName || payload.name || payload.email || "",
      role: payload.role || "",
    };
  } catch {
    return { name: "", role: "" };
  }
}

/** Return the profile route for the given role */
function getProfilePath(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/profile";
    case "director":
    case "head_branch":
      return "/director/profile";
    case "warehouse":
      return "/warehouse/profile";
    case "branch":
      return "/branch/profile";
    case "pharmacist":
      return "/pharmacist/profile";
    default:
      return "/profile";
  }
}

/**
 * Map URL path segments to human-readable Vietnamese page titles.
 * Falls back to a generic workspace label when the segment is unknown.
 */
const PATH_TITLE_MAP: Record<string, string> = {
  dashboard: "Bảng điều khiển",
  medicines: "Quản lý dược phẩm",
  inventory: "Kiểm kê kho",
  orders: "Đơn hàng",
  suppliers: "Nhà cung cấp",
  reports: "Báo cáo & Thống kê",
  users: "Quản lý người dùng",
  branches: "Chi nhánh",
  purchase: "Mua hàng",
  sales: "Bán hàng",
  notifications: "Thông báo",
  profile: "Hồ sơ cá nhân",
  finance: "Tài chính",
  pricing: "Bảng giá",
  sensors: "Cảm biến IoT",
  admin: "Quản trị hệ thống",
  warehouse: "Kho hàng",
  pharmacist: "Dược sĩ",
  director: "Ban giám đốc",
  branch: "Chi nhánh",
};

/** Derive a dynamic page title from the current pathname */
function getTitleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Walk segments from the end to find a recognisable key
  for (let i = segments.length - 1; i >= 0; i--) {
    const key = segments[i].toLowerCase();
    if (PATH_TITLE_MAP[key]) return PATH_TITLE_MAP[key];
  }
  return "Không gian làm việc";
}

interface HeaderProps {
  userRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  handleLogout: () => void;
  getRoleLabel: (role: string) => string;
  isCollapsed?: boolean;
  toggleCollapsed?: () => void;
}

export function Header({
  userRole,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
  getRoleLabel,
  isCollapsed,
  toggleCollapsed,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const { name } = getUserFromToken();
    setUserName(name);
  }, []);

  const profilePath = getProfilePath(userRole);
  const avatarLetter = userName.charAt(0).toUpperCase() || "?";
  const pageTitle = getTitleFromPath(location.pathname);

  return (
    <>
      {/* ── Mobile Header ─────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 print:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <NotificationBell />
          <button
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Desktop Header ────────────────────────────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-20 print:hidden">
        {/* Left: toggle sidebar button + dynamic page title */}
        <div className="flex items-center gap-3 flex-1">
          {toggleCollapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
              title={isCollapsed ? "Mở rộng thanh điều hướng (Ctrl+B)" : "Thu gọn thanh điều hướng (Ctrl+B)"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">
            {pageTitle}
          </h2>
        </div>

        {/* Right: action buttons + user identity */}
        <div className="flex items-center gap-2.5 ml-4">
          {/* Store link — emerald accent */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View customer store (opens in new tab)"
            title="Xem giao diện Cửa Hàng / Khách Hàng (Mở tab mới)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              bg-emerald-50 hover:bg-emerald-100 text-emerald-700
              border border-emerald-200 shadow-sm
              text-xs font-bold transition-all duration-150"
          >
            <Store size={15} className="text-emerald-600" />
            <span className="hidden lg:inline">Xem Cửa Hàng</span>
            <ExternalLink size={12} className="text-emerald-400" />
          </a>

          {/* Notification bell */}
          <NotificationBell />

          {/* History button */}
          <button
            aria-label="View history"
            title="Lịch sử hoạt động"
            className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-150"
          >
            <History size={20} />
          </button>

          {/* User identity — click to navigate to profile */}
          <button
            onClick={() => navigate(profilePath)}
            aria-label="View your profile"
            className="flex items-center gap-3 pl-4 ml-1 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {userName || "Người dùng"}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                {getRoleLabel(userRole)}
              </div>
            </div>
            {/* Avatar — emerald-to-teal gradient */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
              {avatarLetter}
            </div>
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            aria-label="Logout"
            title="Đăng xuất"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 ml-1"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
    </>
  );
}
