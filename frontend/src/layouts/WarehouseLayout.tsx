import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, PackageSearch, Settings, Sparkles, ShieldCheck, Link2, FileText } from "lucide-react";

export function WarehouseLayout() {
  const warehouseNavItems = [
    { name: "Tổng quan", href: "/warehouse", icon: <LayoutDashboard size={20} /> },
    { 
      name: "Quản lý Kho tổng", 
      icon: <PackageSearch size={20} />,
      subItems: [
        { name: "Sơ đồ kho", href: "/warehouse/inventory/map" },
        { name: "Giám sát Nhiệt độ & Độ ẩm kho", href: "/warehouse/inventory/telemetry" },
        { name: "Tổng quan kho", href: "/warehouse/inventory" },
        { name: "Quản trị Nhập / Xuất", href: "/warehouse/inventory/import" },
        { name: "Biên bản kiểm kê", href: "/warehouse/inventory/checks" },
        { name: "Lịch sử hủy thuốc", href: "/warehouse/inventory/dispose" },
        { name: "Truy xuất nguồn gốc Lô thuốc", href: "/warehouse/inventory/lot-tracking" },
      ]
    },
    { 
      name: "Danh mục dùng chung", 
      icon: <Settings size={20} />,
      subItems: [
        { name: "Danh mục Dược phẩm", href: "/warehouse/master-data/products" },
        { name: "Hồ sơ Nhà cung cấp", href: "/warehouse/master-data/suppliers" },
      ]
    },
    { name: "Nhật ký hoạt động", href: "/warehouse/audit-logs", icon: <ShieldCheck size={20} /> },
    { name: "Điều phối chuỗi cung ứng", href: "/warehouse/supply-chain", icon: <Link2 size={20} /> },
    { name: "Dự báo nhu cầu nhập hàng", href: "/warehouse/ai-forecast", icon: <Sparkles size={20} /> },
    { name: "Mời báo giá Nhà cung cấp", href: "/warehouse/rfq", icon: <FileText size={20} /> },
    { name: "Trợ lý phân tích vận hành", href: "/warehouse/ai-insights", icon: <Sparkles size={20} /> },
  ];

  return <BaseDashboardLayout navItems={warehouseNavItems} userRole="warehouse" />;
}
