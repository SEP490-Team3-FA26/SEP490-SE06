import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, Banknote, BarChart3, Sparkles, PackageSearch, ShieldCheck, Tag, CreditCard, Wallet, Link2 } from "lucide-react";

export function DirectorLayout() {
  const directorNavItems = [
    { name: "Tổng quan Điều hành", href: "/director", icon: <LayoutDashboard size={20} /> },
    { name: "Phê duyệt mua hàng (PO)", href: "/director/approvals", icon: <ShieldCheck size={20} /> },
    { name: "Hạn mức ngân sách (Quotas)", href: "/director/quotas", icon: <Wallet size={20} /> },
    { name: "Báo cáo Tài chính", href: "/director/finance", icon: <Banknote size={20} /> },
    { name: "Báo cáo Thống kê & Mùa vụ", href: "/director/reports", icon: <BarChart3 size={20} /> },
    { name: "Công nợ Nhà cung cấp", href: "/director/supplier-credit", icon: <CreditCard size={20} /> },
    { name: "Chuỗi cung ứng (Real-time)", href: "/director/supply-chain", icon: <Link2 size={20} /> },
    { name: "Dự báo Nhu cầu (AI)", href: "/director/ai-forecast", icon: <Sparkles size={20} /> },
    { name: "Phân tích Thông minh (AI Insights)", href: "/director/ai-insights", icon: <Sparkles size={20} /> },
    { name: "Bảng giá chuỗi", href: "/director/price-management", icon: <Tag size={20} /> },
    { name: "Giám sát Kho & Lô thuốc", href: "/director/lot-tracking", icon: <PackageSearch size={20} /> },
  ];

  return <BaseDashboardLayout navItems={directorNavItems} userRole="director" />;
}
