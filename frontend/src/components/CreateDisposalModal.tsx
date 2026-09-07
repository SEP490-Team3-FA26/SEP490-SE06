import React, { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, Trash2, Loader2, Search, Package, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopFilterSidebar } from "./ShopFilterSidebar";
import { MedicineCard } from "./MedicineCard";
import api from "../services/core/api";

export interface CreateDisposalModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export function CreateDisposalModal({ onClose, onSuccess }: CreateDisposalModalProps) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [disposalCart, setDisposalCart] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [disposalReason, setDisposalReason] = useState("Thuốc quá hạn sử dụng theo quy định Dược (Hết date)");
  const [disposalMethod, setDisposalMethod] = useState("Nghiền nhỏ và bàn giao công ty xử lý chất thải y tế nguy hại có hợp đồng");
  const [disposalPerformedBy, setDisposalPerformedBy] = useState("Dược sĩ phụ trách kho");
  const [disposalNotes, setDisposalNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // Advanced Filter states
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedIndication, setSelectedIndication] = useState("");
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    targetGroup: true,
    country: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleResetFilters = () => {
    setSelectedTargetGroup("");
    setSelectedPriceRange("");
    setSelectedFlavour("");
    setSelectedCountry("");
    setSelectedBrand("");
    setSelectedIndication("");
    setSelectedBrandOrigin("");
    setSelectedIngredient("");
    setSelectedClassification("");
  };

  const hasAnyFilter = !!(
    selectedTargetGroup || selectedPriceRange || selectedFlavour || selectedCountry ||
    selectedBrand || selectedIndication || selectedBrandOrigin || selectedIngredient || selectedClassification
  );

  // Fetch full medicines for filtering
  useEffect(() => {
    api.get('/api/medicines?limit=500')
      .then(res => {
        const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setMedicines(list);
      })
      .catch(err => {
        console.error("Lỗi khi tải danh mục thuốc:", err);
        setMedicines([]);
      });
  }, []);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchId = (m.id || m._id || "").toLowerCase().includes(q);
        const matchReg = (m.registrationNumber || "").toLowerCase().includes(q);
        const matchActive = (m.active_ingredient || m.activeIngredient || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchReg && !matchActive) return false;
      }

      if (selectedTargetGroup && m.targetGroup && m.targetGroup !== selectedTargetGroup) return false;
      if (selectedCountry && m.country && m.country !== selectedCountry) return false;
      if (selectedBrand && m.brand && m.brand !== selectedBrand) return false;
      if (selectedIndication && m.indication && m.indication !== selectedIndication) return false;
      if (selectedBrandOrigin && m.brandOrigin && m.brandOrigin !== selectedBrandOrigin) return false;
      if (selectedIngredient && m.ingredient && m.ingredient !== selectedIngredient) return false;
      if (selectedClassification && m.classification && m.classification !== selectedClassification) return false;
      if (selectedFlavour && m.flavour && m.flavour !== selectedFlavour) return false;

      return true;
    });
  }, [medicines, searchQuery, selectedTargetGroup, selectedCountry, selectedBrand, selectedIndication, selectedBrandOrigin, selectedIngredient, selectedClassification, selectedFlavour]);

  // Add medicine to disposal cart
  const handleAddMedicine = (med: any) => {
    const medId = med.id || med._id;
    const exists = disposalCart.find(i => i.id === medId);
    if (exists) {
      return;
    }

    const batches = med.batches || [];
    // Prioritize expired batches first
    const expiredBatch = batches.find((b: any) => b.expDate && new Date(b.expDate) <= new Date() && b.stock > 0);
    const defaultBatch = expiredBatch || batches.find((b: any) => b.stock > 0) || batches[0] || null;

    setDisposalCart(prev => [
      ...prev,
      {
        ...med,
        id: medId,
        selectedBatchNo: defaultBatch?.batchNo || "",
        selectedBatch: defaultBatch,
        quantity: defaultBatch ? Math.min(1, defaultBatch.stock || 1) : 1,
        maxStock: defaultBatch?.stock || 0
      }
    ]);
  };

  const handleBatchChange = (medId: string, batchNo: string) => {
    setDisposalCart(prev => prev.map(item => {
      if (item.id === medId) {
        const batches = item.batches || [];
        const foundBatch = batches.find((b: any) => b.batchNo === batchNo);
        const maxStock = foundBatch?.stock || 0;
        return {
          ...item,
          selectedBatchNo: batchNo,
          selectedBatch: foundBatch,
          maxStock,
          quantity: Math.min(item.quantity, maxStock || 1)
        };
      }
      return item;
    }));
  };

  const updateQuantity = (medId: string, qty: number) => {
    setDisposalCart(prev => prev.map(item => {
      if (item.id === medId) {
        const validQty = Math.max(1, Math.min(qty, item.maxStock || 999999));
        return { ...item, quantity: validQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (medId: string) => {
    setDisposalCart(prev => prev.filter(item => item.id !== medId));
  };

  const totalQuantity = useMemo(() => {
    return disposalCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [disposalCart]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (disposalCart.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất một loại thuốc và lô cần xuất hủy.");
      return;
    }

    for (const item of disposalCart) {
      if (!item.selectedBatchNo || !item.selectedBatch) {
        setErrorMsg(`Thuốc "${item.name}" chưa chọn lô hàng hợp lệ hoặc không có lô trong kho.`);
        return;
      }
      if (item.quantity <= 0) {
        setErrorMsg(`Số lượng hủy của thuốc "${item.name}" phải lớn hơn 0.`);
        return;
      }
      if (item.quantity > item.maxStock) {
        setErrorMsg(`Số lượng hủy của thuốc "${item.name}" (${item.quantity}) vượt quá tồn kho của lô (${item.maxStock}).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Execute disposal action for all items
      for (const item of disposalCart) {
        const batchId = item.selectedBatch.id || item.selectedBatch._id;
        await api.post('/api/medicines/expiration-action', {
          batchId,
          action: 'DISPOSE',
          quantity: item.quantity,
          notes: `[Lý do: ${disposalReason}] ${disposalNotes ? `- Ghi chú: ${disposalNotes}` : ''} - Phương pháp: ${disposalMethod}`,
          performedBy: disposalPerformedBy,
        });
      }

      onSuccess(`Đã lập phiếu xuất hủy thành công cho ${disposalCart.length} loại thuốc (Tổng ${totalQuantity} đơn vị).`);
      onClose();
    } catch (err: any) {
      console.error("Lỗi xuất hủy thuốc:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Không thể thực hiện xuất hủy thuốc.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-[1500px] h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm font-black">
              <Trash2 size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Lập Phiếu Xuất Hủy Thuốc (GSP / GPP)</h2>
              <p className="text-xs font-semibold text-slate-500">
                Thực hiện rà soát lô thuốc, trừ tồn kho và lưu biên bản theo Thông tư 02/2018/TT-BYT & 36/2018/TT-BYT
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* Left Column: Filter Sidebar */}
          <div className="w-full md:w-64 lg:w-72 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 p-5">
            <ShopFilterSidebar
              selectedTargetGroup={selectedTargetGroup} setSelectedTargetGroup={setSelectedTargetGroup}
              selectedPriceRange={selectedPriceRange} setSelectedPriceRange={setSelectedPriceRange}
              selectedFlavour={selectedFlavour} setSelectedFlavour={setSelectedFlavour}
              selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}
              selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand}
              selectedIndication={selectedIndication} setSelectedIndication={setSelectedIndication}
              selectedBrandOrigin={selectedBrandOrigin} setSelectedBrandOrigin={setSelectedBrandOrigin}
              selectedIngredient={selectedIngredient} setSelectedIngredient={setSelectedIngredient}
              selectedClassification={selectedClassification} setSelectedClassification={setSelectedClassification}
              expandedSections={expandedSections} toggleSection={toggleSection}
              handleResetFilters={handleResetFilters} hasAnyFilter={hasAnyFilter}
            />
          </div>

          {/* Middle Column: Medicine Grid */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-5 flex flex-col min-h-0">
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thuốc theo tên, hoạt chất, số đăng ký, mã vạch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
              {filteredMedicines.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                  <Search size={40} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold">Không tìm thấy thuốc phù hợp</p>
                </div>
              ) : (
                filteredMedicines.map(med => {
                  const medId = med.id || med._id;
                  const isAdded = disposalCart.some(i => i.id === medId);
                  return (
                    <MedicineCard
                      key={medId}
                      med={med}
                      added={isAdded}
                      onAddToCart={(m) => { handleAddMedicine(m); }}
                      onClick={() => { handleAddMedicine(med); }}
                      allowOutOfStock={true}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Disposal Details & Cart */}
          <div className="w-full md:w-[450px] lg:w-[500px] xl:w-[560px] border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-5 flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Trash2 size={16} className="text-rose-600" />
                  Danh Sách Thuốc Xuất Hủy
                </h3>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100">
                  {disposalCart.length} loại thuốc ({totalQuantity} đv)
                </span>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 custom-scrollbar p-3 space-y-3">
                {disposalCart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-10">
                    <Package size={36} className="opacity-50" />
                    <p className="text-sm font-bold">Chưa chọn thuốc nào để xuất hủy.</p>
                    <p className="text-xs text-slate-400 text-center max-w-xs">
                      Hãy tìm kiếm và bấm nút (+) trên thẻ thuốc ở giữa để thêm vào danh sách tiêu hủy.
                    </p>
                  </div>
                ) : (
                  disposalCart.map((item) => {
                    const batches = item.batches || [];
                    const selectedBatch = item.selectedBatch;
                    const isExp = selectedBatch?.expDate && new Date(selectedBatch.expDate) <= new Date();

                    return (
                      <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">{item.name}</h4>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              SĐK: {item.registrationNumber || "N/A"} • ĐVT: {item.unit || "Hộp"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Batch Selector */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-black uppercase text-slate-500">LÔ THUỐC (BATCH NO) *</label>
                              {isExp && (
                                <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                  HẾT HẠN
                                </span>
                              )}
                            </div>
                            {batches.length === 0 ? (
                              <div className="text-[11px] text-amber-700 font-bold bg-amber-50 p-1.5 rounded border border-amber-200">
                                Thuốc này không có lô trong kho
                              </div>
                            ) : (
                              <select
                                value={item.selectedBatchNo}
                                onChange={(e) => handleBatchChange(item.id, e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                              >
                                <option value="" disabled>-- Chọn số lô --</option>
                                {batches.map((b: any, bIdx: number) => (
                                  <option key={bIdx} value={b.batchNo}>
                                    Lô: {b.batchNo} | Tồn: {b.stock} | HSD: {b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "N/A"}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {selectedBatch && (
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                              <span className="text-slate-500 font-bold">
                                HSD: <strong className={isExp ? "text-rose-600 font-black" : "text-slate-800"}>
                                  {selectedBatch.expDate ? new Date(selectedBatch.expDate).toLocaleDateString("vi-VN") : "N/A"}
                                </strong>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 font-bold">SL Hủy:</span>
                                <div className="flex items-center bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.maxStock}
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className="w-12 text-center text-xs font-black text-rose-600 bg-transparent border-none p-0 focus:ring-0"
                                  />
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold">/ {item.maxStock}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* General Disposal Form Fields */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    LÝ DO XUẤT HỦY *
                  </label>
                  <select
                    value={disposalReason}
                    onChange={(e) => setDisposalReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="Thuốc quá hạn sử dụng theo quy định Dược (Hết date)">Thuốc quá hạn sử dụng theo quy định Dược (Hết date)</option>
                    <option value="Thuốc bị biến chất, ẩm mốc, vỡ hỏng bao bì trong quá trình bảo quản">Thuốc bị biến chất, ẩm mốc, vỡ hỏng bao bì trong quá trình bảo quản</option>
                    <option value="Thuốc thuộc diện thu hồi khẩn cấp theo quyết định của Cục Quản Lý Dược">Thuốc thuộc diện thu hồi khẩn cấp theo quyết định của Cục Quản Lý Dược</option>
                    <option value="Thuốc không đạt tiêu chuẩn kiểm nghiệm chất lượng định kỳ">Thuốc không đạt tiêu chuẩn kiểm nghiệm chất lượng định kỳ</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                      NGƯỜI PHỤ TRÁCH HỦY
                    </label>
                    <input
                      type="text"
                      value={disposalPerformedBy}
                      onChange={(e) => setDisposalPerformedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                      PHƯƠNG PHÁP TIÊU HỦY
                    </label>
                    <select
                      value={disposalMethod}
                      onChange={(e) => setDisposalMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                    >
                      <option value="Nghiền nhỏ và bàn giao công ty xử lý chất thải y tế nguy hại có hợp đồng">Bàn giao xử lý rác y tế nguy hại</option>
                      <option value="Đốt lò chuyên dụng nhiệt độ cao theo quy chuẩn chất thải nguy hại">Đốt lò nhiệt độ cao</option>
                      <option value="Hòa tan, trung hòa hóa học và chuyển sang hệ thống xử lý nước thải y tế">Hòa tan trung hòa hóa học</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    GHI CHÚ HỘI ĐỒNG KIỂM KÊ
                  </label>
                  <input
                    type="text"
                    value={disposalNotes}
                    onChange={(e) => setDisposalNotes(e.target.value)}
                    placeholder="VD: Hội đồng gồm DS. CKI Nguyễn Văn An (Chủ tịch)..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Action */}
              <button
                onClick={handleSubmit}
                disabled={disposalCart.length === 0 || isSubmitting}
                className={`w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-xs uppercase tracking-wider
                  ${disposalCart.length > 0 && !isSubmitting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang xử lý xuất hủy...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Xác Nhận Xuất Hủy Thuốc ({totalQuantity} ĐV)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
