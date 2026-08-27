import { useState, useMemo } from "react";
import {
  ShieldCheck, Database, Search, Clock, FileText, CheckCircle2,
  AlertTriangle, Download, Lock, RefreshCw, ChevronRight, Activity,
  Building2, User, Stethoscope, Layers, FileSpreadsheet, Key, Archive
} from "lucide-react";

export function DataRetentionTraceability() {
  const [searchQuery, setSearchQuery] = useState("LOT-DHG-2026");
  const [selectedTier, setSelectedTier] = useState<"ALL" | "HOT" | "WARM" | "COLD">("ALL");
  const [activeTab, setActiveTab] = useState<"TRACEABILITY" | "POLICIES" | "ARCHIVE_VAULT">("TRACEABILITY");
  const [isArchiving, setIsArchiving] = useState(false);
  const [legalHoldEnabled, setLegalHoldEnabled] = useState(false);

  // Mẫu dữ liệu Phả hệ Dòng đời Thuốc 50 năm (End-to-End Traceability Sample)
  const sampleTraceData = {
    batchNo: "LOT-DHG-2026",
    medicineName: "Cao dán Salonpas Diclofenac Patch Hisamitsu (15 gói x 2 miếng)",
    registrationNo: "VD-28491-18",
    manufacturer: "Công ty Cổ phần Dược Hậu Giang (DHG Pharma)",
    manufactureDate: "2024-06-15",
    expiryDate: "2027-06-15",
    gppFacilityCode: "79-001234",
    retentionYears: 50,
    retentionExpiresAt: "2076-08-25",
    storageTier: "HOT",
    immutableHash: "sha256:9f8a3c4e5d6b7a8f1e2c3d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f",
    stages: [
      {
        stage: 1,
        title: "1. Sản Xuất & Nhập Khẩu GDP",
        date: "2024-06-15",
        status: "VERIFIED",
        operator: "Dược Hậu Giang (DHG)",
        docCode: "HD-VAT-009214",
        details: "Lô xuất xưởng đạt tiêu chuẩn GMP-WHO. Hóa đơn đỏ VAT truyền lên CSDL Dược Quốc gia chuẩn GDP."
      },
      {
        stage: 2,
        title: "2. Kiểm Định & Nhập Kho Chuỗi Nhà Thuốc",
        date: "2026-08-25",
        status: "SYNCED_GPP",
        operator: "Thủ kho: Nguyễn Văn An",
        docCode: "DQG-IN-20260825-992143",
        details: "Kiểm tra cảm quan đạt 100%. Nhiệt độ bảo quản GSP < 25°C. Cấp mã biên nhận nhập kho CSDL Dược Quốc gia."
      },
      {
        stage: 3,
        title: "3. Kê Đơn & Chỉ Định Y Khoa",
        date: "2026-08-25",
        status: "PRESCRIBED",
        operator: "BS. Nguyễn Thị Lan (Bệnh viện Đa Khoa)",
        docCode: "RX-99281-HAN",
        details: "Chỉ định giảm đau, kháng viêm đau cơ vai gáy trong 7 ngày (Dán 1 miếng/ngày sau ăn)."
      },
      {
        stage: 4,
        title: "4. Xuất Bán & Lịch Sử Dùng Thuốc Bệnh Nhân (Lưu trữ 50 năm)",
        date: "2026-08-25",
        status: "ACTIVE_RETENTION_50Y",
        operator: "Dược sĩ phụ trách: Trần Thị Mai",
        docCode: "DQG-20260825-644432",
        details: "Bệnh nhân: Nguyễn Văn Test (SĐT: 0912345678). Đã cấp phát và liên thông hóa đơn GPP. Bản ghi lưu trữ vĩnh viễn 50 năm đến 2076."
      }
    ]
  };

  const handleExportArchivePackage = () => {
    const archiveManifest = {
      archive_standard: "HEALTHCARE_DATA_RETENTION_50_YEARS",
      standard_compliance: ["TT_02_2018_TT_BYT", "QD_412_QD_BYT", "FDA_21_CFR_PART_11", "HL7_FHIR_EMR"],
      retention_period_years: 50,
      retention_start_date: new Date().toISOString(),
      retention_end_date: new Date(Date.now() + 50 * 365.25 * 24 * 3600 * 1000).toISOString(),
      facility_code: "79-001234",
      digital_signature_hash: sampleTraceData.immutableHash,
      is_immutable: true,
      legal_hold: legalHoldEnabled,
      payload_records: sampleTraceData
    };

    const blob = new Blob([JSON.stringify(archiveManifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HEALTHCARE_50Y_RETENTION_ARCHIVE_${sampleTraceData.batchNo}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6 lg:p-8 bg-[#faf8ff] overflow-y-auto custom-scrollbar font-sans">
      {/* ─── 1. TOP HERO: MEDICAL DATA RETENTION COMPLIANCE ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden shrink-0">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                CHUẨN LƯU TRỮ Y TẾ: 50 NĂM (EMR & GPP RETENTION)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Lock size={12} /> Bất biến WORM (Write Once, Read Many)
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Quản Trị Lưu Trữ & Truy Xuất Nguồn Gốc Dược Phẩm 50 Năm
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Tuân thủ Luật Dược, Luật Khám chữa bệnh & Quy chế Hồ sơ Bệnh án điện tử Bộ Y tế. Dữ liệu kê đơn, nguồn gốc lô thuốc và hồ sơ bệnh nhân được mã hóa và bảo tồn nguyên vẹn suốt 50 năm.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportArchivePackage}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download size={16} /> Xuất Gói Lưu Trữ 50 Năm (JSON WORM)
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. TIERED STORAGE METRICS CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Tier 1: Hot Tier */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tầng 1: Hot Tier (0 - 2 Năm)</div>
            <div className="text-xl font-black text-slate-900">12,450 <span className="text-xs text-slate-400 font-bold">bản ghi</span></div>
            <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> MongoDB NVMe SSD (Tra cứu 10ms)
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={26} />
          </div>
        </div>

        {/* Tier 2: Warm Tier */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tầng 2: Warm Tier (2 - 10 Năm)</div>
            <div className="text-xl font-black text-slate-900">94,210 <span className="text-xs text-slate-400 font-bold">bản ghi</span></div>
            <div className="text-xs text-indigo-600 font-bold flex items-center gap-1">
              <Archive size={13} /> Compressed S3 Parquet Nén 85%
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Database size={26} />
          </div>
        </div>

        {/* Tier 3: Cold Archive */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tầng 3: Cold Vault (10 - 50 Năm)</div>
            <div className="text-xl font-black text-slate-900">1,280,000 <span className="text-xs text-slate-400 font-bold">bản ghi</span></div>
            <div className="text-xs text-purple-600 font-bold flex items-center gap-1">
              <Lock size={13} /> WORM Glacier Deep Archive
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers size={26} />
          </div>
        </div>

        {/* Integrity Checksum */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toàn vẹn & Chống Giả Mạo</div>
            <div className="text-sm font-black text-slate-800 font-mono">SHA-256 VALIDATED</div>
            <div className="text-[10px] text-slate-400 font-mono">0 vụ phát hiện sai lệch</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center shrink-0">
            <Key size={26} />
          </div>
        </div>
      </div>

      {/* ─── 3. TRACEABILITY SEARCH & GENEALOGY MATRIX ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col p-6 space-y-6">
        {/* Search Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Search size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Trình Tra Cứu Phả Hệ Dòng Đời Thuốc 50 Năm (Batch Traceability Explorer)
              </h2>
              <p className="text-xs text-slate-500">Nhập Số Lô sản xuất, Mã hóa đơn DQG hoặc SĐT bệnh nhân để truy vết 4 chặng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập mã lô (VD: LOT-DHG-2026, DQG-...)"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <button
              onClick={() => {}}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} /> Tra cứu
            </button>
          </div>
        </div>

        {/* Traceability Metadata Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tên Biệt Dược:</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{sampleTraceData.medicineName}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Số Lô / Số Đăng Ký (SĐK):</span>
            <div className="font-mono font-black text-indigo-700 mt-0.5">{sampleTraceData.batchNo} | {sampleTraceData.registrationNo}</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Thời Hạn Lưu Trữ Y Tế:</span>
            <div className="font-bold text-emerald-700 mt-0.5">50 Năm (Đến ngày 25/08/2076)</div>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px]">Mã Băm Bất Biến (SHA-256):</span>
            <div className="font-mono text-[10px] text-slate-600 truncate mt-0.5" title={sampleTraceData.immutableHash}>
              {sampleTraceData.immutableHash.slice(0, 24)}...
            </div>
          </div>
        </div>

        {/* 4-Stage Timeline Matrix */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-indigo-600" />
            Chi Tiết Phả Hệ Dòng Đời Thuốc (4-Stage Genealogy Chain):
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sampleTraceData.stages.map((st) => (
              <div key={st.stage} className="bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                      {st.stage}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {st.status}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-xs leading-snug">{st.title}</h4>
                  <div className="text-[11px] text-slate-400 font-medium">Thời gian: <strong className="text-slate-700">{st.date}</strong></div>
                  <div className="text-[11px] text-slate-400 font-medium">Mã chứng từ: <strong className="font-mono text-indigo-700">{st.docCode}</strong></div>
                  <div className="text-[11px] text-slate-400 font-medium">Thực hiện: <strong className="text-slate-700">{st.operator}</strong></div>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed mt-1">
                    {st.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
