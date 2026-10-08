import { BaseDashboardLayout } from "./BaseDashboardLayout";
import {
  LayoutDashboard,
  ShoppingCart,
  ScanLine,
  Mic,
  ShieldCheck,
  BarChart3,
  PackageSearch,
  Calendar,
  RefreshCcw
} from "lucide-react";

export function PharmacistLayout() {
  const pharmacistNavItems = [
    { name: "Tổng quan Cá nhân", href: "/pharmacist", icon: <LayoutDashboard size={20} /> },
    { name: "Bán hàng (POS)", href: "/pharmacist/sales", icon: <ShoppingCart size={20} /> },
    { name: "Lịch Sử Quét OCR", href: "/pharmacist/ocr-history", icon: <ScanLine size={20} /> },
    { name: "Tư Vấn Giọng Nói AI", href: "/pharmacist/ai-consultation", icon: <Mic size={20} /> },
    { name: "Liên Thông Dược QG", href: "/pharmacist/gpp-sync", icon: <ShieldCheck size={20} /> },
    { name: "Truy xuất Lô & HSD", href: "/pharmacist/lot-tracking", icon: <PackageSearch size={20} /> },
    { name: "Lịch Làm Việc", href: "/pharmacist/schedule", icon: <Calendar size={20} /> },
    { name: "Yêu Cầu Đổi Ca", href: "/pharmacist/shift-swaps", icon: <RefreshCcw size={20} /> },
    { name: "Báo cáo thống kê", href: "/pharmacist/reports", icon: <BarChart3 size={20} /> },
  ];

  return <BaseDashboardLayout navItems={pharmacistNavItems} userRole="pharmacist" />;
}
