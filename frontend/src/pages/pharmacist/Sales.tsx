import { useState } from "react";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  FileText,
  ScanText,
  Mic,
  Building2,
  Building,
  RotateCcw,
  Stethoscope,
  Keyboard,
} from "lucide-react";
import RetailView from "./components/RetailView";
import PrescriptionView from "./components/PrescriptionView";
import WholesaleView from "./components/WholesaleView";
import ReturnsView from "./components/ReturnsView";
import GPPView from "./components/GPPView";
import OcrHistoryView from "./components/OcrHistoryView";
import VoiceConsultationHistoryView from "./components/VoiceConsultationHistoryView";

// Helper to decode JWT token to extract branchId and duty pharmacist info
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: "BR-001", fullName: "Dược sĩ Trần Thị A" };
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    const savedBranch = localStorage.getItem("branchId") || "";
    return {
      branchId: decoded.branchId || savedBranch || "BR-001",
      fullName: decoded.fullName || "Dược sĩ trực ca",
    };
  } catch {
    return {
      branchId: localStorage.getItem("branchId") || "BR-001",
      fullName: "Dược sĩ trực ca",
    };
  }
}

interface SalesTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const TABS: SalesTab[] = [
  {
    id: "retail",
    label: "Bán Lẻ (POS)",
    icon: ShoppingCart,
    badge: "GS1 Scan",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "prescription",
    label: "Kê Đơn Thuốc (Rx)",
    icon: FileText,
    badge: "e-Rx GPP",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "ocr-history",
    label: "Lịch Sử Quét OCR",
    icon: ScanText,
    badge: "AI Vision",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "ai-consult-history",
    label: "Tư Vấn Giọng Nói AI",
    icon: Mic,
    badge: "Voice STT",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "gpp-sync",
    label: "Liên Thông Dược QG",
    icon: Building2,
    badge: "GPP Sync",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "wholesale",
    label: "Bán Sỉ Đối Tác",
    icon: Building,
  },
  {
    id: "returns",
    label: "Trả Hàng & Hoàn Tiền",
    icon: RotateCcw,
  },
];

export function Sales() {
  const [activeTab, setActiveTab] = useState<string>("retail");
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" | "warning" | "info" }[]
  >([]);

  const branchInfo = getBranchInfoFromToken();

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {/* 1. Clinical POS Top Bar */}
      <div
        className={`bg-white border-b border-slate-200/90 shrink-0 shadow-xs transition-all ${
          activeTab === "retail"
            ? "px-4 py-2 flex items-center justify-between gap-3"
            : "px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        }`}
      >
        {/* Left: Title & Compliance Badges */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
            <ShoppingCart size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Điểm Bán & Kê Đơn Thuốc (GPP POS)
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                GPP Clinical Shield
              </span>
            </div>
            {activeTab !== "retail" && (
              <p className="text-xs text-slate-500 mt-0.5">
                Xuất bán dược phẩm theo chuẩn GPP • Quét mã vạch GS1 • Liên thông Dược Quốc Gia
              </p>
            )}
          </div>
        </div>

        {/* Right: Duty Pharmacist & Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Building2 size={13} className="text-blue-600 shrink-0" />
            <span className="font-semibold">{branchInfo.branchId}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 truncate max-w-[120px]">Kho Trung Tâm</span>
          </div>

          {/* Duty Pharmacist */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900">
            <Stethoscope size={13} className="text-blue-600 shrink-0" />
            <span className="font-semibold">{branchInfo.fullName}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-white/80 px-1 py-0.2 rounded border border-blue-200">
              Trực ca
            </span>
          </div>

          {/* Hotkey Hint */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600 border border-slate-200/80">
            <Keyboard size={13} className="text-slate-400" />
            <span className="font-mono font-bold text-slate-700">F2</span> Tìm
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-slate-700">F4</span> Khách
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-slate-700">F9</span> Thanh toán
          </div>
        </div>
      </div>

      {/* 2. Sleek Clinical Tab Navigation */}
      <div
        className={`bg-white border-b border-slate-200/90 shrink-0 shadow-2xs transition-all ${
          activeTab === "retail"
            ? "px-4 py-1.5 flex items-center justify-between gap-3"
            : "px-6 py-2.5 flex items-center justify-between gap-4"
        }`}
      >
        <div className="flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/70 overflow-x-auto max-w-full scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/70 ring-1 ring-emerald-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Icon
                  size={14}
                  className={`transition-colors ${
                    isActive ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border transition-all ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : tab.badgeColor || "bg-slate-200/70 text-slate-600 border-slate-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side live status indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Phân hệ: <strong className="text-slate-800 font-bold">Chuẩn GPP</strong></span>
        </div>
      </div>

      {/* 3. Main Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 p-4 sm:p-6">
        {activeTab === "retail" && <RetailView showToast={showToast} />}
        {activeTab === "prescription" && <PrescriptionView showToast={showToast} />}
        {activeTab === "ocr-history" && <OcrHistoryView showToast={showToast} />}
        {activeTab === "ai-consult-history" && <VoiceConsultationHistoryView showToast={showToast} />}
        {activeTab === "gpp-sync" && <GPPView showToast={showToast} />}
        {activeTab === "wholesale" && <WholesaleView />}
        {activeTab === "returns" && <ReturnsView showToast={showToast} />}
      </div>

      {/* 4. Custom Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => {
          const isPharmacistConfirm =
            toast.message.includes("Dược sĩ") || toast.message.includes("xác nhận");
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold tracking-wide transition-all duration-300 animate-slide-in-right ${
                toast.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/50"
                  : toast.type === "warning"
                  ? "bg-amber-50 text-amber-800 border-amber-200 shadow-amber-100/50"
                  : isPharmacistConfirm
                  ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 text-emerald-950 border-emerald-300 shadow-emerald-200/60 ring-1 ring-emerald-400/40"
                  : toast.type === "info"
                  ? "bg-indigo-50 text-indigo-900 border-indigo-200 shadow-indigo-100/50"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === "error" ? (
                  <XCircle className="text-rose-500 shrink-0" size={18} />
                ) : toast.type === "warning" ? (
                  <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                ) : isPharmacistConfirm ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck size={14} />
                  </div>
                ) : toast.type === "info" ? (
                  <Sparkles className="text-indigo-600 shrink-0" size={18} />
                ) : (
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                )}
                <span className="normal-case leading-snug">{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1.5 focus:outline-none pointer-events-auto cursor-pointer shrink-0 text-base"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default Sales;
