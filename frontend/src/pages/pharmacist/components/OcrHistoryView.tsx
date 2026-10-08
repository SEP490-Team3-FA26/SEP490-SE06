import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  User,
  Building,
  Calendar,
  Layers,
  ZoomIn,
  X,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Clock,
  Tag,
  Stethoscope,
  Info,
} from 'lucide-react';
import { usePrescriptionOcrHistory } from '../../../hooks/usePrescriptionOcrHistory';
import { PrescriptionOcrLogItem } from '../../../services/ai/aiClinical.service';

interface OcrHistoryViewProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const OcrHistoryView: React.FC<OcrHistoryViewProps> = ({ showToast }) => {
  const {
    logs,
    total,
    loading,
    selectedBranch,
    setSelectedBranch,
    selectedStatus,
    setSelectedStatus,
    searchKeyword,
    setSearchKeyword,
    selectedLog,
    setSelectedLog,
    refetch,
  } = usePrescriptionOcrHistory();

  // Image lightbox state
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);

  // Computed metrics
  const totalScans = total || logs.length;
  const reviewedCount = logs.filter((l) => l.status === 'REVIEWED' || l.status === 'DISPENSED').length;
  const dispensedCount = logs.filter((l) => l.status === 'DISPENSED').length;
  const adjustedCount = logs.filter((l) => l.hasAdjustments).length;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              UC-69 • GPP Audit
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Sparkles size={13} className="text-amber-500" /> AI Vision Multimodal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Lịch Sử Quét Đơn Thuốc OCR & Đối Soát Lâm Sàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Lưu vết tự động hình ảnh hóa đơn, kết quả bóc tách AI và toàn bộ điều chỉnh chuyên môn của Dược sĩ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={loading}
            aria-label="Refresh OCR history list"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn Quét</p>
            <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">{totalScans}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Thẩm Định</p>
            <p className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1">{reviewedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Có Điều Chỉnh</p>
            <p className="text-2xl font-black text-amber-700 font-mono tabular-nums mt-1">{adjustedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Xuất Bán (POS)</p>
            <p className="text-2xl font-black text-sky-700 font-mono tabular-nums mt-1">{dispensedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã quét, Mã GPP, Tên bệnh nhân, Bác sĩ kê đơn..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Toàn bộ chi nhánh</option>
            <option value="BR-001">Chi nhánh 1 (Quận 1)</option>
            <option value="BR-002">Chi nhánh 2 (Bình Thạnh)</option>
            <option value="CENTRAL_WH">Kho Trung Tâm GSP</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SCANNED">Mới quét (Chờ đối soát)</option>
            <option value="REVIEWED">Đã thẩm định GPP</option>
            <option value="DISPENSED">Đã xuất bán đơn hàng</option>
          </select>
        </div>
      </div>

      {/* 4. Main Records Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="p-3.5 pl-5">Ảnh Đơn Gốc</th>
                <th className="p-3.5">Mã Quét & Ngày Giờ</th>
                <th className="p-3.5">Bệnh Nhân & Bác Sĩ</th>
                <th className="p-3.5">Khoản Mục Thuốc</th>
                <th className="p-3.5">Độ Tin Cậy AI</th>
                <th className="p-3.5">Trạng Thái</th>
                <th className="p-3.5">Dược Sĩ Thẩm Định</th>
                <th className="p-3.5 pr-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Đang tải lịch sử quét đơn OCR...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Chưa có lịch sử quét đơn OCR nào</p>
                    <p className="text-xs text-slate-400 mt-1">Các lượt quét đơn thuốc bằng AI sẽ tự động lưu vết tại đây</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const hasImage = log.imageUrls && log.imageUrls.length > 0;
                  const firstThumb = hasImage ? log.imageUrls[0] : '';
                  const totalItems = log.rawExtractedItems?.length || 0;
                  const formattedDate = new Date(log.createdAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={log.scanId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="p-3.5 pl-5">
                        {hasImage ? (
                          <div
                            onClick={() => setActiveImageZoom(firstThumb)}
                            className="relative group w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer shadow-2xs shrink-0"
                            title="Bấm để phóng to ảnh hóa đơn gốc"
                          >
                            <img
                              src={firstThumb}
                              alt="Đơn thuốc"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </div>
                            {log.imageUrls.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] font-bold px-1 rounded-tl-md">
                                +{log.imageUrls.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                            Không ảnh
                          </div>
                        )}
                      </td>

                      {/* Scan ID & Time */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-800 text-xs">{log.scanId}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock size={11} /> {formattedDate}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {log.branchId}
                        </div>
                      </td>

                      {/* Patient & Doctor */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{log.patient?.name || 'Khách vãng lai'}</span>
                          {log.patient?.age && (
                            <span className="text-slate-400 font-normal">({log.patient.age}t)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Stethoscope size={13} className="text-slate-400" />
                          <span>{log.doctor?.name || 'Bác sĩ điều trị'}</span>
                        </div>
                        {log.doctor?.hospital && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {log.doctor.hospital}
                          </div>
                        )}
                      </td>

                      {/* Extracted Items Count */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Layers size={13} className="text-emerald-600" />
                          <span>{totalItems} khoản mục thuốc</span>
                        </div>
                        {log.hasAdjustments && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            ⚠️ Dược sĩ đã sửa đổi
                          </span>
                        )}
                      </td>

                      {/* Confidence Score */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.round((log.confidenceScore || 0.95) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-emerald-700 text-xs">
                            {Math.round((log.confidenceScore || 0.95) * 100)}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            log.status === 'DISPENSED'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : log.status === 'REVIEWED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {log.status === 'DISPENSED' ? (
                            <>
                              <CheckCircle2 size={12} /> Đã xuất bán
                            </>
                          ) : log.status === 'REVIEWED' ? (
                            <>
                              <ShieldCheck size={12} /> Đã thẩm định
                            </>
                          ) : (
                            <>
                              <Clock size={12} /> Chờ đối soát
                            </>
                          )}
                        </span>
                        {log.orderCode && (
                          <div className="font-mono text-[10px] text-sky-700 font-bold mt-1">
                            Đơn: #{log.orderCode}
                          </div>
                        )}
                      </td>

                      {/* Pharmacist Reviewer */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 text-xs">
                          {log.pharmacistInfo?.name || 'Chưa phân công'}
                        </div>
                        {log.auditCode && (
                          <div className="font-mono text-[11px] text-emerald-700 font-extrabold mt-0.5 flex items-center gap-1">
                            <ShieldCheck size={12} /> {log.auditCode}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Eye size={13} />
                          <span>Đối chiếu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SIDE-BY-SIDE INSPECTION & TRACEABILITY MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Đối Soát Lâm Sàng GPP
                    </span>
                    <span className="text-xs text-emerald-100 font-mono font-bold">
                      {selectedLog.scanId}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                    Hồ Sơ Quét Đơn Thuốc & Lưu Vết Dược Sĩ
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Patient & Doctor Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Thông tin Bệnh nhân</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedLog.patient?.name || 'Khách vãng lai'}
                    {selectedLog.patient?.age && ` (${selectedLog.patient.age} tuổi)`} - {selectedLog.patient?.gender || 'N/A'}
                  </div>
                  <div className="text-slate-600 mt-1">
                    <strong>Chẩn đoán:</strong> {selectedLog.patient?.diagnosis || 'Theo chỉ định của bác sĩ'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Bác sĩ & Bệnh viện</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedLog.doctor?.name || 'Bác sĩ điều trị'}
                  </div>
                  <div className="text-slate-600 mt-1">
                    <strong>Cơ sở:</strong> {selectedLog.doctor?.hospital || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Uploaded Images Strip */}
              {selectedLog.imageUrls && selectedLog.imageUrls.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText size={14} /> Ảnh Hóa Đơn / Đơn Thuốc Đã Lưu Lại ({selectedLog.imageUrls.length} ảnh)
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {selectedLog.imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageZoom(url)}
                        className="relative group w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <img src={url} alt={`Ảnh đơn ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn size={14} /> Phóng to
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Columns */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Đối Chiếu: AI Quét Ban Đầu vs Dược Sĩ Đã Chỉnh Sửa</span>
                  {selectedLog.hasAdjustments && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Có sai khác do Dược sĩ điều chỉnh
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Original AI Extracted Items */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-emerald-600" /> Kết Quả AI Quét Ban Đầu
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Độ tin cậy: {Math.round((selectedLog.confidenceScore || 0.95) * 100)}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(selectedLog.rawExtractedItems || []).map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.generic_name && (
                            <div className="text-[11px] text-slate-500">Hoạt chất: {item.generic_name}</div>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-slate-600">
                            <span>SL: <strong>{item.quantity}</strong> {item.unit || 'Hộp'}</span>
                            <span className="italic text-[11px] text-slate-500">{item.dosage}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Pharmacist Adjusted Items */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-3">
                      <span className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" /> Dược Sĩ Đã Thẩm Định / Chỉnh Sửa
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        {selectedLog.pharmacistAdjustedItems?.length || 0} mục xác nhận
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(selectedLog.pharmacistAdjustedItems || []).map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs text-xs">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.active_ingredient && (
                            <div className="text-[11px] text-slate-500">Hoạt chất: {item.active_ingredient}</div>
                          )}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-slate-600">
                            <span>SL: <strong className="text-emerald-700 font-mono">{item.quantity}</strong> {item.unit || 'Hộp'}</span>
                            <span className="italic text-[11px] text-slate-500">{item.dosage}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* GPP Confirmation Stamp */}
              {selectedLog.auditCode && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-800 font-black text-sm">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      Biên Bản Thẩm Định GPP Hợp Lệ
                    </div>
                    <div className="text-slate-600 mt-1">
                      Dược sĩ phụ trách: <strong>{selectedLog.pharmacistInfo?.name || 'Dược sĩ'}</strong> (CCHN: {selectedLog.pharmacistInfo?.license || 'CCHN-GPP'})
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mã Duyệt Lâm Sàng</span>
                    <span className="font-mono font-black text-emerald-700 text-sm bg-white px-2.5 py-1 rounded-lg border border-emerald-300 inline-block mt-0.5">
                      {selectedLog.auditCode}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. IMAGE LIGHTBOX VIEWER */}
      {activeImageZoom && (
        <div
          onClick={() => setActiveImageZoom(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={activeImageZoom} alt="Phóng to đơn thuốc" className="w-full h-full object-contain max-h-[85vh]" />
            <button
              onClick={() => setActiveImageZoom(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrHistoryView;
