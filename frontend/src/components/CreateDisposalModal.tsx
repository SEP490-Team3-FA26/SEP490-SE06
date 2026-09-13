import React, { useState, useEffect, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, Trash2, Loader2, Search, Package, AlertCircle, CheckSquare, Square, Zap, Clock, ShieldAlert } from "lucide-react";
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

  // Expiry filter mode: default to 'EXPIRED_ONLY' per user requirement
  const [expiryFilterMode, setExpiryFilterMode] = useState<'EXPIRED_ONLY' | 'NEAR_EXPIRY' | 'ALL'>('EXPIRED_ONLY');

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
    targetGroup: false,
    country: false,
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

  // Helper check batch status
  const isBatchExpired = (b: any) => {
    if (!b || !b.expDate) return false;
    return new Date(b.expDate).getTime() <= Date.now() && (b.stock > 0 || b.quantity > 0);
  };

  const isBatchNearExpiry = (b: any) => {
    if (!b || !b.expDate) return false;
    const expTime = new Date(b.expDate).getTime();
    const now = Date.now();
    const diffDays = (expTime - now) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 60 && (b.stock > 0 || b.quantity > 0);
  };

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

  // Expiry Statistics
  const stats = useMemo(() => {
    let expiredCount = 0;
    let nearExpiryCount = 0;
    medicines.forEach(m => {
      const batches = m.batches || [];
      if (batches.some(isBatchExpired)) expiredCount++;
      else if (batches.some(isBatchNearExpiry)) nearExpiryCount++;
    });
    return { expiredCount, nearExpiryCount, totalCount: medicines.length };
  }, [medicines]);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const batches = m.batches || [];

      // Expiry filter logic
      if (expiryFilterMode === 'EXPIRED_ONLY') {
        const hasExpired = batches.some(isBatchExpired);
        if (!hasExpired) return false;
      } else if (expiryFilterMode === 'NEAR_EXPIRY') {
        const hasNearExpiry = batches.some(isBatchNearExpiry);
        if (!hasNearExpiry) return false;
      }

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
  }, [medicines, expiryFilterMode, searchQuery, selectedTargetGroup, selectedCountry, selectedBrand, selectedIndication, selectedBrandOrigin, selectedIngredient, selectedClassification, selectedFlavour]);

  // Check if all currently displayed medicines are added
  const allDisplayedSelected = useMemo(() => {
    if (filteredMedicines.length === 0) return false;
    return filteredMedicines.every(m => disposalCart.some(i => i.id === (m.id || m._id)));
  }, [filteredMedicines, disposalCart]);

  // Add single medicine to disposal cart
  const handleAddMedicine = (med: any) => {
    const medId = med.id || med._id;
    const exists = disposalCart.find(i => i.id === medId);
    if (exists) {
      return;
    }

    const batches = med.batches || [];
    // Prioritize expired batches first, then near-expiry, then with stock
    const expiredBatch = batches.find(isBatchExpired);
    const nearExpiryBatch = batches.find(isBatchNearExpiry);
    const defaultBatch = expiredBatch || nearExpiryBatch || batches.find((b: any) => b.stock > 0) || batches[0] || null;

    setDisposalCart(prev => [
      ...prev,
      {
        ...med,
        id: medId,
        selectedBatchNo: defaultBatch?.batchNo || "",
        selectedBatch: defaultBatch,
        quantity: defaultBatch ? (defaultBatch.stock || 1) : 1, // Default full stock for disposal
        maxStock: defaultBatch?.stock || 0
      }
    ]);
  };

  // Toggle "Select All" / "Deselect All" for current filtered view
  const handleToggleSelectAll = () => {
    if (allDisplayedSelected) {
      // Unselect all displayed
      const displayedIds = new Set(filteredMedicines.map(m => m.id || m._id));
      setDisposalCart(prev => prev.filter(item => !displayedIds.has(item.id)));
    } else {
      // Select all displayed
      setDisposalCart(prev => {
        const currentIds = new Set(prev.map(i => i.id));
        const newItems: any[] = [];

        for (const med of filteredMedicines) {
          const medId = med.id || med._id;
          if (!currentIds.has(medId)) {
            const batches = med.batches || [];
            const expiredBatch = batches.find(isBatchExpired);
            const nearExpiryBatch = batches.find(isBatchNearExpiry);
            const defaultBatch = expiredBatch || nearExpiryBatch || batches.find((b: any) => b.stock > 0) || batches[0] || null;

            if (defaultBatch) {
              newItems.push({
                ...med,
                id: medId,
                selectedBatchNo: defaultBatch.batchNo || "",
                selectedBatch: defaultBatch,
                quantity: defaultBatch.stock || 1,
                maxStock: defaultBatch.stock || 0
              });
            }
          }
        }
        return [...prev, ...newItems];
      });
    }
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
          quantity: maxStock > 0 ? maxStock : 1 // Auto fill max stock of newly selected batch
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

  const handleClearCart = () => {
    setDisposalCart([]);
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
        className="relative bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-[1520px] h-[92vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm font-black">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg">Lập Phiếu Xuất Hủy Thuốc (GSP / GPP)</h2>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-black rounded-md border border-rose-200">
                  Rà Soát Hết Hạn Tự Động
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Lọc nhanh thuốc quá hạn/hết date, chọn tất cả tự động điền toàn bộ tồn kho và xuất biên bản tiêu hủy
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

          {/* Middle Column: Medicine Grid with Expiry Tabs and Select All Button */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-5 flex flex-col min-h-0">

            {/* Expiry Status Tabs & Action Toolbar */}
            <div className="mb-4 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
                
                {/* Expiry Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setExpiryFilterMode('EXPIRED_ONLY')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      expiryFilterMode === 'EXPIRED_ONLY'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <ShieldAlert size={14} />
                    Chỉ Thuốc Hết Hạn
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      expiryFilterMode === 'EXPIRED_ONLY' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {stats.expiredCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setExpiryFilterMode('NEAR_EXPIRY')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      expiryFilterMode === 'NEAR_EXPIRY'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  >
                    <Clock size={14} />
                    Cận Hạn (≤60 ngày)
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      expiryFilterMode === 'NEAR_EXPIRY' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {stats.nearExpiryCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setExpiryFilterMode('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      expiryFilterMode === 'ALL'
                        ? 'bg-[#0057cd] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    Tất Cả Danh Mục
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      expiryFilterMode === 'ALL' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {stats.totalCount}
                    </span>
                  </button>
                </div>

                {/* SELECT ALL BUTTON */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSelectAll}
                    disabled={filteredMedicines.length === 0}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm ${
                      allDisplayedSelected
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {allDisplayedSelected ? (
                      <>
                        <CheckSquare size={16} />
                        Bỏ Chọn Tất Cả ({filteredMedicines.length})
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="text-amber-300 fill-amber-300" />
                        Chọn Tất Cả ({filteredMedicines.length} thuốc)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh theo tên thuốc, số đăng ký, hoạt chất, số lô..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
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
            </div>

            {/* Medicine Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
              {filteredMedicines.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8">
                  <Package size={48} className="mb-4 opacity-40 text-slate-300" />
                  <p className="text-base font-black text-slate-700">
                    {expiryFilterMode === 'EXPIRED_ONLY' 
                      ? 'Kho hiện tại không có thuốc nào bị quá hạn!'
                      : 'Không tìm thấy thuốc phù hợp bộ lọc'}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-1 text-center max-w-sm">
                    {expiryFilterMode === 'EXPIRED_ONLY'
                      ? 'Tất cả các lô thuốc đang trong hạn sử dụng an toàn. Bạn có thể chuyển tab sang "Cận Hạn" hoặc "Tất Cả Danh Mục" để kiểm tra.'
                      : 'Vui lòng thử tìm kiếm với từ khóa khác hoặc xóa bớt tiêu chí lọc.'}
                  </p>
                  {expiryFilterMode === 'EXPIRED_ONLY' && (
                    <button
                      onClick={() => setExpiryFilterMode('ALL')}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Xem tất cả danh mục thuốc
                    </button>
                  )}
                </div>
              ) : (
                filteredMedicines.map(med => {
                  const medId = med.id || med._id;
                  const isAdded = disposalCart.some(i => i.id === medId);
                  const batches = med.batches || [];
                  const expiredBatches = batches.filter(isBatchExpired);
                  const nearExpBatches = batches.filter(isBatchNearExpiry);

                  return (
                    <div key={medId} className="relative group">
                      <MedicineCard
                        med={med}
                        added={isAdded}
                        onAddToCart={(m) => { handleAddMedicine(m); }}
                        onClick={() => { handleAddMedicine(med); }}
                        allowOutOfStock={true}
                      />
                      
                      {/* Top Overlay Badge for Expiry indicator */}
                      {expiredBatches.length > 0 && (
                        <div className="absolute top-2 right-2 pointer-events-none z-10">
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider animate-pulse">
                            <ShieldAlert size={10} /> Hết hạn ({expiredBatches.length} lô)
                          </span>
                        </div>
                      )}
                      {expiredBatches.length === 0 && nearExpBatches.length > 0 && (
                        <div className="absolute top-2 right-2 pointer-events-none z-10">
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider">
                            <Clock size={10} /> Cận date ({nearExpBatches.length} lô)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Disposal Details & Cart */}
          <div className="w-full md:w-[450px] lg:w-[500px] xl:w-[560px] border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-5 flex-1 flex flex-col overflow-hidden space-y-4">
              <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Trash2 size={16} className="text-rose-600" />
                    Danh Sách Thuốc Xuất Hủy
                  </h3>
                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-xs font-black rounded-lg border border-rose-200">
                    {disposalCart.length} thuốc ({totalQuantity} đv)
                  </span>
                </div>

                {disposalCart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 custom-scrollbar p-3 space-y-3">
                {disposalCart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-10">
                    <Package size={36} className="opacity-50" />
                    <p className="text-sm font-bold">Chưa chọn thuốc nào để xuất hủy.</p>
                    <p className="text-xs text-slate-400 text-center max-w-xs">
                      Hãy bấm nút <strong>"⚡ Chọn Tất Cả"</strong> ở trên hoặc nhấn (+) trên từng thẻ thuốc để đưa vào biên bản.
                    </p>
                  </div>
                ) : (
                  disposalCart.map((item) => {
                    const batches = item.batches || [];
                    const selectedBatch = item.selectedBatch;
                    const isExp = isBatchExpired(selectedBatch);
                    const isNearExp = isBatchNearExpiry(selectedBatch);

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
                                <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                                  ĐÃ HẾT HẠN
                                </span>
                              )}
                              {!isExp && isNearExp && (
                                <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                  CẬN HẠN
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
                                    Lô: {b.batchNo} | Tồn: {b.stock} | HSD: {b.expDate ? new Date(b.expDate).toLocaleDateString("vi-VN") : "N/A"} {isBatchExpired(b) ? '🔴 [HẾT HẠN]' : ''}
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
                                <button
                                  onClick={() => updateQuantity(item.id, item.maxStock)}
                                  className="text-[10px] text-rose-600 hover:underline font-bold"
                                  title="Hủy toàn bộ số tồn của lô này"
                                >
                                  (Hết: {item.maxStock})
                                </button>
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
