import React from 'react';
import {
  X,
  Banknote,
  ShieldCheck,
  AlertTriangle,
  Coins,
  ClipboardList,
  Check,
  Clock,
  Lock,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  ArrowUpRight,
  Sparkles,
  UserCheck,
  Store,
} from 'lucide-react';
import { useShiftHandover } from '../../hooks/useShiftHandover';
import { DenominationTable } from './DenominationTable';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ShiftHandoverModal({ isOpen, onClose, onSuccess, showToast }: ShiftHandoverModalProps) {
  const {
    loading,
    submitting,
    liveStats,
    salesSyncError,
    openingFloat,
    systemCashSales,
    systemDigitalSales,
    systemOrderCount,
    expectedCashAmount,
    actualCashAmount,
    actualCashInput,
    cashDiscrepancy,
    isBalanced,
    retainedFloat,
    setRetainedFloat,
    safeDropAmount,
    pettyExpenses,
    setPettyExpenses,
    discrepancyReason,
    setDiscrepancyReason,
    showDenomAccordion,
    setShowDenomAccordion,
    counts,
    handleCountChange,
    resetCounts,
    handleActualCashChange,
    handleSyncToExpected,
    showGppAccordion,
    setShowGppAccordion,
    controlledDrugs,
    handleDrugToggle,
    showNotesAccordion,
    setShowNotesAccordion,
    pendingOrdersNote,
    setPendingOrdersNote,
    generalShiftNotes,
    setGeneralShiftNotes,
    incomingPharmacistName,
    setIncomingPharmacistName,
    submitHandover,
    loadData,
  } = useShiftHandover({ isOpen, onSuccess, showToast });

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const success = await submitHandover();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Đóng ca làm việc: {liveStats?.shiftName || 'Ca hiện tại'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Chuẩn GPP
                </span>
              </div>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  Ngày: <strong>{liveStats?.handoverDate || new Date().toLocaleDateString('vi-VN')}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-400" />
                  Dược sĩ: <strong className="text-white">{liveStats?.employeeName || 'Dược sĩ trực'}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Store size={12} className="text-slate-400" />
                  Chi nhánh: <strong className="text-white">{liveStats?.branchId || 'ABC'}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body Modal Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-500">Đang tổng hợp dữ liệu giao dịch và quét két tiền...</p>
            </div>
          ) : (
            <>
              {/* Canh bao neu loi dong bo doanh so tu orders-service */}
              {salesSyncError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-extrabold">Cảnh báo đồng bộ doanh số</p>
                    <p className="text-[11px] font-normal text-amber-800">
                      Không thể kết nối trực tiếp đến Orders Service. Doanh số hiển thị có thể chưa đầy đủ, vui lòng kiểm đếm tiền mặt thực tế cẩn thận trước khi nộp.
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Dau ca & Doanh so trong ca */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">1. Đầu ca</span>
                    <span className="text-xs text-slate-500">• Tiền mặt đầu ca (Float):</span>
                    <strong className="text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {openingFloat.toLocaleString('vi-VN')}₫
                    </strong>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <span>Số đơn hàng hoàn tất:</span>
                    <strong className="text-slate-900">{systemOrderCount} đơn</strong>
                  </div>
                </div>

                {/* 4 the tong quan */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Giao dịch phát sinh trong ca
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* The 1: Tien mat ban le */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <Receipt size={13} className="text-emerald-600" />
                          Tiền mặt bán
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                          +{systemOrderCount}
                        </span>
                      </div>
                      <div className="text-sm font-black text-emerald-700 mt-1">
                        {systemCashSales.toLocaleString('vi-VN')}₫
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Thu trực tiếp tại quầy</div>
                    </div>

                    {/* The 2: Chuyen khoan */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <CreditCard size={13} className="text-indigo-600" />
                          Chuyển khoản
                        </span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                          PayOS/QR
                        </span>
                      </div>
                      <div className="text-sm font-black text-indigo-700 mt-1">
                        {systemDigitalSales.toLocaleString('vi-VN')}₫
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tài khoản ngân hàng</div>
                    </div>

                    {/* The 3: Phieu chi */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
                        <span className="flex items-center gap-1">
                          <ArrowUpRight size={13} className="text-rose-600" />
                          Phiếu chi ca
                        </span>
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-bold">
                          Chi két
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={pettyExpenses === 0 ? '' : pettyExpenses}
                          onChange={(e) => setPettyExpenses(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="0"
                          className="w-full text-xs font-bold text-rose-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 focus:bg-white focus:border-rose-400 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-400 font-bold shrink-0">₫</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Tiền vặt / Tạm ứng quầy</div>
                    </div>

                    {/* The 4: So sach ly thuyet */}
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/90">
                      <div className="flex items-center justify-between text-emerald-900 text-[11px] font-bold">
                        <span>Tiền sổ sách cần có</span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-black">
                          Sổ sách
                        </span>
                      </div>
                      <div className="text-sm font-black text-emerald-950 mt-1">
                        {expectedCashAmount.toLocaleString('vi-VN')}₫
                      </div>
                      <div className="text-[10px] text-emerald-800 mt-0.5">= Đầu ca + Thu - Chi</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Kiem ke thuc te trong ket */}
              <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Coins size={15} className="text-emerald-600" />
                      3. Kiểm kê tiền mặt thực tế trong két
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Nhập số tiền mặt thực tế đang có trong két hoặc bấm &quot;Khớp sổ sách&quot; nếu đã kiểm đúng
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncToExpected}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={13} />
                      Khớp sổ sách ({expectedCashAmount.toLocaleString('vi-VN')}₫)
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDenomAccordion(!showDenomAccordion)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <span>Kê mệnh giá chi tiết</span>
                      {showDenomAccordion ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* O nhap tien & O hien thi lech ket */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-700 mb-1">
                      Tổng tiền mặt thực tế trong két *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={actualCashInput}
                        onChange={(e) => handleActualCashChange(e.target.value)}
                        className="w-full text-lg font-black text-slate-900 bg-white px-3.5 py-2 rounded-lg border-2 border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition pr-10"
                        placeholder="0"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        ₫
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Nhập số tiền đếm được (hệ thống tự tính chênh lệch)
                    </p>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      isBalanced
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : cashDiscrepancy < 0
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wide">
                        Số tiền chênh lệch
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isBalanced
                            ? 'bg-emerald-200 text-emerald-900'
                            : cashDiscrepancy < 0
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {isBalanced ? 'Khớp 100%' : cashDiscrepancy < 0 ? 'Thiếu tiền' : 'Thừa tiền'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-[11px] opacity-80">Thực tế - Sổ sách:</span>
                      <span
                        className={`text-xl font-black ${
                          isBalanced
                            ? 'text-emerald-700'
                            : cashDiscrepancy < 0
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {cashDiscrepancy > 0 ? '+' : ''}
                        {cashDiscrepancy.toLocaleString('vi-VN')}₫
                      </span>
                    </div>

                    <div className="text-[10px] opacity-80 mt-1">
                      {isBalanced
                        ? 'Két tiền hoàn toàn cân bằng với dữ liệu hóa đơn'
                        : cashDiscrepancy < 0
                        ? 'Két bị thiếu so với doanh số POS. Bắt buộc nhập giải trình bên dưới'
                        : 'Két bị dư so với doanh số POS. Không bắt buộc giải trình'}
                    </div>
                  </div>
                </div>

                {/* Bat buoc giai trinh khi am tien */}
                {cashDiscrepancy < 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-black text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Lý do giải trình két bị thiếu hụt (Bắt buộc tối thiểu 10 ký tự) *</span>
                    </label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder="VD: Làm rơi tiền lẻ, hoặc thối nhầm tiền cho khách vãng lai..."
                      className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                    />
                    <div className="flex items-center justify-between text-[10px] text-rose-700">
                      <span>Quy chuẩn kiểm toán GPP yêu cầu lưu vết mọi sai lệch tiền mặt khi hụt két</span>
                      <span>{discrepancyReason.trim().length}/10 ký tự</span>
                    </div>
                  </div>
                )}

                {/* Ghi chu tuy chon khi duong tien */}
                {cashDiscrepancy > 0 && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>Ghi chú tiền dư trong két (Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder="VD: Khách boa tiền thừa không lấy, hoặc tiền thừa ca trước để lại..."
                      className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                    />
                    <div className="text-[10px] text-amber-700">
                      Két dư tiền không bắt buộc giải trình, có thể để trống hoặc ghi chú nếu cần
                    </div>
                  </div>
                )}

                {/* Sub-component DenominationTable */}
                {showDenomAccordion && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                    <DenominationTable
                      counts={counts}
                      onCountChange={handleCountChange}
                      onReset={resetCounts}
                    />
                  </div>
                )}
              </div>

              {/* 3. Phan bo tien mat ket ca */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Lock size={14} className="text-indigo-600" />
                  <span>4. Phân bổ tiền mặt kết ca</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Tiền lẻ để lại két cho ca sau (VNĐ)
                      </label>
                      <button
                        type="button"
                        onClick={() => setRetainedFloat(Math.min(openingFloat, actualCashAmount))}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        = Đầu ca ({Math.min(openingFloat, actualCashAmount).toLocaleString('vi-VN')}₫)
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={actualCashAmount}
                        value={retainedFloat}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setRetainedFloat(Math.min(val, actualCashAmount));
                        }}
                        className="w-full px-3 py-1.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₫
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Làm vốn lưu động thối lại cho ca tiếp theo</span>
                      <span>Tối đa: {actualCashAmount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>

                  <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                        Tiền niêm phong nộp két sắt (Safe Drop)
                      </label>
                      <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-black">
                        Tự tính
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={`${safeDropAmount.toLocaleString('vi-VN')}₫`}
                        className="w-full px-3 py-1.5 text-sm font-black text-indigo-950 bg-white border border-indigo-300 rounded-lg cursor-not-allowed"
                      />
                    </div>

                    <div className="text-[10px] text-indigo-800 mt-1">
                      = Tiền thực tế ({actualCashAmount.toLocaleString('vi-VN')}₫) - Tiền để lại ({retainedFloat.toLocaleString('vi-VN')}₫)
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Accordions kiem ke thuoc GPP & Ghi chu */}
              <div className="space-y-2">
                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowGppAccordion(!showGppAccordion)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-teal-600" />
                      <span>Kiểm kê tủ thuốc GPP & Thuốc kiểm soát đặc biệt</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                        {controlledDrugs.length} mặt hàng
                      </span>
                    </div>
                    {showGppAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showGppAccordion && (
                    <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
                      <p className="text-[11px] text-slate-500">
                        Đồng kiểm kê số lượng thực tế trên khay đối với thuốc gây nghiện, hướng thần, tiền chất theo Thông tư 20/2017/TT-BYT
                      </p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                        {controlledDrugs.map((med, idx) => (
                          <div
                            key={med.medicineId || idx}
                            onClick={() => handleDrugToggle(idx)}
                            className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer transition text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                                  med.isMatched
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {med.isMatched && <Check size={12} />}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-slate-800">{med.medicineName}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                  ({med.unit}) • Tồn sổ sách: <strong>{med.systemStock}</strong>
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                                med.isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {med.isMatched ? 'Khớp khay' : 'Lệch'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowNotesAccordion(!showNotesAccordion)}
                    className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-slate-600" />
                      <span>Dặn dò đơn hẹn khách & Lưu ý ca trực tiếp theo</span>
                    </div>
                    {showNotesAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showNotesAccordion && (
                    <div className="p-3 border-t border-slate-200 space-y-3 bg-white">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Đơn khách hẹn lấy sau & Đơn online chờ giao
                        </label>
                        <input
                          type="text"
                          value={pendingOrdersNote}
                          onChange={(e) => setPendingOrdersNote(e.target.value)}
                          placeholder="VD: Khách hẹn 18h lấy thuốc tim mạch; Đơn Shopee chờ tài xế..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Lưu ý tình trạng thiết bị / Kho lạnh
                          </label>
                          <input
                            type="text"
                            value={generalShiftNotes}
                            onChange={(e) => setGeneralShiftNotes(e.target.value)}
                            placeholder="VD: Tủ lạnh vắc xin 4°C ổn định, máy in nhiệt sắp hết giấy..."
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Dược sĩ nhận ca tiếp theo
                          </label>
                          <input
                            type="text"
                            value={incomingPharmacistName}
                            onChange={(e) => setIncomingPharmacistName(e.target.value)}
                            placeholder="VD: Dược sĩ Nguyễn Văn B..."
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={loading || submitting}
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Cập nhật dữ liệu</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              disabled={submitting || loading}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-lg text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang chốt ca...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>Đóng ca & In phiếu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftHandoverModal;
