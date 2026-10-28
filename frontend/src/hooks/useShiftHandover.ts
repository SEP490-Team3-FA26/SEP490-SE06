import { useState, useEffect, useCallback } from 'react';
import { hrService } from '../services/hr/hr.service';
import { DENOMINATIONS } from '../components/pos/DenominationTable';

interface UseShiftHandoverProps {
  isOpen: boolean;
  onSuccess?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useShiftHandover({ isOpen, onSuccess, showToast }: UseShiftHandoverProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<any>(null);

  // Quan ly tien mat thuc te va menh gia
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

  // Quan ly luong tien cuoi ca
  const [pettyExpenses, setPettyExpenses] = useState<number>(0);
  const [retainedFloat, setRetainedFloat] = useState<number>(1000000);
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');

  // Accordion va ghi chu bo sung
  const [showGppAccordion, setShowGppAccordion] = useState<boolean>(false);
  const [showNotesAccordion, setShowNotesAccordion] = useState<boolean>(false);
  const [controlledDrugs, setControlledDrugs] = useState<any[]>([]);
  const [pendingOrdersNote, setPendingOrdersNote] = useState<string>('');
  const [generalShiftNotes, setGeneralShiftNotes] = useState<string>('');
  const [incomingPharmacistName, setIncomingPharmacistName] = useState<string>('');

  // Tai du lieu ca truc tu API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getShiftHandoverLiveStats();
      setLiveStats(data);

      const openFloat = Number(data?.openingFloat) || 1000000;
      const cashSales = Number(data?.systemCashSales) || 0;
      const expectedTotal = openFloat + cashSales;

      // Goi y tien thuc te mac dinh bang tien ly thuyet
      setActualCashAmount(expectedTotal);
      setActualCashInput(expectedTotal.toLocaleString('vi-VN'));
      setRetainedFloat(Math.min(openFloat, expectedTotal));

      if (Array.isArray(data?.controlledDrugsChecklist)) {
        setControlledDrugs(data.controlledDrugsChecklist);
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err?.response?.data?.message || 'Không thể lấy dữ liệu ca trực', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Cac chi so tinh toan tai chinh
  const openingFloat = Number(liveStats?.openingFloat) || 1000000;
  const systemCashSales = Number(liveStats?.systemCashSales) || 0;
  const systemDigitalSales = Number(liveStats?.systemDigitalSales) || 0;
  const systemOrderCount = Number(liveStats?.systemOrderCount) || 0;

  const expectedCashAmount = Math.max(0, openingFloat + systemCashSales - pettyExpenses);
  const cashDiscrepancy = actualCashAmount - expectedCashAmount;
  const isBalanced = cashDiscrepancy === 0;

  // Tien nop ket giu lai va nop ve ke toan
  const safeDropAmount = Math.max(0, actualCashAmount - retainedFloat);

  // Xu ly nhap tien mat truc tiep
  const handleActualCashChange = (valStr: string) => {
    const rawNumber = parseInt(valStr.replace(/\D/g, ''), 10) || 0;
    setActualCashAmount(rawNumber);
    setActualCashInput(rawNumber > 0 ? rawNumber.toLocaleString('vi-VN') : '0');

    if (retainedFloat > rawNumber) {
      setRetainedFloat(rawNumber);
    }
  };

  // Dong bo tien mat bang dung so ly thuyet
  const handleSyncToExpected = () => {
    setActualCashAmount(expectedCashAmount);
    setActualCashInput(expectedCashAmount.toLocaleString('vi-VN'));
    setRetainedFloat(Math.min(openingFloat, expectedCashAmount));
  };

  // Xu ly dem tien theo tung menh gia
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

  // Reset bang menh gia ve 0
  const resetCounts = () => {
    const cleared = Object.keys(counts).reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
    setCounts(cleared as Record<string, number>);
  };

  // Danh dau kiem tra thuoc kiem soat dac biet
  const handleDrugToggle = (index: number) => {
    setControlledDrugs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isMatched: !next[index].isMatched };
      return next;
    });
  };

  // In bien ban ban giao ca chuan K80 / A5
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
            <p style="margin: 0; font-size: 10px;">Mã ca: ${payload.shiftId || 'CA_TRUC'} - ${payload.shiftName || 'Ca làm việc'}</p>
          </div>

          <div class="info-row">
            <span>Dược sĩ giao ca:</span>
            <span class="font-bold">${payload.outgoingPharmacistName || liveStats?.pharmacistName || 'Dược sĩ trực quầy'}</span>
          </div>
          <div class="info-row">
            <span>Dược sĩ nhận ca:</span>
            <span class="font-bold">${payload.incomingPharmacistName || 'Chờ xác nhận'}</span>
          </div>

          <div class="divider"></div>

          <div class="info-row">
            <span>Tiền mặt đầu ca (Float):</span>
            <span>${payload.openingFloat.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row">
            <span>Doanh số tiền mặt (${payload.systemOrderCount} đơn):</span>
            <span>${payload.systemCashSales.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row">
            <span>Doanh số chuyển khoản QR:</span>
            <span>${(payload.systemDigitalSales || 0).toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row">
            <span>Chi phí lặt vặt xuất két:</span>
            <span>-${payload.pettyExpenses.toLocaleString('vi-VN')}₫</span>
          </div>

          <div class="divider"></div>

          <div class="info-row font-bold">
            <span>Lý thuyết két phải có:</span>
            <span>${payload.expectedCashAmount.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row font-bold" style="font-size: 12px;">
            <span>Tiền thực tế kiểm đếm:</span>
            <span>${payload.actualCashAmount.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row font-bold" style="color: ${payload.cashDiscrepancy === 0 ? '#059669' : '#dc2626'};">
            <span>Chênh lệch két:</span>
            <span>${payload.cashDiscrepancy > 0 ? '+' : ''}${payload.cashDiscrepancy.toLocaleString('vi-VN')}₫</span>
          </div>

          ${
            payload.cashDiscrepancy !== 0 && payload.discrepancyReason
              ? `<div class="highlight-box"><span class="font-bold">Giải trình:</span> ${payload.discrepancyReason}</div>`
              : ''
          }

          <div class="divider"></div>

          <div class="info-row">
            <span>Tiền để lại cho ca sau:</span>
            <span class="font-bold">${payload.retainedFloatForNextShift.toLocaleString('vi-VN')}₫</span>
          </div>
          <div class="info-row">
            <span>Tiền nộp về két an toàn (Safe Drop):</span>
            <span class="font-bold">${payload.safeDropAmount.toLocaleString('vi-VN')}₫</span>
          </div>

          <div class="signatures">
            <div>
              <p class="font-bold">Dược sĩ giao ca</p>
              <div class="sig-space"></div>
              <p>${payload.outgoingPharmacistName || liveStats?.pharmacistName || 'Ký tên'}</p>
            </div>
            <div>
              <p class="font-bold">Dược sĩ nhận ca</p>
              <div class="sig-space"></div>
              <p>${payload.incomingPharmacistName || 'Ký tên'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Nop bien ban ban giao ca
  const submitHandover = async () => {
    // Rang buoc INV-SHO-03: Giai trinh bat buoc khi am tien
    if (cashDiscrepancy < 0) {
      if (!discrepancyReason || discrepancyReason.trim().length < 10) {
        if (showToast) {
          showToast(
            `Két tiền bị thiếu hụt ${Math.abs(cashDiscrepancy).toLocaleString('vi-VN')}₫. Bắt buộc nhập lý do giải trình cụ thể (tối thiểu 10 ký tự)!`,
            'error'
          );
        }
        return false;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        shiftId: liveStats?.shiftId || 'DEFAULT',
        shiftName: liveStats?.shiftName || 'Ca làm việc',
        handoverDate: liveStats?.handoverDate || new Date().toISOString().slice(0, 10),
        openingFloat,
        systemCashSales,
        systemDigitalSales,
        systemOrderCount,
        pettyExpenses,
        expectedCashAmount,
        actualCashAmount,
        cashDiscrepancy,
        discrepancyReason,
        cashDenominations: counts,
        retainedFloatForNextShift: retainedFloat,
        safeDropAmount,
        controlledDrugsHandover: controlledDrugs,
        pendingOrdersNote,
        generalShiftNotes,
        incomingPharmacistName: incomingPharmacistName.trim() || undefined,
        branchId: liveStats?.branchId,
        outgoingPharmacistName: liveStats?.pharmacistName,
      };

      await hrService.submitShiftHandover(payload);

      if (showToast) {
        showToast('Nộp biên bản bàn giao ca thành công! Bạn có thể Check-out tan ca.', 'success');
      }

      // Tu dong in bien ban sau khi nop thanh cong
      triggerPrintReceipt(payload);

      if (onSuccess) onSuccess();
      return true;
    } catch (err: any) {
      if (showToast) {
        showToast(err?.response?.data?.message || err?.message || 'Lỗi khi nộp biên bản bàn giao ca', 'error');
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    submitting,
    liveStats,
    salesSyncError: Boolean(liveStats?.salesSyncError),
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
    triggerPrintReceipt,
    submitHandover,
    loadData,
  };
}

