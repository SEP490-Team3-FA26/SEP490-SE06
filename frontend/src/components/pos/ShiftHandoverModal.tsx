import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Banknote,
  ShieldCheck,
  CheckCircle2,
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
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  UserCheck,
  Store,
  FileText,
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
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<any>(null);

  // Cash counting states
  const [actualCashAmount, setActualCashAmount] = useState<number>(0);
  const [actualCashInput, setActualCashInput] = useState<string>('0');
  const [showDenomAccordion, setShowDenomAccordion] = useState<boolean>(false);
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

  // Operating cash flow states
  const [pettyExpenses, setPettyExpenses] = useState<number>(0);
  const [retainedFloat, setRetainedFloat] = useState<number>(1000000);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');

  // Accordion & secondary states
  const [showGppAccordion, setShowGppAccordion] = useState<boolean>(false);
  const [showNotesAccordion, setShowNotesAccordion] = useState<boolean>(false);
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

      const openFloat = Number(data?.openingFloat) || 1000000;
      const cashSales = Number(data?.systemCashSales) || 0;
      const expectedTotal = openFloat + cashSales;

      // Suggest expected cash by default
      setActualCashAmount(expectedTotal);
      setActualCashInput(expectedTotal.toLocaleString('vi-VN'));
      setRetainedFloat(Math.min(openFloat, expectedTotal));

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

  // Financial calculations
  const openingFloat = Number(liveStats?.openingFloat) || 1000000;
  const systemCashSales = Number(liveStats?.systemCashSales) || 0;
  const systemDigitalSales = Number(liveStats?.systemDigitalSales) || 0;
  const systemOrderCount = Number(liveStats?.systemOrderCount) || 0;

  const expectedCashAmount = Math.max(0, openingFloat + systemCashSales - pettyExpenses);
  const cashDiscrepancy = actualCashAmount - expectedCashAmount;
  const isBalanced = cashDiscrepancy === 0;

  // Safe drop calculation
  const safeDropAmount = Math.max(0, actualCashAmount - retainedFloat);

  // Handle direct cash input change
  const handleActualCashChange = (valStr: string) => {
    const rawNumber = parseInt(valStr.replace(/\D/g, ''), 10) || 0;
    setActualCashAmount(rawNumber);
    setActualCashInput(rawNumber > 0 ? rawNumber.toLocaleString('vi-VN') : '0');

    // Adjust retained float if it exceeds total actual cash
    if (retainedFloat > rawNumber) {
      setRetainedFloat(rawNumber);
    }
  };

  // Sync cash to expected amount
  const handleSyncToExpected = () => {
    setActualCashAmount(expectedCashAmount);
    setActualCashInput(expectedCashAmount.toLocaleString('vi-VN'));
    setRetainedFloat(Math.min(openingFloat, expectedCashAmount));
  };

  // Handle denomination changes
  const handleCountChange = (key: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    const updated = { ...counts, [key]: num };
    setCounts(updated);

    const totalFromDenoms = DENOMINATIONS.reduce((sum, d) => sum + (updated[d.key] || 0) * d.value, 0);
    setActualCashAmount(totalFromDenoms);
    setActualCashInput(totalFromDenoms.toLocaleString('vi-VN'));

    if (retainedFloat > totalFromDenoms) {
      setRetainedFloat(totalFromDenoms);
    }
  };

  const handleDrugToggle = (index: number) => {
    setControlledDrugs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isMatched: !next[index].isMatched };
      return next;
    });
  };

  // Print Handover Receipt (K80 / A5 standard)
  const triggerPrintReceipt = (payload: any) => {
    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (!printWindow) {
      window.print();
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Biên bản bàn giao ca - ABC Pharmacy</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #111;
              padding: 6px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .header { margin-bottom: 8px; border-bottom: 1px dashed #444; padding-bottom: 6px; }
            .header h2 { font-size: 14px; margin: 0 0 2px 0; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 10px; color: #444; }
            .info-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .divider { border-top: 1px dashed #666; margin: 6px 0; }
            .highlight-box {
              background: #f4f4f4;
              padding: 6px;
              border-radius: 4px;
              margin: 6px 0;
            }
            .signatures {
              margin-top: 18px;
              display: flex;
              justify-content: space-between;
              text-align: center;
              font-size: 10px;
            }
            .sig-space { height: 45px; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2>ABC PHARMACY</h2>
            <p>HỆ THỐNG NHÀ THUỐC ĐẠT CHUẨN GPP</p>
            <p>Chi nhánh: ${payload.branchId || 'Hệ thống'} | Ngày: ${payload.handoverDate || new Date().toLocaleDateString('vi-VN')}</p>
            <h3 style="margin: 6px 0 2px 0; font-size: 13px;">BIÊN BẢN BÀN GIAO CA & CHỐT KÉT</h3>
            <p>Ca: ${payload.shiftName} (${payload.shiftId})</p>
          </div>

          <div>
            <div class="info-row">
              <span>Dược sĩ giao ca:</span>
              <span class="font-bold">${payload.employeeName || 'Dược sĩ'}</span>
            </div>
            <div class="info-row">
              <span>Dược sĩ nhận ca:</span>
              <span class="font-bold">${payload.incomingPharmacistName || 'Chưa bàn giao'}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div>
            <div class="info-row">
              <span>1. Tiền mặt đầu ca (Float):</span>
              <span class="font-bold">${payload.openingFloat.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row">
              <span>2. Tiền mặt bán trong ca (${payload.systemOrderCount} đơn):</span>
              <span class="font-bold">${payload.systemCashSales.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row">
              <span>3. Doanh số Chuyển khoản / QR:</span>
              <span>${payload.systemDigitalSales.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row">
              <span>4. Phiếu chi tiền mặt ca trực:</span>
              <span>${payload.pettyExpenses.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row font-bold" style="color: #047857; margin-top: 4px;">
              <span>=> Tiền mặt sổ sách tính toán:</span>
              <span>${payload.expectedCashAmount.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="highlight-box">
            <div class="info-row font-bold" style="font-size: 12px;">
              <span>TIỀN MẶT KIỂM ĐẾM THỰC TẾ:</span>
              <span>${payload.actualCashAmount.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row font-bold" style="color: ${payload.cashDiscrepancy === 0 ? '#047857' : '#b91c1c'}">
              <span>Chênh lệch sổ sách:</span>
              <span>${payload.cashDiscrepancy > 0 ? '+' : ''}${payload.cashDiscrepancy.toLocaleString('vi-VN')}₫</span>
            </div>
            ${
              payload.discrepancyReason
                ? `<div style="font-size: 9px; margin-top: 4px; color: #b91c1c;">Lý do lệch: ${payload.discrepancyReason}</div>`
                : ''
            }
          </div>

          <div class="divider"></div>

          <div>
            <div class="info-row">
              <span>- Tiền lẻ để lại két cho ca sau:</span>
              <span class="font-bold">${payload.retainedFloatForNextShift.toLocaleString('vi-VN')}₫</span>
            </div>
            <div class="info-row font-bold" style="color: #1e3a8a;">
              <span>- Niêm phong nộp két sắt (Safe Drop):</span>
              <span>${payload.safeDropAmount.toLocaleString('vi-VN')}₫</span>
            </div>
          </div>

          <div class="signatures">
            <div>
              <div class="font-bold">Dược sĩ giao ca</div>
              <div class="sig-space"></div>
              <div>${payload.employeeName || 'Ký tên'}</div>
            </div>
            <div>
              <div class="font-bold">Dược sĩ nhận ca / QL</div>
              <div class="sig-space"></div>
              <div>${payload.incomingPharmacistName || 'Ký tên'}</div>
            </div>
          </div>

          <div class="text-center" style="margin-top: 14px; font-size: 9px; color: #666;">
            Hệ thống quản lý nhà thuốc ABC Pharmacy • In lúc ${new Date().toLocaleTimeString('vi-VN')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Submit handover report
  const handleSubmit = async (shouldPrintReceipt: boolean = false) => {
    if (cashDiscrepancy < 0 && (!discrepancyReason || discrepancyReason.trim().length < 10)) {
      if (showToast) {
        showToast(
          `Két tiền đang bị thiếu hụt ${cashDiscrepancy.toLocaleString('vi-VN')}₫. Vui lòng nhập lý do giải trình cụ thể (tối thiểu 10 ký tự)!`,
          'warning'
        );
      }
      return;
    }

    if (retainedFloat > actualCashAmount) {
      if (showToast) {
        showToast(
          `Tiền lẻ để lại ca sau (${retainedFloat.toLocaleString('vi-VN')}₫) không thể vượt quá tổng tiền thực tế có trong két (${actualCashAmount.toLocaleString('vi-VN')}₫)!`,
          'error'
        );
      }
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        shiftId: liveStats?.shiftId || 'CA_HIEN_TAI',
        shiftName: liveStats?.shiftName || 'Ca làm việc',
        openingFloat,
        systemCashSales,
        systemDigitalSales,
        systemOrderCount,
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
        employeeName: liveStats?.employeeName,
        branchId: liveStats?.branchId,
        handoverDate: liveStats?.handoverDate,
        expectedCashAmount,
        cashDiscrepancy,
      };

      const res = await hrService.submitShiftHandover(payload);
      if (showToast) {
        showToast(res?.message || 'Đóng ca làm việc và chốt két thành công!', 'success');
      }

      if (shouldPrintReceipt) {
        triggerPrintReceipt(payload);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header - KiotViet Style */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-slate-500">Đang tổng hợp dữ liệu giao dịch và quét két tiền...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: ĐẦU CA & DOANH SỐ TRONG CA */}
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

                {/* Grid 4 thẻ: Bán hàng, Phiếu thu, Phiếu chi, Đổi trả */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Giao dịch phát sinh trong ca
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Thẻ 1: Tiền mặt bán lẻ */}
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

                    {/* Thẻ 2: Chuyển khoản & Thẻ */}
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

                    {/* Thẻ 3: Phiếu chi tiền mặt */}
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

                    {/* Thẻ 4: Tiền mặt sổ sách tính toán */}
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

              {/* SECTION 2: KIỂM KÊ THỰC TẾ (KIOTVIET CORE) */}
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

                {/* Hàng to nhập Tiền mặt thực tế & Chênh lệch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* Ô nhập tiền mặt thực tế */}
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

                  {/* Khối hiển thị chênh lệch */}
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

                {/* Bắt buộc nhập giải trình khi két bị hụt tiền (âm tiền) */}
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

                {/* Tùy chọn ghi chú khi két thừa tiền (dương tiền) */}
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

                {/* Accordion kê chi tiết theo mệnh giá */}
                {showDenomAccordion && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Bảng kê số tờ từng mệnh giá (Tùy chọn)</span>
                      <span className="text-[11px] text-slate-500">
                        Tổng đếm: <strong className="text-emerald-700">{actualCashAmount.toLocaleString('vi-VN')}₫</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DENOMINATIONS.map((denom) => {
                        const count = counts[denom.key] || 0;
                        const subTotal = count * denom.value;
                        return (
                          <div
                            key={denom.key}
                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-1 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-800 block truncate">
                                {denom.label}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 block">
                                ={subTotal.toLocaleString('vi-VN')}₫
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                value={count === 0 ? '' : count}
                                placeholder="0"
                                onChange={(e) => handleCountChange(denom.key, e.target.value)}
                                className="w-14 px-1.5 py-0.5 text-center font-bold text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-emerald-500 focus:outline-none"
                              />
                              <span className="text-[9px] text-slate-400 font-bold">tờ</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: PHÂN BỔ TIỀN MẶT BÀN GIAO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Lock size={14} className="text-indigo-600" />
                  <span>4. Phân bổ tiền mặt kết ca</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ô 1: Tiền lẻ để lại ca sau */}
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

                  {/* Ô 2: Tiền niêm phong nộp két sắt */}
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

              {/* SECTION 4: ACCORDIONS BỔ SUNG (THUỐC GPP & GHI CHÚ) */}
              <div className="space-y-2">
                {/* Accordion 1: Thuốc GPP đặc biệt */}
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

                {/* Accordion 2: Ghi chú & Bàn giao ca sau */}
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

        {/* Footer Actions - KiotViet Style */}
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
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-lg text-xs font-extrabold text-slate-800 bg-slate-200 hover:bg-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check size={15} />
              <span>Đóng ca</span>
            </button>

            <button
              type="button"
              disabled={submitting || loading}
              onClick={() => handleSubmit(true)}
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
