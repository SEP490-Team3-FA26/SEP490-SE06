import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight, ShieldCheck, Activity, PackageSearch,
  Workflow, CheckCircle2, ChevronDown, Fingerprint,
  Box, Search, History, BrainCircuit, ScanBarcode, ArrowRightLeft,
  ShoppingCart, Heart, Sparkles, HeartPulse, Award, Shield,
  Check, Info, Sparkle, Stethoscope, Star, SparklesIcon,
  ShieldAlert, XCircle, User, LogOut, PhoneCall, Truck,
  MapPin, Gift, Clock, Flame, Pill, HelpCircle, FileText,
  UploadCloud, ChevronRight, LayoutDashboard, Settings,
  ShoppingBag, Eye, Zap, MessageSquareQuote, CheckCircle,
  Tag, AlertCircle, RefreshCw, Filter, RotateCcw, X, Loader2
} from "lucide-react";
import { notifyAuthTokenChanged } from "../../utils/authEvents";
import api from "../../services/core/api";
import { authService } from "../../services/auth/auth.service";
import { DoveMascotSection } from "../mascot/DoveMascotSection";
import { DoveFloatingWidget } from "../mascot/DoveFloatingWidget";

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { value: "", label: "Tất cả dược phẩm", icon: "💊" },
  { value: "Thuốc kháng sinh", label: "Kháng sinh (Rx)", icon: "🧬" },
  { value: "Thuốc giảm đau hạ sốt", label: "Giảm đau - Hạ sốt", icon: "🌡️" },
  { value: "Thuốc trị ho cảm", label: "Đường hô hấp", icon: "🫁" },
  { value: "Thuốc dạ dày", label: "Hỗ trợ tiêu hóa", icon: "🧪" },
  { value: "Thuốc tim mạch huyết áp", label: "Tim mạch - Huyết áp", icon: "❤️" },
  { value: "Thuốc bổ", label: "Vitamin & TPCN", icon: "🌿" },
  { value: "Thiết bị y tế", label: "Thiết bị y tế", icon: "🩺" }
];

const trendingTags = [
  "Panadol Extra", "Kháng sinh Augmentin", "Men vi sinh Enterogermina",
  "Vitamin C 1000mg", "Berberin", "Máy đo huyết áp Omron", "Que thử đường huyết", "Dung dịch nhỏ mắt"
];

const priceFilterOptions = [
  { value: "", label: "Tất cả mức giá" },
  { value: "under-50", label: "Dưới 50.000₫" },
  { value: "50-100", label: "50.000₫ - 100.000₫" },
  { value: "100-200", label: "100.000₫ - 200.000₫" },
  { value: "over-200", label: "Trên 200.000₫" }
];

const targetGroupOptions = [
  { value: "", label: "Tất cả đối tượng" },
  { value: "Người lớn", label: "Người lớn" },
  { value: "Trẻ em", label: "Trẻ em" },
  { value: "Người cao tuổi", label: "Người cao tuổi" },
  { value: "Phụ nữ có thai", label: "Phụ nữ mang thai" }
];

const classificationOptions = [
  { value: "", label: "Tất cả loại thuốc" },
  { value: "PRESCRIPTION_ANTIBIOTIC", label: "Thuốc kê đơn (Rx)" },
  { value: "COMMON_SUPPLEMENT", label: "Thực phẩm bổ sung" }
];

const dosageFormOptions = [
  { value: "", label: "Tất cả dạng bào chế" },
  { value: "Viên nén", label: "Viên nén" },
  { value: "Viên nang", label: "Viên nang" },
  { value: "Siro", label: "Siro / Hỗn dịch" },
  { value: "Dung dịch", label: "Dung dịch / Chai" }
];

const heroSlides = [
  {
    id: 1,
    tag: "ĐẠI TIỆC DƯỢC PHẨM CHÍNH HÃNG",
    title: "Mua Thuốc Chuẩn GPP",
    subtitle: "Giao Hàng Siêu Tốc 2 Giờ Tận Nhà",
    desc: "Hệ thống nhà thuốc số 3.0 với hơn 1.800 điểm phân phối trên toàn quốc. Đội ngũ Dược sĩ Đại học tận tâm phục vụ 24/7.",
    badge: "Freeship đơn từ 150k",
    ctaText: "Khám phá danh mục thuốc",
    ctaLink: "/customer/shop",
    bgGradient: "from-blue-600 via-sky-600 to-cyan-500",
    pillBg: "bg-blue-500/20"
  },
  {
    id: 2,
    tag: "CÔNG NGHỆ ĐỘT PHÁ AI 3.0",
    title: "Trợ Lý Dược Khoa AI",
    subtitle: "Tự Động Kiểm Tra Tương Tác Thuốc",
    desc: "Bảo vệ an toàn sức khỏe gia đình bạn với thư viện phân tích tương tác thuốc độc quyền, tra cứu liều dùng theo chuẩn Dược thư Quốc gia.",
    badge: "Chuẩn Bộ Y Tế",
    ctaText: "Kiểm tra tương tác thuốc ngay",
    ctaLink: "/interactions",
    bgGradient: "from-indigo-600 via-blue-600 to-teal-500",
    pillBg: "bg-indigo-500/20"
  },
  {
    id: 3,
    tag: "TIỆN ÍCH DÀNH CHO BỆNH NHÂN",
    title: "Tư Vấn & Báo Giá Toa Thuốc",
    subtitle: "Gửi Đơn Nhanh - Nhận Thuốc Trong 15 Phút",
    desc: "Chụp ảnh đơn thuốc của bệnh viện hoặc phòng khám, Dược sĩ chuyên môn sẽ liên hệ tư vấn đúng loại, đúng liều lượng và giá tốt nhất.",
    badge: "Tư vấn 1:1 miễn phí",
    ctaText: "Gửi toa thuốc ngay",
    ctaAction: "openPrescriptionModal",
    bgGradient: "from-emerald-600 via-teal-600 to-blue-600",
    pillBg: "bg-emerald-500/20"
  }
];

export function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const cartIconRef = useRef<HTMLAnchorElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Authentication & Role Detection
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // E-commerce products states
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});
  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Multi-dimensional Search & Filter states (Long Chau & Pharmacity style)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [selectedDosageForm, setSelectedDosageForm] = useState("");

  // Live Search Auto-complete state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Prescription Quick Upload Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    note: "",
    file: null as File | null
  });
  const [prescriptionSubmitted, setPrescriptionSubmitted] = useState(false);

  // Hero Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Flash Sale Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({
    hours: 3,
    minutes: 45,
    seconds: 18
  });

  // Real-time animated audit logs state
  const [logs, setLogs] = useState([
    { time: "15:42:01", user: "Khoa_WHS", action: "TRANSFERRED [Lô A09-Paracetamol]", to: "Branch_DistrictA", status: "SUCCESS" },
    { time: "15:43:12", user: "Admin_System", action: "APPROVED REBATE_POLICY", to: "All_Branches", status: "LOCKED_HASH" },
    { time: "15:44:05", user: "Mai_BranchA", action: "RECEIVED [Lô A09-Paracetamol]", to: "Local_Inventory", status: "VERIFIED_QR" },
    { time: "15:45:19", user: "AI_Warning_Bot", action: "FLAGGED drug interaction warning", to: "POS_Terminal_2", status: "BLOCKED" }
  ]);

  // Load User Auth on Mount & storage changes
  // IMPORTANT: If user is a staff role (admin, pharmacist, warehouse, branch), auto-redirect directly to their backoffice!
  const loadAuthState = () => {
    const t = localStorage.getItem("token") || "";
    setToken(t);

    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    let role = localStorage.getItem("userRole") || "";
    if (!role && currentUser?.role) {
      role = currentUser.role;
      localStorage.setItem("userRole", role);
    }
    if (!role && t) {
      try {
        const parts = t.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.role) {
            role = payload.role;
            localStorage.setItem("userRole", role);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    setUserRole(role || (t ? "user" : ""));

    // Staff Auto-redirect: If a staff member visits '/', route them directly to their work dashboard
    if (role && ["admin", "director", "head_branch", "warehouse", "branch", "pharmacist"].includes(role)) {
      switch (role) {
        case "admin":
          navigate("/admin", { replace: true });
          break;
        case "director":
        case "head_branch":
          navigate("/director", { replace: true });
          break;
        case "warehouse":
          navigate("/warehouse", { replace: true });
          break;
        case "branch":
          navigate("/branch", { replace: true });
          break;
        case "pharmacist":
          navigate("/pharmacist", { replace: true });
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    loadAuthState();
    const handleAuthChange = () => {
      loadAuthState();
      updateCartCount();
    };
    window.addEventListener("auth_token_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("auth_token_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Auto-complete Search with Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchingLive(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const res = await api.get(`/api/medicines?limit=6&search=${encodeURIComponent(searchQuery.trim())}`);
        if (res.data?.data) {
          setSearchResults(res.data.data);
        } else if (Array.isArray(res.data)) {
          setSearchResults(res.data.slice(0, 6));
        }
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Slide Auto-play Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Flash Sale Countdown Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 3, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    notifyAuthTokenChanged();
    loadAuthState();
    navigate("/auth/login");
  };

  const getUserInitials = () => {
    if (!user) return "KH";
    const name = user.fullName || user.name || "";
    if (!name) return "KH";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (user?.fullName) return user.fullName;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Khách Hàng";
  };

  // Fetch cart count
  const updateCartCount = async () => {
    try {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) {
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
        return;
      }
      const res = await api.get("/api/users/cart");
      if (res.status === 200) {
        const data = res.data;
        if (data && data.items) {
          const count = data.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
          setCartCount(count);
        }
      }
    } catch (err: any) {
      const guestCartStr = localStorage.getItem("guest_cart");
      const items = guestCartStr ? JSON.parse(guestCartStr) : [];
      const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
      setCartCount(count);
    }
  };

  // Fetch featured / filtered products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      let url = `/api/medicines?page=1&limit=8`;
      if (activeCategory) url += `&category=${encodeURIComponent(activeCategory)}`;
      if (selectedClassification) url += `&classification=${encodeURIComponent(selectedClassification)}`;
      if (selectedTargetGroup) url += `&targetGroup=${encodeURIComponent(selectedTargetGroup)}`;
      if (selectedDosageForm) url += `&dosageForm=${encodeURIComponent(selectedDosageForm)}`;
      if (selectedPrice === "under-50") url += `&maxPrice=50000`;
      else if (selectedPrice === "50-100") url += `&minPrice=50000&maxPrice=100000`;
      else if (selectedPrice === "100-200") url += `&minPrice=100000&maxPrice=200000`;
      else if (selectedPrice === "over-200") url += `&minPrice=200000`;

      const res = await api.get(url);
      if (res.status === 200) {
        const result = res.data;
        setMedicines(result.data || []);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Sparkle burst helper for premium microinteraction
  const triggerSparkles = (e?: any) => {
    if (!e || typeof e !== "object") return;
    const button = e.currentTarget || e.target;
    if (!button || typeof button.getBoundingClientRect !== "function") return;
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ["#0d6efd", "#38bdf8", "#34d399", "#fbbf24", "#f43f5e"];

    for (let i = 0; i < 14; i++) {
      const particle = document.createElement("div");
      particle.className = "fixed pointer-events-none rounded-full z-50";

      const size = Math.random() * 8 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];

      Object.assign(particle.style, {
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        left: `${centerX}px`,
        top: `${centerY}px`,
        boxShadow: `0 0 10px ${color}`,
        borderRadius: "50%"
      });

      document.body.appendChild(particle);

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 90 + 30;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      gsap.to(particle, {
        x: targetX,
        y: targetY,
        opacity: 0,
        scale: 0,
        duration: 0.7 + Math.random() * 0.4,
        ease: "power3.out",
        onComplete: () => {
          particle.remove();
        }
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeCategory, selectedPrice, selectedTargetGroup, selectedClassification, selectedDosageForm]);

  useEffect(() => {
    updateCartCount();
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearchDropdown(false);
    if (searchQuery.trim()) {
      navigate(`/customer/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/customer/shop");
    }
  };

  const handleAddToCart = async (med: any, eOrQty?: any, customQty: number = 1) => {
    let qty = 1;
    if (typeof eOrQty === "number") {
      qty = eOrQty;
    } else if (typeof customQty === "number") {
      qty = customQty;
    }

    if (eOrQty && typeof eOrQty === "object") {
      triggerSparkles(eOrQty);
    }

    const medId = med.id || med._id;
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
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
        setTimeout(() => {
          setAddedItems((prev) => ({ ...prev, [medId]: false }));
        }, 1500);
      } catch (err) {
        console.error("Error updating guest cart:", err);
      }
      return;
    }

    try {
      await api.post("/api/users/cart",
        { medicineId: medId, quantity: qty },
        { headers: { "Authorization": `Bearer ${currentToken}` } }
      );

      window.dispatchEvent(new Event("cartUpdated"));
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 1500);

    } catch (err: any) {
      alert(err.message || "Lỗi kết nối khi thêm vào giỏ");
      console.error(err);
    }
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handlePrescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescriptionForm.fullName || !prescriptionForm.phoneNumber) {
      alert("Vui lòng nhập họ tên và số điện thoại để Dược sĩ liên hệ!");
      return;
    }
    setPrescriptionSubmitted(true);
    setTimeout(() => {
      setPrescriptionSubmitted(false);
      setIsPrescriptionModalOpen(false);
      setPrescriptionForm({ fullName: "", phoneNumber: "", address: "", note: "", file: null });
      alert("Đã gửi toa thuốc thành công! Dược sĩ chuyên môn ABC Pharmacy sẽ gọi điện tư vấn và báo giá trong 15 phút.");
    }, 1500);
  };

  const hasActiveFilters = !!(activeCategory || selectedPrice || selectedTargetGroup || selectedClassification || selectedDosageForm);

  const resetAllFilters = () => {
    setActiveCategory("");
    setSelectedPrice("");
    setSelectedTargetGroup("");
    setSelectedClassification("");
    setSelectedDosageForm("");
  };

  return (
    <div className="bg-[#f4f7fb] text-slate-800 font-sans selection:bg-[#0d6efd] selection:text-white overflow-x-hidden min-h-screen flex flex-col" ref={containerRef}>

      {/* ========================================================================= */}
      {/* 1. TOP UTILITY BAR (CHUẨN CHUỖI NHÀ THUỐC LONG CHÂU / PHARMACITY) */}
      {/* ========================================================================= */}
      <div className="bg-[#004bb5] text-white text-[11px] font-medium py-1.5 px-4 border-b border-blue-900/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left Highlights */}
          <div className="flex items-center gap-5">
            <a href="tel:18006928" className="flex items-center gap-1.5 hover:text-sky-200 transition-colors font-bold">
              <PhoneCall size={13} className="text-amber-400" />
              <span>Tư vấn Dược sĩ 24/7: <span className="text-amber-300 font-black">1800 6928</span> (Miễn phí)</span>
            </a>
            <span className="hidden md:inline-block text-blue-300/40">|</span>
            <div className="hidden md:flex items-center gap-1.5 text-sky-100">
              <Truck size={13} className="text-emerald-400" />
              <span>Giao siêu tốc <strong className="text-white">2 Giờ</strong> • Freeship từ 150k</span>
            </div>
            <span className="hidden lg:inline-block text-blue-300/40">|</span>
            <div className="hidden lg:flex items-center gap-1.5 text-sky-100">
              <ShieldCheck size={13} className="text-cyan-300" />
              <span>Chuỗi 1.800+ Nhà thuốc chuẩn <strong className="text-white">GPP Bộ Y Tế</strong></span>
            </div>
          </div>

          {/* Right Quick Links */}
          <div className="flex items-center gap-4 text-sky-100">
            <button
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="hover:text-white transition-colors flex items-center gap-1 font-bold cursor-pointer"
            >
              <FileText size={12} className="text-amber-300" /> Tra cứu / Gửi đơn thuốc
            </button>
            <span className="text-blue-300/40">|</span>
            <Link to="/customer/shop" className="hover:text-white transition-colors flex items-center gap-1">
              <MapPin size={12} className="text-emerald-300" /> Tìm nhà thuốc gần bạn
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN HEADER: LOGO, LIVE SEARCH AUTO-COMPLETE, PRESCRIPTION, CART, PROFILE */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0057cd] via-[#0d6efd] to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-all">
              <HeartPulse size={26} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl text-slate-900 tracking-tight leading-none">ABC Pharmacy</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0057cd] text-[9px] font-black uppercase">GPP</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider mt-0.5">Hệ Thống Dược Phẩm Số 3.0</span>
            </div>
          </Link>

          {/* Center Smart Live Search Bar with Auto-Complete Dropdown */}
          <div className="flex-1 max-w-2xl hidden md:block relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Tìm tên thuốc, hoạt chất, triệu chứng (Ví dụ: Panadol, Amoxicillin, Men tiêu hóa)..."
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="w-full pl-10 pr-28 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0d6efd] focus:ring-4 focus:ring-blue-100 rounded-full text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-20 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 bg-[#0057cd] hover:bg-[#0b5ed7] text-white px-5 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1"
              >
                {isSearchingLive ? <Loader2 size={12} className="animate-spin" /> : "Tìm"}
              </button>
            </form>

            {/* Live Search Auto-Complete Mega Dropdown (Long Châu & Pharmacity standard) */}
            {showSearchDropdown && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-[760px] lg:w-[860px] xl:w-[940px] max-w-[94vw] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden text-left">
                
                {/* 2-Column Split Grid */}
                <div className="grid grid-cols-12 max-h-[550px]">
                  
                  {/* Left Column (4/12 cols): Trending keywords, Popular categories, Hotline */}
                  <div className="col-span-4 bg-slate-50/80 border-r border-slate-100 p-4 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-4">
                      {/* Trending Keywords */}
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-600 uppercase tracking-wider mb-2.5">
                          <Flame size={14} className="text-rose-500 fill-rose-500" />
                          <span>Từ khóa tìm kiếm Hot</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {trendingTags.map((tag, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSearchQuery(tag);
                                setShowSearchDropdown(false);
                                navigate(`/customer/shop?search=${encodeURIComponent(tag)}`);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-[#0057cd] hover:border-blue-200 border border-slate-200/80 rounded-lg text-[11px] font-semibold text-slate-700 transition-all text-left truncate max-w-full cursor-pointer shadow-2xs"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quick Category Jump */}
                      <div className="pt-2.5 border-t border-slate-200/70">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">
                          <Pill size={13} className="text-[#0057cd]" />
                          <span>Danh mục nổi bật</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            { name: "Thuốc Kháng Sinh (Rx)", icon: "🧬", val: "Thuốc kháng sinh" },
                            { name: "Giảm Đau & Hạ Sốt", icon: "🌡️", val: "Thuốc giảm đau hạ sốt" },
                            { name: "Đường Hô Hấp & Cảm Cúm", icon: "🫁", val: "Thuốc trị ho cảm" },
                            { name: "Dạ Dày & Tiêu Hóa", icon: "🧪", val: "Thuốc dạ dày" },
                            { name: "Vitamin & TPCN", icon: "🌿", val: "Thuốc bổ" },
                            { name: "Thiết Bị Y Tế Chuẩn", icon: "🩺", val: "Thiết bị y tế" },
                          ].map((cat, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setActiveCategory(cat.val);
                                setShowSearchDropdown(false);
                                navigate(`/customer/shop?category=${encodeURIComponent(cat.val)}`);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#0057cd] transition-colors text-left cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <span>{cat.icon}</span>
                                <span className="truncate">{cat.name}</span>
                              </span>
                              <ChevronRight size={12} className="text-slate-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pharmacist Consultation Tile */}
                    <div className="mt-4 p-3 bg-gradient-to-tr from-[#0057cd] to-sky-600 rounded-2xl text-white text-xs shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Sparkles size={13} className="text-amber-300" />
                        <span>Dược sĩ tư vấn 1:1</span>
                      </div>
                      <p className="text-[11px] text-blue-100 mb-2.5 leading-relaxed">
                        Cần tìm thuốc kê đơn đặc trị hoặc hỗ trợ liều dùng?
                      </p>
                      <a
                        href="tel:18006928"
                        className="inline-flex items-center justify-center w-full py-1.5 bg-white text-[#0057cd] font-black rounded-xl text-[11px] uppercase tracking-wider shadow-sm hover:bg-blue-50 transition-colors"
                      >
                        <PhoneCall size={12} className="mr-1 text-emerald-600" /> Gọi 1800 6928 (Free)
                      </a>
                    </div>
                  </div>

                  {/* Right Column (8/12 cols): Search Results / Product Cards */}
                  <div className="col-span-8 p-4 flex flex-col justify-between overflow-y-auto bg-white">
                    <div>
                      {/* Top bar info */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <PackageSearch size={14} className="text-[#0057cd]" />
                          {searchQuery.trim() ? (
                            <span>Kết quả tìm kiếm cho "<strong className="text-slate-900">{searchQuery}</strong>" ({searchResults.length} thuốc)</span>
                          ) : (
                            <span>Gợi ý Dược phẩm được tin dùng</span>
                          )}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> 100% Chính hãng GPP
                        </span>
                      </div>

                      {/* Loading state */}
                      {isSearchingLive ? (
                        <div className="py-20 text-center text-xs text-slate-400 font-bold flex flex-col items-center justify-center gap-2.5">
                          <Loader2 size={26} className="animate-spin text-[#0057cd]" />
                          <span>Đang tra cứu kho dược phẩm và giá bán...</span>
                        </div>
                      ) : (searchResults.length > 0 ? searchResults : medicines.slice(0, 6)).length > 0 ? (
                        /* 2-Column Product Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(searchResults.length > 0 ? searchResults : medicines.slice(0, 6)).map((med) => {
                            const medId = med.id || med._id;
                            const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
                            return (
                              <div
                                key={medId}
                                onClick={() => {
                                  setSelectedMedicineForModal(med);
                                  setShowSearchDropdown(false);
                                }}
                                className="group p-3 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer flex gap-3 items-start relative hover:shadow-md bg-white"
                              >
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-xl bg-slate-50 p-1.5 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                                  <img
                                    src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                                    alt={med.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                {/* Medicine Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase border shrink-0 ${isRx ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                      {isRx ? "Rx Kê Đơn" : "OTC Không Kê Đơn"}
                                    </span>
                                    {med.dosage_form && (
                                      <span className="text-[9px] font-medium text-slate-400 truncate">• {med.dosage_form}</span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#0057cd] line-clamp-1 leading-snug transition-colors">
                                    {med.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {med.active_ingredient ? `Hoạt chất: ${med.active_ingredient}` : (med.specification || "Thuốc chuẩn Bộ Y Tế")}
                                  </p>

                                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/80">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xs font-black text-rose-600">
                                        {med.price ? med.price.toLocaleString() + "₫" : "Liên hệ"}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-medium">/ {med.unit || "Hộp"}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#0057cd] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                      Xem chi tiết <ChevronRight size={10} />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : searchQuery.trim() ? (
                        <div className="py-12 text-center text-xs text-slate-500 font-medium flex flex-col items-center justify-center gap-2">
                          <AlertCircle size={30} className="text-amber-500" />
                          <p className="text-sm font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</p>
                          <p className="text-[11px] text-slate-400 max-w-xs">
                            Không tìm thấy thuốc nào khớp với từ khóa "<strong className="text-slate-700">{searchQuery}</strong>". Hãy thử tìm theo hoạt chất hoặc gọi Dược sĩ để được hỗ trợ.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrescriptionModalOpen(true);
                          setShowSearchDropdown(false);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <UploadCloud size={14} /> Gửi toa thuốc cho Dược sĩ
                      </button>

                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="py-2 px-4 bg-[#0057cd] hover:bg-[#0b5ed7] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Xem tất cả kết quả {searchQuery ? `cho "${searchQuery}"` : "trong Cửa hàng"}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-3">

            {/* Quick Prescription Upload CTA Button */}
            <button
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <UploadCloud size={16} />
              <span>Gửi Đơn Thuốc</span>
            </button>

            {/* AI Drug Interaction Tool Link */}
            <Link
              to="/interactions"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-sky-50 hover:bg-sky-100 text-[#0057cd] text-xs font-bold border border-sky-200/80 transition-all"
            >
              <BrainCircuit size={15} className="text-[#0d6efd]" />
              <span>AI Tương Tác</span>
            </Link>

            {/* Cart Badge Button */}
            <Link
              ref={cartIconRef}
              to="/customer/cart"
              className="relative p-2.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0057cd] rounded-2xl transition-all border border-slate-200/60"
              title="Giỏ hàng dược phẩm"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-[#e11d48] text-white text-[10px] font-black flex items-center justify-center rounded-full px-1.5 border-2 border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            <span className="w-px h-6 bg-slate-200 hidden sm:inline-block"></span>

            {/* User Account / Profile Dropdown Widget */}
            {token ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 border border-slate-200/60 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0057cd] text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {getUserInitials()}
                  </div>
                  <div className="flex flex-col text-left hidden sm:flex">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">
                      Khách Hàng Thân Thiết
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200"
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản</p>
                      <p className="text-sm font-black text-slate-900 truncate">{getUserDisplayName()}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 bg-sky-50 text-[#0057cd] border border-sky-200">
                        Khách hàng thân thiết
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/customer/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#0057cd] hover:bg-blue-50 transition-colors"
                      >
                        <User size={16} className="text-[#0057cd]" />
                        <span>Hồ sơ & Điểm tích lũy</span>
                      </Link>
                      <Link
                        to="/customer/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ShoppingBag size={15} className="text-slate-400" />
                        <span>Lịch sử đơn thuốc & Mua sắm</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Đăng xuất tài khoản</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth/login"
                  className="bg-[#0057cd] hover:bg-[#0b5ed7] text-white px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  Đăng Nhập
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar (Only visible on screens < md) */}
        <div className="px-4 pb-2.5 md:hidden bg-white">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Tìm thuốc, hoạt chất, triệu chứng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2 bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#0d6efd] rounded-full text-xs font-medium text-slate-800 outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1 bg-[#0057cd] text-white px-3.5 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider shadow-xs"
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Mega Category Navigation Bar */}
        <div className="bg-white border-t border-slate-100 shadow-sm overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-1 text-xs font-bold text-slate-700 whitespace-nowrap py-2">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <Link to="/customer/shop" className="px-3.5 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all flex items-center gap-1.5 text-[#0057cd]">
                <Pill size={14} /> Tất Cả Thuốc
              </Link>
              <button onClick={() => { setActiveCategory("Thuốc kháng sinh"); navigate("/customer/shop?category=" + encodeURIComponent("Thuốc kháng sinh")); }} className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all">
                Thuốc Kê Đơn (Rx)
              </button>
              <button onClick={() => { setActiveCategory("Thuốc giảm đau hạ sốt"); navigate("/customer/shop?category=" + encodeURIComponent("Thuốc giảm đau hạ sốt")); }} className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all">
                Thuốc Không Kê Đơn (OTC)
              </button>
              <button onClick={() => { setActiveCategory("Thuốc bổ"); navigate("/customer/shop?category=" + encodeURIComponent("Thuốc bổ")); }} className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all">
                Thực Phẩm Chức Năng
              </button>
              <button onClick={() => { setActiveCategory("Dược mỹ phẩm"); navigate("/customer/shop?category=" + encodeURIComponent("Dược mỹ phẩm")); }} className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all">
                Dược Mỹ Phẩm
              </button>
              <button onClick={() => { setActiveCategory("Thiết bị y tế"); navigate("/customer/shop?category=" + encodeURIComponent("Thiết bị y tế")); }} className="px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-[#0057cd] transition-all">
                Thiết Bị Y Tế
              </button>
              <Link to="/interactions" className="px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-indigo-700 transition-all flex items-center gap-1">
                <BrainCircuit size={14} /> Tra Cứu Tương Tác
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200 shrink-0 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Award size={13} className="text-amber-500" /> 100% Thuốc chính hãng</span>
              <span className="flex items-center gap-1"><Truck size={13} className="text-emerald-500" /> Giao 2H</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO PROMOTIONS CAROUSEL */}
      {/* ========================================================================= */}
      <section className="relative py-6 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

          {/* Left Main Hero Carousel Banner */}
          <div className="lg:col-span-8 rounded-[28px] overflow-hidden relative shadow-xl min-h-[360px] flex flex-col justify-between text-white p-8 md:p-12 transition-all duration-700 bg-gradient-to-tr from-[#003c96] via-[#0057cd] to-[#0284c7]">
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-300/20 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 right-12 text-white/10 font-black text-9xl select-none">Rx</div>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-sky-200 text-[11px] font-black uppercase tracking-widest mb-4">
                <Sparkles size={13} className="animate-spin" />
                {heroSlides[currentSlide].tag}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-2">
                {heroSlides[currentSlide].title}
              </h1>
              <p className="text-xl sm:text-2xl font-extrabold text-sky-200 mb-4">
                {heroSlides[currentSlide].subtitle}
              </p>

              <p className="text-slate-100 text-xs sm:text-sm font-medium max-w-lg mb-8 leading-relaxed">
                {heroSlides[currentSlide].desc}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {heroSlides[currentSlide].ctaAction === "openPrescriptionModal" ? (
                  <button
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud size={16} /> {heroSlides[currentSlide].ctaText}
                  </button>
                ) : (
                  <Link
                    to={heroSlides[currentSlide].ctaLink || "/customer/shop"}
                    className="bg-white hover:bg-sky-50 text-[#004bb5] px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    {heroSlides[currentSlide].ctaText} <ArrowRight size={15} />
                  </Link>
                )}

                <button
                  onClick={() => setIsPrescriptionModalOpen(true)}
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/30 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={15} /> Gửi Toa Thuốc Nhanh
                </button>
              </div>
            </div>

            {/* Slider Navigation Dots */}
            <div className="relative z-10 flex items-center justify-between pt-6 border-t border-white/10 mt-6">
              <div className="flex items-center gap-2">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${currentSlide === idx ? "w-8 bg-amber-400" : "w-2.5 bg-white/40 hover:bg-white/70"
                      }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-sky-200">
                ⭐ Cam kết 100% thuốc chuẩn GPP Bộ Y Tế
              </span>
            </div>
          </div>

          {/* Right Column: 2 Quick Action Promo Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Sub-card 1: Prescription fast processing */}
            <div
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="bg-white rounded-[24px] p-6 border border-slate-200/80 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer flex-1 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                    DỊCH VỤ 15 PHÚT
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-2 group-hover:text-emerald-600 transition-colors">
                    Chụp & Báo Giá Đơn Thuốc
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Gửi ảnh toa thuốc của bác sĩ, Dược sĩ ABC Pharmacy sẽ gọi lại tư vấn chi tiết.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Gửi ảnh đơn ngay</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Sub-card 2: AI Drug Interaction Check */}
            <Link
              to="/interactions"
              className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[24px] p-6 border border-indigo-800 shadow-md hover:shadow-xl hover:border-indigo-400 transition-all flex-1 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider">
                    CÔNG NGHỆ ĐỘC QUYỀN
                  </span>
                  <h3 className="text-lg font-black text-white mt-2 group-hover:text-sky-300 transition-colors">
                    Tra Cứu Tương Tác Thuốc AI
                  </h3>
                  <p className="text-xs text-indigo-200/80 font-medium mt-1">
                    Phát hiện ngay các hoạt chất xung đột và tương tác bất lợi trước khi dùng.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform border border-indigo-500/30">
                  <BrainCircuit size={24} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-800/80 flex items-center justify-between text-xs font-bold text-sky-300">
                <span>Kiểm tra an toàn thuốc</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 6 QUICK ACTION SERVICE TILES (CHUẨN LONG CHÂU / PHARMACITY) */}
      {/* ========================================================================= */}
      <section className="py-4 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            {
              title: "Gửi Toa Thuốc",
              subtitle: "Dược sĩ tư vấn 15p",
              icon: <FileText size={22} className="text-emerald-500" />,
              action: () => setIsPrescriptionModalOpen(true),
              bg: "hover:border-emerald-200"
            },
            {
              title: "Flash Sale Giờ Vàng",
              subtitle: "Giảm sốc tới 50%",
              icon: <Flame size={22} className="text-rose-500 animate-bounce" />,
              action: () => {
                const el = document.getElementById("flash-sale-section");
                el?.scrollIntoView({ behavior: "smooth" });
              },
              bg: "hover:border-rose-200"
            },
            {
              title: "Kiểm Tra Tương Tác",
              subtitle: "AI Dược lý độc quyền",
              icon: <BrainCircuit size={22} className="text-[#0d6efd]" />,
              action: () => navigate("/interactions"),
              bg: "hover:border-blue-200"
            },
            {
              title: "Tìm Nhà Thuốc",
              subtitle: "1.800+ điểm chuẩn GPP",
              icon: <MapPin size={22} className="text-amber-500" />,
              action: () => navigate("/customer/shop"),
              bg: "hover:border-amber-200"
            },
            {
              title: "Tích Điểm ABC Care",
              subtitle: "Hoàn tiền & Đổi quà",
              icon: <Gift size={22} className="text-purple-500" />,
              action: () => navigate(token ? "/customer/profile" : "/auth/login"),
              bg: "hover:border-purple-200"
            },
            {
              title: "Chat Với Dược Sĩ",
              subtitle: "Tư vấn 1:1 miễn phí",
              icon: <MessageSquareQuote size={22} className="text-teal-500" />,
              action: () => navigate("/customer/ai-consult"),
              bg: "hover:border-teal-200"
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={item.action}
              className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group hover:-translate-y-1 ${item.bg}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-[#0057cd] transition-colors leading-tight mb-0.5">
                {item.title}
              </h4>
              <p className="text-[10px] font-medium text-slate-400">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4.5. MASCOT SHOWCASE: BỒ CÂU Y TẾ AI (INTERACTIVE COMPANION) */}
      {/* ========================================================================= */}
      <DoveMascotSection />

      {/* ========================================================================= */}
      {/* 5. FLASH SALE COUNTDOWN SECTION */}
      {/* ========================================================================= */}
      <section id="flash-sale-section" className="py-8 px-4 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 rounded-[28px] p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-rose-600 flex items-center justify-center font-black shadow-md">
                <Flame size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none">
                  FLASH SALE GIỜ VÀNG
                </h2>
                <p className="text-xs font-semibold text-rose-100 mt-1">
                  Giá sốc hôm nay • Số lượng có hạn
                </p>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-100 uppercase tracking-wider hidden sm:inline">Kết thúc trong:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-sm font-black text-white">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="font-black text-white">:</span>
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-sm font-black text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="font-black text-white">:</span>
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-sm font-black text-white">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                id: "FS-01",
                name: "Viên sủi Berocca Performance Hộp 10 viên",
                brand: "Bayer (Đức)",
                category: "Thuốc bổ",
                active_ingredient: "Vitamin B, C, Kẽm, Magie",
                specification: "Tuýp 10 viên sủi",
                drug_classification: "COMMON_SUPPLEMENT",
                dosage_form: "Viên sủi",
                stock: 120,
                unit: "Tuýp",
                price: 95000,
                originalPrice: 135000,
                discount: 30,
                soldPercent: 82,
                image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"
              },
              {
                id: "FS-02",
                name: "Dầu cá Omega 3 Fish Oil 1000mg Hộp 100 viên",
                brand: "Nature Made (Mỹ)",
                category: "Thuốc bổ",
                active_ingredient: "Omega 3, EPA, DHA",
                specification: "Hộp 100 viên nang mềm",
                drug_classification: "COMMON_SUPPLEMENT",
                dosage_form: "Viên nang",
                stock: 85,
                unit: "Hộp",
                price: 285000,
                originalPrice: 380000,
                discount: 25,
                soldPercent: 91,
                image: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=60"
              },
              {
                id: "FS-03",
                name: "Nước muối sinh lý Physiodose Hộp 40 ống",
                brand: "Gilbert (Pháp)",
                category: "Thuốc trị ho cảm",
                active_ingredient: "Natri Clorid 0.9%",
                specification: "Hộp 40 ống x 5ml",
                drug_classification: "COMMON_SUPPLEMENT",
                dosage_form: "Dung dịch",
                stock: 200,
                unit: "Hộp",
                price: 145000,
                originalPrice: 195000,
                discount: 26,
                soldPercent: 68,
                image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
              },
              {
                id: "FS-04",
                name: "Máy đo huyết áp bắp tay tự động Omron HEM-7120",
                brand: "Omron (Nhật Bản)",
                category: "Thiết bị y tế",
                active_ingredient: "Cảm biến IntelliSense",
                specification: "Bộ máy đo + Vòng bít + Pin",
                drug_classification: "COMMON_SUPPLEMENT",
                dosage_form: "Thiết bị",
                stock: 45,
                unit: "Bộ",
                price: 799000,
                originalPrice: 1050000,
                discount: 24,
                soldPercent: 75,
                image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&auto=format&fit=crop&q=60"
              }
            ].map((deal) => (
              <div
                key={deal.id}
                onClick={() => {
                  setSelectedMedicineForModal(deal);
                  setModalQuantity(1);
                }}
                className="bg-white rounded-2xl p-4 text-slate-800 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1 relative"
              >
                <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                  -{deal.discount}%
                </div>

                <div className="w-full h-36 flex items-center justify-center p-3 mb-2">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{deal.brand}</span>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-2 mt-0.5 mb-2">
                    {deal.name}
                  </h4>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-base font-black text-rose-600">
                      {deal.price.toLocaleString()}₫
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      {deal.originalPrice.toLocaleString()}₫
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative mb-3">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full"
                      style={{ width: `${deal.soldPercent}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white leading-none">
                      🔥 ĐÃ BÁN {deal.soldPercent}%
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(deal, e, 1);
                    }}
                    className={`w-full py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                      addedItems[deal.id]
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 hover:bg-rose-700 text-white active:scale-95"
                    }`}
                  >
                    {addedItems[deal.id] ? (
                      <>
                        <Check size={14} /> Đã thêm!
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={13} /> Thêm Giờ Vàng
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ADVANCED PHARMACY SEARCH & FILTER SECTION (LONG CHÂU & PHARMACITY STYLE) */}
      {/* ========================================================================= */}
      <section className="py-10 px-4 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-[32px] p-6 md:p-10 border border-slate-200/80 shadow-sm">

          {/* Section Title & Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-[#0057cd] font-black text-xs uppercase tracking-widest mb-1">
                <Pill size={15} />
                <span>DANH MỤC DƯỢC PHẨM CHÍNH HÃNG</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Tìm Kiếm & Khám Phá Thuốc Theo Nhu Cầu
              </h2>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer self-start md:self-auto"
              >
                <RotateCcw size={13} />
                <span>Xóa tất cả bộ lọc</span>
              </button>
            )}
          </div>

          {/* Multi-Dimensional Filter Selectors (Long Chau & Pharmacity style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            {/* Filter 1: Mức giá */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                🏷️ Mức giá
              </label>
              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer shadow-sm"
              >
                {priceFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter 2: Đối tượng sử dụng */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                👥 Đối tượng sử dụng
              </label>
              <select
                value={selectedTargetGroup}
                onChange={(e) => setSelectedTargetGroup(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer shadow-sm"
              >
                {targetGroupOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter 3: Phân loại Rx / OTC */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                🧬 Phân loại thuốc
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer shadow-sm"
              >
                {classificationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter 4: Dạng bào chế */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                🧪 Dạng bào chế
              </label>
              <select
                value={selectedDosageForm}
                onChange={(e) => setSelectedDosageForm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer shadow-sm"
              >
                {dosageFormOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-4 mb-6 border-b border-slate-100 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider cursor-pointer ${activeCategory === cat.value
                  ? "bg-[#0057cd] text-white shadow-md font-black"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Live Medicines Grid */}
          {loadingProducts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-9 h-9 border-3 border-[#0057cd] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang kết nối kho thuốc trung tâm...</span>
            </div>
          ) : medicines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {medicines.map((med) => {
                const medId = med.id || med._id;
                const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
                const isOutOfStock = med.stock <= 0;

                return (
                  <div
                    key={medId}
                    onClick={() => {
                      setSelectedMedicineForModal(med);
                      setModalQuantity(1);
                    }}
                    className="product-card bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col overflow-hidden group hover:-translate-y-1.5 relative cursor-pointer"
                  >
                    {/* Visual Image Container */}
                    <div className="w-full h-48 bg-slate-50 flex items-center justify-center p-5 relative overflow-hidden transition-colors border-b border-slate-100">
                      <img
                        src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                        alt={med.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Classification Badge */}
                      <span
                        className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${isRx
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-blue-50 text-[#0057cd] border-blue-200"
                          }`}
                      >
                        {isRx ? "Kê đơn (Rx)" : "Không kê đơn"}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {med.category || "Dược phẩm"}
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0057cd] transition-colors leading-snug mb-1.5 line-clamp-2">
                          {med.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium mb-2">
                          Hoạt chất: <span className="font-bold text-slate-700">{med.active_ingredient || "Đang cập nhật"}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-[11px] text-slate-400 font-medium">Kho: {med.stock} {med.unit || "Hộp"}</span>
                          <span className="text-base font-black text-[#0057cd]">
                            {med.price ? med.price.toLocaleString() + "₫" : "Liên hệ"} <span className="text-[10px] font-normal text-slate-400">/ {med.unit || "Hộp"}</span>
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(med, e);
                          }}
                          disabled={isOutOfStock}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${isOutOfStock
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : addedItems[medId]
                              ? "bg-emerald-600 text-white"
                              : "bg-[#0057cd] hover:bg-[#0b5ed7] text-white active:scale-95 shadow-md shadow-blue-500/15"
                            }`}
                        >
                          {isOutOfStock ? (
                            "Hết hàng"
                          ) : addedItems[medId] ? (
                            <>
                              <Check size={14} /> Đã thêm vào giỏ!
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={14} /> Thêm vào giỏ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
              <Info size={36} className="text-slate-400 mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">Chưa có thuốc phù hợp với bộ lọc hiện tại</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Vui lòng thử điều chỉnh hoặc xóa bớt tiêu chí lọc để xem thêm các loại dược phẩm khác.
              </p>
              <button
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 bg-[#0057cd] text-white text-xs font-bold rounded-xl shadow cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

          {/* View Full Shop Button */}
          <div className="text-center mt-10 pt-6 border-t border-slate-100">
            <Link
              to="/customer/shop"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-[#0057cd] hover:text-white text-[#0057cd] px-8 py-3 rounded-full font-black text-xs uppercase tracking-wider transition-all"
            >
              <span>Xem tất cả hơn 10.000+ sản phẩm tại cửa hàng</span>
              <ArrowRight size={15} />
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. 4 GOLDEN COMMITMENTS */}
      {/* ========================================================================= */}
      <section className="py-12 px-4 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Award size={28} className="text-amber-500" />,
              title: "100% Thuốc Chính Hãng",
              desc: "Nguồn gốc rõ ràng từ các hãng dược phẩm hàng đầu thế giới (AstraZeneca, Sanofi, DHG...)."
            },
            {
              icon: <Truck size={28} className="text-[#0057cd]" />,
              title: "Giao Hàng Siêu Tốc 2 Giờ",
              desc: "Giao thuốc tận nhà đúng hẹn, đóng gói chuyên dụng bảo quản nhiệt độ chuẩn GSP."
            },
            {
              icon: <Stethoscope size={28} className="text-emerald-500" />,
              title: "Dược Sĩ Tư Vấn Tận Tâm",
              desc: "Đội ngũ Dược sĩ Đại học có chứng chỉ hành nghề, tư vấn đúng thuốc, đúng liều lượng 24/7."
            },
            {
              icon: <RefreshCw size={28} className="text-purple-500" />,
              title: "Đổi Trả Miễn Phí 30 Ngày",
              desc: "Hỗ trợ đổi trả thuốc nguyên seal và hoàn tiền nhanh chóng nếu sản phẩm có lỗi từ nhà sản xuất."
            }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. HEALTH ARTICLES */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-black text-[#0057cd] uppercase tracking-widest mb-1 block">CẨM NANG Y KHOA</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Góc Sức Khỏe & Lời Khuyên Dược Sĩ</h2>
          </div>
          <Link to="/customer/consultant" className="text-xs font-black text-[#0057cd] hover:underline flex items-center gap-1">
            Xem thêm các bài viết y khoa <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Cách phân biệt sốt virus và sốt xuất huyết ở trẻ nhỏ",
              category: "Bệnh Học Nhi Khoa",
              date: "14/09/2026",
              author: "Dược sĩ CKI. Nguyễn Văn Nam",
              image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=500&auto=format&fit=crop&q=60"
            },
            {
              title: "5 sai lầm phổ biến khi dùng thuốc kháng sinh mà bạn cần tránh",
              category: "Sử Dụng Thuốc An Toàn",
              date: "12/09/2026",
              author: "Dược sĩ ĐH. Lê Thị Mai",
              image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60"
            },
            {
              title: "Hướng dẫn bổ sung Canxi và Vitamin D3 đúng cách cho người cao tuổi",
              category: "Dinh Dưỡng & TPCN",
              date: "10/09/2026",
              author: "Dược sĩ ĐH. Trần Hoàng",
              image: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=500&auto=format&fit=crop&q=60"
            }
          ].map((post, idx) => (
            <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all group flex flex-col">
              <div className="h-44 overflow-hidden relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-[#0057cd] text-white text-[10px] font-black px-2.5 py-0.5 rounded-md">
                  {post.category}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-1.5">{post.date} • {post.author}</p>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0057cd] transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h4>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs font-bold text-[#0057cd]">
                  <span>Đọc tiếp</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 bg-slate-100/70 border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-black text-[#0057cd] uppercase tracking-widest mb-1 block">HỎI ĐÁP Y KHOA</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Câu Hỏi Thường Gặp</h2>
          </div>

          <div className="space-y-3.5">
            {[
              {
                q: "Làm thế nào để mua thuốc kê đơn (Rx) tại ABC Pharmacy?",
                a: "Đối với thuốc kê đơn (Rx), quý khách chỉ cần tải ảnh đơn thuốc của bác sĩ lên hệ thống hoặc gửi qua Zalo/Hotline 1800 6928. Đội ngũ Dược sĩ Đại học sẽ kiểm tra tính hợp lệ của đơn thuốc, tư vấn liều dùng và hướng dẫn nhận thuốc tại nhà thuốc gần nhất hoặc giao tận nơi."
              },
              {
                q: "Tính năng Tra cứu tương tác thuốc AI hoạt động như thế nào?",
                a: "Hệ thống AI của ABC Pharmacy tích hợp thư viện Dược thư Quốc gia và chuẩn y tế quốc tế. Khi bạn nhập từ 2 loại hoạt chất trở lên, hệ thống sẽ tự động đối chiếu các cơ chế chuyển hóa gan/thận để cảnh báo các tương tác nguy cơ (như tương tác làm tăng độc tính hoặc làm giảm hiệu quả điều trị)."
              },
              {
                q: "Chính sách giao hàng siêu tốc 2 giờ áp dụng ở khu vực nào?",
                a: "Dịch vụ giao thuốc hỏa tốc trong 2 giờ áp dụng cho tất cả đơn hàng trong bán kính 10km từ hệ thống 1.800+ nhà thuốc ABC Pharmacy trên toàn quốc. Đơn hàng từ 150.000₫ được hoàn toàn miễn phí vận chuyển."
              }
            ].map((faq, i) => (
              <div
                key={i}
                className={`border border-slate-200 bg-white rounded-2xl overflow-hidden transition-all ${openFAQ === i ? 'shadow-md border-blue-300' : 'hover:border-slate-300'}`}
              >
                <button
                  onClick={() => toggleFAQ(i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between bg-white text-slate-800 focus:outline-none cursor-pointer"
                >
                  <h4 className="font-bold text-sm text-slate-900 pr-4">{faq.q}</h4>
                  <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-300 ${openFAQ === i ? 'rotate-180 text-[#0057cd]' : ''}`} />
                </button>
                {openFAQ === i && (
                  <div className="px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. PHARMACEUTICAL CORPORATE COMPLIANT FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-[#0b1329] text-white pt-16 pb-8 px-4 text-xs border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#0057cd] flex items-center justify-center text-white">
                <HeartPulse size={20} />
              </div>
              <span className="font-black text-lg text-white tracking-tight">ABC Pharmacy</span>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4 text-xs">
              Hệ thống Chuỗi Nhà thuốc Chuẩn GPP 3.0. Tiên phong ứng dụng Trí tuệ nhân tạo (AI) trong kiểm tra tương tác thuốc, nhận diện đơn thuốc và tối ưu chuỗi cung ứng dược phẩm.
            </p>
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <p>🏛️ <strong>GPKD:</strong> 0316889988 do Sở Kế Hoạch & Đầu Tư cấp</p>
              <p>⚕️ <strong>GCN Đủ Điều Kiện KD Dược:</strong> 1234/ĐKKDD-SYT do Sở Y Tế cấp</p>
              <p>👨‍⚕️ <strong>Người chịu trách nhiệm chuyên môn:</strong> Dược sĩ CKI. Nguyễn Văn Nam</p>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Tổng Đài Hỗ Trợ (Miễn Phí)</h4>
            <div className="space-y-3 text-slate-300">
              <div>
                <p className="text-[10px] text-slate-400">Tư vấn mua thuốc & Đơn thuốc:</p>
                <a href="tel:18006928" className="text-amber-400 font-black text-sm hover:underline">1800 6928</a> <span className="text-[10px] text-slate-400">(8:00 - 22:00)</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Góp ý & Khiếu nại dịch vụ:</p>
                <a href="tel:18006929" className="text-sky-400 font-black text-sm hover:underline">1800 6929</a> <span className="text-[10px] text-slate-400">(8:00 - 21:30)</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Hợp tác kinh doanh & B2B:</p>
                <p className="text-white font-bold text-xs">contact@abcpharmacy.store</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Danh Mục Dược Phẩm</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/customer/shop" className="hover:text-white transition-colors">Thuốc Kê Đơn (Rx)</Link></li>
              <li><Link to="/customer/shop" className="hover:text-white transition-colors">Thuốc Không Kê Đơn</Link></li>
              <li><Link to="/customer/shop" className="hover:text-white transition-colors">Thực Phẩm Chức Năng</Link></li>
              <li><Link to="/customer/shop" className="hover:text-white transition-colors">Dược Mỹ Phẩm</Link></li>
              <li><Link to="/customer/shop" className="hover:text-white transition-colors">Thiết Bị Y Tế</Link></li>
              <li><Link to="/interactions" className="hover:text-white transition-colors">Tra Cứu Tương Tác AI</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4">Cổng Thanh Toán Hỗ Trợ</h4>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {["VietQR PayOS", "VNPay", "MoMo", "Visa", "MasterCard", "COD"].map((pay, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-[10px] font-bold text-slate-300">
                  {pay}
                </div>
              ))}
            </div>

            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Chứng Nhận Chuẩn Y Tế</h4>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck size={18} />
              <span>Đạt Chuẩn GPP - GDP - GSP</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
          <p>© 2026 ABC Pharmacy System - Đồ án Tốt nghiệp Kỹ thuật Phần mềm Nhóm 7 (Đại học FPT Đà Nẵng).</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">Chính sách bảo mật</a>
            <a href="#" className="hover:text-white">Quy chế hoạt động</a>
            <a href="#" className="hover:text-white">Chính sách giao hàng</a>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 11. QUICK PRESCRIPTION UPLOAD MODAL */}
      {/* ========================================================================= */}
      {isPrescriptionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsPrescriptionModalOpen(false)}
        >
          <div
            className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                  TƯ VẤN TOA THUỐC 1:1
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Gửi Đơn Thuốc Nhanh</h3>
                <p className="text-xs text-slate-500 font-medium">Dược sĩ ABC Pharmacy sẽ liên hệ tư vấn và báo giá trong 15 phút.</p>
              </div>
              <button
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <XCircle size={22} />
              </button>
            </div>

            <form onSubmit={handlePrescriptionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên quý khách <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={prescriptionForm.fullName}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0057cd] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912 345 678"
                  value={prescriptionForm.phoneNumber}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, phoneNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0057cd] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ giao hàng (nếu cần giao tận nhà)</label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={prescriptionForm.address}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0057cd] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh chụp toa thuốc / bệnh án</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#0057cd] rounded-xl p-4 text-center cursor-pointer bg-slate-50 transition-colors">
                  <UploadCloud size={28} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Kéo thả ảnh hoặc bấm để chọn tệp</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, PDF (Tối đa 10MB)</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    id="prescription-file-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPrescriptionForm({ ...prescriptionForm, file: e.target.files[0] });
                      }
                    }}
                  />
                  <label htmlFor="prescription-file-upload" className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 text-[#0057cd] text-xs font-bold rounded-lg cursor-pointer">
                    {prescriptionForm.file ? `Đã chọn: ${prescriptionForm.file.name}` : "Chọn ảnh toa thuốc"}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú cho Dược sĩ (triệu chứng, tiền sử dị ứng...)</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Người bệnh dị ứng Penicillin, cần giao trước 17h..."
                  value={prescriptionForm.note}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, note: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0057cd] outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={prescriptionSubmitted}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {prescriptionSubmitted ? "Đang gửi toa thuốc..." : "Gửi Toa Thuốc Cho Dược Sĩ →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MEDICINE QUICK VIEW DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedMedicineForModal && (() => {
        const med = selectedMedicineForModal;
        const medId = med.id || med._id;
        const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
        const isOutOfStock = med.stock <= 0;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
            onClick={() => {
              setSelectedMedicineForModal(null);
              setModalQuantity(1);
            }}
          >
            <div
              className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isRx ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-[#0057cd] border-blue-200"
                      }`}>
                      {isRx ? "Thuốc kê đơn (Rx)" : "Không kê đơn"}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Mã: {med.sku || med.barcode || medId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                    {med.name}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedMedicineForModal(null);
                    setModalQuantity(1);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 flex flex-col gap-5">
                  <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-6 border border-slate-100 relative">
                    <img
                      src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                      alt={med.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Giá niêm yết</span>
                      <span className="text-2xl font-black text-[#0057cd]">
                        {med.price ? med.price.toLocaleString() + "₫" : "Liên hệ"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
                      <span className="text-xs font-bold text-slate-600">Số lượng:</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button
                          onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-slate-800 text-sm">
                          {modalQuantity}
                        </span>
                        <button
                          onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(med, e, modalQuantity)}
                      disabled={isOutOfStock}
                      className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${isOutOfStock
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : addedItems[medId]
                          ? "bg-emerald-600 text-white"
                          : "bg-[#0057cd] hover:bg-[#0b5ed7] text-white active:scale-95"
                        }`}
                    >
                      {isOutOfStock ? "Hết hàng" : addedItems[medId] ? "Đã thêm vào giỏ!" : "Thêm vào giỏ hàng"}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col gap-4 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">Hoạt chất</span>
                      <span className="font-bold text-slate-800 text-xs">{med.active_ingredient || "Đang cập nhật"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">Nhóm điều trị</span>
                      <span className="font-bold text-slate-800 text-xs">{med.category || "Đang cập nhật"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">Dạng bào chế</span>
                      <span className="font-bold text-slate-800 text-xs">{med.dosage_form || "Viên / Gói / Chai"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">Nhà sản xuất</span>
                      <span className="font-bold text-slate-800 text-xs">{med.manufacturer || "Đang cập nhật"}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Info size={14} className="text-[#0057cd]" /> Chỉ định & Công dụng
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {med.cong_dung || "Chỉ định điều trị theo hướng dẫn của bác sĩ hoặc dược sĩ chuyên môn."}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Activity size={14} className="text-[#0057cd]" /> Hướng dẫn & Liều dùng
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {med.cach_dung || "Đọc kỹ hướng dẫn sử dụng trước khi dùng. Tham khảo ý kiến Dược sĩ khi dùng chung với các thuốc khác."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Mascot Companion */}
      <DoveFloatingWidget />
    </div>
  );
}
