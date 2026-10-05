import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, ShoppingCart, Star, Heart, Info, Check,
  ChevronLeft, ChevronRight, XCircle, Activity,
  ShieldAlert, Filter, X, ChevronDown, ChevronUp,
  RotateCcw, Sparkles, SlidersHorizontal, ArrowUpDown
} from "lucide-react";
import { MedicineCard } from "../../components/MedicineCard";
import { ShopFilterSidebar } from "../../components/ShopFilterSidebar";
import { Pagination } from "../../components/Pagination";
import { MedicineDetailModal } from "../../components/MedicineDetailModal";
import api from "../../services/core/api";

// Sub-category Card Model
export interface SubCategoryCard {
  id: string;
  name: string;
  count: number;
  image: string;
  searchKeyword?: string;
  categoryValue?: string;
}

// Map các danh mục con cho từng nhóm (chính xác như hình ảnh thực tế của Long Châu)
export const subCategoriesByGroup: {
  [key: string]: { parentName: string; title: string; items: SubCategoryCard[] };
} = {
  "Thuốc bổ": {
    parentName: "Thực phẩm chức năng",
    title: "Vitamin & Khoáng chất",
    items: [
      { id: "dau-ca", name: "Dầu cá - Omega 3", count: 13, image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=60", searchKeyword: "Omega 3" },
      { id: "kem-magie", name: "Kẽm - Magie", count: 7, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60", searchKeyword: "Kẽm" },
      { id: "vitamin-tong-hop", name: "Vitamin tổng hợp", count: 45, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=60", searchKeyword: "Vitamin" },
      { id: "canxi-d", name: "Canxi & Vitamin D", count: 44, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=60", searchKeyword: "Canxi" },
      { id: "vitamin-c", name: "Vitamin C", count: 9, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60", searchKeyword: "Vitamin C" },
      { id: "vitamin-e", name: "Vitamin E", count: 3, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=60", searchKeyword: "Vitamin E" },
      { id: "sat-folic", name: "Sắt - Axit Folic", count: 11, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=200&auto=format&fit=crop&q=60", searchKeyword: "Sắt" },
    ]
  },
  "Dược mỹ phẩm": {
    parentName: "Dược mỹ phẩm",
    title: "Chăm sóc da mặt",
    items: [
      { id: "sua-rua-mat", name: "Sữa rửa mặt", count: 61, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=60", searchKeyword: "Sữa rửa mặt" },
      { id: "kem-chong-nang", name: "Kem chống nắng da mặt", count: 28, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=60", searchKeyword: "Kem chống nắng" },
      { id: "duong-da", name: "Dưỡng da mặt", count: 15, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&auto=format&fit=crop&q=60", searchKeyword: "Dưỡng da" },
      { id: "mat-na", name: "Mặt nạ", count: 14, image: "https://images.unsplash.com/photo-1567928815116-248c8c7c9451?w=200&auto=format&fit=crop&q=60", searchKeyword: "Mặt nạ" },
      { id: "serum", name: "Serum, Essence, Ampoule", count: 16, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=60", searchKeyword: "Serum" },
      { id: "toner", name: "Toner & Lotion", count: 2, image: "https://images.unsplash.com/photo-1608248597359-00994966d5b0?w=200&auto=format&fit=crop&q=60", searchKeyword: "Toner" },
      { id: "tay-te-bao-chet", name: "Tẩy tế bào chết mặt", count: 2, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=60", searchKeyword: "Tẩy tế bào chết" },
      { id: "xit-khoang", name: "Xịt khoáng", count: 3, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=60", searchKeyword: "Xịt khoáng" },
      { id: "tay-trang", name: "Nước tẩy trang, dầu tẩy trang", count: 19, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=60", searchKeyword: "Tẩy trang" },
      { id: "mieng-dan-mun", name: "Miếng dán mụn", count: 10, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60", searchKeyword: "Mụn" },
    ]
  },
  "Thuốc kháng sinh": {
    parentName: "Thuốc",
    title: "Thuốc Kê Đơn & Kháng Sinh (Rx)",
    items: [
      { id: "ks-uong", name: "Kháng sinh đường uống", count: 24, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc kháng sinh" },
      { id: "ha-sot", name: "Thuốc giảm đau hạ sốt", count: 18, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc giảm đau hạ sốt" },
      { id: "tri-ho", name: "Thuốc trị ho cảm & Hô hấp", count: 15, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc trị ho cảm" },
      { id: "da-day", name: "Thuốc dạ dày & Đại tràng", count: 16, image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc dạ dày" },
      { id: "tim-mach", name: "Thuốc tim mạch & Huyết áp", count: 12, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc tim mạch huyết áp" },
      { id: "di-ung", name: "Thuốc chống dị ứng", count: 9, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60", categoryValue: "Thuốc dị ứng" },
    ]
  },
  "Thuốc giảm đau hạ sốt": {
    parentName: "Thuốc",
    title: "Thuốc Giảm Đau - Hạ Sốt - Kháng Viêm",
    items: [
      { id: "paracetamol", name: "Paracetamol đơn chất", count: 14, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60", searchKeyword: "Paracetamol" },
      { id: "giam-dau-ket-hop", name: "Giảm đau kết hợp", count: 10, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60", searchKeyword: "Panadol" },
      { id: "khang-viem", name: "Kháng viêm NSAIDs", count: 8, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=60", searchKeyword: "Ibuprofen" },
      { id: "ha-sot-tre-em", name: "Hạ sốt dành cho trẻ em", count: 6, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=60", searchKeyword: "Hapacol" },
      { id: "mieng-dan", name: "Miếng dán giảm đau", count: 5, image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=60", categoryValue: "Miếng dán giảm đau" },
    ]
  },
  "Thiết bị y tế": {
    parentName: "Thiết bị y tế",
    title: "Thiết Bị Y Tế & Dụng Cụ Đo",
    items: [
      { id: "may-huyet-ap", name: "Máy đo huyết áp điện tử", count: 8, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=60", searchKeyword: "Huyết áp" },
      { id: "may-duong-huyet", name: "Máy & Que thử đường huyết", count: 6, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=60", searchKeyword: "Đường huyết" },
      { id: "nhiet-ke", name: "Nhiệt kế điện tử hồng ngoại", count: 5, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=60", searchKeyword: "Nhiệt kế" },
      { id: "khau-trang", name: "Khẩu trang & Băng gạc", count: 12, image: "https://images.unsplash.com/photo-1586942593568-29361efcd571?w=200&auto=format&fit=crop&q=60", searchKeyword: "Khẩu trang" },
    ]
  }
};

export function CustomerShop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams.get("subCategory") || "");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  // Sorting state (Long Châu standard: Bán chạy / Giá thấp / Giá cao)
  const [sortBy, setSortBy] = useState<"bestseller" | "price-asc" | "price-desc">("bestseller");

  // Advanced Filter states
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedIndication, setSelectedIndication] = useState("");
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");

  // UI state for Mobile filter drawer and section expand/collapse
  const [showMobileFilters, setShowMobileFilters] = useState(false);
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

  // Modal states
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(16); // 4x4 layout

  const categories = [
    "Thuốc kháng sinh",
    "Thuốc giảm đau hạ sốt",
    "Thuốc trị ho cảm",
    "Thuốc dạ dày",
    "Thuốc bổ",
    "Miếng dán giảm đau",
    "Thuốc tim mạch huyết áp",
    "Thuốc tiêu hoá",
    "Thuốc dị ứng"
  ];

  const classifications = [
    { value: "", label: "Tất cả các loại" },
    { value: "PRESCRIPTION_ANTIBIOTIC", label: "Thuốc kê đơn (Rx)" },
    { value: "COMMON_SUPPLEMENT", label: "Thực phẩm bổ sung" }
  ];

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
    setSelectedCategory("");
    setSelectedSubCategory("");
    setSearchQuery("");
  };

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const classParam = selectedClassification ? `&classification=${selectedClassification}` : "";
      const searchVal = selectedIngredient || searchQuery;
      const searchParam = searchVal ? `&search=${encodeURIComponent(searchVal)}` : "";

      let minPrice = "";
      let maxPrice = "";
      if (selectedPriceRange === "under-50" || selectedPriceRange === "under-100") {
        maxPrice = selectedPriceRange === "under-50" ? "50000" : "100000";
      } else if (selectedPriceRange === "50-100" || selectedPriceRange === "100-300") {
        minPrice = selectedPriceRange === "50-100" ? "50000" : "100000";
        maxPrice = selectedPriceRange === "50-100" ? "100000" : "300000";
      } else if (selectedPriceRange === "100-200" || selectedPriceRange === "300-500") {
        minPrice = selectedPriceRange === "100-200" ? "100000" : "300000";
        maxPrice = selectedPriceRange === "100-200" ? "200000" : "500000";
      } else if (selectedPriceRange === "over-200" || selectedPriceRange === "over-500") {
        minPrice = selectedPriceRange === "over-200" ? "200000" : "500000";
      }

      const targetParam = selectedTargetGroup ? `&targetGroup=${encodeURIComponent(selectedTargetGroup)}` : "";
      const minPriceParam = minPrice ? `&minPrice=${minPrice}` : "";
      const maxPriceParam = maxPrice ? `&maxPrice=${maxPrice}` : "";
      const flavourParam = selectedFlavour ? `&flavour=${encodeURIComponent(selectedFlavour)}` : "";
      const countryParam = selectedCountry ? `&country=${encodeURIComponent(selectedCountry)}` : "";
      const brandParam = selectedBrand ? `&brand=${encodeURIComponent(selectedBrand)}` : "";
      const indicationParam = selectedIndication ? `&indication=${encodeURIComponent(selectedIndication)}` : "";
      const brandOriginParam = selectedBrandOrigin ? `&brandOrigin=${encodeURIComponent(selectedBrandOrigin)}` : "";

      const res = await api.get(`/api/medicines?page=${currentPage}&limit=${limit}${searchParam}${categoryParam}${classParam}${targetParam}${minPriceParam}${maxPriceParam}${flavourParam}${countryParam}${brandParam}${indicationParam}${brandOriginParam}`);
      const result = res.data;
      setMedicines(result.data || []);
      setTotalItems(result.total || 0);
      setTotalPages(Math.ceil((result.total || 0) / limit) || 1);
    } catch (err) {
      console.error("Error fetching medicines:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync search query and category from URL search params if it changes
  useEffect(() => {
    const q = searchParams.get("search") || "";
    const cat = searchParams.get("category") || "";
    const subCat = searchParams.get("subCategory") || "";
    setSearchQuery(q);
    setSelectedCategory(cat);
    setSelectedSubCategory(subCat);
  }, [searchParams]);

  // Trigger fetch when pagination or dropdown filters/advanced filters change
  useEffect(() => {
    fetchMedicines();
  }, [
    currentPage,
    selectedCategory,
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
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

  // Debounce search and reset to page 1
  useEffect(() => {
    const delay = setTimeout(() => {
      setCurrentPage(1);
      fetchMedicines();
    }, 450);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Handle add to cart
  const handleAddToCart = async (med: any, qty: number = 1) => {
    const medId = med.id || med._id;
    const token = localStorage.getItem("token");

    if (!token) {
      try {
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const existingItem = cart.find((it: any) => it.id === medId || it._id === medId);

        if (existingItem) {
          if (existingItem.quantity + qty > (med.stock || 999)) {
            alert(`Chỉ còn ${med.stock} sản phẩm khả dụng trong kho!`);
            return;
          }
          existingItem.quantity += qty;
        } else {
          if ((med.stock ?? 1) <= 0) {
            alert("Sản phẩm đã hết hàng!");
            return;
          }
          cart.push({
            id: medId,
            _id: medId,
            name: med.name,
            category: med.category,
            price: med.salePrice || med.price,
            quantity: qty,
            unit: med.unit || "Hộp",
            stock: med.stock || 100,
            active_ingredient: med.active_ingredient || "",
            image: med.image || ""
          });
        }
        localStorage.setItem("guest_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cartUpdated"));

        setAddedItems((prev) => ({ ...prev, [medId]: true }));
        setTimeout(() => setAddedItems((prev) => ({ ...prev, [medId]: false })), 1500);
      } catch (err) {
        console.error("Error updating guest cart:", err);
      }
      return;
    }

    try {
      await api.post("/api/users/cart", { medicineId: medId, quantity: qty });
      window.dispatchEvent(new Event("cartUpdated"));
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => setAddedItems((prev) => ({ ...prev, [medId]: false })), 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi kết nối khi thêm vào giỏ");
    }
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

  const renderFilterSidebar = () => (
    <ShopFilterSidebar
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
  );

  const hasActiveFilters = !!(selectedCategory || selectedClassification || selectedTargetGroup || selectedPriceRange || selectedCountry || selectedBrand || searchQuery);

  // Determine current active sub-category group information
  const currentSubGroupData = useMemo(() => {
    if (selectedCategory && subCategoriesByGroup[selectedCategory]) {
      return subCategoriesByGroup[selectedCategory];
    }
    // Default fallback to "Thuốc bổ" / Vitamin nếu không có match
    if (selectedCategory === "Dược mỹ phẩm") return subCategoriesByGroup["Dược mỹ phẩm"];
    if (selectedCategory === "Thuốc kháng sinh") return subCategoriesByGroup["Thuốc kháng sinh"];
    if (selectedCategory === "Thuốc giảm đau hạ sốt") return subCategoriesByGroup["Thuốc giảm đau hạ sốt"];
    if (selectedCategory === "Thiết bị y tế") return subCategoriesByGroup["Thiết bị y tế"];
    return subCategoriesByGroup["Thuốc kháng sinh"];
  }, [selectedCategory]);

  // Click on a sub-category card to quick filter
  const handleSubCategoryClick = (card: SubCategoryCard) => {
    if (card.categoryValue) {
      setSelectedCategory(card.categoryValue);
      setSearchParams({ category: card.categoryValue });
    } else if (card.searchKeyword) {
      setSearchQuery(card.searchKeyword);
      setSearchParams({
        ...(selectedCategory ? { category: selectedCategory } : {}),
        search: card.searchKeyword
      });
    }
  };

  // Sorted medicines according to sorting criteria
  const sortedMedicines = useMemo(() => {
    const list = [...medicines];
    if (sortBy === "price-asc") {
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }
    if (sortBy === "price-desc") {
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    return list; // 'bestseller'
  }, [medicines, sortBy]);

  return (
    <div className="flex flex-col gap-5 flex-1">

      {/* ========================================================================= */}
      {/* 1. BREADCRUMB NAVIGATION (LONG CHÂU STANDARD) */}
      {/* ========================================================================= */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/" className="text-[#0057cd] hover:underline">Trang chủ</Link>
        <span className="text-slate-300">/</span>
        <button
          onClick={() => {
            if (selectedCategory) navigate(`/customer/shop?category=${encodeURIComponent(selectedCategory)}`);
            else navigate("/customer/shop");
          }}
          className="text-[#0057cd] hover:underline cursor-pointer"
        >
          {currentSubGroupData.parentName}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold">{currentSubGroupData.title}</span>
      </nav>

      {/* ========================================================================= */}
      {/* 2. GROUP TITLE */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {currentSubGroupData.title}
        </h1>
      </div>

      {/* ========================================================================= */}
      {/* 3. SUB-CATEGORY GRID CARDS (BỘ LỌC DẠNG THẺ VUÔNG BO TRÒN GIỐNG LONG CHÂU) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
        {currentSubGroupData.items.map((card) => {
          const isSelected =
            (card.categoryValue && selectedCategory === card.categoryValue) ||
            (card.searchKeyword && searchQuery.toLowerCase().includes(card.searchKeyword.toLowerCase()));

          return (
            <div
              key={card.id}
              onClick={() => handleSubCategoryClick(card)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 bg-white group hover:shadow-md hover:border-blue-400 ${
                isSelected
                  ? "border-[#0057cd] bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20"
                  : "border-slate-200/80 shadow-2xs hover:bg-slate-50/50"
              }`}
            >
              {/* Product Thumbnail Box */}
              <div className="w-14 h-14 rounded-xl bg-slate-50 p-1 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>

              {/* Sub-category Info */}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold leading-snug line-clamp-2 transition-colors ${
                  isSelected ? "text-[#0057cd] font-black" : "text-slate-800 group-hover:text-[#0057cd]"
                }`}>
                  {card.name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {card.count} sản phẩm
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN CONTENT AREA: SIDEBAR FILTER + PRODUCT LIST */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1 items-start w-full mt-2">

        {/* Sticky Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          {renderFilterSidebar()}
        </aside>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}></div>
            <div className="relative w-80 max-w-full bg-white h-full p-6 shadow-xl flex flex-col overflow-y-auto no-scrollbar z-10">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="font-black text-sm uppercase tracking-wider text-slate-800">Bộ lọc nâng cao</span>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              {renderFilterSidebar()}
            </div>
          </div>
        )}

        {/* Products Right Column */}
        <div className="flex-1 flex flex-col w-full">

          {/* ========================================================================= */}
          {/* SORTING TOOLBAR (CHUẨN CHUỖI LONG CHÂU: BÁN CHẠY / GIÁ THẤP / GIÁ CAO) */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Danh sách sản phẩm</h2>
                <span className="text-xs text-slate-400 font-semibold">({totalItems || sortedMedicines.length})</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Lưu ý: Thuốc kê đơn và một số sản phẩm sẽ cần tư vấn từ dược sĩ
              </p>
            </div>

            {/* Mobile Filter Button */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Filter size={13} className="text-[#0057cd]" />
                <span>Bộ lọc</span>
                {hasActiveFilters && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>}
              </button>

              {/* Sorting Pills */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="text-slate-500 text-xs hidden sm:inline font-medium">Sắp xếp theo:</span>
                
                <button
                  onClick={() => setSortBy("bestseller")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "bestseller"
                      ? "bg-[#0057cd] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  Bán chạy
                </button>

                <button
                  onClick={() => setSortBy("price-asc")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "price-asc"
                      ? "bg-[#0057cd] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  Giá thấp
                </button>

                <button
                  onClick={() => setSortBy("price-desc")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    sortBy === "price-desc"
                      ? "bg-[#0057cd] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  Giá cao
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              <span className="font-bold text-slate-400 mr-1 uppercase text-[10px]">Đang lọc:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-1.5">
                  Từ khóa: "{searchQuery}"
                  <X size={12} className="cursor-pointer text-slate-400 hover:text-slate-650" onClick={() => setSearchQuery("")} />
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center gap-1.5 border border-blue-100">
                  Nhóm: {selectedCategory}
                  <X size={12} className="cursor-pointer text-blue-400 hover:text-blue-700" onClick={() => setSelectedCategory("")} />
                </span>
              )}
              {selectedPriceRange && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold rounded-xl flex items-center gap-1.5 border border-amber-100">
                  Giá: {selectedPriceRange}
                  <X size={12} className="cursor-pointer text-amber-400 hover:text-amber-700" onClick={() => setSelectedPriceRange("")} />
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-rose-500 hover:text-rose-700 font-black uppercase text-[10px] tracking-wider ml-1 cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}

          {/* Product Cards Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-10 h-10 border-4 border-[#0057cd] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải danh sách dược phẩm...</span>
            </div>
          ) : sortedMedicines.length > 0 ? (
            <div className="flex flex-col gap-8 flex-1 justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {sortedMedicines.map((med) => {
                  const medId = med.id || med._id;
                  return (
                    <MedicineCard
                      key={medId}
                      med={med}
                      added={!!addedItems[medId]}
                      onClick={() => { setSelectedMedicineForModal(med); }}
                      onAddToCart={(m, qty, _unit) => { handleAddToCart(m, qty); }}
                    />
                  );
                })}
              </div>

              {/* Styled Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                totalItems={totalItems}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center">
              <Info size={40} className="text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700 text-md">Không tìm thấy sản phẩm phù hợp</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm font-semibold">
                Thử chọn nhóm danh mục con khác hoặc xóa bớt tiêu chí lọc để xem thêm dược phẩm.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Styled Product Details Preview Modal */}
      <MedicineDetailModal
        medicine={selectedMedicineForModal}
        isOpen={!!selectedMedicineForModal}
        onClose={() => setSelectedMedicineForModal(null)}
        onAddToCart={handleAddToCart}
        addedItems={addedItems}
      />
    </div>
  );
}
