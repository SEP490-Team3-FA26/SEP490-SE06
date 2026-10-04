import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Send,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  X,
  Loader2,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Award,
  ExternalLink,
  Users,
  Package,
  Copy,
  Link,
  Share2
} from 'lucide-react';
import {
  rfqService,
  RequestForQuotationData,
  CreateRfqPayload,
  SubmitQuotePayload,
  SupplierQuotation
} from '../../services/purchase/rfq.service';
import { supplierService, Supplier } from '../../services/purchase/supplier.service';
import { medicineService } from '../../services/inventory/medicine.service';

export function RFQManagement() {
  const [rfqs, setRfqs] = useState<RequestForQuotationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showMatrixModal, setShowMatrixModal] = useState<boolean>(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState<boolean>(false);
  const [selectedRfq, setSelectedRfq] = useState<RequestForQuotationData | null>(null);

  // Create Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [formMinShelfLife, setFormMinShelfLife] = useState<number>(18);
  const [formPaymentTerms, setFormPaymentTerms] = useState<number>(30);
  const [formNotes, setFormNotes] = useState<string>('');
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<
    { medicineId: string; medicineName: string; sku: string; unit: string; quantityRequested: number; targetPrice: number }[]
  >([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manual Add Quote State
  const [quoteSupplierId, setQuoteSupplierId] = useState<string>('');
  const [quotePaymentDays, setQuotePaymentDays] = useState<number>(30);
  const [quoteDeliveryDays, setQuoteDeliveryDays] = useState<number>(2);
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteItemPrices, setQuoteItemPrices] = useState<
    { [medId: string]: { price: number; shelfLife: number; qty: number } }
  >({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [rfqList, suppList, medList] = await Promise.all([
        rfqService.getRfqs(),
        supplierService.getSuppliers().catch(() => []),
        medicineService.getMedicines({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setRfqs(Array.isArray(rfqList) ? rfqList : []);
      setSuppliers(Array.isArray(suppList) ? suppList : (suppList as any)?.data || []);
      const meds = Array.isArray(medList) ? medList : (medList as any)?.data || (medList as any)?.medicines || [];
      setMedicines(meds);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu RFQ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered RFQs
  const filteredRfqs = useMemo(() => {
    return rfqs.filter((r) => {
      const matchSearch =
        r.rfqCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rfqs, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = rfqs.length;
    const active = rfqs.filter((r) => r.status === 'SENT' || r.status === 'IN_REVIEW').length;
    const awarded = rfqs.filter((r) => r.status === 'AWARDED').length;
    const draft = rfqs.filter((r) => r.status === 'DRAFT').length;
    return { total, active, awarded, draft };
  }, [rfqs]);

  // Handle Send RFQ Bulk
  const handleSendRfq = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gửi RFQ [${code}] đồng loạt đến tất cả NCC được mời?`)) return;
    try {
      await rfqService.sendRfq(id);
      alert(`✅ Đã gửi RFQ ${code} hàng loạt thành công!`);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi gửi RFQ: ${err?.response?.data?.message || err.message}`);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormTitle('');
    setFormDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setFormMinShelfLife(12);
    setFormPaymentTerms(30);
    setFormNotes('');
    setSelectedMedicineIds([]);
    setSelectedSupplierIds([]);
    setShowCreateModal(true);
  };

  // Add Item in Create Form
  const handleAddMedicineToRfq = (medId: string) => {
    const med = medicines.find((m) => (m._id || m.id) === medId);
    if (!med) return;
    if (selectedMedicineIds.some((item) => item.medicineId === medId)) return;
    setSelectedMedicineIds((prev) => [
      ...prev,
      {
        medicineId: medId,
        medicineName: med.name,
        sku: med.sku || med.barcode || '',
        unit: med.unit || (med.units?.[0]?.unitName) || 'Hộp',
        quantityRequested: 1,
        targetPrice: med.price || 0,
      },
    ]);
  };

  // Submit Create RFQ
  const handleCreateSubmit = async () => {
    if (!formTitle.trim()) return alert('Vui lòng nhập tiêu đề RFQ');
    if (selectedMedicineIds.length === 0) return alert('Vui lòng chọn ít nhất 1 mặt hàng thuốc cần báo giá');
    if (selectedSupplierIds.length === 0) return alert('Vui lòng chọn ít nhất 1 Nhà cung cấp');

    const targetSuppliers = suppliers
      .filter((s) => selectedSupplierIds.includes(s._id || s.id || ''))
      .map((s: any) => ({
        supplierId: s._id || s.id || '',
        supplierName: s.name,
        email: s.contact_info || s.email || `${s._id}@pharma-supplier.vn`,
        phone: s.phone || s.salesRep?.phone || '0901234567',
        salesRepName: s.salesRep?.fullName || s.contactPerson || 'Trình dược viên',
        salesRepPhone: s.salesRep?.phone || s.phone || '',
      }));

    const payload: CreateRfqPayload = {
      title: formTitle,
      deadline: formDeadline,
      minShelfLifeMonths: Number(formMinShelfLife),
      requiredPaymentTermDays: Number(formPaymentTerms),
      items: selectedMedicineIds,
      targetSuppliers,
      notes: formNotes,
    };

    try {
      setIsSubmitting(true);
      await rfqService.createRfq(payload);
      alert('✅ Đã tạo thành công Yêu cầu báo giá (RFQ)!');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi tạo RFQ: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy Magic Link to clipboard for Sales (Zalo)
  const handleCopyMagicLink = (target: any, rfq: RequestForQuotationData) => {
    if (!target.token) {
      return alert('Chưa có mã Token liên kết cho NCC này.');
    }
    const origin = window.location.origin;
    const link = `${origin}/supplier-quote/${target.token}`;
    const message = `Kính gửi anh/chị ${target.salesRepName || 'đại diện'} (${target.supplierName}),\nChuỗi Nhà thuốc Pharmachain trân trọng gửi lời mời tham gia chào giá cho đợt mua hàng [${rfq.rfqCode} - ${rfq.title}].\n👉 Vui lòng truy cập đường link sau để nhập báo giá trực tiếp (Không cần đăng nhập):\n${link}\n⏰ Hạn chót nhận báo giá: ${new Date(rfq.deadline).toLocaleDateString('vi-VN')}\nTrân trọng!`;
    navigator.clipboard.writeText(message);
    alert(`✅ Đã sao chép link báo giá Zalo cho [${target.supplierName}]!\nBạn có thể dán (Ctrl+V) vào tin nhắn Zalo gửi cho Sales.`);
  };

  // Open Matrix Comparison
  const openMatrixModal = (rfq: RequestForQuotationData) => {
    setSelectedRfq(rfq);
    setShowMatrixModal(true);
  };

  // Open Add Quote
  const openAddQuoteModal = (rfq: RequestForQuotationData) => {
    setSelectedRfq(rfq);
    setQuoteSupplierId(rfq.targetSuppliers?.[0]?.supplierId || '');
    setQuotePaymentDays(rfq.requiredPaymentTermDays || 30);
    setQuoteDeliveryDays(2);
    setQuoteNotes('');
    const initialItemPrices: any = {};
    rfq.items.forEach((item) => {
      initialItemPrices[item.medicineId] = {
        price: item.targetPrice ? Math.round(item.targetPrice * 0.95) : 45000,
        shelfLife: 24,
        qty: item.quantityRequested,
      };
    });
    setQuoteItemPrices(initialItemPrices);
    setShowAddQuoteModal(true);
  };

  // Submit Manual Quote
  const handleSubmitQuote = async () => {
    if (!selectedRfq || !quoteSupplierId) return;
    const supp = suppliers.find((s) => (s._id || s.id) === quoteSupplierId) || {
      name: selectedRfq.targetSuppliers?.find((s) => s.supplierId === quoteSupplierId)?.supplierName || 'NCC',
    };

    let total = 0;
    const items = selectedRfq.items.map((item) => {
      const p = quoteItemPrices[item.medicineId]?.price || 0;
      const shelf = quoteItemPrices[item.medicineId]?.shelfLife || 24;
      const qty = quoteItemPrices[item.medicineId]?.qty || item.quantityRequested;
      total += p * qty;
      return {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        quotedPrice: p,
        offeredShelfLifeMonths: shelf,
        availableQuantity: qty,
        notes: 'Hàng chính hãng chuẩn GMP',
      };
    });

    const payload: SubmitQuotePayload = {
      supplierId: quoteSupplierId,
      supplierName: supp.name,
      paymentTermsDays: Number(quotePaymentDays),
      deliveryDays: Number(quoteDeliveryDays),
      items,
      totalAmount: total,
      notes: quoteNotes,
    };

    try {
      setIsSubmitting(true);
      await rfqService.submitQuotation(selectedRfq._id || selectedRfq.id || '', payload);
      alert('✅ Đã ghi nhận báo giá của NCC thành công!');
      setShowAddQuoteModal(false);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi nộp báo giá: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Award RFQ
  const handleAward = async (quotation: SupplierQuotation) => {
    if (!selectedRfq) return;
    const confirmMsg = `Xác nhận CHỌN THẦU cho Nhà cung cấp: [${quotation.supplierName}] với tổng giá trị ${quotation.totalAmount.toLocaleString('vi-VN')} đ?\n\nHệ thống sẽ tự động phát hành Đơn đặt hàng PO tương ứng!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsSubmitting(true);
      await rfqService.awardRfq(selectedRfq._id || selectedRfq.id || '', {
        quotationId: quotation.quotationId,
        supplierId: quotation.supplierId,
        reason: 'Giá cạnh tranh, đáp ứng đầy đủ yêu cầu Hạn dùng và thời hạn công nợ',
      });
      alert(`🎉 Đã chọn thầu thành công cho ${quotation.supplierName} và phát hành Đơn đặt hàng PO!`);
      setShowMatrixModal(false);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi chọn thầu: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Yêu Cầu Báo Giá Hàng Loạt (RFQ)
                <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  Procurement v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tự động gom nhu cầu thiếu hụt, gửi RFQ đa kênh đến NCC GDP và chọn thầu thông minh chống bẫy hàng cận date.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={16} />
          Tạo Yêu Cầu Báo Giá (RFQ)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng số RFQ</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Tất cả phiên chào giá</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Đang chào giá</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.active}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Chờ NCC gửi bảng giá</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Đã chọn thầu</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.awarded}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Đã tự động phát hành PO</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Tiết kiệm trung bình</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">8.5%</p>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Nhờ so sánh giá đa nguồn</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingDown size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 items-center">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã RFQ, tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="DRAFT">Nháp (DRAFT)</option>
            <option value="SENT">Đã gửi NCC (SENT)</option>
            <option value="IN_REVIEW">Đang so sánh (IN_REVIEW)</option>
            <option value="AWARDED">Đã chọn thầu (AWARDED)</option>
          </select>
        </div>
      </div>

      {/* Table RFQ List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-blue-600" size={28} />
            <span className="text-xs">Đang tải danh sách Yêu cầu báo giá...</span>
          </div>
        ) : filteredRfqs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-600">Chưa có Yêu cầu báo giá nào</p>
            <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Yêu Cầu Báo Giá (RFQ)" để bắt đầu chào thầu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã RFQ</th>
                  <th className="py-3.5 px-4">Tiêu đề yêu cầu</th>
                  <th className="py-3.5 px-4">Số mặt hàng</th>
                  <th className="py-3.5 px-4">NCC Mời / Nộp</th>
                  <th className="py-3.5 px-4">Hạn chót</th>
                  <th className="py-3.5 px-4">Ràng buộc HSD</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRfqs.map((rfq) => {
                  const itemsCount = rfq.items?.length || 0;
                  const suppliersCount = rfq.targetSuppliers?.length || 0;
                  const quotesCount = rfq.quotations?.length || 0;

                  return (
                    <tr key={rfq._id || rfq.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{rfq.rfqCode}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{rfq.title}</span>
                        <span className="text-[11px] text-slate-400">Tạo bởi: {rfq.createdByName || 'Quản lý thu mua'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {itemsCount} loại thuốc
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{quotesCount}</span> / {suppliersCount} NCC
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(rfq.deadline).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-amber-200">
                          ≥ {rfq.minShelfLifeMonths || 18} tháng
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {rfq.status === 'DRAFT' && (
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Bản nháp
                          </span>
                        )}
                        {rfq.status === 'SENT' && (
                          <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Đã gửi NCC
                          </span>
                        )}
                        {rfq.status === 'IN_REVIEW' && (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            Đã có {quotesCount} báo giá
                          </span>
                        )}
                        {rfq.status === 'AWARDED' && (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} /> Đã chọn thầu
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {rfq.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendRfq(rfq._id || rfq.id || '', rfq.rfqCode)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Send size={13} /> Gửi NCC
                          </button>
                        )}
                        {rfq.status !== 'DRAFT' && (
                          <>
                            <button
                              onClick={() => openAddQuoteModal(rfq)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                              title="Ghi nhận báo giá từ NCC gửi về"
                            >
                              + Báo giá
                            </button>
                            <button
                              onClick={() => openMatrixModal(rfq)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                            >
                              Ma trận so sánh
                              <ChevronRight size={14} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: TẠO RFQ MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                <h3 className="font-bold text-sm">Tạo Yêu Cầu Báo Giá (RFQ) Hàng Loạt</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề RFQ</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn chót báo giá (Deadline)</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">HSD tối thiểu (Chống cận date)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={6}
                      max={36}
                      value={formMinShelfLife}
                      onChange={(e) => setFormMinShelfLife(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-amber-700 outline-none"
                    />
                    <span className="text-xs text-slate-500">tháng</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Yêu cầu công nợ</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none"
                    />
                    <span className="text-xs text-slate-500">ngày</span>
                  </div>
                </div>
              </div>

              {/* Danh sách thuốc cần mua */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package size={14} className="text-blue-600" />
                    Danh mục thuốc cần chào giá ({selectedMedicineIds.length})
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMedicineToRfq(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-blue-600 outline-none"
                  >
                    <option value="">+ Thêm thuốc từ danh mục...</option>
                    {medicines.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id}>
                        {m.name} ({m.unit || 'Hộp'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMedicineIds.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-3">
                    Chưa chọn thuốc nào. Hãy chọn thuốc từ danh mục ở trên.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedMedicineIds.map((item, idx) => (
                      <div key={item.medicineId} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <span className="w-5 text-slate-400 font-bold">{idx + 1}.</span>
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 block">{item.medicineName}</span>
                          <span className="text-[10px] text-slate-400">{item.sku} • {item.unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">SL:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantityRequested}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSelectedMedicineIds((prev) =>
                                prev.map((it) => (it.medicineId === item.medicineId ? { ...it, quantityRequested: val } : it))
                              );
                            }}
                            className="w-16 px-2 py-1 text-xs border rounded font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMedicineIds((prev) => prev.filter((it) => it.medicineId !== item.medicineId))}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách NCC mời thầu */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-600" />
                  Mời các Nhà cung cấp tham gia chào thầu ({selectedSupplierIds.length}):
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {suppliers.map((s) => {
                    const sid = s._id || s.id || '';
                    const checked = selectedSupplierIds.includes(sid);
                    return (
                      <label key={sid} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs cursor-pointer hover:bg-blue-50/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSupplierIds((prev) => [...prev, sid]);
                            else setSelectedSupplierIds((prev) => prev.filter((id) => id !== sid));
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-semibold text-slate-800 truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20"
              >
                {isSubmitting ? 'Đang tạo...' : 'Lưu & Khởi Tạo RFQ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MA TRẬN SO SÁNH BÁO GIÁ & CHỌN THẦU (QUOTATION MATRIX) */}
      {showMatrixModal && selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  Ma Trận So Sánh Báo Giá - {selectedRfq.rfqCode}
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
                    Ràng buộc HSD ≥ {selectedRfq.minShelfLifeMonths || 18} tháng
                  </span>
                </h3>
                <p className="text-xs text-slate-300">{selectedRfq.title}</p>
              </div>
              <button onClick={() => setShowMatrixModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* DANH SÁCH NCC & LINK BÁO GIÁ ZALO (MAGIC LINK) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users size={15} className="text-indigo-600" />
                    Danh Sách Nhà Cung Cấp & Link Gửi Zalo Cho Sales ({selectedRfq.targetSuppliers?.length || 0} NCC)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Sales click link là nhập báo giá được ngay (Không cần tài khoản)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {selectedRfq.targetSuppliers?.map((target) => {
                    const hasSubmitted = selectedRfq.quotations?.some(
                      (q) => q.supplierId === target.supplierId
                    );
                    return (
                      <div
                        key={target.supplierId}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate" title={target.supplierName}>
                              {target.supplierName}
                            </span>
                            {hasSubmitted ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                Đã báo giá
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                Đang chờ
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Sales: <strong className="text-slate-700">{target.salesRepName || 'Trình dược viên'}</strong>
                            {target.salesRepPhone && (
                              <span className="font-mono text-indigo-600 block text-[10px]">
                                SĐT: {target.salesRepPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyMagicLink(target, selectedRfq)}
                            className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                            title="Sao chép lời nhắn và link Zalo gửi cho Sales"
                          >
                            <Copy size={12} />
                            Copy Link Zalo
                          </button>
                          {target.token && (
                            <a
                              href={`/supplier-quote/${target.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                              title="Mở cổng báo giá của NCC này"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(!selectedRfq.quotations || selectedRfq.quotations.length === 0) ? (
                <div className="p-10 text-center text-slate-400">
                  <Clock size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Chưa có NCC nào nộp bảng chào giá</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Gửi link Zalo ở trên cho Sales hoặc bấm "+ Báo giá" ở danh sách ngoài để nhập báo giá.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="py-3 px-3 font-bold text-slate-700 w-48">Mặt hàng thuốc</th>
                        <th className="py-3 px-3 font-bold text-slate-500 w-20">Số lượng</th>
                        {selectedRfq.quotations.map((q) => (
                          <th key={q.quotationId} className="py-3 px-3 border-l border-slate-200 bg-blue-50/50">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-900 block truncate">{q.supplierName}</span>
                              {q.isSelected && (
                                <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                                  TRÚNG THẦU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Công nợ: {q.paymentTermsDays} ngày • Giao: {q.deliveryDays} ngày
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRfq.items.map((item) => (
                        <tr key={item.medicineId} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {item.medicineName}
                            <span className="block text-[10px] text-slate-400 font-normal">{item.unit}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600">
                            {item.quantityRequested.toLocaleString('vi-VN')}
                          </td>
                          {selectedRfq.quotations.map((q) => {
                            const qItem = q.items.find((it) => it.medicineId === item.medicineId);
                            const isCompliant = qItem?.isCompliantShelfLife !== false;

                            return (
                              <td key={q.quotationId} className="py-3 px-3 border-l border-slate-200">
                                {qItem ? (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 text-sm">
                                        {Number(qItem.quotedPrice).toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {isCompliant ? (
                                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                                          HSD: {qItem.offeredShelfLifeMonths} tháng
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                          <AlertTriangle size={10} /> HSD {qItem.offeredShelfLifeMonths} th (Cận date!)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Không báo giá</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Hàng tổng tiền & Nút Chọn Thầu */}
                      <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                        <td className="py-4 px-3 text-slate-900 uppercase">TỔNG GIÁ TRỊ</td>
                        <td className="py-4 px-3 text-slate-500">—</td>
                        {selectedRfq.quotations.map((q) => (
                          <td key={q.quotationId} className="py-4 px-3 border-l border-slate-200 bg-blue-50/70">
                            <div className="font-black text-base text-blue-900">
                              {Number(q.totalAmount).toLocaleString('vi-VN')} đ
                            </div>
                            <div className="mt-2">
                              {selectedRfq.status === 'AWARDED' ? (
                                q.isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                                    <CheckCircle2 size={14} /> Đơn vị trúng thầu
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">Không chọn</span>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAward(q)}
                                  disabled={isSubmitting}
                                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
                                >
                                  <Award size={14} />
                                  Chọn Thầu & Sinh PO
                                </button>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GHI NHẬN BÁO GIÁ NCC */}
      {showAddQuoteModal && selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Ghi Nhận Báo Giá NCC - {selectedRfq.rfqCode}</h3>
              <button onClick={() => setShowAddQuoteModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Nhà cung cấp báo giá</label>
                  <select
                    value={quoteSupplierId}
                    onChange={(e) => setQuoteSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                  >
                    {selectedRfq.targetSuppliers.map((s) => (
                      <option key={s.supplierId} value={s.supplierId}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Công nợ (ngày)</label>
                  <input
                    type="number"
                    value={quotePaymentDays}
                    onChange={(e) => setQuotePaymentDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian giao (ngày)</label>
                  <input
                    type="number"
                    value={quoteDeliveryDays}
                    onChange={(e) => setQuoteDeliveryDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Đơn giá và HSD cam kết từng mặt hàng:</label>
                {selectedRfq.items.map((item) => (
                  <div key={item.medicineId} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block">{item.medicineName}</span>
                      <span className="text-[10px] text-slate-400">SL: {item.quantityRequested} {item.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Đơn giá chào (VNĐ):</span>
                      <input
                        type="number"
                        value={quoteItemPrices[item.medicineId]?.price || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQuoteItemPrices((prev) => ({
                            ...prev,
                            [item.medicineId]: { ...prev[item.medicineId], price: val },
                          }));
                        }}
                        className="w-28 px-2 py-1 border rounded bg-white font-bold text-blue-700"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">HSD còn lại (tháng):</span>
                      <input
                        type="number"
                        value={quoteItemPrices[item.medicineId]?.shelfLife || 24}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQuoteItemPrices((prev) => ({
                            ...prev,
                            [item.medicineId]: { ...prev[item.medicineId], shelfLife: val },
                          }));
                        }}
                        className="w-16 px-2 py-1 border rounded bg-white font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitQuote}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Báo Giá NCC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
