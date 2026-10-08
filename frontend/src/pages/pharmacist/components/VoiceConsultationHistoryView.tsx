import React, { useState } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Clock,
  User,
  ShoppingBag,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Headphones,
  FileText,
  X,
  Repeat,
} from 'lucide-react';
import { useVoiceConsultationHistory } from '../../../hooks/useVoiceConsultationHistory';
import { ConsultationAudioRecordItem } from '../../../services/ai/aiClinical.service';

interface VoiceConsultationHistoryViewProps {
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const VoiceConsultationHistoryView: React.FC<VoiceConsultationHistoryViewProps> = ({ showToast }) => {
  const {
    consultations,
    total,
    loading,
    selectedBranch,
    setSelectedBranch,
    selectedStatus,
    setSelectedStatus,
    searchKeyword,
    setSearchKeyword,
    activeRecord,
    setActiveRecord,
    isPlaying,
    currentTime,
    duration,
    playAudio,
    stopAudio,
    seekAudio,
    refetch,
  } = useVoiceConsultationHistory();

  // Selected consultation for deep traceability inspection
  const [inspectRecord, setInspectRecord] = useState<ConsultationAudioRecordItem | null>(null);

  // Computed metrics
  const totalConsultations = total || consultations.length;
  const agreedCount = consultations.filter((c) => c.pharmacistAgreement).length;
  const orderedCount = consultations.filter((c) => c.orderCode || c.status === 'ORDERED').length;

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
              UC-70 • Voice Audit
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Headphones size={13} className="text-teal-600" /> Whisper STT & RAG Phác Đồ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Quản Lý Lịch Sử Ghi Âm Tư Vấn & Truy Vết Quyết Định
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Hỗ trợ khách offline tại quầy: truy vết đơn thuốc AI gợi ý, quyết định của Dược sĩ và đồng bộ với đơn hàng
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={loading}
            aria-label="Refresh voice consultation list"
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
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Bản Ghi Âm</p>
            <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">{totalConsultations}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Mic size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dược Sĩ Xác Nhận GPP</p>
            <p className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1">{agreedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã Đồng Bộ Đơn Hàng</p>
            <p className="text-2xl font-black text-sky-700 font-mono tabular-nums mt-1">{orderedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Cam Kết</p>
            <p className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
              {totalConsultations > 0 ? Math.round((agreedCount / totalConsultations) * 100) : 100}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* 3. Global Audio Player Bar (When a recording is playing) */}
      {activeRecord && (
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 rounded-2xl shadow-lg border border-teal-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => playAudio(activeRecord)}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition shadow-md shrink-0 cursor-pointer active:scale-95"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Đang phát hội thoại
                </span>
                <span className="font-mono text-xs text-slate-300 truncate">{activeRecord.consultationId}</span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-sm mt-0.5">
                "{activeRecord.transcription}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Waveform Simulation Animation */}
            <div className="flex items-center gap-1 h-5 shrink-0">
              {[40, 75, 55, 90, 60, 100, 45, 80, 50, 70].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 bg-emerald-400 rounded-full transition-all duration-200 ${
                    isPlaying ? 'animate-pulse' : 'opacity-40'
                  }`}
                  style={{ height: isPlaying ? `${h}%` : '25%' }}
                />
              ))}
            </div>

            {/* Time Indicator */}
            <span className="font-mono text-xs text-slate-300 tabular-nums">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration || 15)}
            </span>

            {/* Close / Stop Button */}
            <button
              onClick={stopAudio}
              aria-label="Stop audio playback"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã phiên, Lời thoại khách hàng, Mã duyệt GPP..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Toàn bộ chi nhánh</option>
            <option value="BR-001">Chi nhánh 1 (Quận 1)</option>
            <option value="BR-002">Chi nhánh 2 (Bình Thạnh)</option>
            <option value="CENTRAL_WH">Kho Trung Tâm GSP</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="RECORDED">Mới ghi âm</option>
            <option value="CONFIRMED">Dược sĩ đã chốt đơn</option>
            <option value="ORDERED">Đã tạo đơn hàng POS</option>
          </select>
        </div>
      </div>

      {/* 5. Main Consultation Records Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="p-3.5 pl-5">Ghi Âm & Mã Phiên</th>
                <th className="p-3.5">Lời Thoại Triệu Chứng (Whisper STT)</th>
                <th className="p-3.5">AI Gợi Ý Ban Đầu</th>
                <th className="p-3.5">Quyết Định Của Dược Sĩ</th>
                <th className="p-3.5">Cam Kết GPP</th>
                <th className="p-3.5">Đơn Hàng</th>
                <th className="p-3.5 pr-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && consultations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Đang tải lịch sử ghi âm tư vấn...</span>
                  </td>
                </tr>
              ) : consultations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Headphones size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Chưa có bản ghi âm tư vấn nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Các cuộc tư vấn ghi âm offline tại quầy POS sẽ tự động lưu vết tại đây
                    </p>
                  </td>
                </tr>
              ) : (
                consultations.map((item) => {
                  const isCurrentActive = activeRecord?.consultationId === item.consultationId;
                  const formattedDate = new Date(item.createdAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const aiDrugsCount = item.aiOriginalSuggestion?.recommended_drugs?.length || 0;
                  const pharmacistDrugsCount = item.pharmacistFinalDecision?.selectedDrugs?.length || 0;

                  return (
                    <tr key={item.consultationId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Play Audio Button & ID */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => playAudio(item)}
                            aria-label="Play recording"
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-95 ${
                              isCurrentActive && isPlaying
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
                            }`}
                          >
                            {isCurrentActive && isPlaying ? (
                              <Pause size={15} />
                            ) : (
                              <Play size={15} className="ml-0.5" />
                            )}
                          </button>
                          <div>
                            <div className="font-mono font-bold text-slate-800 text-xs">{item.consultationId}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {formattedDate}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">{item.branchId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Customer Transcription */}
                      <td className="p-3.5 max-w-xs">
                        <p className="text-xs text-slate-700 italic line-clamp-2" title={item.transcription}>
                          "{item.transcription || 'Không có lời thoại'}"
                        </p>
                      </td>

                      {/* AI Original Recommendation */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Sparkles size={12} className="text-amber-500" />
                          <span>{aiDrugsCount} thuốc gợi ý</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {item.aiOriginalSuggestion?.diagnosis || 'Tư vấn triệu chứng'}
                        </div>
                      </td>

                      {/* Pharmacist Final Decision */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <ShieldCheck size={13} className="text-emerald-600" />
                          <span>{pharmacistDrugsCount} thuốc thực tế</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          DS. {item.pharmacistInfo?.name || 'Dược sĩ'}
                        </div>
                      </td>

                      {/* Pharmacist Agreement Checkbox */}
                      <td className="p-3.5">
                        {item.pharmacistAgreement ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={12} /> Đã cam kết GPP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={12} /> Chưa cam kết
                          </span>
                        )}
                        {item.auditCode && (
                          <div className="font-mono text-[10px] text-emerald-700 font-bold mt-1">
                            {item.auditCode}
                          </div>
                        )}
                      </td>

                      {/* Synchronized Order */}
                      <td className="p-3.5">
                        {item.orderCode ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-mono font-bold">
                            <ShoppingBag size={12} /> #{item.orderCode}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa tạo đơn</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => setInspectRecord(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <span>Truy vết</span>
                          <ChevronRight size={13} />
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

      {/* 6. SIDE-BY-SIDE TRACEABILITY MODAL */}
      {inspectRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Headphones size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Truy Vết Hội Thoại & Đơn Thuốc
                    </span>
                    <span className="font-mono text-xs text-teal-100 font-bold">
                      {inspectRecord.consultationId}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                    Hồ Sơ Tư Vấn Quầy Offline & Đối Soát Ra Quyết Định
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setInspectRecord(null)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Audio playback banner */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => playAudio(inspectRecord)}
                    aria-label="Play recording in modal"
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                  >
                    {activeRecord?.consultationId === inspectRecord.consultationId && isPlaying ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} className="ml-0.5" />
                    )}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Volume2 size={14} /> Bản ghi âm gốc cuộc thoại quầy thuốc
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Thời lượng: {inspectRecord.audioDuration || 15} giây • Chi nhánh {inspectRecord.branchId}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Ngày ghi nhận</span>
                  <span className="text-xs text-slate-300 font-mono">
                    {new Date(inspectRecord.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Customer Voice Transcript Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Mic size={12} className="text-teal-600" /> Văn Bản Bóc Tách Giọng Nói (Whisper STT)
                </span>
                <p className="text-sm font-medium text-slate-800 italic mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  "{inspectRecord.transcription}"
                </p>
              </div>

              {/* Side-by-Side Traceability Comparison */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Đối Soát Chi Tiết: Gợi Ý Của AI vs Quyết Định Của Dược Sĩ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: AI Recommendation */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-500" /> AI Đề Xuất Ban Đầu
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {inspectRecord.aiOriginalSuggestion?.recommended_drugs?.length || 0} thuốc
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(inspectRecord.aiOriginalSuggestion?.recommended_drugs || []).map((drug, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
                          <div className="font-bold text-slate-900">{drug.name}</div>
                          {drug.active_ingredient && (
                            <div className="text-[11px] text-slate-500">Hoạt chất: {drug.active_ingredient}</div>
                          )}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-600 flex items-center justify-between">
                            <span>Liều dùng: {drug.dosage || 'Theo nhãn'}</span>
                          </div>
                          {drug.reason && (
                            <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              Lý do: {drug.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Pharmacist Final Decision */}
                  <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-200">
                    <div className="flex items-center justify-between border-b border-teal-200 pb-2 mb-3">
                      <span className="font-bold text-xs text-teal-800 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-teal-600" /> Dược Sĩ Ra Quyết Định Thực Tế
                      </span>
                      <span className="text-[10px] font-bold text-teal-700">
                        {inspectRecord.pharmacistFinalDecision?.selectedDrugs?.length || 0} thuốc đã chọn
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(inspectRecord.pharmacistFinalDecision?.selectedDrugs || []).map((drug, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{drug.name}</span>
                            {drug.isAlternative && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Repeat size={10} /> Đổi thay thế
                              </span>
                            )}
                          </div>
                          {drug.active_ingredient && (
                            <div className="text-[11px] text-slate-500">Hoạt chất: {drug.active_ingredient}</div>
                          )}
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-600 flex items-center justify-between">
                            <span>SL: <strong className="text-teal-700">{drug.quantity || 1}</strong> {drug.unit || 'Hộp'}</span>
                            <span className="text-[11px] text-slate-500">{drug.dosage}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pharmacist Clinical Responsibility & Order Sync Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-emerald-900 text-sm">
                        Đã Cam Kết Trách Nhiệm Chuyên Môn Dược Sĩ (GPP)
                      </span>
                      <p className="text-[11px] text-emerald-700">
                        Dược sĩ: <strong>{inspectRecord.pharmacistInfo?.name || 'Dược sĩ trực quầy'}</strong> (Số CCHN: {inspectRecord.pharmacistInfo?.license || 'CCHN-GPP/02849-HN'})
                      </p>
                    </div>
                  </div>

                  {inspectRecord.auditCode && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Mã Duyệt GPP</span>
                      <span className="font-mono font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 inline-block mt-0.5">
                        {inspectRecord.auditCode}
                      </span>
                    </div>
                  )}
                </div>

                {inspectRecord.orderCode && (
                  <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShoppingBag size={14} className="text-sky-600" />
                      Đồng bộ đơn hàng bán lẻ:
                    </span>
                    <span className="font-mono font-black text-sky-800 bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-300">
                      Mã Đơn #{inspectRecord.orderCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setInspectRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceConsultationHistoryView;
