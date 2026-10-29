import { useState, useEffect } from "react";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
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
  Banknote,
} from "lucide-react";
import RetailView from "./components/RetailView";
import PrescriptionView from "./components/PrescriptionView";
import WholesaleView from "./components/WholesaleView";
import ReturnsView from "./components/ReturnsView";
import GPPView from "./components/GPPView";
import OcrHistoryView from "./components/OcrHistoryView";
import VoiceConsultationHistoryView from "./components/VoiceConsultationHistoryView";
import ShiftHandoverModal from "../../components/pos/ShiftHandoverModal";
import { hrService } from "../../services/hr/hr.service";

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

  // State kiểm tra ca trực & điểm danh GPS theo chuẩn GPP
  const [shiftCheckLoading, setShiftCheckLoading] = useState<boolean>(true);
  const [shiftCheckedIn, setShiftCheckedIn] = useState<boolean>(true);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [isHandoverOpen, setIsHandoverOpen] = useState<boolean>(false);

  const verifyShiftStatus = async () => {
    setShiftCheckLoading(true);
    try {
      const res: any = await hrService.getMyCurrentShift();
      const isAllowed = !!res?.isCheckedIn && !res?.isCompleted && !res?.isHandoverSubmitted;
      setShiftCheckedIn(isAllowed);
      setShiftInfo(res);
    } catch (err) {
      console.warn("Could not verify shift status:", err);
      // Quy chuẩn GPP: Fail-closed, khóa quyền bán hàng khi không xác thực được ca trực
      setShiftCheckedIn(false);
    } finally {
      setShiftCheckLoading(false);
    }
  };

  useEffect(() => {
    verifyShiftStatus();
  }, []);

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
      {/* Cảnh báo tuân thủ GPP khi chưa vào ca hoặc chưa điểm danh GPS */}
      {!shiftCheckLoading && !shiftCheckedIn && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between gap-4 text-rose-950 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700 shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-900">
                {shiftInfo?.isHandoverSubmitted
                  ? "Phiên bán hàng POS đã đóng: Ca trực đã nộp biên bản bàn giao ca"
                  : "Cảnh báo GPP: Chưa đến ca làm việc hoặc chưa điểm danh"}
              </p>
              <p className="text-xs text-rose-700 truncate">
                {shiftInfo?.isHandoverSubmitted
                  ? "Biên bản bàn giao ca và đối soát két tiền mặt đã được gửi lên hệ thống. Không thể tạo thêm đơn hàng."
                  : "Chức năng tạo đơn bán lẻ đã bị khóa. Vui lòng sử dụng ứng dụng di động để Check-in GPS vào ca trực trước khi bán hàng."}
              </p>
            </div>
          </div>
          <button
            onClick={verifyShiftStatus}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            Kiểm tra lại
          </button>
        </div>
      )}

      {/* 2. Sleek Clinical Tab Navigation */}
      <div
        className={`bg-white border-b border-slate-200/90 shrink-0 shadow-2xs transition-all ${activeTab === "retail"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${isActive
                  ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/70 ring-1 ring-emerald-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
              >
                <Icon
                  size={14}
                  className={`transition-colors ${isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border transition-all ${isActive
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

        {/* Right side live status indicator & Handover Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsHandoverOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition cursor-pointer"
          >
            <Banknote size={15} />
            <span>Bàn Giao Ca & Chốt Két</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 pl-2 border-l border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Phân hệ: <strong className="text-slate-800 font-bold">Chuẩn GPP</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Main Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0 p-4 sm:p-6">
        {activeTab === "retail" && <RetailView showToast={showToast} isShiftActive={shiftCheckedIn} />}
        {activeTab === "prescription" && <PrescriptionView showToast={showToast} isShiftActive={shiftCheckedIn} />}
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
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold tracking-wide transition-all duration-300 animate-slide-in-right ${toast.type === "error"
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

      {/* 5. Modal Bàn Giao Ca & Chốt Két Tiền Mặt */}
      <ShiftHandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        onSuccess={() => {
          setTimeout(() => {
            verifyShiftStatus();
          }, 800);
        }}
        showToast={showToast}
      />
    </div>
  );
}

export default Sales;
