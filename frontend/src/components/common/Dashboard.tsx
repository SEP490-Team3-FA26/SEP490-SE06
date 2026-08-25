import { ReactNode, useState, useEffect } from "react";
import {
  Users,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  Package,
  Building2,
  AlertTriangle,
  ChevronRight,
  Clock,
  RotateCcw,
  ShoppingCart,
  ScanBarcode,
  History,
  ArrowRightLeft,
  Search,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  CheckCircle2,
  Boxes,
  Percent,
  BrainCircuit,
  Eye,
  PlusCircle,
  ExternalLink,
  Layers,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { medicineService } from "../../services/inventory/medicine.service";
import { useSocket } from "../../hooks/useSocket";

export function DashboardHome() {
  const [role, setRole] = useState("admin");
  const [stats, setStats] = useState<any>(null);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("month");

  const { isConnected, onEvent, offEvent } = useSocket();

  useEffect(() => {
    setRole(localStorage.getItem("userRole") || "admin");
  }, []);

  const fetchRealData = async () => {
    if (role === "warehouse" || role === "admin" || role === "head_branch" || role === "branch") {
      setLoading(true);
      try {
        const [statsData, lowStockData, expiringData] = await Promise.all([
          medicineService.getMedicineStats().catch(() => null),
          medicineService.getLowStockReport().catch(() => []),
          medicineService.getExpirationReport().catch(() => []),
        ]);
        setStats(statsData);
        setLowStockList(lowStockData || []);
        setExpiringList(expiringData || []);
      } catch (error) {
        console.error("Error fetching dashboard real data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRealData();
  }, [role]);

  // Real-time update for Dashboard
  useEffect(() => {
    const handleDashboardUpdate = (data: any) => {
      console.log('Dashboard updated event received:', data);
      fetchRealData();
    };

    onEvent('broadcast.dashboard_updated', handleDashboardUpdate);

    return () => {
      offEvent('broadcast.dashboard_updated', handleDashboardUpdate);
    };
  }, [onEvent, offEvent, role]);

  const getDashboardData = () => {
    switch (role) {
      case "pharmacist":
        return {
          title: "Bàn thu ngân & Bán hàng (POS)",
          subtitle: "Chào mừng bạn. Hãy kiểm tra các đơn hàng và ca làm việc hiện tại.",
          badge: "Quầy bán hàng trực tiếp",
          stats: [
            { title: "Doanh thu ca hiện tại", value: "8,500,000đ", icon: <ShoppingCart size={20} />, trend: "+2.5M so với ca trước", trendUp: true, subtitle: "Mục tiêu ca: 12.0M (71%)" },
            { title: "Đơn hàng đã thanh toán", value: "32 đơn", icon: <Package size={20} />, trend: "2 hoàn trả", trendUp: false, subtitle: "Giá trị TB: 265,000đ/đơn" },
            { title: "Khách hàng thân thiết", value: "18 khách", icon: <Users size={20} />, trend: "+5 tích điểm mới", trendUp: true, subtitle: "Tỷ lệ quay lại: 68%" },
            { title: "Cảnh báo tương tác thuốc", value: "0 rủi ro", icon: <ShieldCheck size={20} />, trend: "Đã kiểm tra 100%", trendUp: true, subtitle: "AI Safety Shield Active" },
          ],
          actions: [
            {
              id: "retail-pos",
              name: "Bán lẻ (Tạo đơn mới)",
              desc: "Lập hóa đơn nhanh, quét mã vạch và thanh toán PayOS / Tiền mặt",
              icon: <ShoppingCart size={22} />,
              color: "bg-blue-500 text-white",
              bgCard: "hover:border-blue-300",
              badge: "POS Bán Hàng",
              link: "/pharmacist/sales"
            },
            {
              id: "scan-prescription",
              name: "Quét đơn thuốc điện tử",
              desc: "Nhận diện mã đơn quốc gia, phân tích hoạt chất & cảnh báo tương tác AI",
              icon: <ScanBarcode size={22} />,
              color: "bg-emerald-500 text-white",
              bgCard: "hover:border-emerald-300",
              badge: "AI OCR",
              link: "/pharmacist/sales"
            },
            {
              id: "returns",
              name: "Xử lý đổi / trả hàng",
              desc: "Tra cứu hóa đơn cũ, hoàn tiền và cập nhật số lượng tồn lô kho",
              icon: <RotateCcw size={22} />,
              color: "bg-rose-500 text-white",
              bgCard: "hover:border-rose-300",
              badge: "Hoàn trả",
              link: "/pharmacist/sales"
            },
            {
              id: "member-lookup",
              name: "Tra cứu thẻ thành viên",
              desc: "Kiểm tra điểm tích lũy, chiết khấu hạng thẻ và áp dụng voucher",
              icon: <Users size={22} />,
              color: "bg-indigo-500 text-white",
              bgCard: "hover:border-indigo-300",
              badge: "Khách VIP",
              link: "/pharmacist/sales"
            },
          ]
        };
      case "branch":
        return {
          title: "Quản lý Chi nhánh Cơ sở",
          subtitle: "Theo dõi tình hình kinh doanh, doanh số và tồn kho tại chi nhánh của bạn.",
          badge: "Chi nhánh hoạt động",
          stats: [
            { title: "Doanh thu Chi nhánh (Ngày)", value: "45,210,000đ", icon: <DollarSign size={20} />, trend: "+12% so với hôm qua", trendUp: true, subtitle: "Đạt 94% chỉ tiêu ngày" },
            { title: "Đơn hàng trong ngày", value: "142 đơn", icon: <ShoppingCart size={20} />, trend: "+18 đơn mới", trendUp: true, subtitle: "3 đơn đang giao" },
            { title: "Thuốc xuất kho chờ", value: "14 loại", icon: <Package size={20} />, trend: "Cần xử lý gấp", trendUp: false, subtitle: "Dưới ngưỡng an toàn" },
            { title: "Nhân viên trong ca", value: "6 / 6", icon: <Users size={20} />, trend: "100% đúng giờ", trendUp: true, subtitle: "Ca 1: 07:00 - 15:00" },
          ],
          actions: [
            {
              id: "revenue-dashboard",
              name: "Báo cáo Doanh thu",
              desc: "Xem biểu đồ doanh thu theo giờ, theo nhóm thuốc và dược sĩ bán hàng",
              icon: <Activity size={22} />,
              color: "bg-blue-500 text-white",
              bgCard: "hover:border-blue-300",
              badge: "Doanh số",
              link: "/admin/reports"
            },
            {
              id: "branch-stockcheck",
              name: "Kiểm kê kho chi nhánh",
              desc: "Tạo phiên kiểm kê thực tế theo quầy, đối chiếu chênh lệch và điều chỉnh",
              icon: <Search size={22} />,
              color: "bg-amber-500 text-white",
              bgCard: "hover:border-amber-300",
              badge: "Kiểm kê",
              link: "/warehouse/inventory/checks"
            },
            {
              id: "stock-transfer",
              name: "Yêu cầu chuyển kho",
              desc: "Tạo phiếu đề xuất điều chuyển hàng từ kho tổng hoặc chi nhánh lân cận",
              icon: <ArrowRightLeft size={22} />,
              color: "bg-indigo-500 text-white",
              bgCard: "hover:border-indigo-300",
              badge: "Điều phối",
              link: "/warehouse/inventory/export"
            },
            {
              id: "staff-report",
              name: "Báo cáo nhân viên",
              desc: "Đánh giá doanh số từng nhân sự và lịch phân ca làm việc chi nhánh",
              icon: <Users size={22} />,
              color: "bg-emerald-500 text-white",
              bgCard: "hover:border-emerald-300",
              badge: "Nhân sự",
              link: "/admin/employees"
            },
          ]
        };
      case "warehouse":
        return {
          title: "Quản trị Kho vận (Logistics & Inventory)",
          subtitle: "Theo dõi quy trình xuất nhập tồn, điều chuyển nội bộ và cảnh báo HSD.",
          badge: "Trung tâm Logistics",
          stats: stats ? [
            { title: "Tổng loại thuốc", value: String(stats.totalMedicines), icon: <Package size={20} />, trend: "Dược phẩm hoạt động", trendUp: true, subtitle: "Đã chuẩn hóa danh mục" },
            { title: "Tổng tồn kho toàn mạng", value: `${stats.totalStock.toLocaleString('vi-VN')} đv`, icon: <Boxes size={20} />, trend: "Tổng số lượng tồn", trendUp: true, subtitle: "Giá trị tồn: ~1.2B" },
            { title: "Cần bổ sung hàng", value: `${stats.lowStockCount} sắp hết | ${stats.outOfStockCount} hết`, icon: <AlertTriangle size={20} />, trend: "Dưới mức tối thiểu", trendUp: false, subtitle: "Cần tạo PO bổ sung" },
            { title: "Hạn sử dụng lô", value: `${stats.soonToExpireCount} cận | ${stats.expiredCount} hết hạn`, icon: <Clock size={20} />, trend: "Lô cần xử lý", trendUp: false, subtitle: "AI gợi ý xả hàng" },
          ] : [
            { title: "Tổng loại thuốc", value: "1,240", icon: <Package size={20} />, trend: "Đang tải...", trendUp: true, subtitle: "Dược phẩm hoạt động" },
            { title: "Tổng tồn kho", value: "48,500 đv", icon: <Boxes size={20} />, trend: "Đang tải...", trendUp: true, subtitle: "Giá trị tồn kho" },
            { title: "Cần bổ sung hàng", value: "8 sắp hết", icon: <AlertTriangle size={20} />, trend: "Đang tải...", trendUp: false, subtitle: "Dưới mức an toàn" },
            { title: "Hạn sử dụng lô", value: "12 cận hạn", icon: <Clock size={20} />, trend: "Đang tải...", trendUp: false, subtitle: "Cần kiểm tra" },
          ],
          actions: [
            {
              id: "import-stock",
              name: "Nhập kho & Kiểm định AI",
              desc: "Tạo phiếu nhập từ NCC, quét kiểm đếm số lượng thông minh bằng AI Vision",
              icon: <Package size={22} />,
              color: "bg-blue-500 text-white",
              bgCard: "hover:border-blue-300",
              badge: "Nhập kho",
              link: "/warehouse/inventory/import"
            },
            {
              id: "internal-export",
              name: "Xuất kho điều chuyển",
              desc: "Xuất kho cấp phát cho chi nhánh theo nguyên tắc FIFO chuẩn GPP",
              icon: <ArrowRightLeft size={22} />,
              color: "bg-amber-500 text-white",
              bgCard: "hover:border-amber-300",
              badge: "Xuất kho",
              link: "/warehouse/inventory/export"
            },
            {
              id: "lot-tracking",
              name: "Truy xuất nguồn gốc Lô",
              desc: "Tra cứu vòng đời lô thuốc, nhà cung cấp, lịch sử phân phối và HSD",
              icon: <History size={22} />,
              color: "bg-indigo-500 text-white",
              bgCard: "hover:border-indigo-300",
              badge: "Lot Tracking",
              link: "/warehouse/lot-tracking"
            },
            {
              id: "min-stock-alert",
              name: "Dự báo Nhu cầu & Auto PO",
              desc: "Thuật toán AI tự động gợi ý số lượng đặt hàng và tạo đơn PO nháp",
              icon: <Sparkles size={22} />,
              color: "bg-rose-500 text-white",
              bgCard: "hover:border-rose-300",
              badge: "AI Forecast",
              link: "/warehouse/ai-forecast"
            },
          ]
        };
      case "head_branch":
      case "admin":
      default:
        return {
          title: "Điều hành Hệ thống & Tổng Chi nhánh",
          subtitle: "Giám sát thời gian thực toàn chuỗi: doanh thu, kho vận, phân tích AI và an ninh hệ thống.",
          badge: "Trung tâm Điều hành HQ",
          stats: [
            {
              title: "Doanh thu Toàn Chuỗi (Tháng)",
              value: "3,450,210,000đ",
              icon: <DollarSign size={22} />,
              trend: "+20.4% so với tháng trước",
              trendUp: true,
              subtitle: "Mục tiêu tháng: 4.0 Tỷ (Đạt 86.2%)",
              progress: 86.2,
              color: "from-blue-600 to-indigo-600"
            },
            {
              title: "Đơn hàng & Giao dịch",
              value: "1,428 đơn",
              icon: <ShoppingCart size={22} />,
              trend: "+156 đơn tuần này",
              trendUp: true,
              subtitle: "Tỷ lệ hoàn tất đơn: 98.4%",
              progress: 98.4,
              color: "from-emerald-600 to-teal-600"
            },
            {
              title: "Nhân sự & Chi nhánh",
              value: "48 / 50 Nhân sự",
              icon: <Users size={22} />,
              trend: "8 / 8 Chi nhánh hoạt động",
              trendUp: true,
              subtitle: "2 nhân sự off-shift hôm nay",
              progress: 96,
              color: "from-purple-600 to-pink-600"
            },
            {
              title: "Độ tin cậy AI & An ninh",
              value: "99.8% Ổn định",
              icon: <ShieldCheck size={22} />,
              trend: "0 Bất thường bảo mật",
              trendUp: true,
              subtitle: "12 Cảnh báo kho cần duyệt",
              progress: 99.8,
              color: "from-amber-600 to-orange-600"
            },
          ],
          actions: [
            {
              id: "chain-performance",
              name: "So sánh Hiệu suất Chuỗi",
              desc: "Báo cáo so sánh doanh thu, biên lợi nhuận và tốc độ tăng trưởng của 8 chi nhánh",
              icon: <BarChart3 size={24} />,
              color: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
              badge: "Real-time BI",
              badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
              link: "/admin/reports"
            },
            {
              id: "ai-forecast",
              name: "Dự báo Nhu cầu (AI Forecast)",
              desc: "Mô hình Machine Learning phân tích xu hướng tiêu thụ và tự động tạo đơn PO",
              icon: <Sparkles size={24} />,
              color: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
              badge: "AI Engine",
              badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
              link: "/admin/ai-forecast"
            },
            {
              id: "ai-insights",
              name: "Phân tích Theo Mùa & Dịch bệnh",
              desc: "AI Insights nhận diện biến động dịch bệnh, thời tiết để điều phối kho kịp thời",
              icon: <BrainCircuit size={24} />,
              color: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white",
              badge: "Predictive",
              badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
              link: "/admin/ai-insights"
            },
            {
              id: "supply-chain",
              name: "Chuỗi Cung ứng Toàn chuỗi",
              desc: "Bản đồ nhiệt tồn kho, thuật toán tồn kho an toàn và phát hiện bất thường Z-score",
              icon: <Layers size={24} />,
              color: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white",
              badge: "Supply Chain",
              badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200",
              link: "/admin/supply-chain"
            },
            {
              id: "finance",
              name: "Kế toán & Quản lý Dòng tiền",
              desc: "Sổ quỹ thu chi, chi phí cố định (mặt bằng, lương) và báo cáo lợi nhuận ròng",
              icon: <DollarSign size={24} />,
              color: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
              badge: "Tài chính",
              badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
              link: "/admin/finance"
            },
            {
              id: "approvals",
              name: "Phê duyệt Mua hàng (HQ)",
              desc: "Kiểm tra và duyệt các yêu cầu mua hàng (PR/PO) từ các chi nhánh và kho tổng",
              icon: <FileCheck2 size={24} />,
              color: "bg-gradient-to-br from-teal-500 to-emerald-600 text-white",
              badge: "Phê duyệt",
              badgeColor: "bg-teal-100 text-teal-700 border-teal-200",
              link: "/admin/approvals"
            },
            {
              id: "role-management",
              name: "Quản lý Nhân sự & Phân quyền",
              desc: "Cấu hình tài khoản, phân quyền Role chuyên sâu và quản lý thông tin nhân viên",
              icon: <Users size={24} />,
              color: "bg-gradient-to-br from-slate-600 to-slate-800 text-white",
              badge: "Nhân sự",
              badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
              link: "/admin/employees"
            },
            {
              id: "audit-logs",
              name: "Nhật ký Hệ thống & Audit",
              desc: "Truy vết toàn diện lịch sử thay đổi giá, thao tác người dùng và cảnh báo an ninh",
              icon: <History size={24} />,
              color: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
              badge: "Bảo mật",
              badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
              link: "/admin/audit-logs"
            },
          ]
        };
    }
  };

  const data = getDashboardData();

  const issues = [
    { id: 1, type: "low_stock", item: "Paracetamol 500mg (Hộp 100 viên)", branch: "Kho Tổng (Q.7)", current: 15, min: 100, unit: "Hộp", time: "2 giờ trước" },
    { id: 2, type: "expiring", item: "Amoxicillin 250mg Kháng sinh", branch: "CN1 (Q.1) - Lô AMX-2024", expiryDate: "10/11/2026", time: "Hệ thống AI", days: 76 },
    { id: 3, type: "low_stock", item: "Vitamin C 1000mg Sủi cam", branch: "CN3 (Bình Thạnh)", current: 8, min: 50, unit: "Tuýp", time: "5 giờ trước" },
    { id: 4, type: "expiring", item: "Panadol Extra Đỏ Giảm Đau", branch: "CN2 (Q.2) - Lô PAN-881", expiryDate: "15/12/2026", time: "Hệ thống AI", days: 111 },
  ];

  const displayLowStock = lowStockList.length > 0
    ? lowStockList.slice(0, 6).map((item, index) => ({
      id: item.id || String(index),
      item: item.name || "Thuốc",
      branch: item.branchName || "Kho trung tâm",
      current: item.stock ?? item.stockQuantity ?? 0,
      min: item.minStock ?? item.minStockThreshold ?? 50,
      unit: item.unit || "Hộp",
      status: (item.stock ?? 0) === 0 ? "Hết hàng" : "Sắp hết",
      badgeClass: (item.stock ?? 0) === 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }))
    : issues.filter(i => i.type === 'low_stock').map(i => ({ ...i, badgeClass: "bg-amber-50 text-amber-700 border-amber-200", status: "Sắp hết" }));

  const displayExpiring = expiringList.length > 0
    ? expiringList.slice(0, 6).map((item, index) => ({
      id: item.id || String(index),
      item: item.medicineName || "Thuốc",
      branch: item.batchNo ? `Lô: ${item.batchNo} (${item.unit || 'ĐV'})` : "Lô thuốc",
      expiryDate: item.expDate || item.expiryDate ? new Date(item.expDate || item.expiryDate).toLocaleDateString('vi-VN') : "2026-11-20",
      time: item.status === 'EXPIRED' ? 'Đã hết hạn' : 'Hệ thống AI',
      badgeText: item.status === 'EXPIRED' ? 'Hết hạn' : 'Gần hết hạn',
      badgeClass: item.status === 'EXPIRED' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }))
    : issues.filter(i => i.type === 'expiring').map(i => ({ ...i, badgeText: 'Gần hết hạn', badgeClass: "bg-amber-50 text-amber-700 border-amber-200" }));

  const branchesSummary = [
    { name: "CN1 - Quận 1 (Trần Hưng Đạo)", sales: "18.4M", orders: 64, status: "Hoạt động", score: "99%" },
    { name: "CN2 - Quận 2 (Thảo Điền)", sales: "24.1M", orders: 82, status: "Hoạt động", score: "98%" },
    { name: "CN3 - Bình Thạnh (Điện Biên Phủ)", sales: "15.8M", orders: 51, status: "Hoạt động", score: "97%" },
    { name: "CN4 - Quận 7 (Nguyễn Thị Thập)", sales: "31.2M", orders: 110, status: "Hoạt động", score: "100%" },
  ];

  return (
    <div className="space-y-8 pb-12 p-6 lg:p-8 bg-[#faf8ff] min-h-screen">
      {/* ─── 1. TOP HERO HEADER & SYSTEM STATUS ─── */}
      <div className="bg-gradient-to-r from-white via-white to-blue-50/50 p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0057cd]/10 text-[#0057cd] border border-[#0057cd]/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0057cd] animate-ping inline-block" />
                {data.badge}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {isConnected ? "Real-time Live Sync" : "Đã đồng bộ máy chủ"}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.title}
            </h1>
            <p className="text-slate-500 text-sm max-w-3xl leading-relaxed">
              {data.subtitle}
            </p>
          </div>

          {/* Time & Quick Actions Buttons */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/60">
              <button
                onClick={() => setSelectedPeriod("day")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedPeriod === "day" ? "bg-white text-[#0057cd] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setSelectedPeriod("week")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedPeriod === "week" ? "bg-white text-[#0057cd] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                7 ngày
              </button>
              <button
                onClick={() => setSelectedPeriod("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedPeriod === "month" ? "bg-white text-[#0057cd] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Tháng này
              </button>
            </div>

            <Link
              to="/admin/reports"
              className="px-4 py-2.5 bg-[#0057cd] hover:bg-[#0046a8] text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <TrendingUp size={15} />
              Xem báo cáo chuyên sâu
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE KPI CARDS (HIGH IMPACT) ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-[#0057cd]" />
            Chỉ số Điều hành & Hiệu suất Vận hành
          </h2>
          <span className="text-xs font-semibold text-slate-500">Kỳ báo cáo: Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {data.stats.map((stat: any, i: number) => (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 tracking-wide">{stat.title}</h3>
                  <div className="p-2.5 rounded-2xl bg-slate-50 text-[#0057cd] border border-slate-100 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                </div>

                <div className="text-2xl lg:text-3xl font-black text-slate-900 mb-2 tracking-tight">
                  {stat.value}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-1 font-bold ${stat.trendUp ? "text-emerald-600" : "text-rose-600"}`}>
                    {stat.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stat.trend}
                  </span>
                  {stat.progress && (
                    <span className="font-bold text-slate-400">{stat.progress}%</span>
                  )}
                </div>

                {stat.progress ? (
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stat.color || 'from-[#0057cd] to-blue-400'}`}
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                ) : null}

                {stat.subtitle && (
                  <p className="text-[11px] text-slate-400 font-medium truncate">{stat.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3. FEATURE QUICK NAVIGATION HUB (RICH ACTION TILES) ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Boxes size={14} className="text-[#0057cd]" />
              Trung tâm Chức năng Điều hành (Role-based Hub)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Truy cập nhanh các phân hệ nghiệp vụ quan trọng</p>
          </div>
          <span className="text-xs font-bold text-[#0057cd] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            {data.actions.length} Phân hệ khả dụng
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {data.actions.map((action: any, i: number) => (
            <Link
              key={i}
              to={action.link || "#"}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3.5 rounded-2xl shadow-sm ${action.color} group-hover:scale-105 transition-transform`}>
                    {action.icon}
                  </div>
                  {action.badge && (
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${action.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {action.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0057cd] transition-colors leading-snug">
                    {action.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {action.desc || "Xem chi tiết và thao tác phân hệ nghiệp vụ."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#0057cd] transition-colors">
                <span>Khám phá ngay</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── 4. REAL-TIME HEALTH & ALERT HUB (2-COLUMN CARDS) ─── */}
      {(role !== "pharmacist") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Cảnh Báo Tồn Kho */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[460px]">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Cảnh Báo Tồn Kho & Cần Bổ Sung</h3>
                  <p className="text-[11px] text-slate-500">Thuốc dưới ngưỡng tồn kho an toàn</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                  {lowStockList.length > 0 ? lowStockList.length : issues.filter(i => i.type === 'low_stock').length} mục
                </span>
                <Link to="/warehouse/ai-forecast" className="text-xs font-bold text-[#0057cd] hover:underline flex items-center gap-1">
                  Đặt hàng <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
              {displayLowStock.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-50/80 rounded-2xl transition-colors flex items-start gap-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0 mt-0.5 border border-amber-100">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{alert.item}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${alert.badgeClass}`}>
                        {alert.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <Building2 size={11} className="text-slate-400" />
                      {alert.branch}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="bg-slate-100 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                          Tồn hiện tại: <b className="text-amber-600">{alert.current}</b> / Min: <b>{alert.min}</b> {alert.unit || 'đv'}
                        </span>
                      </div>
                      <Link
                        to="/warehouse/ai-forecast"
                        className="text-[11px] font-bold text-[#0057cd] hover:text-[#0041a8] flex items-center gap-1"
                      >
                        <PlusCircle size={12} /> Tạo PO nháp
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: AI Cảnh Báo Hết Hạn */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[460px]">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Cảnh Báo Lô Thuốc Cận Hạn</h3>
                  <p className="text-[11px] text-slate-500">Giám sát HSD và đề xuất phương án xử lý</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200">
                  {expiringList.length > 0 ? expiringList.length : issues.filter(i => i.type === 'expiring').length} lô
                </span>
                <Link to="/warehouse/lot-tracking" className="text-xs font-bold text-[#0057cd] hover:underline flex items-center gap-1">
                  Tra cứu <ExternalLink size={12} />
                </Link>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
              {displayExpiring.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-50/80 rounded-2xl transition-colors flex items-start gap-4">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl shrink-0 mt-0.5 border border-rose-100">
                    <Clock size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{alert.item}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${alert.badgeClass}`}>
                        {alert.badgeText}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <Building2 size={11} className="text-slate-400" />
                      {alert.branch}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-600 text-[11px] bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                        Hạn dùng: <b className="text-rose-600">{alert.expiryDate}</b>
                      </span>
                      <span className="text-slate-400 italic text-[11px] flex items-center gap-1">
                        <Sparkles size={11} className="text-purple-500" /> {alert.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. CHAIN HEALTH & BRANCH PULSE (BOTTOM WIDGET) ─── */}
      {(role === "admin" || role === "head_branch") && (
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 size={18} className="text-[#0057cd]" />
                Tình hình Hoạt động Các Chi nhánh Trọng điểm
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Giám sát doanh số trong ngày và độ ổn định hệ thống POS từng điểm bán</p>
            </div>
            <Link
              to="/admin/branches"
              className="text-xs font-bold text-[#0057cd] hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              Quản lý toàn bộ 8 chi nhánh <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {branchesSummary.map((b, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-black text-xs">
                    0{idx + 1}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {b.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs line-clamp-1 mb-2">{b.name}</h4>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Doanh số: <b className="text-slate-900">{b.sales}</b></span>
                  <span className="text-slate-500 font-medium">Đơn: <b className="text-[#0057cd]">{b.orders}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp
}: {
  key?: any;
  title: string;
  value: string;
  icon: ReactNode;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        <div className={`p-2.5 rounded-2xl bg-slate-50 text-slate-600`}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{value}</div>
      <div className={`text-xs flex items-center gap-1.5 font-bold ${trendUp ? "text-emerald-700 bg-emerald-50 border border-emerald-100 self-start px-2.5 py-1 rounded-lg" : "text-rose-700 bg-rose-50 border border-rose-100 self-start px-2.5 py-1 rounded-lg"}`}>
        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
  );
}
