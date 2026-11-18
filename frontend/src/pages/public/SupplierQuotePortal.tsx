import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  Package,
  Phone,
  UserCheck,
  CreditCard,
  Plus,
  Trash2,
  Layers,
  Info,
  Sparkles,
  Lock,
  MessageSquare,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  rfqService,
  QuotationPriceTier,
  calculateRfqItemTieredPricing,
} from '../../services/purchase/rfq.service';

interface QuotationItemInput {
  medicineId: string;
  medicineName: string;
  sku: string;
  unit: string;
  quantityRequested: number;
  quotedPrice: number;
  moq: number; // Số lượng đặt hàng tối thiểu (Minimum Order Quantity)
  priceTiers: QuotationPriceTier[]; // Bảng đơn giá theo bậc số lượng
  discountPercent: number;
  committedShelfLifeMonths: number;
  availableQuantity: number;
  notes: string;
  nationalDrugCode?: string;
  declaredPrice?: number;
  isExceedingDeclaredPrice?: boolean;
}

export const SupplierQuotePortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rfqData, setRfqData] = useState<any>(null);

  // Trạng thái biểu mẫu chào giá
  const [items, setItems] = useState<QuotationItemInput[]>([]);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [deliveryDays, setDeliveryDays] = useState<number>(2);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Hệ thống thông báo Toast nội bộ (thay thế hoàn toàn alert trình duyệt)
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]
  >([]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Modal xác nhận gửi báo giá khi có cảnh báo vượt trần BYT hoặc chưa đạt MOQ
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Mã truy cập (Token) không hợp lệ hoặc bị thiếu.');
      setLoading(false);
      return;
    }

    const loadRfqInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await rfqService.getRfqByToken(token);
        setRfqData(data);

        // Nạp lại dữ liệu báo giá cũ (nếu Sale đã gửi trước đó và muốn xem/cập nhật)
        const existingItems = data.existingQuotation?.items || [];

        // Khởi tạo danh sách mặt hàng cần báo giá kèm thông tin CSDL Dược Quốc Gia, MOQ và bậc giá
        const initialItems: QuotationItemInput[] = (data.items || []).map((item: any) => {
          const prevQuote = existingItems.find((q: any) => q.medicineId === item.medicineId);
          const quoted = prevQuote?.quotedPrice ?? (item.targetPrice || 0);
          const declared = item.declaredPrice || 0;
          const prevTiers: QuotationPriceTier[] = Array.isArray(prevQuote?.priceTiers)
            ? prevQuote.priceTiers
            : [];
          const moq = Number(prevQuote?.moq || 1);
          const pricing = calculateRfqItemTieredPricing(
            quoted,
            item.quantityRequested || 100,
            prevTiers,
            moq,
            prevQuote?.discountPercent || 0,
          );

          return {
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            sku: item.sku || '',
            unit: item.unit || 'Hộp',
            quantityRequested: item.quantityRequested || 100,
            quotedPrice: quoted,
            moq,
            priceTiers: prevTiers,
            discountPercent: Number(prevQuote?.discountPercent || 0),
            committedShelfLifeMonths: Number(
              prevQuote?.offeredShelfLifeMonths || data.minShelfLifeMonths || 24,
            ),
            availableQuantity: Number(prevQuote?.availableQuantity || item.quantityRequested || 100),
            notes: prevQuote?.notes || '',
            nationalDrugCode: item.nationalDrugCode || '',
            declaredPrice: declared,
            isExceedingDeclaredPrice: declared > 0 && pricing.effectiveUnitPrice > declared,
          };
        });
        setItems(initialItems);

        setPaymentTermsDays(
          data.existingQuotation?.paymentTermsDays ?? (data.requiredPaymentTermDays || 30),
        );
        setDeliveryDays(data.existingQuotation?.deliveryDays ?? 2);
        setGeneralNotes(data.existingQuotation?.notes || '');

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

  // Cập nhật trường thông tin từng mặt hàng và tự động kiểm tra giá trần BYT theo đơn giá thực tế
  const handleItemChange = (index: number, field: keyof QuotationItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const targetItem = { ...updated[index], [field]: value };
      const pricing = calculateRfqItemTieredPricing(
        targetItem.quotedPrice,
        targetItem.quantityRequested,
        targetItem.priceTiers,
        targetItem.moq,
        targetItem.discountPercent,
      );
      const declared = targetItem.declaredPrice || 0;
      targetItem.isExceedingDeclaredPrice = declared > 0 && pricing.effectiveUnitPrice > declared;
      updated[index] = targetItem;
      return updated;
    });
  };

  // Thêm 1 bậc đơn giá theo số lượng mới cho mặt hàng
  const handleAddPriceTier = (itemIdx: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[itemIdx];
      const existing = item.priceTiers || [];
      const lastMinQty =
        existing.length > 0
          ? Math.max(...existing.map((t) => Number(t.minQuantity) || 0))
          : Math.max(item.moq || 1, item.quantityRequested || 50);
      const nextMinQty = existing.length === 0 ? lastMinQty : Math.round(lastMinQty * 2);
      const lastPrice =
        existing.length > 0
          ? existing[existing.length - 1].unitPrice
          : item.quotedPrice || 0;
      const suggestedPrice = lastPrice > 0 ? Math.max(0, Math.round((lastPrice * 0.95) / 100) * 100) : 0;

      const nextTiers = [...existing, { minQuantity: nextMinQty, unitPrice: suggestedPrice }];
      const pricing = calculateRfqItemTieredPricing(
        item.quotedPrice,
        item.quantityRequested,
        nextTiers,
        item.moq,
        item.discountPercent,
      );
      updated[itemIdx] = {
        ...item,
        priceTiers: nextTiers,
        isExceedingDeclaredPrice:
          (item.declaredPrice || 0) > 0 && pricing.effectiveUnitPrice > (item.declaredPrice || 0),
      };
      return updated;
    });
  };

  // Tự động tạo nhanh 3 bậc đơn giá sỉ chuẩn B2B dựa trên đơn giá cơ bản & SL yêu cầu
  const handleAutoGenerateTiers = (itemIdx: number) => {
    const item = items[itemIdx];
    if (!item || !item.quotedPrice || item.quotedPrice <= 0) {
      showToast('Vui lòng nhập Đơn giá cơ bản trước khi tạo nhanh bậc giá sỉ.', 'warning');
      return;
    }
    const baseQty = Math.max(item.moq || 1, item.quantityRequested || 100);
    const tier1Qty = baseQty;
    const tier2Qty = baseQty * 2;
    const tier3Qty = baseQty * 5;

    const roundPrice = (p: number) => Math.max(0, Math.round(p / 100) * 100);
    const generated: QuotationPriceTier[] = [
      { minQuantity: tier1Qty, unitPrice: roundPrice(item.quotedPrice * 0.97) },
      { minQuantity: tier2Qty, unitPrice: roundPrice(item.quotedPrice * 0.93) },
      { minQuantity: tier3Qty, unitPrice: roundPrice(item.quotedPrice * 0.88) },
    ];
    handleItemChange(itemIdx, 'priceTiers', generated);
    showToast(`Đã tạo nhanh 3 bậc đơn giá theo số lượng cho ${item.medicineName}.`, 'info');
  };

  // Cập nhật một bậc đơn giá cụ thể
  const handleTierChange = (
    itemIdx: number,
    tierIdx: number,
    field: keyof QuotationPriceTier,
    value: number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[itemIdx];
      const nextTiers = [...(item.priceTiers || [])];
      nextTiers[tierIdx] = { ...nextTiers[tierIdx], [field]: value };
      const pricing = calculateRfqItemTieredPricing(
        item.quotedPrice,
        item.quantityRequested,
        nextTiers,
        item.moq,
        item.discountPercent,
      );
      updated[itemIdx] = {
        ...item,
        priceTiers: nextTiers,
        isExceedingDeclaredPrice:
          (item.declaredPrice || 0) > 0 && pricing.effectiveUnitPrice > (item.declaredPrice || 0),
      };
      return updated;
    });
  };

  // Xóa một bậc đơn giá
  const handleRemovePriceTier = (itemIdx: number, tierIdx: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = updated[itemIdx];
      const nextTiers = (item.priceTiers || []).filter((_, i) => i !== tierIdx);
      const pricing = calculateRfqItemTieredPricing(
        item.quotedPrice,
        item.quantityRequested,
        nextTiers,
        item.moq,
        item.discountPercent,
      );
      updated[itemIdx] = {
        ...item,
        priceTiers: nextTiers,
        isExceedingDeclaredPrice:
          (item.declaredPrice || 0) > 0 && pricing.effectiveUnitPrice > (item.declaredPrice || 0),
      };
      return updated;
    });
  };

  // Tính tổng giá trị chào thầu dựa trên Đơn giá thực tế theo bậc số lượng & chiết khấu
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const pricing = calculateRfqItemTieredPricing(
        item.quotedPrice,
        item.quantityRequested,
        item.priceTiers,
        item.moq,
        item.discountPercent,
      );
      return sum + pricing.lineTotal;
    }, 0);
  };

  const executeSubmit = async () => {
    if (!token) return;
    try {
      setSubmitting(true);
      const payload = {
        paymentTermsDays: Number(paymentTermsDays),
        deliveryDays: Number(deliveryDays),
        notes: generalNotes,
        items: items.map((it) => {
          const pricing = calculateRfqItemTieredPricing(
            it.quotedPrice,
            it.quantityRequested,
            it.priceTiers,
            it.moq,
            it.discountPercent,
          );
          return {
            medicineId: it.medicineId,
            medicineName: it.medicineName,
            quotedPrice: Number(it.quotedPrice),
            moq: pricing.moq,
            priceTiers: pricing.normalizedTiers,
            effectiveUnitPrice: pricing.effectiveUnitPrice,
            appliedTierMinQuantity: pricing.appliedTierMinQuantity,
            isMoqMet: pricing.isMoqMet,
            discountPercent: Number(it.discountPercent || 0),
            committedShelfLifeMonths: Number(it.committedShelfLifeMonths),
            offeredShelfLifeMonths: Number(it.committedShelfLifeMonths),
            availableQuantity: Number(it.availableQuantity || it.quantityRequested),
            notes: it.notes,
          };
        }),
        totalAmount: calculateTotal(),
      };

      await rfqService.submitQuoteByToken(token, payload);
      setSubmittedData(payload);
      setIsSuccess(true);
      showToast('Đã gửi báo giá thành công đến phòng Thu Mua ABC Pharmacy!', 'success');
    } catch (err: any) {
      showToast(
        `Lỗi gửi báo giá: ${err.response?.data?.message || err.message}`,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Kiểm tra hợp lệ các trường bắt buộc
    for (const item of items) {
      if (!item.quotedPrice || item.quotedPrice <= 0) {
        showToast(`Vui lòng nhập đơn giá chào cơ bản hợp lệ cho thuốc: ${item.medicineName}`, 'warning');
        return;
      }
      if (!item.moq || item.moq < 1) {
        showToast(`Số lượng đặt tối thiểu (MOQ) phải >= 1 cho thuốc: ${item.medicineName}`, 'warning');
        return;
      }
      if (!item.committedShelfLifeMonths || item.committedShelfLifeMonths <= 0) {
        showToast(`Vui lòng nhập hạn sử dụng cam kết cho thuốc: ${item.medicineName}`, 'warning');
        return;
      }
      for (const tier of item.priceTiers || []) {
        if (!tier.minQuantity || tier.minQuantity < 1 || tier.unitPrice < 0) {
          showToast(
            `Bậc đơn giá theo số lượng chưa hợp lệ cho thuốc: ${item.medicineName} (Mốc SL >= 1 và Đơn giá >= 0).`,
            'warning',
          );
          return;
        }
      }
    }

    // Kiểm tra tuân thủ giá trần kê khai BYT (NĐ 54/2017) & Cảnh báo MOQ cao hơn SL yêu cầu
    const exceedingItems = items.filter((it) => it.isExceedingDeclaredPrice);
    const unmetMoqItems = items.filter((it) => (it.moq || 1) > (it.quantityRequested || 0));

    if (exceedingItems.length > 0 || unmetMoqItems.length > 0) {
      const warningParts: string[] = [];
      if (exceedingItems.length > 0) {
        warningParts.push(
          `• Có ${exceedingItems.length} mặt hàng vượt mức giá trần kê khai Cục Quản Lý Dược (Bộ Y Tế).`,
        );
      }
      if (unmetMoqItems.length > 0) {
        warningParts.push(
          `• Có ${unmetMoqItems.length} mặt hàng có MOQ (SL đặt tối thiểu) cao hơn SL dự kiến của nhà thuốc. Hội đồng Thu mua sẽ xem xét nâng số lượng đặt hoặc thương lượng lại.`,
        );
      }

      setConfirmModal({
        isOpen: true,
        title: 'Xác nhận gửi bảng chào giá kèm lưu ý',
        description: `${warningParts.join('\n')}\n\nQuý đối tác có chắc chắn muốn gửi bảng báo giá này đến Phòng Thu Mua không?`,
        onConfirm: () => {
          setConfirmModal(null);
          executeSubmit();
        },
      });
      return;
    }

    await executeSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full space-y-4">
          <Loader2 size={44} className="animate-spin text-sky-600 mx-auto" />
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
            {error || 'Đường link này có thể đã hết hạn nhận báo giá hoặc bị hủy bởi phòng Thu Mua.'}
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 block">
              Vui lòng liên hệ Phòng Thu Mua Chuỗi Nhà Thuốc ABC Pharmacy nếu cần cấp lại liên kết mới.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const supplier = rfqData.supplier || {};
  const isExpired = rfqData.isExpired;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header thương hiệu bên mời thầu */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-sky-600 to-teal-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-sky-500/20">
              ABC
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Phòng Thu Mua • Hệ Thống Chuỗi Nhà Thuốc ABC Pharmacy
              </span>
              <h1 className="text-xl font-black text-slate-900">
                Cổng Chào Giá Dành Cho Bộ Phận Sale Nhà Cung Cấp (RFQ)
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
            <Clock size={16} className="text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block font-medium">Hạn chót nhận báo giá:</span>
              <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                {new Date(rfqData.deadline).toLocaleString('vi-VN')} {isExpired && '(Đã hết hạn)'}
              </span>
            </div>
          </div>
        </div>

        {/* Banner nhận diện chính xác NCC & Sale phụ trách */}
        <div className="bg-gradient-to-r from-sky-800 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold">
              <UserCheck size={14} />
              Liên Kết Định Danh Riêng (Magic Link) • Không Cần Tài Khoản
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-sky-200 uppercase tracking-wider font-semibold block">
                  Nhà cung cấp được mời chào giá
                </span>
                <p className="text-lg font-black text-white">{supplier.supplierName}</p>
                <div className="flex items-center flex-wrap gap-3 text-xs text-slate-300 mt-1">
                  {supplier.phone && <span>SĐT: {supplier.phone}</span>}
                  {supplier.email && <span>Email: {supplier.email}</span>}
                </div>
              </div>

              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
                <span className="text-[11px] text-sky-200 uppercase tracking-wider font-semibold block">
                  Bộ phận Sale / Trình dược viên tiếp nhận
                </span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {supplier.salesRepName || 'Đại diện Kinh doanh (Sales Rep)'}
                </p>
                {supplier.salesRepPhone && (
                  <div className="flex items-center gap-1 text-xs text-sky-300 font-mono mt-0.5">
                    <Phone size={12} /> {supplier.salesRepPhone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI GIẢI THÍCH NGỮ CẢNH GỬI LINK BÁO GIÁ CHO BỘ PHẬN SALE NCC & CHÍNH SÁCH MOQ / BẬC GIÁ */}
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-black text-blue-950">
                Ngữ cảnh & Hướng dẫn điền báo giá dành cho Bộ phận Sale Nhà cung cấp
              </h2>
              <p className="text-xs text-blue-900/90 leading-relaxed">
                Quý Anh/Chị đang truy cập <strong>Liên kết chào giá bảo mật (Magic Link)</strong> do{' '}
                <strong>Phòng Thu Mua Chuỗi Nhà Thuốc ABC Pharmacy</strong> gửi trực tiếp qua Zalo/Email cho bộ phận
                Sale phụ trách của <strong>{supplier.supplierName}</strong>. Dữ liệu báo giá gửi lên sẽ được chuyển
                thẳng về Hội đồng Thu Mua để so sánh và phát hành Đơn đặt hàng (PO) tự động.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-[11px]">
            <div className="bg-white/90 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <Lock size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Bảo mật độc lập từng NCC</span>
                <span className="text-slate-600">
                  Mỗi NCC nhận 1 mã truy cập riêng, tuyệt đối không xem được bảng giá của đối thủ cạnh tranh.
                </span>
              </div>
            </div>
            <div className="bg-white/90 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <Package size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Số lượng đặt tối thiểu (MOQ)</span>
                <span className="text-slate-600">
                  <strong>MOQ (Minimum Order Quantity)</strong> là số lượng tối thiểu nhà thuốc cần đặt cho mỗi mặt
                  hàng để hưởng chính sách bán buôn của Quý công ty.
                </span>
              </div>
            </div>
            <div className="bg-white/90 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
              <Layers size={14} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Đơn giá theo bậc số lượng</span>
                <span className="text-slate-600">
                  Khai báo thêm các mốc chiết khấu mua sỉ (VD: từ 100, 300, 500 hộp). Hệ thống tự áp dụng bậc giá tốt
                  nhất theo SL đặt hàng.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Màn hình thông báo đã ghi nhận báo giá thành công */}
        {isSuccess && (
          <div className="bg-sky-50 border border-sky-300 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-sky-900">Báo Giá Đã Được Ghi Nhận Thành Công!</h2>
              <p className="text-xs text-sky-800 max-w-xl mx-auto leading-relaxed">
                Cảm ơn Bộ phận Sale của <strong>{supplier.supplierName}</strong> đã hoàn tất bảng chào giá cho đợt thu
                mua <strong>[{rfqData.rfqCode}] - {rfqData.title}</strong>. Dữ liệu MOQ và bậc đơn giá của Quý đối tác
                đã tự động đồng bộ realtime về Ma trận So sánh của Hội đồng Thu Mua ABC Pharmacy.
              </p>
            </div>

            {/* Tóm tắt báo giá đã gửi */}
            {submittedData?.items?.length > 0 && (
              <div className="bg-white rounded-xl border border-sky-200 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-700">Tóm tắt báo giá đã nộp:</span>
                  <span className="font-black text-sky-700 text-sm">
                    Tổng: {Math.round(submittedData.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {submittedData.items.map((it: any) => (
                    <div key={it.medicineId} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="font-bold text-slate-800">{it.medicineName}</span>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                          <span>MOQ: <strong>{it.moq || 1}</strong></span>
                          <span>• Đơn giá áp dụng: <strong className="text-sky-700">{Number(it.effectiveUnitPrice || it.quotedPrice || 0).toLocaleString('vi-VN')} đ</strong></span>
                          {Array.isArray(it.priceTiers) && it.priceTiers.length > 0 && (
                            <span className="text-teal-700">• {it.priceTiers.length} bậc giá sỉ</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">
                        HSD cam kết: {it.offeredShelfLifeMonths || it.committedShelfLifeMonths} tháng
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                <MessageSquare size={12} />
                Phòng Thu Mua sẽ thông báo kết quả chọn thầu và phát hành PO trực tiếp qua Zalo/Email của Quý Sale.
              </span>
            </div>
          </div>
        )}

        {/* Biểu mẫu nhập báo giá */}
        {!isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Điều kiện chung của phiên RFQ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-mono font-bold text-sky-600">Mã RFQ: {rfqData.rfqCode}</span>
                <h2 className="text-base font-bold text-slate-800 mt-0.5">{rfqData.title}</h2>
                {rfqData.notes && <p className="text-xs text-slate-500 mt-1 italic">"{rfqData.notes}"</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl text-xs">
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
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Kiểm soát Giá kê khai BYT:</span>
                    <span className="text-amber-800">
                      Tuân thủ <strong>NĐ 54/2017/NĐ-CP & QĐ 232 CSDL Dược</strong>. Không chào giá vượt trần kê khai.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách dược phẩm cần báo giá kèm MOQ & Đơn giá bậc thang */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-sky-600" />
                  Danh mục Dược phẩm cần báo giá ({items.length} mặt hàng)
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Đơn vị tiền tệ: VNĐ • Tự động áp dụng bậc giá tốt nhất
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => {
                  const isDateCompliant =
                    Number(item.committedShelfLifeMonths) >= Number(rfqData.minShelfLifeMonths || 18);
                  const pricing = calculateRfqItemTieredPricing(
                    item.quotedPrice,
                    item.quantityRequested,
                    item.priceTiers,
                    item.moq,
                    item.discountPercent,
                  );

                  return (
                    <div
                      key={item.medicineId}
                      className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                        item.isExceedingDeclaredPrice
                          ? 'border-rose-300 bg-rose-50/20'
                          : !pricing.isMoqMet
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200 hover:border-sky-300 bg-slate-50/50'
                      }`}
                    >
                      {/* Tiêu đề thuốc & Thành tiền live */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 block">
                              {idx + 1}. {item.medicineName}
                            </span>
                            {item.nationalDrugCode && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                SĐK BYT: {item.nationalDrugCode}
                              </span>
                            )}
                            {item.declaredPrice && item.declaredPrice > 0 ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  item.isExceedingDeclaredPrice
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                                    : 'bg-sky-50 text-sky-700 border-sky-300'
                                }`}
                              >
                                Trần kê khai BYT: {item.declaredPrice.toLocaleString('vi-VN')} đ
                                {item.isExceedingDeclaredPrice ? ' (⚠️ VƯỢT TRẦN)' : ' (✓ HỢP LỆ)'}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                            Mã: {item.sku || 'N/A'} • ĐVT: <strong>{item.unit}</strong> • SL nhà thuốc dự kiến đặt:{' '}
                            <strong className="text-slate-900 bg-slate-200/70 px-1.5 py-0.5 rounded">
                              {item.quantityRequested.toLocaleString('vi-VN')} {item.unit}
                            </strong>
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Đơn giá áp dụng:
                            {pricing.appliedTierMinQuantity ? (
                              <span className="ml-1 text-teal-700 font-bold">
                                {pricing.effectiveUnitPrice.toLocaleString('vi-VN')} đ (Bậc ≥ {pricing.appliedTierMinQuantity})
                              </span>
                            ) : (
                              <span className="ml-1 text-slate-700 font-bold">
                                {pricing.effectiveUnitPrice.toLocaleString('vi-VN')} đ
                              </span>
                            )}
                          </span>
                          <span className="text-base font-black text-sky-700 block">
                            {pricing.lineTotal.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {/* Grid 5 cột: Đơn giá cơ bản, MOQ, HSD, Chiết khấu, SL sẵn sàng cấp */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2.5 border-t border-slate-200/70">
                        {/* Đơn giá cơ bản */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Đơn giá cơ bản (VNĐ/{item.unit}) <span className="text-rose-500">*</span>
                            </label>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={item.quotedPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'quotedPrice', Number(e.target.value))}
                            placeholder="Nhập giá..."
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 bg-white ${
                              item.isExceedingDeclaredPrice
                                ? 'border-rose-400 bg-rose-50/40 text-rose-700 focus:ring-rose-500'
                                : 'border-slate-300 focus:ring-sky-500 focus:border-sky-500'
                            }`}
                            required
                          />
                          {item.isExceedingDeclaredPrice && (
                            <span className="text-[10px] text-rose-600 block mt-0.5 font-medium leading-tight">
                              Vượt trần BYT +
                              {(pricing.effectiveUnitPrice - (item.declaredPrice || 0)).toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>

                        {/* Số lượng đặt hàng tối thiểu (MOQ) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label
                              className="text-[11px] font-bold text-slate-700 flex items-center gap-1"
                              title="Minimum Order Quantity - Số lượng tối thiểu nhà thuốc bắt buộc phải đặt cho mặt hàng này"
                            >
                              MOQ (SL tối thiểu) <span className="text-rose-500">*</span>
                            </label>
                            {pricing.isMoqMet ? (
                              <span className="text-[10px] text-emerald-600 font-bold">✓ Đạt MOQ</span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold">⚠️ Cao hơn SL</span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={item.moq || ''}
                            onChange={(e) => handleItemChange(idx, 'moq', Math.max(1, Number(e.target.value)))}
                            placeholder="VD: 100"
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-bold focus:ring-2 bg-white ${
                              pricing.isMoqMet
                                ? 'border-slate-300 focus:ring-sky-500'
                                : 'border-amber-400 bg-amber-50/60 text-amber-800 focus:ring-amber-500'
                            }`}
                            required
                          />
                          {!pricing.isMoqMet ? (
                            <span className="text-[10px] text-amber-700 block mt-0.5 leading-tight font-medium">
                              Nhà thuốc cần tăng thêm {pricing.moqShortfall.toLocaleString('vi-VN')} {item.unit} để đạt MOQ
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Đặt tối thiểu từ {pricing.moq} {item.unit}/đơn
                            </span>
                          )}
                        </div>

                        {/* Hạn sử dụng cam kết */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-700">
                              HSD cam kết (tháng) <span className="text-rose-500">*</span>
                            </label>
                            {isDateCompliant ? (
                              <span className="text-[10px] text-sky-600 font-bold">✓ Đạt</span>
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
                                ? 'border-slate-300 focus:ring-sky-500 focus:border-sky-500'
                                : 'border-rose-400 bg-rose-50/50 text-rose-700 focus:ring-rose-500'
                            }`}
                            required
                          />
                        </div>

                        {/* Chiết khấu % */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Chiết khấu thêm (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.discountPercent || ''}
                            onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                            placeholder="0%"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>

                        {/* Số lượng có sẵn */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            SL sẵn sàng cấp ngay
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.availableQuantity || ''}
                            onChange={(e) => handleItemChange(idx, 'availableQuantity', Number(e.target.value))}
                            placeholder="Số lượng..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>
                      </div>

                      {/* BẢNG ĐƠN GIÁ THEO BẬC SỐ LƯỢNG (QUANTITY-BASED TIERED PRICING) */}
                      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Layers size={14} className="text-teal-600" />
                            <span className="text-xs font-bold text-slate-800">
                              Bảng đơn giá theo bậc số lượng (Mua sỉ càng nhiều giá càng ưu đãi)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAutoGenerateTiers(idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="Tự động gợi ý 3 mức giá ưu đãi theo số lượng"
                            >
                              <Sparkles size={12} />
                              Gợi ý 3 bậc sỉ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddPriceTier(idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <Plus size={12} />
                              Thêm bậc giá
                            </button>
                          </div>
                        </div>

                        {(!item.priceTiers || item.priceTiers.length === 0) ? (
                          <p className="text-[11px] text-slate-400 italic">
                            Chưa thiết lập bậc giá theo số lượng — hệ thống sẽ áp dụng cố định Đơn giá cơ bản ở trên.
                            Bấm <strong>"+ Thêm bậc giá"</strong> nếu Quý công ty có chính sách giảm giá khi đặt số
                            lượng lớn.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {item.priceTiers.map((tier, tIdx) => {
                              const isAppliedTier =
                                pricing.appliedTierMinQuantity !== undefined &&
                                Number(tier.minQuantity) === pricing.appliedTierMinQuantity;
                              return (
                                <div
                                  key={tIdx}
                                  className={`grid grid-cols-12 items-center gap-2 p-2 rounded-lg border text-xs ${
                                    isAppliedTier
                                      ? 'bg-teal-50/80 border-teal-300'
                                      : 'bg-slate-50/70 border-slate-200'
                                  }`}
                                >
                                  <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                                      Từ SL ≥
                                    </span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={tier.minQuantity || ''}
                                      onChange={(e) =>
                                        handleTierChange(idx, tIdx, 'minQuantity', Number(e.target.value))
                                      }
                                      className="w-full px-2 py-1 border border-slate-300 rounded-md text-xs font-bold bg-white text-center"
                                    />
                                    <span className="text-[10px] text-slate-500">{item.unit}</span>
                                  </div>

                                  <div className="col-span-5 sm:col-span-5 flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                                      Đơn giá:
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={tier.unitPrice || ''}
                                      onChange={(e) =>
                                        handleTierChange(idx, tIdx, 'unitPrice', Number(e.target.value))
                                      }
                                      className="w-full px-2 py-1 border border-slate-300 rounded-md text-xs font-bold bg-white text-right text-teal-800"
                                    />
                                    <span className="text-[10px] text-slate-500">đ</span>
                                  </div>

                                  <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-1.5">
                                    {isAppliedTier && (
                                      <span className="hidden sm:inline-flex text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                                        Đang áp dụng
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePriceTier(idx, tIdx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      title="Xóa bậc giá này"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Điều kiện thương mại & Nút gửi báo giá */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-sky-600" />
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
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500"
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
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Số ngày giao hàng kể từ khi nhận Đơn PO chính thức.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú chính sách MOQ hoặc Điều kiện giao hàng riêng
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ví dụ: Miễn phí vận chuyển tận kho GSP của chuỗi khi đạt MOQ, cam kết đủ hóa đơn VAT và phiếu kiểm nghiệm xuất xưởng..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    Tổng giá trị chào thầu dự kiến (đã áp dụng bậc giá & chiết khấu):
                  </span>
                  <span className="text-2xl font-black text-sky-800">
                    {Math.round(calculateTotal()).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || isExpired}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={18} />
                  {submitting ? 'Đang gửi bảng giá...' : 'Xác Nhận & Gửi Báo Giá Cho Nhà Thuốc'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Modal xác nhận tùy chỉnh (thay thế window.confirm) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Xem lại bảng giá
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg cursor-pointer"
              >
                Vẫn xác nhận gửi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container nội bộ */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl shadow-xl border text-xs font-semibold ${
              t.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-800'
                : t.type === 'warning'
                ? 'bg-amber-950/95 text-amber-100 border-amber-800'
                : t.type === 'info'
                ? 'bg-blue-950/95 text-blue-100 border-blue-800'
                : 'bg-sky-950/95 text-sky-100 border-sky-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'error' && <AlertCircle size={16} className="text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
              {t.type === 'info' && <Info size={16} className="text-blue-400" />}
              {t.type === 'success' && <CheckCircle2 size={16} className="text-sky-400" />}
            </div>
            <div className="flex-1 leading-relaxed">{t.message}</div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
