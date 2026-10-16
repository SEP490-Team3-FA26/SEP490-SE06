import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  X,
  Gift,
  ShoppingBag,
  Info,
  Pill
} from "lucide-react";
import { VoucherPayload, VoucherRuleType } from "../../services/sales/voucher.service";
import { useVoucherManagement } from "../../hooks/useVoucherManagement";
import { medicineService } from "../../services/inventory/medicine.service";

// =========================================================================
// HÀM TIỆN ÍCH HỖ TRỢ TÌM KIẾM TIẾNG VIỆT & TÔ SÁNG TỪ KHÓA
// =========================================================================
const removeAccents = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

const highlightKeyword = (text: string, keyword: string) => {
  if (!keyword.trim()) return text;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-black px-1 py-0.5 rounded shadow-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// =========================================================================
// COMPONENT CHỌN THUỐC TÌM KIẾM THÔNG MINH (Searchable Combobox)
// Hỗ trợ live search, highlight từ khóa và tự động xếp hạng độ ưu tiên kết quả
// =========================================================================
interface SearchableMedicineSelectProps {
  value: string;
  medicineName?: string;
  onChange: (medicineId: string, medicineName: string) => void;
  medicines: any[];
  placeholder?: string;
  align?: "left" | "right";
}

const SearchableMedicineSelect: React.FC<SearchableMedicineSelectProps> = ({
  value,
  medicineName,
  onChange,
  medicines,
  placeholder = "Tìm theo tên thuốc hoặc số đăng ký...",
  align = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Tìm thuốc đang được chọn
  const selectedMed = useMemo(() => {
    return medicines.find((m) => (m._id || m.id) === value);
  }, [medicines, value]);

  // Thuật toán tìm kiếm thông minh có xếp hạng độ phù hợp (Relevance Ranking)
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) {
      return medicines.slice(0, 30);
    }
    const rawSearch = searchTerm.trim().toLowerCase();
    const cleanSearch = removeAccents(rawSearch);

    return medicines
      .map((m) => {
        const nameRaw = (m.name || "").toLowerCase();
        const nameClean = removeAccents(nameRaw);
        const regRaw = (m.registrationNumber || "").toLowerCase();

        let score = 0;
        // 1. Tên bắt đầu bằng từ khóa (Ví dụ: "Vitamin C...", "Multivitamin...")
        if (nameRaw.startsWith(rawSearch) || nameClean.startsWith(cleanSearch)) {
          score += 150;
        }
        // 2. Chứa từ khóa như một từ độc lập trong tên (Ví dụ: "... bổ sung vitamin C...")
        else if (nameRaw.includes(" " + rawSearch) || nameClean.includes(" " + cleanSearch)) {
          score += 100;
        }
        // 3. Chứa từ khóa ở bất kỳ đâu trong tên thuốc
        else if (nameRaw.includes(rawSearch) || nameClean.includes(cleanSearch)) {
          score += 50;
        }
        // 4. Khớp số đăng ký
        if (regRaw.includes(rawSearch)) {
          score += 40;
        }

        return { medicine: m, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.medicine)
      .slice(0, 50); // Mở rộng tối đa 50 kết quả
  }, [medicines, searchTerm]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = selectedMed ? selectedMed.name : medicineName || "";

  // Trạng thái đã chọn thuốc: hiển thị thẻ thông tin thuốc sang trọng kèm nút đổi
  if (value && displayName && !isOpen) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl transition-all shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Pill size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-800 line-clamp-1" title={displayName}>
              {displayName}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
              {selectedMed?.registrationNumber && (
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-800 font-semibold">
                  SĐK: {selectedMed.registrationNumber}
                </span>
              )}
              {selectedMed?.unit && <span>ĐVT: {selectedMed.unit}</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          className="px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg transition shrink-0 shadow-xs"
        >
          Đổi thuốc khác
        </button>
      </div>
    );
  }

  // Trạng thái tìm kiếm nhập liệu
  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={displayName || placeholder}
          className="w-full pl-8 pr-8 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 transition-all shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-30 ${
            align === "right" ? "right-0" : "left-0"
          } w-[340px] sm:w-[420px] max-w-[90vw] mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="p-2.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 flex justify-between items-center z-10">
            <span>Danh mục thuốc ({filteredList.length} kết quả)</span>
            <span className="text-[9px] font-normal text-slate-400">Gõ từ khóa để lọc nhanh</span>
          </div>
          {filteredList.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Không tìm thấy thuốc khớp với "{searchTerm}"
            </div>
          ) : (
            filteredList.map((m) => {
              const mId = m._id || m.id;
              const isSelected = mId === value;
              return (
                <div
                  key={mId}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(mId, m.name);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  onClick={() => {
                    onChange(mId, m.name);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`p-3 hover:bg-amber-50 cursor-pointer transition flex items-center justify-between text-xs ${
                    isSelected ? "bg-amber-50/80 font-bold text-amber-950" : "text-slate-700"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-800 leading-snug line-clamp-2">
                      {highlightKeyword(m.name, searchTerm)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                      {m.registrationNumber && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold">
                          SĐK: {m.registrationNumber}
                        </span>
                      )}
                      {m.unit && <span>ĐVT: {m.unit}</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-xs" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export function VoucherManagement() {
  const {
    vouchers,
    loading,
    submitting,
    errorMsg,
    successMsg,
    updatingIds,
    fetchVouchers,
    saveVoucher,
    toggleActive,
    deleteVoucher,
    setErrorMsg,
  } = useVoucherManagement();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  // Danh sách thuốc cho dropdown chọn quà
  const [medicinesDropdown, setMedicinesDropdown] = useState<any[]>([]);

  // Modals & form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form Fields Chung
  const [code, setCode] = useState("");
  const [ruleType, setRuleType] = useState<VoucherRuleType>("STANDARD");
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  // Form Fields: Loại STANDARD
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [maxDiscountValue, setMaxDiscountValue] = useState<number | undefined>(undefined);

  // Form Fields: Loại BUY_X_GET_Y (Mua X tặng Y)
  const [buyMedicineId, setBuyMedicineId] = useState("");
  const [buyMedicineName, setBuyMedicineName] = useState("");
  const [buyQuantity, setBuyQuantity] = useState<number>(2);

  const [giftMedicineId, setGiftMedicineId] = useState("");
  const [giftMedicineName, setGiftMedicineName] = useState("");
  const [giftQuantity, setGiftQuantity] = useState<number>(1);
  const [giftDiscountPercent, setGiftDiscountPercent] = useState<number>(100);

  // Tải toàn bộ danh mục thuốc phục vụ chọn lựa đầy đủ 100%
  useEffect(() => {
    const loadMedicines = async () => {
      try {
        let list: any[] = [];
        try {
          const res = await medicineService.getMedicinesDropdown();
          list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        } catch (dropErr) {
          console.warn("Dropdown API failed, falling back to medicines list:", dropErr);
        }

        // Đảm bảo tải đầy đủ toàn bộ hơn 2.300 loại dược phẩm trong hệ thống
        if (!list || list.length < 2000) {
          try {
            const fallbackRes = await medicineService.getMedicines({ limit: 5000 });
            const fullList = Array.isArray(fallbackRes) ? fallbackRes : (fallbackRes?.data && Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
            if (fullList.length > list.length) {
              list = fullList;
            }
          } catch (fallbackErr) {
            console.warn("Fallback getMedicines limit 5000:", fallbackErr);
          }
        }

        const normalized = (list || []).map((m: any) => {
          const id = String(m._id || m.id || "");
          return {
            ...m,
            _id: id,
            id: id,
            name: m.name || "Thuốc chưa đặt tên",
            unit: m.unit || "Hộp",
            registrationNumber: m.registrationNumber || m.registration_number || "",
          };
        }).filter((m: any) => Boolean(m._id));

        setMedicinesDropdown(normalized);
      } catch (err) {
        console.error("Lỗi khi tải danh mục thuốc:", err);
      }
    };
    loadMedicines();
  }, []);

  const resetForm = () => {
    setCode("");
    setRuleType("STANDARD");
    setDiscountType("PERCENTAGE");
    setDiscountValue(0);
    setMinOrderValue(0);
    setMaxDiscountValue(undefined);
    setStartDate("");
    setExpiryDate("");
    setUsageLimit(undefined);
    setIsActive(true);
    setSelectedId(null);
    setIsEditing(false);

    // Reset Mua X tặng Y
    setBuyMedicineId("");
    setBuyMedicineName("");
    setBuyQuantity(2);
    setGiftMedicineId("");
    setGiftMedicineName("");
    setGiftQuantity(1);
    setGiftDiscountPercent(100);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (v: any) => {
    setSelectedId(v._id);
    setCode(v.code);
    const rType: VoucherRuleType = v.ruleType || "STANDARD";
    setRuleType(rType);
    setDiscountType(v.discountType || "PERCENTAGE");
    setDiscountValue(v.discountValue || 0);
    setMinOrderValue(v.minOrderValue || 0);
    setMaxDiscountValue(v.maxDiscountValue);
    setStartDate(v.startDate ? new Date(v.startDate).toISOString().split("T")[0] : "");
    setExpiryDate(v.expiryDate ? new Date(v.expiryDate).toISOString().split("T")[0] : "");
    setUsageLimit(v.usageLimit !== null ? v.usageLimit : undefined);
    setIsActive(v.isActive);

    // Mua X tặng Y
    if (v.buyCondition) {
      setBuyMedicineId(v.buyCondition.buyMedicineId || "");
      setBuyMedicineName(v.buyCondition.buyMedicineName || "");
      setBuyQuantity(v.buyCondition.buyQuantity || 1);
    }
    if (v.giftReward) {
      setGiftMedicineId(v.giftReward.giftMedicineId || "");
      setGiftMedicineName(v.giftReward.giftMedicineName || "");
      setGiftQuantity(v.giftReward.giftQuantity || 1);
      setGiftDiscountPercent(v.giftReward.giftDiscountPercent ?? 100);
    }

    setIsEditing(true);
    setShowModal(true);
  };

  // Xử lý lưu Form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !startDate || !expiryDate) {
      setErrorMsg("Vui lòng điền đầy đủ mã khuyến mãi, ngày bắt đầu và kết thúc.");
      return;
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      setErrorMsg("Ngày kết thúc phải lớn hơn ngày bắt đầu.");
      return;
    }

    if (usageLimit !== undefined && usageLimit !== null && usageLimit <= 0) {
      setErrorMsg("Tổng lượt dùng phải lớn hơn hoặc bằng 1.");
      return;
    }

    // Validate theo từng loại
    if (ruleType === "STANDARD") {
      if (discountValue <= 0) {
        setErrorMsg("Giá trị giảm giá phải lớn hơn 0.");
        return;
      }
      if (discountType === "PERCENTAGE" && (discountValue <= 0 || discountValue > 100)) {
        setErrorMsg("Phần trăm giảm giá phải từ 1 đến 100%.");
        return;
      }
    } else if (ruleType === "BUY_X_GET_Y") {
      if (!buyMedicineId || buyQuantity <= 0) {
        setErrorMsg("Vui lòng chọn thuốc cần mua và số lượng yêu cầu.");
        return;
      }
      if (!giftMedicineId || giftQuantity <= 0) {
        setErrorMsg("Vui lòng chọn thuốc quà tặng và số lượng tặng.");
        return;
      }
    }

    const payload: VoucherPayload = {
      code: code.toUpperCase().trim(),
      ruleType,
      discountType: ruleType === "STANDARD" ? discountType : "FIXED_AMOUNT",
      discountValue: ruleType === "STANDARD" ? Number(discountValue) : 0,
      minOrderValue: Number(minOrderValue || 0),
      maxDiscountValue: maxDiscountValue ? Number(maxDiscountValue) : undefined,
      startDate: new Date(startDate).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      isActive,
      // Dữ liệu Mua X tặng Y
      buyCondition:
        ruleType === "BUY_X_GET_Y"
          ? {
              buyMedicineId,
              buyMedicineName,
              buyQuantity: Number(buyQuantity),
            }
          : undefined,
      giftReward:
        ruleType === "BUY_X_GET_Y"
          ? {
              giftMedicineId,
              giftMedicineName,
              giftQuantity: Number(giftQuantity),
              giftDiscountPercent: Number(giftDiscountPercent),
            }
          : undefined,
    };

    const res = await saveVoucher(payload, isEditing && selectedId ? selectedId : undefined);
    if (res.success) {
      setShowModal(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn vô hiệu hóa vĩnh viễn mã khuyến mãi này?")) return;
    await deleteVoucher(id);
  };

  // Lọc voucher theo tìm kiếm và loại
  const filteredVouchers = vouchers.filter((v) => {
    const matchSearch =
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.buyCondition?.buyMedicineName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.giftReward?.giftMedicineName || "").toLowerCase().includes(searchQuery.toLowerCase());

    const rType = v.ruleType || "STANDARD";
    const matchType = selectedTypeFilter === "ALL" || rType === selectedTypeFilter;

    return matchSearch && matchType;
  });

  const activeCount = vouchers.filter((v) => v.isActive && new Date(v.expiryDate) > new Date()).length;
  const totalCount = vouchers.length;
  const usedTotal = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quản Lý Voucher & Khuyến Mãi
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Thiết lập mã giảm giá điều kiện: Mua X tặng Y và giảm giá theo đơn hàng
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchVouchers}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition shadow-sm"
          >
            Tải lại dữ liệu
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center gap-1.5"
          >
            <Plus size={16} /> Tạo Mã Khuyến Mãi Mới
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-500" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <AlertTriangle size={16} className="text-rose-500" />
          {errorMsg}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">TỔNG VOUCHER</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            All
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">ĐANG HOẠT ĐỘNG</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">MUA X TẶNG Y</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {vouchers.filter((v) => v.ruleType === "BUY_X_GET_Y").length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Gift size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã, tên thuốc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedTypeFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedTypeFilter === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({vouchers.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter("BUY_X_GET_Y")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              selectedTypeFilter === "BUY_X_GET_Y"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Gift size={13} /> Mua X tặng Y
          </button>
          <button
            type="button"
            onClick={() => setSelectedTypeFilter("STANDARD")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              selectedTypeFilter === "STANDARD"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <Tag size={13} /> Đơn hàng chuẩn
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách khuyến mãi...</span>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              Không tìm thấy voucher hoặc quy tắc khuyến mãi nào phù hợp.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Voucher</th>
                  <th className="py-3 px-4">Loại Khuyến Mãi</th>
                  <th className="py-3 px-4">Quy Tắc & Mức Ưu Đãi</th>
                  <th className="py-3 px-4">Đơn Tối Thiểu</th>
                  <th className="py-3 px-4">Thời Hạn Áp Dụng</th>
                  <th className="py-3 px-4 text-center">Lượt Dùng</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredVouchers.map((v) => {
                  const rType = v.ruleType || "STANDARD";
                  const isExpired = new Date(v.expiryDate) < new Date();

                  return (
                    <tr key={v._id} className="hover:bg-slate-50/70 transition">
                      {/* Mã Voucher */}
                      <td className="py-3.5 px-4 font-black text-indigo-900 tracking-wide">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700">
                            {v.code}
                          </span>
                        </div>
                      </td>

                      {/* Loại Khuyến Mãi */}
                      <td className="py-3.5 px-4">
                        {rType === "BUY_X_GET_Y" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-lg font-bold">
                            <Gift size={12} /> Mua X tặng Y
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold">
                            <Tag size={12} /> Giảm theo đơn
                          </span>
                        )}
                      </td>

                      {/* Quy tắc & Mức Ưu Đãi */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {rType === "BUY_X_GET_Y" ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-800 font-bold">
                              Mua <span className="text-indigo-600 font-black">{v.buyCondition?.buyQuantity}</span> x{" "}
                              {v.buyCondition?.buyMedicineName || "Thuốc chỉ định"}
                            </div>
                            <div className="text-amber-600 font-semibold flex items-center gap-1">
                              🎁 Tặng <span className="font-bold">{v.giftReward?.giftQuantity}</span> x{" "}
                              {v.giftReward?.giftMedicineName || "Quà tặng"} ({v.giftReward?.giftDiscountPercent ?? 100}% giá)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-900 font-bold">
                              {v.discountType === "PERCENTAGE"
                                ? `Giảm ${v.discountValue}%`
                                : `Giảm ${Number(v.discountValue).toLocaleString("vi-VN")}₫`}
                            </span>
                            {v.maxDiscountValue ? (
                              <span className="text-[10px] text-slate-400 block">
                                Tối đa {Number(v.maxDiscountValue).toLocaleString("vi-VN")}₫
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Đơn Tối Thiểu */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {Number(v.minOrderValue || 0) > 0 ? (
                          `${Number(v.minOrderValue).toLocaleString("vi-VN")}₫`
                        ) : (
                          <span className="text-slate-400">Không yêu cầu</span>
                        )}
                      </td>

                      {/* Thời Hạn Áp Dụng */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="text-[11px] font-medium">
                          {new Date(v.startDate).toLocaleDateString("vi-VN")} -{" "}
                          <span className={isExpired ? "text-rose-600 font-bold" : ""}>
                            {new Date(v.expiryDate).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        {isExpired && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">
                            Đã hết hạn
                          </span>
                        )}
                      </td>

                      {/* Lượt Dùng */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800">{v.usedCount || 0}</span>
                        <span className="text-slate-400 text-[10px]">
                          {" "}
                          / {v.usageLimit !== null && v.usageLimit !== undefined ? v.usageLimit : "∞"}
                        </span>
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={updatingIds.has(v._id)}
                          onClick={() => toggleActive(v)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            v.isActive ? "bg-emerald-500" : "bg-slate-200"
                          } ${updatingIds.has(v._id) ? "opacity-50 pointer-events-none" : ""}`}
                          title={v.isActive ? "Nhấn để tạm dừng" : "Nhấn để kích hoạt"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              v.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Sửa quy tắc"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Vô hiệu hóa vĩnh viễn"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Tạo/Sửa Khuyến Mãi (Mua X tặng Y) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-indigo-950 flex items-center gap-2 text-base">
                  <Tag size={18} className="text-indigo-600" />
                  {isEditing ? "Cập Nhật Quy Tắc Khuyến Mãi" : "Thiết Lập Chiến Dịch Khuyến Mãi Mới"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo mã giảm giá theo điều kiện: Mua X tặng Y hoặc Giảm theo đơn hàng
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Chọn Loại Khuyến Mãi */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  1. Chọn Loại Hình Khuyến Mãi *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRuleType("STANDARD")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ruleType === "STANDARD"
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <Tag size={14} className={ruleType === "STANDARD" ? "text-indigo-600" : "text-slate-400"} />
                      Đơn Hàng Chuẩn
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Giảm % hoặc tiền mặt trên tổng hóa đơn
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuleType("BUY_X_GET_Y")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ruleType === "BUY_X_GET_Y"
                        ? "border-amber-600 bg-amber-50/60 text-amber-950 shadow-sm ring-1 ring-amber-600"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1 text-amber-700">
                      <Gift size={14} className="text-amber-600" />
                      Mua X Tặng Y
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Mua đủ thuốc A tặng kèm hoặc giảm giá thuốc B
                    </div>
                  </button>
                </div>
              </div>

              {/* Thông tin Mã và Thời Hạn */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mã Khuyến Mãi (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: MUAPANA1TANG1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ngày Bắt Đầu *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ngày Kết Thúc *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* KHỐI CẤU HÌNH CHI TIẾT THEO LOẠI */}
              {ruleType === "STANDARD" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in">
                  <div className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <Tag size={14} className="text-indigo-600" /> Cấu hình Giảm Giá Đơn Hàng
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Hình thức giảm giá *
                    </label>
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden p-1 bg-white">
                      <button
                        type="button"
                        onClick={() => setDiscountType("PERCENTAGE")}
                        className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                          discountType === "PERCENTAGE"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        % Phần trăm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("FIXED_AMOUNT")}
                        className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                          discountType === "FIXED_AMOUNT"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Tiền mặt cố định
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {discountType === "PERCENTAGE" ? "Mức giảm (%) *" : "Số tiền giảm (₫) *"}
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={discountType === "PERCENTAGE" ? 100 : undefined}
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        placeholder={discountType === "PERCENTAGE" ? "10" : "50000"}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {discountType === "PERCENTAGE" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Giảm tối đa (₫)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={maxDiscountValue || ""}
                          onChange={(e) => setMaxDiscountValue(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Không giới hạn"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* KHỐI MUA X TẶNG Y */}
              {ruleType === "BUY_X_GET_Y" && (
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-4 animate-in fade-in">
                  <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <Gift size={14} className="text-amber-600" /> Cấu hình Quy Tắc Mua X Tặng Y
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phần điều kiện mua X */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-3">
                      <span className="text-xs font-black text-slate-800 block">
                        ĐIỀU KIỆN MUA (X)
                      </span>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Chọn thuốc cần mua *
                        </label>
                        <SearchableMedicineSelect
                          value={buyMedicineId}
                          medicineName={buyMedicineName}
                          onChange={(id, name) => {
                            setBuyMedicineId(id);
                            setBuyMedicineName(name);
                          }}
                          medicines={medicinesDropdown}
                          placeholder="🔍 Gõ tên thuốc hoặc số đăng ký để tìm..."
                          align="left"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Số lượng tối thiểu cần mua (X) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={buyQuantity}
                          onChange={(e) => setBuyQuantity(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Phần quà tặng Y */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-3">
                      <span className="text-xs font-black text-amber-800 block">
                        QUÀ TẶNG KÈM (Y)
                      </span>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Chọn thuốc quà tặng *
                        </label>
                        <SearchableMedicineSelect
                          value={giftMedicineId}
                          medicineName={giftMedicineName}
                          onChange={(id, name) => {
                            setGiftMedicineId(id);
                            setGiftMedicineName(name);
                          }}
                          medicines={medicinesDropdown}
                          placeholder="🔍 Gõ tên thuốc quà tặng..."
                          align="right"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Số lượng tặng (Y) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={giftQuantity}
                            onChange={(e) => setGiftQuantity(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Mức giảm (%)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={giftDiscountPercent}
                            onChange={(e) => setGiftDiscountPercent(Number(e.target.value))}
                            title="100% là miễn phí hoàn toàn quà tặng"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Điều kiện chung: Đơn tối thiểu & Lượt dùng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Giá trị đơn tối thiểu (₫)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Giới hạn lượt dùng toàn hệ thống
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={usageLimit || ""}
                    onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Không giới hạn"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? "Đang xử lý..." : isEditing ? "Lưu Thay Đổi" : "Tạo Mã Khuyến Mãi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
