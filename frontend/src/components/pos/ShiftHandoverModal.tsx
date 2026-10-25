import { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  ArrowRight,
  ClipboardList,
  Save,
  Check,
  Building2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { hrService } from '../../services/hr/hr.service';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const DENOMINATIONS = [
  { key: 'count500k', label: '500.000₫', value: 500000 },
  { key: 'count200k', label: '200.000₫', value: 200000 },
  { key: 'count100k', label: '100.000₫', value: 100000 },
  { key: 'count50k', label: '50.000₫', value: 50000 },
  { key: 'count20k', label: '20.000₫', value: 20000 },
  { key: 'count10k', label: '10.000₫', value: 10000 },
  { key: 'count5k', label: '5.000₫', value: 5000 },
  { key: 'count2k', label: '2.000₫', value: 2000 },
  { key: 'count1k', label: '1.000₫', value: 1000 },
];

export function ShiftHandoverModal({ isOpen, onClose, onSuccess, showToast }: ShiftHandoverModalProps) {
  const [activeStep, setActiveStep] = useState<'cash' | 'gpp' | 'notes'>('cash');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<any>(null);

  // Form states
  const [counts, setCounts] = useState<Record<string, number>>({
    count500k: 0,
    count200k: 0,
    count100k: 0,
    count50k: 0,
    count20k: 0,
    count10k: 0,
    count5k: 0,
    count2k: 0,
    count1k: 0,
  });

  const [pettyExpenses, setPettyExpenses] = useState<number>(0);
  const [retainedFloat, setRetainedFloat] = useState<number>(1000000);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [controlledDrugs, setControlledDrugs] = useState<any[]>([]);
  const [pendingOrdersNote, setPendingOrdersNote] = useState<string>('');
  const [generalShiftNotes, setGeneralShiftNotes] = useState<string>('');
  const [incomingPharmacistName, setIncomingPharmacistName] = useState<string>('');

  // Fetch live stats from API
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrService.getShiftHandoverLiveStats();
      setLiveStats(data);
      if (data?.openingFloat) {
        setRetainedFloat(data.openingFloat);
      }
      if (Array.isArray(data?.controlledDrugsChecklist)) {
        setControlledDrugs(data.controlledDrugsChecklist);
      }
    } catch (err: any) {
      if (showToast) showToast(err?.response?.data?.message || 'Không thể lấy dữ liệu ca trực', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Calculate actual cash from denominations
  const actualCashAmount = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.key] || 0) * d.value, 0);

  const openingFloat = Number(liveStats?.openingFloat) || 1000000;
  const systemCashSales = Number(liveStats?.systemCashSales) || 0;
  const expectedCashAmount = openingFloat + systemCashSales - (Number(pettyExpenses) || 0);
  const cashDiscrepancy = actualCashAmount - expectedCashAmount;
  const isBalanced = cashDiscrepancy === 0;
  const safeDropAmount = Math.max(0, actualCashAmount - retainedFloat);

  const handleCountChange = (key: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [key]: num }));
  };

  const handleDrugToggle = (index: number) => {
    setControlledDrugs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isMatched: !next[index].isMatched };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (cashDiscrepancy !== 0 && (!discrepancyReason || discrepancyReason.trim().length < 10)) {
      if (showToast) {
        showToast(
          `Két tiền đang lệch ${cashDiscrepancy > 0 ? '+' : ''}${cashDiscrepancy.toLocaleString('vi-VN')}₫. Vui lòng nhập lý do giải trình cụ thể (tối thiểu 10 ký tự) trước khi nộp!`,
          'warning'
        );
      }
      setActiveStep('cash');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shiftId: liveStats?.shiftId || 'CA_SANG',
        shiftName: liveStats?.shiftName || 'Ca làm việc',
        openingFloat,
        systemCashSales,
        systemDigitalSales: liveStats?.systemDigitalSales || 0,
        systemOrderCount: liveStats?.systemOrderCount || 0,
        pettyExpenses,
        actualCashAmount,
        cashDenominations: counts,
        retainedFloatForNextShift: retainedFloat,
        safeDropAmount,
        discrepancyReason: discrepancyReason.trim(),
        controlledDrugsHandover: controlledDrugs,
        pendingOrdersNote: pendingOrdersNote.trim(),
        generalShiftNotes: generalShiftNotes.trim(),
        incomingPharmacistName: incomingPharmacistName.trim() || undefined,
      };

      const res = await hrService.submitShiftHandover(payload);
      if (showToast) {
        showToast(res?.message || 'Nộp biên bản bàn giao ca thành công! Phiên bán hàng đã chốt.', 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      if (showToast) {
        showToast(err?.response?.data?.message || err?.message || 'Lỗi khi nộp biên bản bàn giao ca', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Banknote size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">Biên Bản Bàn Giao Ca & Chốt Két</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Chuẩn GPP
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>{liveStats?.shiftName || 'Đang tải...'}</span>
                <span>•</span>
                <span>Dược sĩ: <strong className="text-white">{liveStats?.employeeName || 'Quầy POS'}</strong></span>
                <span>•</span>
                <span>Chi nhánh: <strong>{liveStats?.branchId}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Tabs Navigation */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep('cash')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeStep === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Coins size={14} />
              <span>1. Két Tiền Mặt</span>
              {isBalanced ? (
                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-300"></span>
              )}
            </button>

            <button
              onClick={() => setActiveStep('gpp')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeStep === 'gpp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ClipboardList size={14} />
              <span>2. Thuốc GPP Đặc Biệt</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-100 text-slate-700 font-extrabold">
                {controlledDrugs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveStep('notes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeStep === 'notes'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>3. Bàn Giao & Ký Nộp</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Clock size={13} />
            <span>Ngày: {liveStats?.handoverDate || 'Hôm nay'}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-500 font-bold">Đang tổng hợp doanh số và quét két tiền...</p>
            </div>
          ) : (
            <>
              {/* STEP 1: KÉT TIỀN MẶT */}
              {activeStep === 'cash' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Tiền Đầu Ca (Float)</p>
                      <p className="text-base font-extrabold text-slate-900 mt-1">
                        {openingFloat.toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tiền lẻ nhận bàn giao</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase">Tiền Mặt Bán Lẻ</p>
                      <p className="text-base font-extrabold text-emerald-900 mt-1">
                        {systemCashSales.toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        {liveStats?.systemOrderCount || 0} đơn ({liveStats?.sales?.cashSales ? 'Khớp POS' : 'Chưa có đơn'})
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                      <p className="text-[11px] font-bold text-indigo-800 uppercase">Chuyển Khoản / QR</p>
                      <p className="text-base font-extrabold text-indigo-900 mt-1">
                        {(liveStats?.systemDigitalSales || 0).toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-[10px] text-indigo-700 mt-0.5">PayOS / Thẻ ngân hàng</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                      <p className="text-[11px] font-bold text-amber-800 uppercase">Tiền Sổ Sách Cần Có</p>
                      <p className="text-base font-extrabold text-amber-950 mt-1">
                        {expectedCashAmount.toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-[10px] text-amber-700 mt-0.5">= Đầu ca + Thu - Chi</p>
                    </div>
                  </div>

                  {/* Denomination Counter Grid */}
                  <div className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-slate-800 tracking-wide">
                          Bảng Kê Đếm Tiền Mặt Thực Tế Theo Mệnh Giá
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Nhập số lượng tờ cho từng mệnh giá để hệ thống tính tổng tiền thực tế
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-bold">Tổng tiền đếm: </span>
                        <strong className="text-sm font-black text-emerald-700">
                          {actualCashAmount.toLocaleString('vi-VN')}₫
                        </strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {DENOMINATIONS.map((denom) => {
                        const count = counts[denom.key] || 0;
                        const subTotal = count * denom.value;
                        return (
                          <div
                            key={denom.key}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-800 block truncate">
                                {denom.label}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 block">
                                = {subTotal.toLocaleString('vi-VN')}₫
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min={0}
                                value={count === 0 ? '' : count}
                                placeholder="0"
                                onChange={(e) => handleCountChange(denom.key, e.target.value)}
                                className="w-16 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-emerald-500 focus:outline-none transition"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">tờ</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Discrepancy & Status Alert Box */}
                  <div
                    className={`p-4.5 rounded-2xl border transition-all ${
                      isBalanced
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : cashDiscrepancy < 0
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isBalanced ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                          }`}
                        >
                          {isBalanced ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide">
                            {isBalanced
                              ? 'Két Tiền Cân Bằng Hoàn Hảo (Khớp 100%)'
                              : cashDiscrepancy < 0
                              ? `Két Tiền Bị Hụt Thiếu: ${Math.abs(cashDiscrepancy).toLocaleString('vi-VN')}₫`
                              : `Két Tiền Bị Dư Thừa: +${cashDiscrepancy.toLocaleString('vi-VN')}₫`}
                          </p>
                          <p className="text-xs opacity-90 mt-0.5">
                            {isBalanced
                              ? 'Tiền mặt thực tế đếm được hoàn toàn trùng khớp với doanh số tính toán của hệ thống.'
                              : 'Bắt buộc giải trình nguyên nhân chênh lệch két theo quy chuẩn kiểm toán GPP.'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold block opacity-70">Chênh lệch:</span>
                        <span
                          className={`text-base font-black ${
                            isBalanced ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {cashDiscrepancy > 0 ? '+' : ''}
                          {cashDiscrepancy.toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    </div>

                    {/* Mandatory Explanation input when discrepancy exists */}
                    {!isBalanced && (
                      <div className="mt-3.5 pt-3.5 border-t border-rose-200/80">
                        <label className="block text-xs font-bold text-rose-900 mb-1.5">
                          Lý Do Giải Trình Chênh Lệch Két (Bắt buộc tối thiểu 10 ký tự) *
                        </label>
                        <input
                          type="text"
                          value={discrepancyReason}
                          onChange={(e) => setDiscrepancyReason(e.target.value)}
                          placeholder="VD: Khách trả tiền thừa không lấy (5k), hoặc thối nhầm tiền khách vãng lai..."
                          className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash Allocation for Next Shift */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tiền Lẻ Để Lại Két Cho Ca Sau (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={retainedFloat}
                        onChange={(e) => setRetainedFloat(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Làm vốn tiền lẻ thối lại ca tiếp</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tiền Mặt Niêm Phong Nộp Két Sắt (Safe Drop)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`${safeDropAmount.toLocaleString('vi-VN')}₫`}
                        className="w-full px-3 py-2 text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 rounded-xl cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">= Tổng tiền thực tế - Tiền để lại</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: THUỐC GPP ĐẶC BIỆT */}
              {activeStep === 'gpp' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 flex items-start gap-3">
                    <ShieldCheck className="text-teal-600 shrink-0 mt-0.5" size={20} />
                    <div className="text-xs">
                      <p className="font-extrabold uppercase">
                        Quy Chuẩn Kiểm Kê Tủ Thuốc GPP & Thuốc Kiểm Soát Đặc Biệt
                      </p>
                      <p className="text-teal-800 mt-0.5">
                        Theo Thông tư 20/2017/TT-BYT, dược sĩ giao ca và nhận ca bắt buộc đồng kiểm kê số lượng thực tế
                        trên khay của các nhóm thuốc kháng sinh, thuốc kê đơn đặc biệt và thuốc gây nghiện/hướng thần.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
                    {controlledDrugs.map((med, idx) => (
                      <div
                        key={med.medicineId || idx}
                        onClick={() => handleDrugToggle(idx)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                          med.isMatched ? 'bg-white hover:bg-slate-50/80' : 'bg-rose-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                              med.isMatched
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {med.isMatched && <Check size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{med.medicineName}</p>
                            <p className="text-[11px] text-slate-500">
                              Đơn vị: <strong>{med.unit}</strong> • Tồn sổ sách:{' '}
                              <strong className="text-slate-800">{med.systemStock}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              med.isMatched
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {med.isMatched ? 'Khớp khay thuốc' : 'Lệch số lượng'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: BÀN GIAO VIỆC & KÝ NỘP */}
              {activeStep === 'notes' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <span>Đơn Khách Hẹn Lấy Sau & Đơn Online Chờ Ship</span>
                    </label>
                    <textarea
                      rows={2}
                      value={pendingOrdersNote}
                      onChange={(e) => setPendingOrdersNote(e.target.value)}
                      placeholder="VD: Đơn #10294 khách tên Mai hẹn 18h lấy thuốc tim mạch; Đơn Shopee đang chờ tài xế..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                      <span>Lưu Ý Ca Trực & Tình Trạng Thiết Bị / Kho Lạnh GSP</span>
                    </label>
                    <textarea
                      rows={2}
                      value={generalShiftNotes}
                      onChange={(e) => setGeneralShiftNotes(e.target.value)}
                      placeholder="VD: Nhiệt độ tủ lạnh vắc xin 4°C ổn định, máy in nhiệt bill sắp hết giấy..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Dược Sĩ Nhận Ca Tiếp Theo (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={incomingPharmacistName}
                      onChange={(e) => setIncomingPharmacistName(e.target.value)}
                      placeholder="VD: Dược sĩ Nguyễn Văn B (hoặc để trống nếu đóng cửa ca tối)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ca tiếp theo hoặc Quản lý chi nhánh sẽ vào hệ thống xác nhận nhận bàn giao két và tủ thuốc.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeStep === 'cash' && <span>Bước 1/3: Kiểm đếm két tiền mặt</span>}
            {activeStep === 'gpp' && <span>Bước 2/3: Đối soát tủ thuốc GPP</span>}
            {activeStep === 'notes' && <span>Bước 3/3: Bàn giao & Ký nộp biên bản</span>}
          </div>

          <div className="flex items-center gap-2">
            {activeStep !== 'cash' && (
              <button
                onClick={() => setActiveStep(activeStep === 'notes' ? 'gpp' : 'cash')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Quay lại
              </button>
            )}

            {activeStep !== 'notes' ? (
              <button
                onClick={() => setActiveStep(activeStep === 'cash' ? 'gpp' : 'notes')}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang nộp biên bản...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Chốt Két & Nộp Biên Bản Bàn Giao</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShiftHandoverModal;
