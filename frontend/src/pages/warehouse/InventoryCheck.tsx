import React, { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Trash2,
  ShieldAlert,
  FileText,
  ArrowRightLeft,
  User,
  MessageSquare,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Check,
  Tag,
} from "lucide-react";
import { inventoryCheckService, InventoryCheckItem, InventoryCheckMedicine } from "../../services/inventory/inventoryCheck.service";
import { authService } from "../../services/auth/auth.service";

export function InventoryCheck() {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<InventoryCheckMedicine[]>([]);
  const [batchError, setBatchError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Trạng thái Modal chọn thuốc có ảnh
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalSelectedCategory, setModalSelectedCategory] = useState("all");

  // Trạng thái lập biên bản mới
  const [isCreating, setIsCreating] = useState(false);
  const [notes, setNotes] = useState("");
  const performedBy = authService.getCurrentUser()?.fullName || "Người đăng nhập";
  const [itemsList, setItemsList] = useState<InventoryCheckItem[]>([]);

  // Trạng thái chọn thuốc và lô trong form
  const [selectedMedId, setSelectedMedId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [actualStockInput, setActualStockInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  const selectedMedicineObj = medicines.find(medicine => medicine.id === selectedMedId);
  const availableBatches = selectedMedicineObj?.batches ?? [];
  const selectedBatch = availableBatches.find(batch => batch.id === selectedBatchId);
  const systemStock = selectedBatch?.stock ?? 0;
  const actual = actualStockInput.trim() === "" ? NaN : Number(actualStockInput);
  const validActual = Number.isSafeInteger(actual) && actual >= 0;
  const difference = actual - systemStock;

  // Trạng thái xem chi tiết biên bản
  const [selectedCheck, setSelectedCheck] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const data = await inventoryCheckService.getChecks();
      setChecks(data || []);
    } catch (error) {
      console.error("Failed to load inventory checks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicinesList = async () => {
    setBatchError(false);
    try {
      setMedicines(await inventoryCheckService.getBatches());
    } catch (err) {
      setMedicines([]);
      setBatchError(true);
    }
  };

  useEffect(() => {
    fetchChecks();
    fetchMedicinesList();
  }, []);

  // Danh mục phân loại thuốc cho Modal
  const categories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach(m => {
      if (m.category && m.category.trim()) cats.add(m.category.trim());
    });
    return ["all", ...Array.from(cats)];
  }, [medicines]);

  // Bộ lọc thuốc hiển thị trong Modal (theo tên, số đăng ký, mã vạch, danh mục, hoặc số lô)
  const filteredModalMedicines = useMemo(() => {
    const term = modalSearchTerm.trim().toLowerCase();
    return medicines.filter(m => {
      const matchCategory = modalSelectedCategory === "all" || m.category === modalSelectedCategory;
      if (!matchCategory) return false;
      if (!term) return true;

      const nameMatch = m.name?.toLowerCase().includes(term);
      const catMatch = m.category?.toLowerCase().includes(term);
      const regMatch = m.registrationNumber?.toLowerCase().includes(term);
      const batchMatch = m.batches?.some(b => b.batchNo.toLowerCase().includes(term));
      return nameMatch || catMatch || regMatch || batchMatch;
    });
  }, [medicines, modalSearchTerm, modalSelectedCategory]);

  // Xử lý chọn thuốc từ Modal
  const handleSelectMedicineFromModal = (med: InventoryCheckMedicine, preselectedBatchId?: string) => {
    setSelectedMedId(med.id);
    if (preselectedBatchId) {
      setSelectedBatchId(preselectedBatchId);
    } else if (med.batches && med.batches.length > 0) {
      setSelectedBatchId(med.batches[0].id);
    } else {
      setSelectedBatchId("");
    }
    setActualStockInput("");
    setReasonInput("");
    setIsMedicineModalOpen(false);
  };

  const handleAddItem = () => {
    if (!selectedMedicineObj || !selectedBatch || actualStockInput.trim() === "") {
      alert("Vui lòng điền đầy đủ thông tin thuốc, số lô và số lượng kiểm thực tế!");
      return;
    }

    if (!validActual) {
      alert("Số lượng kiểm thực tế phải là số nguyên không âm!");
      return;
    }

    // Kiểm tra trùng lô trong cùng 1 biên bản
    if (itemsList.some(item => item.batchId === selectedBatch.id)) {
      alert("Lô thuốc này đã có trong danh sách kiểm kê!");
      return;
    }

    const reason = reasonInput.trim();
    if (difference !== 0 && !reason) {
      alert("Vui lòng ghi lý do khi số lượng thực tế lệch tồn sổ.");
      return;
    }

    const newItem: InventoryCheckItem = {
      batchId: selectedBatch.id,
      medicineId: selectedMedId,
      medicineName: selectedMedicineObj.name,
      batchNo: selectedBatch.batchNo,
      systemStock: systemStock,
      actualStock: actual,
      difference,
      reason,
    };

    setItemsList(prev => [...prev, newItem]);

    // Reset các trường nhập
    setSelectedMedId("");
    setSelectedBatchId("");
    setActualStockInput("");
    setReasonInput("");
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCheck = async () => {
    if (itemsList.length === 0) {
      alert("Vui lòng thêm ít nhất 1 mặt hàng cần kiểm kê!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        notes,
        items: itemsList.map(item => ({
          batchId: item.batchId,
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          actualStock: item.actualStock,
          reason: item.reason
        }))
      };

      await inventoryCheckService.createCheck(payload);
      alert("Lưu biên bản nháp thành công!");
      setIsCreating(false);
      setItemsList([]);
      setNotes("");
      fetchChecks();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Lỗi khi xử lý biên bản kiểm kê!");
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteDraft = async (checkId: string) => {
    setCompletingId(checkId);
    try {
      await inventoryCheckService.completeCheck(checkId);
      alert("Hoàn thành biên bản và tự động cập nhật số lượng tồn kho thành công!");
      setDetailOpen(false);
      fetchChecks();
      fetchMedicinesList();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Lỗi khi chốt biên bản kiểm kê!");
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenDetail = async (check: any) => {
    try {
      const fullCheck = await inventoryCheckService.getCheckById(check.id || check._id);
      let parsed = fullCheck;
      if (typeof fullCheck === 'string') {
        try {
          parsed = JSON.parse(fullCheck);
        } catch {
          parsed = check;
        }
      }
      const actualData = parsed?.data || parsed || {};
      setSelectedCheck({
        ...check,
        ...actualData,
        items: actualData.items && actualData.items.length > 0 ? actualData.items : (check.items || []),
      });
      setDetailOpen(true);
    } catch (err) {
      console.error('Failed to load details', err);
      setSelectedCheck(check);
      setDetailOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full bg-[#faf8ff] px-6 pt-4 pb-3 lg:px-8 overflow-hidden">
      <div className="flex flex-row justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Biên Bản Kiểm Kê Kho Chi Nhánh</h1>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý đối chiếu kho thực tế và tự động điều chỉnh số lượng tồn chuẩn GPP</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 text-sm cursor-pointer"
          >
            <Plus size={16} />
            Lập Biên Bản Mới
          </button>
        )}
      </div>

      {isCreating ? (
        /* Create Checking View */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-300">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-slate-800 text-sm">Lập Biên Bản Kiểm Kê & Điều Chỉnh Kho Chi Nhánh</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Thông tin đầu trang biên bản */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Người thực hiện</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    value={performedBy}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600">Ghi chú kiểm kê</label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400">
                    <MessageSquare size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Kiểm kho định kỳ cuối tháng, kiểm kê đột xuất, điều chỉnh bù lệch..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600 focus:bg-white transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* BẢNG CHỌN THUỐC & LÔ CẦN KIỂM KÊ (MODAL CÓ ẢNH VÀ THÔNG TIN CHI TIẾT) */}
            <div className="bg-[#faf8ff] border border-blue-100 rounded-2xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#0057cd] flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers size={14} /> Chọn Thuốc & Lô Hàng Cần Kiểm Kê
                </h4>
                {batchError && (
                  <button type="button" onClick={fetchMedicinesList} className="text-xs font-semibold text-rose-700 underline">
                    Không tải được danh sách lô. Thử lại
                  </button>
                )}
              </div>

              {/* KHU VỰC THẺ CHỌN DƯỢC PHẨM CÓ ẢNH */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* 1. Thẻ hiển thị thuốc đã chọn hoặc Nút mở Modal */}
                <div className="lg:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Dược phẩm kiểm kê (Xem ảnh & chi tiết)
                  </label>
                  {!selectedMedicineObj ? (
                    <button
                      type="button"
                      onClick={() => setIsMedicineModalOpen(true)}
                      className="w-full p-4 border-2 border-dashed border-blue-200 hover:border-[#0057cd] bg-white hover:bg-blue-50/50 rounded-2xl transition-all flex items-center gap-3.5 text-left group cursor-pointer shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0057cd] group-hover:scale-105 transition-transform shrink-0">
                        <Package size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-slate-800 group-hover:text-[#0057cd] flex items-center gap-1.5">
                          <span>Bấm để mở danh mục chọn thuốc</span>
                          <Sparkles size={12} className="text-amber-500" />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Hiển thị ảnh sản phẩm, số lô, tồn kho & hạn dùng
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-[#0057cd] text-white text-[11px] font-bold rounded-xl shadow-xs shrink-0">
                        Chọn thuốc
                      </span>
                    </button>
                  ) : (
                    <div className="p-3 bg-white border border-blue-200 rounded-2xl shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Ảnh thuốc */}
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {selectedMedicineObj.image ? (
                            <img
                              src={selectedMedicineObj.image}
                              alt={selectedMedicineObj.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package size={22} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-xs text-slate-900 truncate" title={selectedMedicineObj.name}>
                            {selectedMedicineObj.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-medium text-[10px]">
                              {selectedMedicineObj.category || 'Dược phẩm'}
                            </span>
                            <span>ĐVT: <strong>{selectedMedicineObj.unit}</strong></span>
                            <span>• {availableBatches.length} lô</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMedicineModalOpen(true)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Đổi thuốc
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Chọn lô, số lượng thực tế và lý do chênh lệch */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Chọn lô */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số lô hàng chi nhánh</label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => {
                        setSelectedBatchId(e.target.value);
                        setActualStockInput("");
                        setReasonInput("");
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800 cursor-pointer disabled:bg-slate-50"
                      disabled={availableBatches.length === 0}
                    >
                      <option value="">-- Chọn lô --</option>
                      {availableBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batchNo} · Tồn {b.stock} · HSD {new Date(b.expDate).toLocaleDateString("vi-VN")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Số lượng kiểm thực tế */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">SL thực tế kiểm</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        placeholder={selectedBatch ? `Tồn sổ: ${systemStock}` : "Nhập SL"}
                        value={actualStockInput}
                        onChange={(e) => setActualStockInput(e.target.value)}
                        disabled={!selectedBatch}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800 disabled:bg-slate-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-extrabold uppercase">
                        {selectedMedicineObj?.unit || ''}
                      </span>
                    </div>
                  </div>

                  {/* Lý do khi lệch + Nút thêm */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Lý do khi có lệch</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Lý do chênh lệch..."
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        disabled={!selectedBatch}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800 disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedBatch}
                        className="px-3.5 bg-[#0057cd] hover:bg-[#00419e] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin đối chiếu nhanh của lô đã chọn */}
              {selectedBatch && (
                <div className="bg-blue-50/80 border border-blue-100 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-[#0057cd] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      Hệ thống ghi nhận: <strong>{systemStock} {selectedMedicineObj?.unit}</strong> cho lô <strong>{selectedBatch.batchNo}</strong> (HSD: {new Date(selectedBatch.expDate).toLocaleDateString("vi-VN")})
                    </span>
                  </div>
                  {validActual && (
                    <span className={`font-black uppercase text-xs px-2.5 py-0.5 rounded-full ${
                      difference < 0
                        ? 'bg-rose-100 text-rose-700'
                        : difference > 0
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {difference === 0 ? 'Khớp 100%' : `Chênh lệch: ${difference > 0 ? '+' : ''}${difference} ${selectedMedicineObj?.unit}`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bảng danh sách các mặt hàng đã kiểm kê trong biên bản */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Danh sách mặt hàng kiểm kê ({itemsList.length})
              </label>
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-sm text-left border-collapse bg-white">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-extrabold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Thuốc / Dược phẩm</th>
                      <th className="px-4 py-3">Lô kiểm</th>
                      <th className="px-4 py-3 text-center">Tồn hệ thống</th>
                      <th className="px-4 py-3 text-center">Thực tế kiểm</th>
                      <th className="px-4 py-3 text-center">Lệch</th>
                      <th className="px-4 py-3">Lý do điều chỉnh</th>
                      <th className="px-4 py-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsList.map((item, idx) => (
                      <tr key={item.batchId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.medicineName}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.batchNo}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">{item.systemStock}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{item.actualStock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold
                            ${(item.difference || 0) < 0 
                              ? 'bg-rose-50 text-rose-700' 
                              : (item.difference || 0) > 0 
                              ? 'bg-sky-50 text-sky-700' 
                              : 'bg-slate-50 text-slate-500'
                            }
                          `}>
                            {(item.difference || 0) > 0 ? '+' : ''}{item.difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium text-xs">{item.reason || '---'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itemsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                          Chưa có thuốc nào trong danh sách đối chiếu. Hãy chọn thuốc từ danh mục để bắt đầu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
            <button
              onClick={handleSubmitCheck}
              disabled={saving}
              className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-xl disabled:opacity-50 text-xs shadow-xs transition-colors cursor-pointer"
            >
              {saving ? "Đang lưu..." : "Lưu Bản Nháp (DRAFT)"}
            </button>
          </div>
        </div>
      ) : (
        /* Danh sách lịch sử biên bản kiểm kê */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/30">
          <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex justify-between items-center shrink-0">
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Lịch sử biên bản kiểm kê điều chỉnh kho chi nhánh</h3>
          </div>

          <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-sm font-semibold text-slate-500">Đang tải lịch sử kiểm kê...</p>
              </div>
            ) : null}

            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100/80 tracking-wider font-extrabold sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th scope="col" className="px-6 py-4">Mã Biên Bản</th>
                  <th scope="col" className="px-6 py-4">Trạng Thái</th>
                  <th scope="col" className="px-6 py-4 text-center">Số Mặt Hàng</th>
                  <th scope="col" className="px-6 py-4">Người Kiểm</th>
                  <th scope="col" className="px-6 py-4">Ngày Tạo</th>
                  <th scope="col" className="px-6 py-4">Ghi Chú</th>
                  <th scope="col" className="px-6 py-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && checks.map((c: any) => (
                  <tr key={c.id || c._id} className="group bg-white hover:bg-slate-50/50 transition-all duration-150">
                    <td className="px-6 py-4 font-mono font-bold text-[#0057cd] text-xs">
                      {c.checkCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase shadow-sm inline-flex items-center gap-1
                        ${c.status === 'COMPLETED' 
                          ? 'bg-sky-50 text-sky-700 border-sky-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                        }
                      `}>
                        {c.status === 'COMPLETED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {c.status === 'COMPLETED' ? 'Đã Điều Chỉnh' : 'Bản Nháp'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 text-xs">
                      {c.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                      {c.performedBy}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-xs max-w-xs truncate" title={c.notes}>
                      {c.notes || '---'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="text-slate-400 group-hover:text-[#0057cd] hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all flex items-center justify-center ml-auto cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && checks.length === 0 && (
              <div className="text-center py-20 bg-white">
                <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-500 font-bold">Chưa có biên bản kiểm kê nào được lập.</p>
                <button 
                  onClick={() => setIsCreating(true)} 
                  className="mt-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0057cd] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Bắt đầu kiểm kho ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CHỌN DƯỢC PHẨM CÓ ẢNH VÀ THÔNG TIN CHI TIẾT (MEDICINE SELECT MODAL) */}
      {/* ========================================================================= */}
      {isMedicineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0057cd] flex items-center justify-center shadow-xs">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Danh Mục Dược Phẩm Kho Chi Nhánh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tìm kiếm theo tên thuốc, danh mục hoặc số lô để chọn đối chiếu tồn kho
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMedicineModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Thanh tìm kiếm & Lọc danh mục */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên thuốc, số đăng ký, số lô..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
                {modalSearchTerm && (
                  <button
                    onClick={() => setModalSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setModalSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                      modalSelectedCategory === cat
                        ? "bg-[#0057cd] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat === "all" ? "Tất cả danh mục" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách lưới các thẻ thuốc có ảnh */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {filteredModalMedicines.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-slate-600">Không tìm thấy thuốc phù hợp</p>
                  <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử từ khóa tìm kiếm hoặc danh mục khác</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredModalMedicines.map((med) => {
                    const isSelected = selectedMedId === med.id;
                    const totalBranchStock = med.batches.reduce((sum, b) => sum + (b.stock || 0), 0);

                    return (
                      <div
                        key={med.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-blue-50/60 border-[#0057cd] shadow-md ring-1 ring-[#0057cd]"
                            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                        }`}
                      >
                        <div>
                          {/* Ảnh thuốc + Huy hiệu danh mục */}
                          <div className="relative w-full h-36 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center group">
                            {med.image ? (
                              <img
                                src={med.image}
                                alt={med.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-300">
                                <Package size={36} />
                                <span className="text-[10px] text-slate-400 mt-1">Chưa có ảnh</span>
                              </div>
                            )}

                            {med.category && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg uppercase">
                                {med.category}
                              </span>
                            )}

                            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-xs text-slate-700 text-[10px] font-black rounded-lg shadow-xs">
                              ĐVT: {med.unit}
                            </span>
                          </div>

                          {/* Tên thuốc & Thông tin */}
                          <h4 className="font-black text-xs text-slate-900 line-clamp-2 leading-tight mb-1" title={med.name}>
                            {med.name}
                          </h4>

                          {med.registrationNumber && (
                            <div className="text-[10px] text-slate-400 font-mono mb-2">
                              SĐK: {med.registrationNumber}
                            </div>
                          )}

                          {/* Danh sách lô hàng chi nhánh */}
                          <div className="mt-2 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                              <span>Các lô tại chi nhánh ({med.batches.length}):</span>
                              <span className="text-[#0057cd]">Tổng tồn: {totalBranchStock}</span>
                            </div>

                            <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                              {med.batches.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => handleSelectMedicineFromModal(med, b.id)}
                                  className="w-full text-left p-1.5 rounded-lg bg-slate-50 hover:bg-blue-100/60 border border-slate-200/80 hover:border-blue-300 transition-all text-[11px] flex items-center justify-between cursor-pointer group/batch"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-slate-800 group-hover/batch:text-[#0057cd]">
                                      {b.batchNo}
                                    </span>
                                    <span className="text-slate-400 text-[10px] ml-1.5">
                                      HSD: {new Date(b.expDate).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-[#0057cd] text-[10px] bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                    {b.stock} {med.unit}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Nút chọn thuốc */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleSelectMedicineFromModal(med)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-[#0057cd] hover:bg-[#00419e] text-white shadow-xs"
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} /> Đang chọn thuốc này
                              </>
                            ) : (
                              <>
                                <Plus size={14} /> Chọn thuốc này
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500 shrink-0 px-6">
              <span>Đang hiển thị <strong>{filteredModalMedicines.length}</strong> dược phẩm trong kho chi nhánh</span>
              <button
                onClick={() => setIsMedicineModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Biên Bản & Phê Duyệt Hoàn Tất */}
      {detailOpen && selectedCheck && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-[#0057cd]" />
                Chi Tiết Biên Bản: {selectedCheck.checkCode}
              </h3>
              <button onClick={() => setDetailOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>Người kiểm: <strong>{selectedCheck.performedBy}</strong></div>
                <div>Ngày tạo: <strong>{new Date(selectedCheck.createdAt).toLocaleString("vi-VN")}</strong></div>
                <div>Trạng thái: <strong className={selectedCheck.status === 'COMPLETED' ? 'text-sky-600' : 'text-amber-600'}>{selectedCheck.status === 'COMPLETED' ? 'ĐÃ HOÀN TẤT & ĐIỀU CHỈNH' : 'BẢN NHÁP (DRAFT)'}</strong></div>
                <div>Chi nhánh: <strong>{selectedCheck.branchId}</strong></div>
                {selectedCheck.notes && <div className="col-span-2 text-slate-500">Ghi chú: {selectedCheck.notes}</div>}
              </div>

              <div>
                <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Danh sách các mặt hàng đối chiếu</h4>
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">Thuốc</th>
                        <th className="p-2">Lô</th>
                        <th className="p-2 text-center">Tồn sổ</th>
                        <th className="p-2 text-center">Thực tế</th>
                        <th className="p-2 text-center">Lệch</th>
                        <th className="p-2">Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedCheck.items || []).map((it: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-2 font-medium">{it.medicineName}</td>
                          <td className="p-2 font-mono">{it.batchNo}</td>
                          <td className="p-2 text-center">{it.systemStock}</td>
                          <td className="p-2 text-center font-bold">{it.actualStock}</td>
                          <td className="p-2 text-center font-bold">
                            <span className={it.difference < 0 ? 'text-rose-600' : it.difference > 0 ? 'text-sky-600' : 'text-slate-500'}>
                              {it.difference > 0 ? '+' : ''}{it.difference}
                            </span>
                          </td>
                          <td className="p-2 text-slate-500">{it.reason || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              {selectedCheck.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => handleCompleteDraft(selectedCheck.id || selectedCheck._id)}
                  disabled={completingId === (selectedCheck.id || selectedCheck._id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {completingId === (selectedCheck.id || selectedCheck._id) ? 'Đang cập nhật tồn kho...' : 'Phê Duyệt & Chốt Điều Chỉnh Tồn'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default InventoryCheck;
