import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sidebar, NavItem } from "../components/ui/Sidebar";
import { Header } from "../components/ui/Header";
import { notifyAuthTokenChanged } from "../utils/authEvents";
import { authService } from "../services/auth/auth.service";

interface BaseDashboardLayoutProps {
  navItems: NavItem[];
  userRole: string;
}

export function BaseDashboardLayout({ navItems, userRole }: BaseDashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    notifyAuthTokenChanged();
    navigate("/auth/login");
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Quản trị hệ thống";
      case "director":
      case "head_branch":
        return "Ban Giám Đốc";
      case "warehouse":
        return "Quản lý kho";
      case "branch":
        return "Quản lý chi nhánh";
      case "pharmacist":
        return "Dược sĩ / Nhân viên";
      default:
        return "Khách hàng";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#faf8ff] flex flex-col md:flex-row">
      <Sidebar
        navItems={navItems}
        userRole={userRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        getRoleLabel={getRoleLabel}
        isCollapsed={isCollapsed}
        toggleCollapsed={toggleCollapsed}
      />

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-[#faf8ff] print:h-auto print:bg-white print:overflow-visible transition-all duration-300">
        <Header
          userRole={userRole}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
          getRoleLabel={getRoleLabel}
          isCollapsed={isCollapsed}
          toggleCollapsed={toggleCollapsed}
        />
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#faf8ff] print:overflow-visible print:bg-white print:h-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default BaseDashboardLayout;
