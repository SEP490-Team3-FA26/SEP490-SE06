import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, Settings, Building2, PackageSearch, ShieldCheck, Tag, Users, Database } from "lucide-react";

export function AdminLayout() {
  const adminNavItems = [
    { name: "Tổng quan Hệ thống", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { name: "Quản lý chi nhánh", href: "/admin/branches", icon: <Building2 size={20} /> },
    { name: "Quản lý nhân viên & Phân quyền", href: "/admin/employees", icon: <Users size={20} /> },
    { name: "Quản lý Voucher", href: "/admin/vouchers", icon: <Tag size={20} /> },
    {
      name: "Quản trị Dược phẩm & NCC",
      icon: <Settings size={20} />,
      subItems: [
        { name: "Danh mục Dược phẩm", href: "/admin/master-data/products" },
        { name: "Hồ sơ Nhà cung cấp", href: "/admin/master-data/suppliers" },
      ]
    },
    { name: "Bảng giá chuỗi", href: "/admin/price-management", icon: <Tag size={20} /> },
    {
      name: "Quản trị Kho tổng",
      icon: <PackageSearch size={20} />,
      subItems: [
        { name: "Tổng quan kho", href: "/admin/inventory" },
        { name: "Nhập / Xuất kho", href: "/admin/inventory/import" },
        { name: "Biên bản kiểm kê", href: "/admin/inventory/checks" },
        { name: "Lịch sử hủy thuốc", href: "/admin/inventory/dispose" },
        { name: "Truy xuất Lô thuốc", href: "/admin/inventory/lot-tracking" },
      ]
    },
    { name: "Nhật ký hệ thống (Audit Logs)", href: "/admin/audit-logs", icon: <ShieldCheck size={20} /> },
    { name: "Lưu trữ Y tế 50 năm", href: "/admin/data-retention", icon: <Database size={20} /> },
    { name: "Cấu hình hệ thống", href: "/admin/settings", icon: <Settings size={20} /> },
  ];

  return <BaseDashboardLayout navItems={adminNavItems} userRole="admin" />;
}

