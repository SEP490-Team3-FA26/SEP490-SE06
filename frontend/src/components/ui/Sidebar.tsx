import { NavLink, Link } from "react-router-dom";
import { ReactNode, useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, LogOut } from "lucide-react";
import { Logo, MascotLogoIcon } from "./Logo";

export interface NavItem {
  name: string;
  href?: string;
  icon: ReactNode;
  subItems?: { name: string; href: string }[];
}

interface SidebarProps {
  navItems: NavItem[];
  userRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  handleLogout: () => void;
  getRoleLabel: (role: string) => string;
  isCollapsed?: boolean;
  toggleCollapsed?: () => void;
}

interface HoveredTooltipData {
  name: string;
  top: number;
  subItems?: { name: string; href: string }[];
}

// Decode user name from JWT stored in localStorage
function getUserNameFromToken(): string {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return payload.fullName || payload.name || payload.email || "";
  } catch {
    return "";
  }
}

export function Sidebar({
  navItems,
  userRole,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
  getRoleLabel,
  isCollapsed = false,
  toggleCollapsed,
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltipData | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userName = getUserNameFromToken();
  const avatarLetter = userName.charAt(0).toUpperCase() || "?";

  // Clear tooltip when sidebar expands
  useEffect(() => {
    if (!isCollapsed) {
      setHoveredTooltip(null);
    }
  }, [isCollapsed]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleItemMouseEnter = (
    name: string,
    e: React.MouseEvent<HTMLElement>,
    subItems?: { name: string; href: string }[]
  ) => {
    if (!isCollapsed) return;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      name,
      top: rect.top + rect.height / 2,
      subItems,
    });
  };

  const handleItemMouseLeave = () => {
    if (!isCollapsed) return;
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredTooltip(null);
    }, 120);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setHoveredTooltip(null);
  };

  return (
    <aside
      className={`
        fixed md:sticky top-0 left-0 z-40 h-[100dvh]
        ${isCollapsed ? "md:w-[76px]" : "md:w-[260px]"}
        w-[260px]
        bg-white/95 backdrop-blur-xl
        border-r border-slate-200/70
        shadow-[1px_0_20px_rgba(0,0,0,0.03)]
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        flex flex-col flex-shrink-0 print:hidden relative group
      `}
    >
      {/* Desktop Collapse / Expand Toggle Button on Sidebar Border */}
      {toggleCollapsed && (
        <button
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          onMouseEnter={(e) =>
            handleItemMouseEnter(
              isCollapsed
                ? "Mở rộng thanh điều hướng (Ctrl+B)"
                : "Thu gọn thanh điều hướng (Ctrl+B)",
              e
            )
          }
          onMouseLeave={handleItemMouseLeave}
          className="hidden md:flex absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-sm items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 cursor-pointer z-50 transition-all hover:scale-110 active:scale-95"
        >
          <ChevronLeft
            size={14}
            className={`transition-transform duration-300 text-slate-600 ${isCollapsed ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* Logo Area */}
      <div
        className={`py-5 hidden md:flex items-center transition-all ${
          isCollapsed ? "justify-center px-2" : "px-5"
        } border-b border-slate-100/80 bg-gradient-to-b from-slate-50/80 to-transparent overflow-hidden`}
      >
        {isCollapsed ? (
          <Link
            to="/pharmacist"
            aria-label="ABC Pharmacy"
            onMouseEnter={(e) => handleItemMouseEnter("Hệ thống ABC Pharmacy", e)}
            onMouseLeave={handleItemMouseLeave}
            className="flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <MascotLogoIcon size="sm" />
          </Link>
        ) : (
          <Logo />
        )}
      </div>

      {/* Navigation list */}
      <nav
        onScroll={() => setHoveredTooltip(null)}
        className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300"
      >
        {navItems.map((item) => {
          const isOpen = openMenus[item.name] || false;
          return (
            <div key={item.name} className="relative">
              {item.subItems ? (
                isCollapsed ? (
                  // Collapsed mode: Group icon with hover flyout
                  <button
                    onClick={() => toggleMenu(item.name)}
                    aria-label={item.name}
                    onMouseEnter={(e) => handleItemMouseEnter(item.name, e, item.subItems)}
                    onMouseLeave={handleItemMouseLeave}
                    className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-slate-400 group-hover:text-slate-800 shrink-0">
                      {item.icon}
                    </span>
                  </button>
                ) : (
                  // Expanded mode: Collapsible group with accordion
                  <div>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-[18px] h-[18px] flex items-center justify-center text-slate-400 shrink-0">
                          {item.icon}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-250 ease-in-out"
                      style={{ maxHeight: isOpen ? "500px" : "0px" }}
                    >
                      <div className="mt-0.5 space-y-0.5 pl-10 pr-2 pb-1">
                        {item.subItems.map((subItem) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            end
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `block px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                              ${
                                isActive
                                  ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border border-emerald-200/50 border-l-2 border-l-emerald-500 font-semibold"
                                  : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-900"
                              }`
                            }
                          >
                            {subItem.name}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // Flat item
                <NavLink
                  to={item.href!}
                  end
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setHoveredTooltip(null);
                  }}
                  onMouseEnter={(e) => handleItemMouseEnter(item.name, e)}
                  onMouseLeave={handleItemMouseLeave}
                  aria-label={item.name}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isCollapsed
                        ? "justify-center w-11 h-11 mx-auto"
                        : "gap-3 px-3 py-2.5"
                    } rounded-xl text-sm font-semibold transition-all duration-150 relative
                    ${
                      isActive
                        ? isCollapsed
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-300/60 shadow-xs"
                          : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border border-emerald-200/50 border-l-2 border-l-emerald-500"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-700"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom user card + logout */}
      <div
        className={`border-t border-slate-100/80 p-3 bg-gradient-to-t from-slate-50/60 to-transparent transition-all ${
          isCollapsed ? "px-1.5" : "px-3"
        }`}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              onMouseEnter={(e) =>
                handleItemMouseEnter(
                  `${userName || "Người dùng"} (${getRoleLabel(userRole)})`,
                  e
                )
              }
              onMouseLeave={handleItemMouseLeave}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 cursor-default"
            >
              {avatarLetter}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              onMouseEnter={(e) => handleItemMouseEnter("Đăng xuất", e)}
              onMouseLeave={handleItemMouseLeave}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {userName || "Người dùng"}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">
                {getRoleLabel(userRole)}
              </div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 shrink-0 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Fixed Floating Tooltip / Flyout Menu for Collapsed Sidebar */}
      {isCollapsed && hoveredTooltip && (
        <div
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className="fixed z-[99999] pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: "82px",
            top: `${hoveredTooltip.top}px`,
            transform: "translateY(-50%)",
          }}
        >
          {hoveredTooltip.subItems && hoveredTooltip.subItems.length > 0 ? (
            /* Submenu flyout for collapsible group */
            <div className="relative flex items-center filter drop-shadow-xl">
              <div className="w-2.5 h-2.5 bg-white border-l border-b border-slate-200 rotate-45 -mr-1.5 z-10 shrink-0" />
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 min-w-[210px] max-w-[260px]">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                  <span className="truncate">{hoveredTooltip.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-2" />
                </div>
                <div className="mt-1 px-1.5 space-y-0.5 max-h-[300px] overflow-y-auto">
                  {hoveredTooltip.subItems.map((subItem) => (
                    <NavLink
                      key={subItem.name}
                      to={subItem.href}
                      end
                      onClick={() => {
                        setHoveredTooltip(null);
                        setIsMobileMenuOpen(false);
                      }}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      {subItem.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* High-contrast tooltip badge for flat icon item */
            <div className="relative flex items-center filter drop-shadow-md">
              <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1 shadow-sm shrink-0" />
              <div className="bg-slate-900 text-white rounded-lg shadow-xl px-3 py-1.5 flex items-center gap-2 select-none border border-slate-800">
                <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
                  {hoveredTooltip.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
