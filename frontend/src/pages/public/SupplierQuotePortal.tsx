import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Send,
  Package,
  Phone,
  UserCheck,
  FileText,
  CreditCard,
  Truck
} from 'lucide-react';
import { rfqService } from '../../services/purchase/rfq.service';

interface QuotationItemInput {
  medicineId: string;
  medicineName: string;
  sku: string;
  unit: string;
  quantityRequested: number;
  quotedPrice: number;
  discountPercent: number;
  committedShelfLifeMonths: number;
  availableQuantity: number;
  notes: string;
}

export const SupplierQuotePortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rfqData, setRfqData] = useState<any>(null);

  // Form States
  const [items, setItems] = useState<QuotationItemInput[]>([]);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [deliveryDays, setDeliveryDays] = useState<number>(2);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('Mã truy cập (Token) không hợp lệ hoặc thiếu.');
      setLoading(false);
      return;
    }

    const loadRfqInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await rfqService.getRfqByToken(token);
        setRfqData(data);

        // Khởi tạo danh sách mặt hàng cần báo giá
        const initialItems: QuotationItemInput[] = (data.items || []).map((item: any) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          sku: item.sku || '',
          unit: item.unit || 'Hộp',
          quantityRequested: item.quantityRequested || 100,
          quotedPrice: item.targetPrice || 0,
          discountPercent: 0,
          committedShelfLifeMonths: data.minShelfLifeMonths || 24,
          availableQuantity: item.quantityRequested || 100,
          notes: '',
        }));
        setItems(initialItems);

        setPaymentTermsDays(data.requiredPaymentTermDays || 30);

        // Nếu đã từng nộp trước đó, nạp lại dữ liệu cũ
        if (data.existingQuotation) {
          setSubmittedData(data.existingQuotation);
          setIsSuccess(true);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Không thể tải thông tin báo giá.');
      } finally {
        setLoading(false);
      }
    };

    loadRfqInfo();
  }, [token]);

  const handleItemChange = (index: number, field: keyof QuotationItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const subtotal = (item.quotedPrice || 0) * (item.quantityRequested || 0);
      const discount = subtotal * ((item.discountPercent || 0) / 100);
      return sum + (subtotal - discount);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validate
    for (const item of items) {
      if (!item.quotedPrice || item.quotedPrice <= 0) {
        return alert(`Vui lòng nhập đơn giá chào hợp lệ cho thuốc: ${item.medicineName}`);
      }
      if (!item.committedShelfLifeMonths || item.committedShelfLifeMonths <= 0) {
        return alert(`Vui lòng nhập hạn sử dụng cam kết cho thuốc: ${item.medicineName}`);
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        paymentTermsDays: Number(paymentTermsDays),
        deliveryDays: Number(deliveryDays),
        notes: generalNotes,
        items: items.map((it) => ({
          medicineId: it.medicineId,
          medicineName: it.medicineName,
          quotedPrice: Number(it.quotedPrice),
          discountPercent: Number(it.discountPercent || 0),
          committedShelfLifeMonths: Number(it.committedShelfLifeMonths),
          availableQuantity: Number(it.availableQuantity || it.quantityRequested),
          notes: it.notes,
        })),
        totalAmount: calculateTotal(),
      };

      await rfqService.submitQuoteByToken(token, payload);
      setSubmittedData(payload);
      setIsSuccess(true);
    } catch (err: any) {
      alert(`❌ Lỗi gửi báo giá: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-700 font-bold text-sm">Đang xác thực liên kết báo giá...</p>
          <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát.</p>
        </div>
      </div>
    );
  }

  if (error || !rfqData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full space-y-4 border border-rose-200">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Liên Kết Báo Giá Không Hợp Lệ</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || 'Đường link này có thể đã hết hạn nhận báo giá hoặc bị hủy bởi ban quản trị chuỗi.'}
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 block">Vui lòng liên hệ phòng Thu Mua chuỗi Nhà thuốc Pharmachain nếu cần hỗ trợ.</span>
          </div>
        </div>
      </div>
    );
  }

  const supplier = rfqData.supplier || {};
  const isExpired = rfqData.isExpired;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Brand Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/20">
              PC
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Hệ Thống Chuỗi Nhà Thuốc Pharmachain
              </span>
              <h1 className="text-xl font-black text-slate-900">Cổng Báo Giá Nhà Cung Cấp (RFQ)</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
            <Clock size={16} className="text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Hạn chót gửi báo giá:</span>
              <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                {new Date(rfqData.deadline).toLocaleString('vi-VN')} {isExpired && '(Đã hết hạn)'}
              </span>
            </div>
          </div>
        </div>

        {/* Identity Recognition Banner (Nhận diện chính xác NCC & Sales phụ trách) */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <UserCheck size={14} />
              Đã Nhận Diện Nhà Cung Cấp Thành Công
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-emerald-200 uppercase tracking-wider font-semibold block">
                  Đơn vị được mời báo giá
                </span>
                <p className="text-lg font-black text-white">{supplier.supplierName}</p>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                  {supplier.phone && <span>SĐT: {supplier.phone}</span>}
                  {supplier.email && <span>Email: {supplier.email}</span>}
                </div>
              </div>

              {supplier.salesRepName && (
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-emerald-200 uppercase tracking-wider font-semibold block">
                    Đại diện thương mại / Trình dược viên phụ trách
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">{supplier.salesRepName}</p>
                  {supplier.salesRepPhone && (
                    <div className="flex items-center gap-1 text-xs text-emerald-300 font-mono mt-0.5">
                      <Phone size={12} /> {supplier.salesRepPhone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success Alert if already submitted */}
        {isSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 p-6 rounded-2xl shadow-sm text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-lg font-bold text-emerald-900">Báo Giá Đã Được Ghi Nhận Thành Công!</h2>
            <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
              Cảm ơn Quý đối tác <strong>{supplier.supplierName}</strong> đã gửi báo giá cho đơn hàng{' '}
              <strong>[{rfqData.rfqCode}] - {rfqData.title}</strong>. Hệ thống của chuỗi Pharmachain đã lưu trữ dữ liệu chào thầu của quý đối tác.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsSuccess(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                Cập nhật lại báo giá (Trước hạn chót)
              </button>
            </div>
          </div>
        )}

        {/* Quotation Form */}
        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* RFQ General Conditions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-emerald-600">Mã RFQ: {rfqData.rfqCode}</span>
                <h2 className="text-base font-bold text-slate-800 mt-0.5">{rfqData.title}</h2>
                {rfqData.notes && <p className="text-xs text-slate-500 mt-1 italic">"{rfqData.notes}"</p>}
              </div>

              {/* Regulatory & Commercial Constraints Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl text-xs">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Ràng buộc Hạn sử dụng:</span>
                    <span className="text-amber-800">
                      Tối thiểu phải còn từ <strong>{rfqData.minShelfLifeMonths} tháng</strong> trở lên.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Ràng buộc Công nợ:</span>
                    <span className="text-amber-800">
                      Thời hạn thanh toán yêu cầu từ <strong>{rfqData.requiredPaymentTermDays} ngày</strong>.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medicines Quotation Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-emerald-600" />
                  Danh mục Dược phẩm cần báo giá ({items.length} mặt hàng)
                </h3>
                <span className="text-xs text-slate-400 font-medium">Đơn vị tiền tệ: VNĐ</span>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => {
                  const isDateCompliant =
                    Number(item.committedShelfLifeMonths) >= Number(rfqData.minShelfLifeMonths || 18);
                  const lineTotal =
                    (item.quotedPrice || 0) *
                    (item.quantityRequested || 0) *
                    (1 - (item.discountPercent || 0) / 100);

                  return (
                    <div
                      key={item.medicineId}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all bg-slate-50/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">
                            {idx + 1}. {item.medicineName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Mã: {item.sku || 'N/A'} • Đơn vị tính: <strong>{item.unit}</strong> • Số lượng mua: <strong>{item.quantityRequested.toLocaleString()}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">Thành tiền chào:</span>
                          <span className="text-base font-black text-emerald-700">
                            {Math.round(lineTotal).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                        {/* Giá chào */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Đơn giá chào (VNĐ/đơn vị) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={item.quotedPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'quotedPrice', Number(e.target.value))}
                            placeholder="Nhập giá..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                            required
                          />
                        </div>

                        {/* Hạn sử dụng cam kết */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-600">
                              HSD cam kết (tháng) <span className="text-rose-500">*</span>
                            </label>
                            {isDateCompliant ? (
                              <span className="text-[10px] text-emerald-600 font-bold">✓ Đạt chuẩn</span>
                            ) : (
                              <span className="text-[10px] text-rose-600 font-bold">⚠️ Cận date</span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={item.committedShelfLifeMonths || ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'committedShelfLifeMonths', Number(e.target.value))
                            }
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 bg-white ${
                              isDateCompliant
                                ? 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                                : 'border-rose-400 bg-rose-50/50 text-rose-700 focus:ring-rose-500'
                            }`}
                            required
                          />
                          {!isDateCompliant && (
                            <span className="text-[10px] text-rose-600 block mt-0.5">
                              Thấp hơn yêu cầu tối thiểu {rfqData.minShelfLifeMonths} tháng
                            </span>
                          )}
                        </div>

                        {/* Chiết khấu % */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Chiết khấu thương mại (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.discountPercent || ''}
                            onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                            placeholder="0%"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>

                        {/* Số lượng có sẵn */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            Số lượng sẵn sàng cấp
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.availableQuantity || ''}
                            onChange={(e) => handleItemChange(idx, 'availableQuantity', Number(e.target.value))}
                            placeholder="Số lượng..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Commercial Terms & Submit */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600" />
                Điều kiện thương mại & Thanh toán
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thời hạn công nợ cam kết (ngày) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Chuỗi yêu cầu tối thiểu: {rfqData.requiredPaymentTermDays} ngày.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thời gian giao hàng cam kết (ngày) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Số ngày giao hàng kể từ khi nhận Đơn PO chính thức.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú hoặc Điều kiện giao hàng riêng
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ví dụ: Miễn phí vận chuyển tận kho GSP của chuỗi, cam kết đủ hóa đơn VAT và phiếu kiểm nghiệm xuất xưởng..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Total & Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Tổng giá trị chào thầu dự kiến:</span>
                  <span className="text-2xl font-black text-emerald-800">
                    {Math.round(calculateTotal()).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || isExpired}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={18} />
                  {submitting ? 'Đang gửi bảng giá...' : 'Xác Nhận & Gửi Báo Giá Cho Nhà Thuốc'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
