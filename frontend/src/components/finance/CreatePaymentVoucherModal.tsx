import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Building2,
  CreditCard,
  Banknote,
  ReceiptText,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Search,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { financeService, PaymentVoucherPayload } from '../../services/finance.service';
import { supplierService } from '../../services/purchase/supplier.service';
import { cn } from '../../lib/utils';

interface CreatePaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branches: Array<{ id: string; name: string }>;
  defaultBranchId?: string;
}

interface SupplierItem {
  id: string;
  name: string;
  gdpNumber?: string;
  contact?: string;
}

const FALLBACK_SUPPLIERS: SupplierItem[] = [
  { id: 'SUP-001', name: 'Công ty Cổ phần Dược Hậu Giang (DHG Pharma)', gdpNumber: 'GDP-0001/2023-BOH' },
  { id: 'SUP-002', name: 'Công ty Cổ phần Hoá - Dược phẩm Mekophar', gdpNumber: 'GDP-0003/2023-BOH' },
  { id: 'SUP-003', name: 'Công ty Cổ phần Dược phẩm Imexpharm', gdpNumber: 'GDP-0007/2023-BOH' },
  { id: 'SUP-004', name: 'Công ty TNHH Sanofi-Aventis Việt Nam', gdpNumber: 'GDP-0010/2024-BOH' },
  { id: 'SUP-005', name: 'Công ty Cổ phần Xuất Nhập khẩu Y tế Domesco', gdpNumber: 'GDP-0012/2023-BOH' },
  { id: 'SUP-006', name: 'Công ty Cổ phần Traphaco', gdpNumber: 'GDP-0015/2022-BOH' },
];

export const CreatePaymentVoucherModal: React.FC<CreatePaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  defaultBranchId = 'BR-001',
}) => {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [recipientType, setRecipientType] = useState<'SUPPLIER' | 'PARTNER' | 'OPERATIONAL' | 'OTHER'>('SUPPLIER');
  const [supplierId, setSupplierId] = useState(FALLBACK_SUPPLIERS[0].id);
  const [supplierName, setSupplierName] = useState(FALLBACK_SUPPLIERS[0].name);
  const [purchaseOrderId, setPurchaseOrderId] = useState('PO-2026-0819');
  const [amount, setAmount] = useState<number | ''>(45000000);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [description, setDescription] = useState('Thanh toán đợt 1 tiền hàng hóa đơn PO-2026-0819');
  const [notes, setNotes] = useState('Đã nghiệm thu chứng từ nhập kho GRN đầy đủ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable Combobox State for GDP Suppliers
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [dbSuppliers, setDbSuppliers] = useState<SupplierItem[]>([]);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultBranchId) {
      setBranchId(defaultBranchId);
    }
  }, [defaultBranchId]);

  // Load real suppliers from database
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await supplierService.getSuppliers();
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const mapped: SupplierItem[] = list.map((s: any) => ({
            id: s._id || s.id || s.code || 'SUP',
            name: s.name,
            gdpNumber: s.gdp_certificate_number || 'Đạt chuẩn GDP',
            contact: s.contact_info || s.business_registration_number || '',
          }));
          setDbSuppliers(mapped);
          setSupplierId(mapped[0].id);
          setSupplierName(mapped[0].name);
        }
      } catch (err) {
        console.warn('Could not load database suppliers, using fallback list', err);
      }
    };
    fetchSuppliers();
  }, []);

  // Handle click outside combobox to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsSupplierOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allSuppliers = useMemo(() => {
    return dbSuppliers.length > 0 ? dbSuppliers : FALLBACK_SUPPLIERS;
  }, [dbSuppliers]);

  // Filter suppliers by name or GDP certificate code
  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.toLowerCase().trim();
    if (!query) return allSuppliers;
    return allSuppliers.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query) ||
      (s.gdpNumber && s.gdpNumber.toLowerCase().includes(query))
    );
  }, [allSuppliers, supplierSearch]);

  const selectedSupplierObj = useMemo(() => {
    return allSuppliers.find(s => s.id === supplierId || s.name === supplierName) || allSuppliers[0];
  }, [allSuppliers, supplierId, supplierName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Vui lòng nhập số tiền chi hợp lệ (> 0 đ)');
      return;
    }
    if (!description.trim()) {
      setError('Vui lòng nhập nội dung giải trình khoản chi');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const branchObj = branches.find(b => b.id === branchId);
      const payload: PaymentVoucherPayload = {
        branchId,
        branchName: branchObj ? branchObj.name : 'Chi nhánh trung tâm',
        recipientType,
        supplierId: recipientType === 'SUPPLIER' ? supplierId : undefined,
        supplierName: recipientType === 'SUPPLIER' ? supplierName : undefined,
        purchaseOrderId: purchaseOrderId.trim() || undefined,
        amount: Number(amount),
        paymentMethod,
        status: 'COMPLETED',
        description: description.trim(),
        notes: notes.trim() || undefined,
      };

      await financeService.createPaymentVoucher(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi khi tạo phiếu chi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header - shadcn Dialog style */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Lập Phiếu Chi Nhà Cung Cấp & Đối Tác</h2>
              <p className="text-xs text-slate-500 mt-0.5">Quy chuẩn chứng từ kế toán chi nhánh & công nợ nhà cung cấp GDP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Branch & Recipient Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Chi nhánh chi tiền
              </label>
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-10 appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Đối tượng nhận
              </label>
              <div className="relative">
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as any)}
                  className="w-full h-10 appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
                >
                  <option value="SUPPLIER">Nhà cung cấp dược phẩm (PO)</option>
                  <option value="PARTNER">Đối tác vận chuyển & dịch vụ</option>
                  <option value="OPERATIONAL">Chi phí vận hành khẩn cấp</option>
                  <option value="OTHER">Khoản chi khác</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Searchable Combobox: GDP Supplier (shadcn Popover + Search) */}
          {recipientType === 'SUPPLIER' && (
            <div className="relative" ref={comboboxRef}>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Nhà cung cấp dược phẩm GDP</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {allSuppliers.length} đối tác GDP trong hệ thống
                </span>
              </label>

              {/* Combobox Trigger Button */}
              <button
                type="button"
                onClick={() => setIsSupplierOpen(prev => !prev)}
                className={cn(
                  "w-full h-11 px-3 text-left rounded-lg border bg-white shadow-xs flex items-center justify-between transition-all",
                  isSupplierOpen
                    ? "border-blue-600 ring-2 ring-blue-600/15"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {supplierName || 'Chọn nhà cung cấp GDP...'}
                    </span>
                    {selectedSupplierObj?.gdpNumber && (
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Chứng chỉ: {selectedSupplierObj.gdpNumber}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
              </button>

              {/* Combobox Popover Dropdown */}
              {isSupplierOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                  {/* Search Input in Dropdown Header */}
                  <div className="p-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                    <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="Tìm theo tên (DHG, OPC...), mã GDP..."
                      autoFocus
                      className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none py-1"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => setSupplierSearch('')}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((s) => {
                        const isSelected = s.id === supplierId || s.name === supplierName;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSupplierId(s.id);
                              setSupplierName(s.name);
                              setIsSupplierOpen(false);
                              setSupplierSearch('');
                            }}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-colors",
                              isSelected
                                ? "bg-blue-50 text-blue-900 font-semibold"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-slate-900 truncate">
                                {s.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  {s.gdpNumber || 'Đạt chuẩn GDP'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {s.id.length > 12 ? s.id.slice(0, 8) : s.id}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600 shrink-0 ml-auto" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Không tìm thấy nhà cung cấp nào khớp với &quot;{supplierSearch}&quot;.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PO Reference */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Mã đơn đặt hàng (PO Reference)
            </label>
            <input
              type="text"
              placeholder="VD: PO-2026-0819"
              value={purchaseOrderId}
              onChange={(e) => setPurchaseOrderId(e.target.value)}
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Amount (VND) with formatted preview badge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Số tiền thanh toán
              </label>
              {typeof amount === 'number' && amount > 0 && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                  {amount.toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <span className="text-slate-400 text-xs font-semibold">₫</span>
              </div>
              <input
                type="number"
                placeholder="Nhập số tiền..."
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Payment Method - Segmented Radio Cards */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  paymentMethod === 'BANK_TRANSFER'
                    ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                  paymentMethod === 'BANK_TRANSFER' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900">Chuyển khoản NH</div>
                  <div className="text-[11px] text-slate-500">VietQR / Ủy nhiệm chi</div>
                </div>
                {paymentMethod === 'BANK_TRANSFER' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                )}
              </div>

              <div
                onClick={() => setPaymentMethod('CASH')}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  paymentMethod === 'CASH'
                    ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                  paymentMethod === 'CASH' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <Banknote className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900">Tiền mặt quầy</div>
                  <div className="text-[11px] text-slate-500">Trừ két ca trực</div>
                </div>
                {paymentMethod === 'CASH' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </div>
            </div>
            {paymentMethod === 'CASH' && (
              <div className="mt-2 text-[11px] font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Khoản chi tiền mặt sẽ được tự động khấu trừ vào Két tiền mặt ca trực hiện tại.</span>
              </div>
            )}
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nội dung khoản chi / Lý do giải trình
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thanh toán tiền hàng hóa đơn PO..."
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-normal text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ghi chú chứng từ kèm theo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Số hóa đơn VAT, biên bản nghiệm thu GRN..."
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-normal text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Dialog Footer */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang lập phiếu...' : 'Xác nhận lập phiếu chi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
