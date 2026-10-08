import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Loader2, MapPin, ChevronDown, Check,
  AlertTriangle, TrendingDown, XCircle, RotateCcw,
  Boxes, Filter, Tag, Archive, AlertCircle
} from "lucide-react";
import { inventoryMapService } from "../../../services/inventory/inventoryMap.service";

export type QuickChipType = "WARN" | "LOW" | "EXPIRED";

export interface WarehouseFilterBarProps {
  zones: any[];
  onFilterChange: (targets: Set<string>, filterDescription?: string) => void;
  onSearchSelect: (targetId: string) => void;
}

export function WarehouseFilterBar({
  zones,
  onFilterChange,
  onSearchSelect,
}: WarehouseFilterBarProps) {
  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeChips, setActiveChips] = useState<Set<QuickChipType>>(new Set());
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // 1. Phân tích thống kê từ zones (Category list & Status counts)
  const { categoriesSummary, statusCounts } = useMemo(() => {
    const catMap = new Map<string, { count: number; totalStock: number }>();
    let warnCount = 0;
    let lowCount = 0;
    let expiredCount = 0;

    zones.forEach((zone: any) => {
      zone.racks?.forEach((rack: any) => {
        rack.shelves?.forEach((shelf: any) => {
          // Status counts
          if (["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(shelf.status)) {
            warnCount++;
          }
          if (shelf.status === "LOW_STOCK") {
            lowCount++;
          }
          if (shelf.status === "EXPIRED") {
            expiredCount++;
          }

          // Category counts
          if (Array.isArray(shelf.categories)) {
            shelf.categories.forEach((cat: string) => {
              if (cat && cat.trim()) {
                const current = catMap.get(cat) || { count: 0, totalStock: 0 };
                current.count += 1;
                current.totalStock += shelf.totalStock || 0;
                catMap.set(cat, current);
              }
            });
          }
        });
      });
    });

    const sortedCats = Array.from(catMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      categoriesSummary: sortedCats,
      statusCounts: {
        warn: warnCount,
        low: lowCount,
        expired: expiredCount,
      },
    };
  }, [zones]);

  // Helper lấy icon danh mục sinh động
  const getCategoryIcon = (categoryName: string) => {
    const lower = categoryName.toLowerCase();
    if (lower.includes("kháng sinh") || lower.includes("antibiotic")) return "💊";
    if (lower.includes("hạ sốt") || lower.includes("giảm đau") || lower.includes("fever")) return "🌡️";
    if (lower.includes("tim") || lower.includes("cardio")) return "❤️";
    if (lower.includes("tiêu hóa") || lower.includes("digest")) return "🫁";
    if (lower.includes("tpcn") || lower.includes("thực phẩm") || lower.includes("vitamin")) return "🌿";
    if (lower.includes("vật tư") || lower.includes("thiết bị")) return "🩺";
    return "📦";
  };

  // 2. Debounce search thuốc theo API
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoadingSearch(true);
        inventoryMapService
          .warehouseSearch(query)
          .then((data) => {
            setSearchResults(data || []);
            setIsSearchOpen(true);
          })
          .catch((err) => {
            console.error("Search failed:", err);
            setSearchResults([]);
          })
          .finally(() => setLoadingSearch(false));
      } else {
        setSearchResults([]);
        setIsSearchOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside listener cho 2 dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Tính toán target highlight khi selectedCategory hoặc activeChips thay đổi
  useEffect(() => {
    // Nếu không áp dụng bộ lọc nào
    if (!selectedCategory && activeChips.size === 0) {
      if (!query) {
        onFilterChange(new Set(), "");
      }
      return;
    }

    const matchedTargets = new Set<string>();

    zones.forEach((zone: any) => {
      zone.racks?.forEach((rack: any) => {
        rack.shelves?.forEach((shelf: any) => {
          // Điều kiện 1: Khớp danh mục (nếu có chọn)
          const matchesCategory =
            !selectedCategory ||
            (Array.isArray(shelf.categories) && shelf.categories.includes(selectedCategory));

          // Điều kiện 2: Khớp chip trạng thái (OR giữa các chips đang active)
          let matchesStatus = activeChips.size === 0; // Mặc định true nếu ko chọn chip
          if (activeChips.size > 0) {
            const isWarn =
              activeChips.has("WARN") &&
              ["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(shelf.status);
            const isLow = activeChips.has("LOW") && shelf.status === "LOW_STOCK";
            const isExpired = activeChips.has("EXPIRED") && shelf.status === "EXPIRED";
            matchesStatus = isWarn || isLow || isExpired;
          }

          // Kết hợp AND: phải thỏa mãn cả danh mục và trạng thái (nếu cả 2 đều được chỉ định)
          if (matchesCategory && matchesStatus) {
            matchedTargets.add(`${zone.zone}-${rack.rack}-${shelf.shelf}`);
          }
        });
      });
    });

    // Tạo chuỗi mô tả ngữ cảnh bộ lọc
    const parts: string[] = [];
    if (selectedCategory) {
      parts.push(`Danh mục: ${selectedCategory}`);
    }
    if (activeChips.has("WARN")) parts.push("⚠️ Cần xử lý");
    if (activeChips.has("LOW")) parts.push("📉 Sắp hết");
    if (activeChips.has("EXPIRED")) parts.push("❌ Hết hạn");

    const description = `${parts.join(" · ")} (${matchedTargets.size} tầng kệ)`;
    onFilterChange(matchedTargets, description);
  }, [selectedCategory, activeChips, zones]);

  // Xử lý chọn kết quả từ ô search
  const handleSelectSearchResult = (item: any) => {
    setSelectedCategory(null);
    setActiveChips(new Set());
    setQuery(item.name);
    setIsSearchOpen(false);
    onSearchSelect(item.targetId);
  };

  // Toggle quick chip
  const handleToggleChip = (chip: QuickChipType) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) {
        next.delete(chip);
      } else {
        next.add(chip);
      }
      return next;
    });
  };

  // Reset toàn bộ bộ lọc
  const handleResetAll = () => {
    setSelectedCategory(null);
    setActiveChips(new Set());
    setQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
    onFilterChange(new Set(), "");
  };

  const isFiltered = Boolean(selectedCategory || activeChips.size > 0 || query);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap w-full">
      {/* 1. Nhóm Tìm kiếm & Danh mục */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* 1. Ô tìm kiếm thuốc */}
        <div className="relative" ref={searchDropdownRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-slate-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thuốc (Tên, SKU)..."
            className="w-56 lg:w-64 bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
          />
          {loadingSearch && (
            <Loader2 className="absolute right-2.5 animate-spin text-sky-500" size={13} />
          )}
          {!loadingSearch && query && (
            <button
              onClick={() => {
                setQuery("");
                setSearchResults([]);
                setIsSearchOpen(false);
                if (!selectedCategory && activeChips.size === 0) {
                  onFilterChange(new Set(), "");
                }
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-sm leading-none"
            >
              &times;
            </button>
          )}
        </div>

        {/* Kết quả tìm kiếm thuốc */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Không tìm thấy thuốc khớp với từ khóa tìm kiếm.
                </div>
              ) : (
                <ul>
                  {searchResults.map((item, idx) => (
                    <li
                      key={`${item.medicineId}-${item.targetId || 'unassigned'}-${idx}`}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-3 hover:bg-sky-50/70 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-slate-800 line-clamp-1" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>SKU: {item.sku}</span>
                            {item.category && <span>&middot; {item.category}</span>}
                          </div>
                        </div>
                        {item.stock !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0 ${
                            item.stock > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {item.stock > 0 ? `Tồn: ${item.stock.toLocaleString("vi-VN")} ${item.unit || 'hộp'}` : "Hết hàng"}
                          </span>
                        )}
                      </div>

                      {item.location?.zone && item.location.zone !== 'RESERVE' ? (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 w-fit px-2 py-0.5 rounded-md border border-sky-200/70 font-medium">
                          <MapPin size={11} className="text-sky-500 shrink-0" />
                          <span>
                            Khu {item.location.zone} &middot; Kệ {item.location.rack} &middot; Tầng {item.location.shelf} {item.location.bin ? `· Thùng B${item.location.bin}` : ''}
                          </span>
                        </div>
                      ) : item.isReserve || item.location?.zone === 'RESERVE' ? (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 w-fit px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                          <Archive size={11} className="text-amber-500 shrink-0" />
                          <span>Khu Lưu Trữ Dự Phòng (RESERVE)</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 w-fit px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                          <AlertCircle size={11} className="text-slate-400 shrink-0" />
                          <span>Chưa có hàng tại kho tổng</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phân cách nhẹ */}
      <div className="h-6 w-px bg-slate-200 hidden sm:block" />

      {/* 2. Dropdown Danh Mục Thuốc */}
      <div className="relative" ref={categoryDropdownRef}>
        <button
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border shadow-sm ${
            selectedCategory
              ? "bg-sky-50 border-sky-300 text-sky-700 ring-2 ring-sky-400/20 font-semibold"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          }`}
          title="Lọc sơ đồ theo danh mục thuốc"
        >
          <Tag size={13} className={selectedCategory ? "text-sky-600" : "text-slate-400"} />
          <span className="truncate max-w-[120px]">
            {selectedCategory ? `${getCategoryIcon(selectedCategory)} ${selectedCategory}` : "Tất cả danh mục"}
          </span>
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu Danh Mục */}
        {isCategoryOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Filter size={11} /> Chọn danh mục hiển thị
              </span>
              <span>{categoriesSummary.length} danh mục</span>
            </div>
            <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
              {/* Option: Tất cả */}
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setIsCategoryOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                  selectedCategory === null
                    ? "bg-sky-100 text-sky-800 font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>(Tất cả danh mục)</span>
                </span>
                {selectedCategory === null && <Check size={14} className="text-sky-600" />}
              </button>

              {/* Danh sách categories thực tế */}
              {categoriesSummary.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      isSelected
                        ? "bg-sky-100 text-sky-800 font-bold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{getCategoryIcon(cat.name)}</span>
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {cat.count} tầng
                      </span>
                      {isSelected && <Check size={13} className="text-sky-600" />}
                    </div>
                  </button>
                );
              })}

              {categoriesSummary.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-400">
                  Chưa có dữ liệu danh mục trên các tầng kệ
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* 2. Nhóm Quick Filter Chips & Reset */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 3. Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
        {/* Chip 1: ⚠️ Cần xử lý */}
        <button
          onClick={() => handleToggleChip("WARN")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border shadow-sm ${
            activeChips.has("WARN")
              ? "bg-amber-500 text-white border-amber-600 shadow-amber-200/50 ring-2 ring-amber-400/20"
              : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/70 hover:border-amber-300"
          }`}
          title="Highlight các tầng có thuốc cận date, hết hạn hoặc sắp hết tồn kho"
        >
          <AlertTriangle
            size={13}
            className={activeChips.has("WARN") ? "text-white" : "text-amber-500"}
          />
          <span>Cần xử lý</span>
          <span
            className={`ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeChips.has("WARN")
                ? "bg-amber-600 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {statusCounts.warn}
          </span>
        </button>

        {/* Chip 2: 📉 Sắp hết */}
        <button
          onClick={() => handleToggleChip("LOW")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border shadow-sm ${
            activeChips.has("LOW")
              ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-200/50 ring-2 ring-yellow-400/20"
              : "bg-white text-slate-700 border-slate-200 hover:bg-yellow-50/70 hover:border-yellow-300"
          }`}
          title="Highlight các tầng kệ có tồn kho dưới 50 đơn vị"
        >
          <TrendingDown
            size={13}
            className={activeChips.has("LOW") ? "text-white" : "text-yellow-600"}
          />
          <span>Sắp hết</span>
          <span
            className={`ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeChips.has("LOW")
                ? "bg-yellow-600 text-white"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {statusCounts.low}
          </span>
        </button>

        {/* Chip 3: ❌ Hết hạn */}
        <button
          onClick={() => handleToggleChip("EXPIRED")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border shadow-sm ${
            activeChips.has("EXPIRED")
              ? "bg-rose-500 text-white border-rose-600 shadow-rose-200/50 ring-2 ring-rose-400/20"
              : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50/70 hover:border-rose-300"
          }`}
          title="Highlight các tầng kệ có chứa thuốc đã quá hạn sử dụng"
        >
          <XCircle
            size={13}
            className={activeChips.has("EXPIRED") ? "text-white" : "text-rose-500"}
          />
          <span>Hết hạn</span>
          <span
            className={`ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeChips.has("EXPIRED")
                ? "bg-rose-600 text-white"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {statusCounts.expired}
          </span>
        </button>
      </div>

        {/* 4. Nút Reset / Clear filters */}
        {isFiltered && (
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-dashed border-slate-300 hover:border-rose-300 shadow-2xs"
            title="Xóa tất cả bộ lọc và tìm kiếm"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Xóa bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}
