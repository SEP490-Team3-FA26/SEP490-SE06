import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Share2,
  Filter,
  Check,
  Trash2,
  Warehouse,
  Zap,
  RotateCcw
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    {
      medicineId: string;
      medicineName: string;
      sku: string;
      unit: string;
      currentStock?: number;
      quantityRequested: number;
      targetPrice: number;
      nationalDrugCode?: string;
      declaredPrice?: number;
    }[]
  >([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // States bộ lọc & tìm kiếm danh mục dược phẩm đồng bộ bên kho
  const [medSearchQuery, setMedSearchQuery] = useState<string>('');
  const [selectedMedCategory, setSelectedMedCategory] = useState<string>('all');
  const [medStockFilter, setMedStockFilter] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');

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
        rfqService.getRfqs().catch(() => []),
        supplierService.getSuppliers().catch(() => []),
        medicineService.getMedicines({ limit: 500 }).catch(() => ({ data: [] })),
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

  // Xử lý tự động prefill thuốc cần chào giá từ Kho hoặc AI Forecast qua sessionStorage hoặc URL query
  useEffect(() => {
    const openCreate = searchParams.get('openCreateRFQ');
    const urlPrefill = searchParams.get('prefillMeds');
    let prefillStr = urlPrefill;

    if (!prefillStr) {
      try {
        prefillStr = sessionStorage.getItem('rfq_prefill_meds');
      } catch (_) {}
    }

    if (openCreate === 'true') {
      if (prefillStr) {
        try {
          const decoded =
            typeof prefillStr === 'string' && prefillStr.startsWith('%')
              ? JSON.parse(decodeURIComponent(prefillStr))
              : typeof prefillStr === 'string'
              ? JSON.parse(prefillStr)
              : prefillStr;

          if (Array.isArray(decoded) && decoded.length > 0) {
            const prefillList = decoded.map((d: any) => ({
              medicineId: d.medicineId || d._id || d.id,
              medicineName: d.name || d.medicineName,
              sku: d.sku || d.barcode || '',
              unit: d.unit || 'Hộp',
              currentStock: Number(d.currentStock || d.stock || 0),
              quantityRequested: Number(d.suggestedOrderQty || d.quantityRequested || d.quantity || 100),
              targetPrice: Number(d.price || d.targetPrice || d.unitPrice || 0),
              nationalDrugCode: d.nationalDrugCode || d.registration_number || '',
              declaredPrice: Number(d.price || d.declaredPrice || d.targetPrice || 0),
            }));
            setSelectedMedicineIds(prefillList);
            setFormTitle(`Đợt chào giá nhập bổ sung kho (Chuẩn GPP) - ${new Date().toLocaleDateString('vi-VN')}`);
          }
        } catch (e) {
          console.error('Lỗi khi phân tích danh sách thuốc cần chào giá', e);
        } finally {
          try {
            sessionStorage.removeItem('rfq_prefill_meds');
          } catch (_) {}
        }
      }
      setShowCreateModal(true);
      setSearchParams(
        (prev) => {
          prev.delete('openCreateRFQ');
          prev.delete('prefillMeds');
          return prev;
        },
        { replace: true }
      );
    }
  }, [searchParams, medicines]);

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

  // Trích xuất danh sách danh mục (category) từ medicines
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) set.add(m.category.trim());
    });
    return Array.from(set).sort();
  }, [medicines]);

  // Bộ lọc danh mục dược phẩm đồng bộ như bên kho
  const filteredCatalogMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = medSearchQuery.toLowerCase().trim();
      const nameMatch = (m.name || '').toLowerCase().includes(q);
      const skuMatch = (m.sku || m.barcode || '').toLowerCase().includes(q);
      const ingredientMatch = (m.ingredient || m.activeIngredient || '').toLowerCase().includes(q);
      const matchSearch = !q || nameMatch || skuMatch || ingredientMatch;

      const matchCategory = selectedMedCategory === 'all' || (m.category || '').trim() === selectedMedCategory;

      const stock = Number(m.stock || 0);
      const reorderPoint = Number(m.reorderPoint || m.minStock || 30);
      let matchStock = true;
      if (medStockFilter === 'out_of_stock') {
        matchStock = stock <= 0;
      } else if (medStockFilter === 'low_stock') {
        matchStock = stock <= reorderPoint;
      }

      return matchSearch && matchCategory && matchStock;
    });
  }, [medicines, medSearchQuery, selectedMedCategory, medStockFilter]);

  // Mở modal tạo RFQ
  const openCreateModal = () => {
    setFormTitle(`Yêu cầu báo giá dược phẩm - ${new Date().toLocaleDateString('vi-VN')}`);
    setFormDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setFormMinShelfLife(18);
    setFormPaymentTerms(30);
    setFormNotes('');
    setMedSearchQuery('');
    setSelectedMedCategory('all');
    setMedStockFilter('all');
    setSelectedMedicineIds([]);
    setSelectedSupplierIds([]);
    setShowCreateModal(true);
  };

  // Thêm thuốc từ danh mục kho vào danh sách chào giá
  const handleAddMedicineToRfq = (medId: string) => {
    const med = medicines.find((m) => (m._id || m.id) === medId);
    if (!med) return;
    if (selectedMedicineIds.some((item) => item.medicineId === medId)) return;
    const stock = Number(med.stock || 0);
    const defaultQty = stock <= 0 ? 100 : 50;
    setSelectedMedicineIds((prev) => [
      ...prev,
      {
        medicineId: medId,
        medicineName: med.name,
        sku: med.sku || med.barcode || '',
        unit: med.unit || (med.units?.[0]?.unitName) || 'Hộp',
        currentStock: stock,
        quantityRequested: defaultQty,
        targetPrice: med.price || 0,
        nationalDrugCode: med.national_drug_code || med.registration_number || '',
        declaredPrice: med.price || 0,
      },
    ]);
  };

  // Chọn hàng loạt các thuốc đang thiếu hụt (Hết hàng hoặc Tồn < ROP) vào RFQ
  const handleAddAllShortageMedicines = () => {
    const shortageMeds = medicines.filter((m) => {
      const stock = Number(m.stock || 0);
      const reorderPoint = Number(m.reorderPoint || m.minStock || 30);
      return stock <= reorderPoint;
    });

    if (shortageMeds.length === 0) {
      alert("Tất cả dược phẩm trong kho hiện tại đều đang ở mức an toàn!");
      return;
    }

    const newItems = shortageMeds
      .filter((m) => !selectedMedicineIds.some((it) => it.medicineId === (m._id || m.id)))
      .map((m) => {
        const stock = Number(m.stock || 0);
        return {
          medicineId: m._id || m.id,
          medicineName: m.name,
          sku: m.sku || m.barcode || '',
          unit: m.unit || (m.units?.[0]?.unitName) || 'Hộp',
          currentStock: stock,
          quantityRequested: stock <= 0 ? 100 : 50,
          targetPrice: m.price || 0,
        };
      });

    if (newItems.length === 0) {
      alert("Tất cả các thuốc thiếu hụt đã có trong danh sách chào giá.");
      return;
    }

    setSelectedMedicineIds((prev) => [...prev, ...newItems]);
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
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

              {/* DANH MỤC DƯỢC PHẨM ĐỒNG BỘ NHƯ BÊN KHO ĐỂ BÁO GIÁ */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Warehouse size={15} className="text-blue-600" />
                      Danh Mục Dược Phẩm Bên Kho ({filteredCatalogMedicines.length}/{medicines.length})
                    </span>
                    <p className="text-[11px] text-slate-500">Tra cứu tồn kho thực tế và chọn các mặt hàng cần nhà cung cấp gửi báo giá</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAllShortageMedicines}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors shadow-sm"
                    title="Tự động chọn toàn bộ thuốc đang hết hàng hoặc sắp hết hàng vào danh sách chào giá"
                  >
                    <Zap size={13} className="text-amber-600" />
                    + Thêm tất cả thuốc thiếu hụt
                  </button>
                </div>

                {/* Thanh công cụ tìm kiếm và lọc danh mục như bên kho */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                  <div className="md:col-span-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Tìm theo tên thuốc, mã SKU, hoạt chất..."
                      value={medSearchQuery}
                      onChange={(e) => setMedSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {medSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMedSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <select
                      value={selectedMedCategory}
                      onChange={(e) => setSelectedMedCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                    >
                      <option value="all">Tất cả nhóm dược lý</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMedStockFilter('all')}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        medStockFilter === 'all'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedStockFilter('out_of_stock')}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        medStockFilter === 'out_of_stock'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-red-600 border-slate-200 hover:bg-red-50'
                      }`}
                      title="Thuốc có tồn kho bằng 0"
                    >
                      Hết hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedStockFilter('low_stock')}
                      className={`flex-1 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        medStockFilter === 'low_stock'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-amber-700 border-slate-200 hover:bg-amber-50'
                      }`}
                      title="Thuốc có tồn kho dưới ngưỡng an toàn ROP"
                    >
                      Sắp hết
                    </button>
                  </div>
                </div>

                {/* Bảng danh mục dược phẩm bên kho */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Tên dược phẩm & Hoạt chất</th>
                          <th className="py-2 px-3">SKU / Nhóm</th>
                          <th className="py-2 px-3 text-center">ĐVT</th>
                          <th className="py-2 px-3 text-center">Tồn kho</th>
                          <th className="py-2 px-3 text-right">Giá tham chiếu</th>
                          <th className="py-2 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCatalogMedicines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400 italic">
                              Không tìm thấy dược phẩm nào khớp với điều kiện lọc.
                            </td>
                          </tr>
                        ) : (
                          filteredCatalogMedicines.slice(0, 50).map((med) => {
                            const medId = med._id || med.id;
                            const isSelected = selectedMedicineIds.some((it) => it.medicineId === medId);
                            const stock = Number(med.stock || 0);
                            const reorderPoint = Number(med.reorderPoint || med.minStock || 30);

                            return (
                              <tr key={medId} className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/20' : ''}`}>
                                <td className="py-2 px-3">
                                  <span className="font-bold text-slate-900 block">{med.name}</span>
                                  {(med.ingredient || med.activeIngredient) && (
                                    <span className="text-[10px] text-slate-400 block line-clamp-1">
                                      {med.ingredient || med.activeIngredient}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="font-mono text-[10px] text-slate-500 block">{med.sku || med.barcode || 'N/A'}</span>
                                  <span className="text-[10px] text-blue-600 block line-clamp-1">{med.category || 'Chung'}</span>
                                </td>
                                <td className="py-2 px-3 text-center font-medium text-slate-700">
                                  {med.unit || (med.units?.[0]?.unitName) || 'Hộp'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {stock <= 0 ? (
                                    <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      Hết hàng (0)
                                    </span>
                                  ) : stock <= reorderPoint ? (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      Tồn thấp ({stock})
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      Còn hàng ({stock})
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-700">
                                  {Number(med.price || 0).toLocaleString('vi-VN')} đ
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {isSelected ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded">
                                      <Check size={13} /> Đã chọn
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddMedicineToRfq(medId)}
                                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded text-xs transition-colors inline-flex items-center gap-1 shadow-sm"
                                    >
                                      <Plus size={12} /> Thêm
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DANH SÁCH CÁC MẶT HÀNG ĐÃ CHỌN ĐỂ YÊU CẦU BÁO GIÁ */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package size={14} className="text-indigo-600" />
                      Danh mục thuốc đã chọn gửi báo giá ({selectedMedicineIds.length} mặt hàng)
                    </span>
                    {selectedMedicineIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedMedicineIds([])}
                        className="text-[11px] text-red-600 hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 size={11} /> Xóa tất cả
                      </button>
                    )}
                  </div>

                  {selectedMedicineIds.length === 0 ? (
                    <div className="bg-white p-5 rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                      Chưa chọn dược phẩm nào. Hãy bấm <strong>"+ Thêm"</strong> từ danh mục kho ở trên.
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 w-8">#</th>
                            <th className="py-2 px-3">Tên thuốc & Quy cách</th>
                            <th className="py-2 px-3 text-center">Tồn kho</th>
                            <th className="py-2 px-3 text-center w-28">SL cần chào</th>
                            <th className="py-2 px-3 text-right w-36">Giá trần mục tiêu</th>
                            <th className="py-2 px-3 text-right">Dự toán</th>
                            <th className="py-2 px-2 text-center w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {selectedMedicineIds.map((item, idx) => {
                            const subtotal = (item.quantityRequested || 0) * (item.targetPrice || 0);
                            return (
                              <tr key={item.medicineId} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900">{item.medicineName}</span>
                                    {item.nationalDrugCode ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200" title="Mã Dược Quốc Gia / Số Đăng Ký BYT">
                                        Mã BYT: {item.nationalDrugCode}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500">
                                        Chuẩn GPP
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                    <span>{item.sku ? `SKU: ${item.sku}` : 'SKU: Tự động'} • {item.unit}</span>
                                    {item.declaredPrice ? (
                                      <span className="text-emerald-700 font-medium">
                                        • Giá trần BYT: {item.declaredPrice.toLocaleString('vi-VN')} đ
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                                  {item.currentStock !== undefined ? item.currentStock : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
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
                                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-center focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px] text-slate-400">{item.unit}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      step={500}
                                      value={item.targetPrice || ''}
                                      onChange={(e) => {
                                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                                        setSelectedMedicineIds((prev) =>
                                          prev.map((it) => (it.medicineId === item.medicineId ? { ...it, targetPrice: val } : it))
                                        );
                                      }}
                                      className="w-24 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-right focus:ring-1 focus:ring-blue-500"
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] text-slate-400">đ</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                                  {subtotal.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMedicineIds((prev) => prev.filter((it) => it.medicineId !== item.medicineId))}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                    title="Xóa khỏi đợt chào giá"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                          <tr>
                            <td colSpan={3} className="py-2.5 px-3 text-slate-700 uppercase">
                              Tổng cộng ({selectedMedicineIds.length} loại thuốc):
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-900 font-black">
                              {selectedMedicineIds.reduce((sum, it) => sum + (it.quantityRequested || 0), 0).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">Dự toán mục tiêu:</td>
                            <td className="py-2.5 px-3 text-right text-blue-900 font-black text-sm">
                              {selectedMedicineIds
                                .reduce((sum, it) => sum + (it.quantityRequested || 0) * (it.targetPrice || 0), 0)
                                .toLocaleString('vi-VN')}{' '}
                              đ
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
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

            {/* NỘI DUNG MA TRẬN SO SÁNH */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedRfq.targetSuppliers?.map((target) => {
                    const quotation = selectedRfq.quotations?.find(
                      (q) => q.supplierId === target.supplierId
                    );
                    const hasSubmitted = Boolean(quotation || target.status === 'SUBMITTED');
                    return (
                      <div
                        key={target.supplierId}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                          hasSubmitted
                            ? 'bg-white border-emerald-200 shadow-xs'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-900 truncate" title={target.supplierName}>
                              {target.supplierName}
                            </span>
                            {hasSubmitted ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                                Đã báo giá
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full shrink-0">
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
                            className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
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
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
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

              {/* BẢNG MA TRẬN SO SÁNH GIÁ (TCO MATRIX) ĐỒNG BỘ 1-1 VỚI TẤT CẢ NCC ĐƯỢC MỜI */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200">
                      <th className="py-3.5 px-4 font-bold text-slate-700 min-w-[240px] w-64">
                        Mặt hàng thuốc
                      </th>
                      <th className="py-3.5 px-3 font-bold text-slate-500 min-w-[90px] w-24 text-center">
                        Số lượng
                      </th>
                      {selectedRfq.targetSuppliers?.map((target) => {
                        const quotation = selectedRfq.quotations?.find(
                          (q) => q.supplierId === target.supplierId
                        );
                        return (
                          <th
                            key={target.supplierId}
                            className={`py-3.5 px-4 border-l border-slate-200 min-w-[230px] ${
                              quotation ? 'bg-blue-50/50' : 'bg-slate-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 block truncate" title={target.supplierName}>
                                {target.supplierName}
                              </span>
                              {quotation?.isSelected && (
                                <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0">
                                  TRÚNG THẦU
                                </span>
                              )}
                            </div>
                            {quotation ? (
                              <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                                Công nợ: {quotation.paymentTermsDays || 30} ngày • Giao: {quotation.deliveryDays || 2} ngày
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-medium block mt-0.5 italic">
                                ⏳ Đang chờ gửi báo giá
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRfq.items.map((item, itemIdx) => (
                      <tr key={item.medicineId || itemIdx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="text-slate-900 leading-snug">{item.medicineName}</div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                              ĐVT: {item.unit || 'Hộp'}
                            </span>
                            {item.nationalDrugCode && (
                              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded font-mono text-[9px] font-bold">
                                SĐK BYT: {item.nationalDrugCode}
                              </span>
                            )}
                            {item.declaredPrice && item.declaredPrice > 0 ? (
                              <span className="text-[10px] text-emerald-700 font-medium block w-full mt-0.5">
                                Trần kê khai BYT: {Number(item.declaredPrice).toLocaleString('vi-VN')} đ
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-700 text-center">
                          {item.quantityRequested.toLocaleString('vi-VN')}
                        </td>
                        {selectedRfq.targetSuppliers?.map((target) => {
                          const quotation = selectedRfq.quotations?.find(
                            (q) => q.supplierId === target.supplierId
                          );
                          const qItem = quotation?.items?.find((it) => it.medicineId === item.medicineId);
                          const offeredMonths =
                            qItem?.offeredShelfLifeMonths ||
                            (qItem as any)?.committedShelfLifeMonths ||
                            (qItem as any)?.shelfLife ||
                            selectedRfq.minShelfLifeMonths ||
                            24;
                          const isCompliant = qItem?.isCompliantShelfLife !== false;
                          const isOverCeiling = Boolean(
                            qItem?.isExceedingDeclaredPrice ||
                            (item.declaredPrice && qItem && Number(qItem.quotedPrice) > item.declaredPrice)
                          );

                          return (
                            <td
                              key={target.supplierId}
                              className={`py-3.5 px-4 border-l border-slate-200 align-middle ${
                                quotation ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                            >
                              {qItem ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className="font-extrabold text-slate-900 text-sm">
                                      {Number(qItem.quotedPrice).toLocaleString('vi-VN')} đ
                                    </span>
                                    {isOverCeiling && (
                                      <span
                                        className="text-[9px] bg-rose-100 text-rose-700 border border-rose-200 font-black px-1.5 py-0.5 rounded"
                                        title="Giá chào vượt mức kê khai trần theo Nghị định 54/2017"
                                      >
                                        Vượt trần BYT
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isCompliant ? (
                                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                        HSD: {offeredMonths} tháng
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                        <AlertTriangle size={10} /> HSD {offeredMonths} th (Cận date!)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic block text-center py-2">
                                  — Chưa báo giá —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* HÀNG TỔNG GIÁ TRỊ & NÚT CHỌN THẦU */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <td className="py-4 px-4 text-slate-900 uppercase tracking-wider font-extrabold">
                        TỔNG GIÁ TRỊ
                      </td>
                      <td className="py-4 px-3 text-slate-400 text-center">—</td>
                      {selectedRfq.targetSuppliers?.map((target) => {
                        const quotation = selectedRfq.quotations?.find(
                          (q) => q.supplierId === target.supplierId
                        );

                        return (
                          <td
                            key={target.supplierId}
                            className={`py-4 px-4 border-l border-slate-200 ${
                              quotation ? 'bg-blue-50/70' : 'bg-slate-50/50'
                            }`}
                          >
                            {quotation ? (
                              <div>
                                <div className="font-black text-base text-blue-900">
                                  {Number(quotation.totalAmount).toLocaleString('vi-VN')} đ
                                </div>
                                <div className="mt-2.5">
                                  {selectedRfq.status === 'AWARDED' ? (
                                    quotation.isSelected ? (
                                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                                        <CheckCircle2 size={14} /> Đơn vị trúng thầu
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-medium">Không chọn</span>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAward(quotation)}
                                      disabled={isSubmitting}
                                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                      <Award size={14} />
                                      Chọn Thầu & Sinh PO
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2 text-slate-400">
                                <span className="text-xs font-medium block">—</span>
                                <span className="text-[10px] text-amber-600 font-semibold block mt-1">
                                  Đang chờ nộp báo giá
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
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
