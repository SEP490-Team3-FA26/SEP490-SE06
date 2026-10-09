import { useEffect, useState, useMemo } from "react";
import { Plus, Search, PackageSearch, Activity, Pill, AlertCircle, Edit2, X, CheckCircle2, XCircle, Filter, FileText, ExternalLink, ShieldCheck, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { medicineService, type Medicine } from "../../services/inventory/medicine.service";
import { Pagination } from "../../components/Pagination";
import { AdminProductFilterSidebar } from "../../components/AdminProductFilterSidebar";
import { CreateMedicineModal } from "../../components/CreateMedicineModal";
import { EditMedicineModal } from "../../components/EditMedicineModal";

export function Products() {
  const [products, setProducts] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSyncStatus, setSelectedSyncStatus] = useState<"ALL" | "SYNCED" | "UNSYNCED" | "NOT_REQUIRED">("ALL");
  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";

  // Modal and toast states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Medicine | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);
  
  // Advanced Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassification, setSelectedClassification] = useState(""); // same as categoryFilter before
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedIndication, setSelectedIndication] = useState("");
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    price: true,
    classification: true,
    targetGroup: false,
    country: false,
    indication: false,
    brand: false,
    brandOrigin: false,
    ingredient: false,
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);

      let minPrice = "";
      let maxPrice = "";
      if (selectedPriceRange === "under-50") {
        maxPrice = "50000";
      } else if (selectedPriceRange === "50-100") {
        minPrice = "50000";
        maxPrice = "100000";
      } else if (selectedPriceRange === "100-200") {
        minPrice = "100000";
        maxPrice = "200000";
      } else if (selectedPriceRange === "over-200") {
        minPrice = "200000";
      }

      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
        classification: selectedClassification === "ALL" ? undefined : selectedClassification || undefined,
        targetGroup: selectedTargetGroup || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        flavour: selectedFlavour || undefined,
        country: selectedCountry || undefined,
        brand: selectedBrand || undefined,
        indication: selectedIndication || undefined,
        brandOrigin: selectedBrandOrigin || undefined,
        ingredient: selectedIngredient || undefined
      };

      // Remove undefined keys
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const res: any = await medicineService.getMedicines(params);
      const items = res.data || [];
      const total = res.pagination?.total ?? res.total ?? items.length;
      const pages = res.pagination?.totalPages ?? res.totalPages ?? Math.max(1, Math.ceil(total / itemsPerPage));

      setProducts(items);
      setTotalPages(pages);
      setTotalItems(total);
    } catch (err) {
      console.error("Lỗi tải danh mục sản phẩm:", err);
      setProducts([]);
      showToast("Không thể tải danh sách sản phẩm", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when any filter/page changes
  useEffect(() => {
    // Debounce search query
    const timer = setTimeout(() => {
      fetchProducts();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    currentPage,
    searchQuery,
    selectedClassification,
    selectedTargetGroup,
    selectedPriceRange,
    selectedFlavour,
    selectedCountry,
    selectedBrand,
    selectedIndication,
    selectedBrandOrigin,
    selectedIngredient
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedClassification,
    selectedTargetGroup,
    selectedPriceRange,
    selectedFlavour,
    selectedCountry,
    selectedBrand,
    selectedIndication,
    selectedBrandOrigin,
    selectedIngredient
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
    setSearchQuery("");
  };

  const hasAnyFilter = !!(
    selectedTargetGroup ||
    selectedPriceRange ||
    selectedFlavour ||
    selectedCountry ||
    selectedBrand ||
    selectedIndication ||
    selectedBrandOrigin ||
    selectedIngredient ||
    selectedClassification
  );

  const displayedProducts = useMemo(() => {
    if (selectedSyncStatus === "ALL") return products;
    if (selectedSyncStatus === "NOT_REQUIRED") {
      return products.filter((p) => p.is_medicine === false || p.national_sync_status === "NOT_REQUIRED");
    }
    if (selectedSyncStatus === "UNSYNCED") {
      return products.filter((p) => p.is_medicine !== false && p.national_sync_status === "UNSYNCED");
    }
    if (selectedSyncStatus === "SYNCED") {
      return products.filter((p) => p.is_medicine !== false && (p.national_sync_status === "SYNCED" || !p.national_sync_status));
    }
    return products;
  }, [products, selectedSyncStatus]);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showToast(`Đã sao chép mã: ${code}`, "success");
  };

  const openEditModal = (product: Medicine) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PRESCRIPTION":
      case "PRESCRIPTION_ANTIBIOTIC":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertCircle size={12}/> Thuốc kê đơn</span>;
      case "PSYCHOTROPIC":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200"><Activity size={12}/> Hướng thần</span>;
      case "NORMAL":
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><Pill size={12}/> Thuốc thường</span>;
    }
  };

  const getNationalSyncBadge = (product: Medicine) => {
    // If not classified as medicine (supplements, medical consumables)
    if (product.is_medicine === false || product.national_sync_status === "NOT_REQUIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Không đồng bộ
        </span>
      );
    }
    // If pending synchronization
    if (product.national_sync_status === "UNSYNCED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Chưa đồng bộ
        </span>
      );
    }
    // Default or successfully synchronized
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Đã đồng bộ
      </span>
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục Dược phẩm</h1>
          <p className="text-slate-500 mt-1">Quản lý SKU, thông tin cấp phép và đồng bộ CSDL Dược Quốc gia</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm text-sm cursor-pointer"
        >
          <Plus size={18} />
          <span>Thêm Dược phẩm (SKU)</span>
        </button>
      </div>

      {/* ─── 4 Core National Database Sync KPI Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng SKU Dược Phẩm</div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono tabular-nums">{totalItems || 2331}</div>
            <div className="text-xs text-slate-500 mt-0.5">Toàn bộ danh mục chuỗi</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
            <PackageSearch size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đã Đồng Bộ BYT</div>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-mono tabular-nums">2.307</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              99.0% danh mục thuốc
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chưa Đồng Bộ</div>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono tabular-nums">0</div>
            <div className="text-xs text-slate-500 mt-0.5">Không có tồn đọng</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Không Bắt Buộc (TPCN/Vật tư)</div>
            <div className="text-2xl font-black text-slate-600 mt-1 font-mono tabular-nums">24</div>
            <div className="text-xs text-slate-500 mt-0.5">Mỹ phẩm, bông băng, dụng cụ</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-5 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          <AdminProductFilterSidebar 
            selectedTargetGroup={selectedTargetGroup}
            setSelectedTargetGroup={setSelectedTargetGroup}
            selectedPriceRange={selectedPriceRange}
            setSelectedPriceRange={setSelectedPriceRange}
            selectedFlavour={selectedFlavour}
            setSelectedFlavour={setSelectedFlavour}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedIndication={selectedIndication}
            setSelectedIndication={setSelectedIndication}
            selectedBrandOrigin={selectedBrandOrigin}
            setSelectedBrandOrigin={setSelectedBrandOrigin}
            selectedIngredient={selectedIngredient}
            setSelectedIngredient={setSelectedIngredient}
            selectedClassification={selectedClassification}
            setSelectedClassification={setSelectedClassification}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            handleResetFilters={handleResetFilters}
            hasAnyFilter={hasAnyFilter}
          />
        </aside>

        {/* Main Table Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo mã SKU, tên thuốc, mã Dược QG..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all bg-white"
              />
            </div>
            
            {/* National Sync Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">CSDL Dược:</span>
              <button
                onClick={() => setSelectedSyncStatus("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSyncStatus === "ALL" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Tất cả ({totalItems || 2331})
              </button>
              <button
                onClick={() => setSelectedSyncStatus("SYNCED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSyncStatus === "SYNCED" 
                    ? "bg-emerald-600 text-white shadow-sm" 
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Đã đồng bộ (2.307)
              </button>
              <button
                onClick={() => setSelectedSyncStatus("UNSYNCED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSyncStatus === "UNSYNCED" 
                    ? "bg-amber-600 text-white shadow-sm" 
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Chưa đồng bộ (0)
              </button>
              <button
                onClick={() => setSelectedSyncStatus("NOT_REQUIRED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedSyncStatus === "NOT_REQUIRED" 
                    ? "bg-slate-700 text-white shadow-sm" 
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Không bắt buộc (24)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white border-b border-slate-200 text-slate-900 font-medium uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-4">Mã SKU</th>
                  <th className="px-5 py-4">Tên Dược Phẩm</th>
                  <th className="px-5 py-4">Mã Dược Quốc Gia</th>
                  <th className="px-4 py-4 text-center">Là Thuốc</th>
                  <th className="px-5 py-4 text-center">Đồng bộ CSDL Dược</th>
                  <th className="px-5 py-4 text-right">Giá bán</th>
                  <th className="px-5 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8">Đang tải dữ liệu...</td></tr>
                ) : displayedProducts.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8">Không có dữ liệu phù hợp với bộ lọc</td></tr>
                ) : displayedProducts.map((product) => {
                  const nationalCode = product.national_drug_code || product.registration_number || product.national_drug_id || (product.is_medicine !== false && product.sku ? `VN-${product.sku}` : null);
                  const isNonMedicine = product.is_medicine === false || product.national_sync_status === "NOT_REQUIRED";

                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={product.id} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500">
                        {product.sku || product.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] shrink-0">
                            {product.image ? (
                              <img src={product.image} alt="" className="w-8 h-8 object-contain" />
                            ) : (
                              <PackageSearch size={20} />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 line-clamp-1">{product.name}</span>
                            <span className="text-xs text-slate-400 block">{product.active_ingredient}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        {isNonMedicine ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Không áp dụng
                          </span>
                        ) : nationalCode ? (
                          <div 
                            onClick={() => handleCopyCode(nationalCode)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-indigo-50/70 text-[#0057cd] border border-indigo-100 hover:bg-indigo-100 cursor-pointer group/code select-none transition"
                            title="Bấm để sao chép mã Dược Quốc Gia"
                          >
                            <FileText size={13} className="text-[#0057cd] shrink-0" />
                            <span>{nationalCode}</span>
                            <Copy size={11} className="opacity-0 group-hover/code:opacity-100 text-slate-400 transition-opacity ml-0.5" />
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Chưa xác định</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {!isNonMedicine ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-50 text-[#0057cd] border border-blue-200 mx-auto" title="Là mặt hàng thuốc (Bắt buộc liên thông CSDL Dược)">
                            <CheckCircle2 size={14} />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-50 text-slate-400 border border-slate-200 mx-auto" title="Không phải thuốc (TPCN/Vật tư)">
                            <XCircle size={14} />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {getNationalSyncBadge(product)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900 font-mono tabular-nums">
                        {(product.price || 0).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openEditModal(product)} 
                            title="Sửa thông tin dược phẩm"
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-[#0057cd] hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && totalItems > 0 && (
            <div className="p-4 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold tracking-wide uppercase transition-all duration-300 ${toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/50"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/50"
              }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
              <span className="leading-tight">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>

      <CreateMedicineModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          showToast("Tạo mới dược phẩm thành công!", "success");
          fetchProducts();
        }}
      />
      <EditMedicineModal
        isOpen={showEditModal}
        product={editingProduct}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          showToast("Cập nhật dược phẩm thành công!", "success");
          fetchProducts();
        }}
      />
    </div>
  );
}
