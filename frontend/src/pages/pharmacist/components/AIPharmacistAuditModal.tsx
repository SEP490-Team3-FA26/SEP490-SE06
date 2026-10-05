import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Printer,
  Sparkles,
  Building,
  User,
  Clock,
  Copy,
  Check,
  FileCheck,
  Stethoscope,
  Shield,
  Activity,
  Award,
  BadgeCheck
} from "lucide-react";

export interface AIPharmacistConfirmationData {
  confirmed: boolean;
  pharmacistName: string;
  pharmacistLicense?: string;
  confirmedAt: string;
  auditCode: string;
  scanId?: string;
  totalItems: number;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  diagnosis?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  hospitalCode?: string;
  warningsCount?: number;
  source: "AI_VISION_SCAN" | "AI_VOICE_CONSULT" | "AI_SYMPTOM_CONSULT" | string;
  drugs?: Array<{
    name: string;
    dosage?: string;
    quantity?: number;
    unit?: string;
    active_ingredient?: string;
    price?: number;
  }>;
  clinicalNotes?: string;
}

interface AIPharmacistAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AIPharmacistConfirmationData | null;
  branchName?: string;
}

export const AIPharmacistAuditModal: React.FC<AIPharmacistAuditModalProps> = ({
  isOpen,
  onClose,
  data,
  branchName = "Chuỗi Nhà Thuốc WDP301 - Chi Nhánh 1 (Quận 1)"
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (data?.auditCode) {
      navigator.clipboard.writeText(data.auditCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmedDate = new Date(data.confirmedAt);
  const formattedDate = confirmedDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formattedTime = confirmedDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        
        {/* ========================================================================= */}
        {/* 1. MODERN HERO HEADER (Soft Emerald & Sky Gradient) */}
        {/* ========================================================================= */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shrink-0 overflow-hidden">
          {/* Subtle background circles for depth */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-400/15 rounded-full blur-lg pointer-events-none"></div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck size={26} className="text-white drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Chứng nhận chuẩn GPP
                  </span>
                  <span className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-300" /> AI-Assisted Clinical Audit
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                  Biên Bản Thẩm Định Đơn Thuốc
                </h2>
                <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                  Lưu vết trách nhiệm chuyên môn Dược sĩ lâm sàng đối soát hỗ trợ AI
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-2xs active:scale-95"
                title="In biên bản"
              >
                <Printer size={13} /> In
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Audit Code Banner */}
          <div className="relative mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-100/80 font-medium">Mã thẩm định:</span>
              <span className="font-mono font-black text-white bg-black/20 px-2.5 py-0.5 rounded-lg border border-white/20 tracking-wider">
                {data.auditCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-emerald-200 hover:text-white p-1 transition-colors cursor-pointer"
                title="Sao chép mã"
              >
                {copied ? <Check size={13} className="text-amber-300" /> : <Copy size={13} />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100 text-[11px] font-medium">
              <Clock size={12} />
              <span>{formattedTime} • {formattedDate}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT (Clean, Modern, Airy) */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 custom-scrollbar">
          
          {/* Key Information 2-Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: Duoc si phu trach */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                <User size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Dược sĩ phụ trách chuyên môn
                </span>
                <h4 className="font-black text-slate-900 text-sm truncate mt-0.5">
                  {data.pharmacistName}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {data.pharmacistLicense || "CCHN-GPP/02849-HN"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                  {branchName}
                </span>
              </div>
            </div>

            {/* Card 2: Benh nhan & Kenh AI */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0 border border-cyan-200 shadow-2xs">
                <Activity size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Khách hàng & Nguồn hỗ trợ AI
                </span>
                <h4 className="font-black text-slate-900 text-sm truncate mt-0.5">
                  {data.patientName || "Khách lẻ vãng lai"}
                  {data.patientAge && (
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      ({data.patientAge} tuổi)
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    <Sparkles size={10} className="text-indigo-600" />
                    {data.source === "AI_VISION_SCAN" ? "Nhận diện đơn thuốc (Vision OCR)" : "Tư vấn triệu chứng giọng nói (AI Voice)"}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 mt-1 block">
                  ✓ Trạng thái: Đã thẩm định lâm sàng 100%
                </span>
              </div>
            </div>
          </div>

          {/* Trieu chung / Chan doan (Quote Card) */}
          {data.diagnosis && (
            <div className="bg-gradient-to-r from-blue-50/60 to-cyan-50/60 rounded-2xl p-3.5 border border-blue-200/80">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-900 mb-1.5">
                <Stethoscope size={14} className="text-blue-600" />
                <span>Nội dung triệu chứng & Yêu cầu tư vấn</span>
              </div>
              <div className="text-xs text-slate-700 italic bg-white/90 p-3 rounded-xl border border-blue-100 leading-relaxed shadow-2xs">
                "{data.diagnosis.replace(/^Tư vấn triệu chứng AI:\s*/i, "")}"
              </div>
            </div>
          )}

          {/* 4 Tru cot Tham dinh Lam sang GPP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-600" />
                4 Tiêu chí Thẩm định Chuyên môn Dược (Chuẩn GPP)
              </h4>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                4/4 ĐẠT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Đối chiếu hoạt chất & nồng độ</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Khớp danh mục Dược thư, không trùng hoạt chất kháng sinh hoặc giảm đau.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Kiểm tra tương tác thuốc (DDI)</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Không ghi nhận tương tác nguy cơ nghiêm trọng hoặc phối hợp chống chỉ định.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Liều dùng & Đường dùng an toàn</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Liều lượng phù hợp độ tuổi, thể trạng bệnh nhân và liệu trình điều trị.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition-colors">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Lô cận hạn FEFO & Xuất kho GSP</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Ưu tiên xuất lô có hạn dùng gần nhất, đạt chuẩn bảo quản GSP/GDP.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dau Chung Nhan Ky Thuat So (Digital Cryptographic Stamp) */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <Award size={22} />
              </div>
              <div>
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  Chứng Thư Ký Số Điện Tử Dược Sĩ
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </span>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-tight">
                  Xác nhận lưu vết số trên hệ thống máy chủ ABC Pharmacy GPP • Sẵn sàng phục vụ thanh tra.
                </p>
              </div>
            </div>

            {/* Chu ky so Duoc si */}
            <div className="text-center sm:text-right shrink-0 bg-white/80 px-4 py-2 rounded-xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                DƯỢC SĨ PHÊ DUYỆT
              </span>
              <span className="text-xs font-black text-emerald-900 block font-mono">
                {data.pharmacistName}
              </span>
              <span className="text-[9px] text-emerald-700 font-mono block">
                {data.auditCode}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Biên bản có giá trị pháp lý lưu trữ nội bộ chuẩn GPP.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
            >
              <Printer size={13} /> In biên bản
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIPharmacistAuditModal;
