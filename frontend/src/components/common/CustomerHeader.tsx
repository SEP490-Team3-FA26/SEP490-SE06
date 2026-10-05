import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search, ShoppingCart, Award, Truck, ShieldCheck,
  PhoneCall, FileText, MapPin, UploadCloud, ChevronDown,
  ChevronRight, X, Loader2, BrainCircuit, Star, LogOut,
  User, ClipboardList, Pill, Flame, CheckCircle2, AlertCircle,
  Menu, XCircle, PackageSearch, Mic, ScanLine, Smartphone,
  Sparkles, HeartPulse, Stethoscope, Scale, Eye, Apple, Brain,
  Droplets, Wind, Bone, MoreHorizontal, Activity
} from "lucide-react";
import api from "../../services/core/api";
import { authService } from "../../services/auth/auth.service";
import { notifyAuthTokenChanged, AUTH_TOKEN_CHANGED_EVENT } from "../../utils/authEvents";
import { MascotLogoIcon } from "../ui/Logo";
import { MedicineDetailModal } from "../MedicineDetailModal";

// Top trending tags under search bar (Long Chau style)
const headerTrendingTags = [
  "Canxi", "Omega 3", "Kẽm", "Sắt", "Kem chống nắng",
  "Thuốc nhỏ mắt", "Sữa rửa mặt", "Men vi sinh", "Dung dịch vệ sinh", "Vitamin C"
];

// Type definitions for Long Chau style Mega Menu
export interface QuickSubCard {
  title: string;
  image?: string;
  search?: string;
  category?: string;
  subCategoryParam?: string;
  isMore?: boolean;
}

export interface BestSellerProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  unit?: string;
  packSpec?: string;
}

export interface SubCategoryGroup {
  title: string;
  iconName: string;
  subCategoryParam: string;
  quickCards: QuickSubCard[];
  bestSellers: BestSellerProduct[];
}

export interface CategoryGroup {
  id: string;
  name: string;
  categoryParam?: string;
  href?: string;
  hasDropdown: boolean;
  subGroups?: SubCategoryGroup[];
}

// Icon helper function for dynamic Lucide icons
function getSubCategoryIcon(iconName?: string) {
  switch (iconName) {
    case "Pill": return Pill;
    case "ShieldCheck": return ShieldCheck;
    case "Scale": return Scale;
    case "Eye": return Eye;
    case "Apple": return Apple;
    case "Brain": return Brain;
    case "Sparkles": return Sparkles;
    case "Droplets": return Droplets;
    case "HeartPulse": return HeartPulse;
    case "Wind": return Wind;
    case "Bone": return Bone;
    case "Activity": return Activity;
    case "Stethoscope": return Stethoscope;
    default: return Pill;
  }
}

// Mega Menu Dropdown Hierarchy (Long Chau standard 1:1)
export const navigationCategoryGroups: CategoryGroup[] = [
  {
    id: "thuc-pham-chuc-nang",
    name: "Thực phẩm chức năng",
    categoryParam: "Thuốc bổ",
    hasDropdown: true,
    subGroups: [
      {
        title: "Vitamin & Khoáng chất",
        iconName: "Pill",
        subCategoryParam: "Vitamin & Khoáng chất",
        quickCards: [
          { title: "Dầu cá - Omega 3", image: "/images/mega-menu/card_omega3.jpg", search: "Omega 3" },
          { title: "Kẽm - Magie", image: "/images/mega-menu/card_zinc.jpg", search: "Kẽm" },
          { title: "Vitamin tổng hợp", image: "/images/mega-menu/card_multivit.jpg", search: "Vitamin tổng hợp" },
          { title: "Canxi & Vitamin D", image: "/images/mega-menu/card_calcium.jpg", search: "Canxi" },
          { title: "Vitamin C", image: "/images/mega-menu/card_vitc.jpg", search: "Vitamin C" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          {
            id: "tpcn-bs-1",
            name: "Viên uống hỗ trợ cải thiện sức đề kháng cho cơ thể ZINCELITE Vitamins For...",
            price: 295000,
            image: "/images/mega-menu/bs_zincelite.jpg",
            unit: "Hộp",
            packSpec: "Hộp 30 Viên"
          },
          {
            id: "tpcn-bs-2",
            name: "Viên uống bổ sung Vitamin và khoáng chất, giúp tăng đề kháng Nature's Way...",
            price: 540000,
            image: "/images/mega-menu/bs_multivitamin.jpg",
            unit: "Hộp",
            packSpec: "Hộp 200 Viên"
          },
          {
            id: "tpcn-bs-3",
            name: "Siro hỗ trợ hấp thu canxi, giúp xương, răng chắc khỏe Nature's Way Kids Smart...",
            price: 360000,
            originalPrice: 400000,
            discountPercent: 10,
            image: "/images/mega-menu/bs_kids_drops.jpg",
            unit: "Hộp",
            packSpec: "Hộp x 11ml"
          },
          {
            id: "tpcn-bs-4",
            name: "Viên uống hỗ trợ giảm mệt mỏi New Nordic Active Liver...",
            price: 468000,
            image: "/images/mega-menu/bs_herbal_liver.jpg",
            unit: "Hộp",
            packSpec: "Hộp 30 Viên"
          },
          {
            id: "tpcn-bs-5",
            name: "Siro bổ sung kẽm và hỗ trợ kích thích thèm ăn Kids Smart Liquid Zinc...",
            price: 355500,
            originalPrice: 395000,
            discountPercent: 10,
            image: "/images/mega-menu/bs_kids_zinc.jpg",
            unit: "Hộp",
            packSpec: "Chai 120ml"
          }
        ]
      },
      {
        title: "Miễn dịch - Đề kháng",
        iconName: "ShieldCheck",
        subCategoryParam: "Miễn dịch",
        quickCards: [
          { title: "Tăng đề kháng hô hấp", image: "/images/mega-menu/lungcare.png", search: "Đề kháng" },
          { title: "Đông trùng hạ thảo", image: "/images/mega-menu/sub_cordyceps.png", search: "Đông trùng" },
          { title: "Keo ong xanh", image: "/images/mega-menu/sub_herbal.png", search: "Keo ong" },
          { title: "Hồng sâm linh chi", image: "/images/mega-menu/echina.png", search: "Hồng sâm" },
          { title: "Siro tăng đề kháng", image: "/images/mega-menu/sub_siro.png", search: "Siro đề kháng" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "md-1", name: "Viên uống tăng cường miễn dịch Thymomodulin 80mg...", price: 185000, image: "/images/mega-menu/thymoglucan.png", unit: "Hộp" },
          { id: "md-2", name: "Tinh chất keo ong xanh Kotimogin tăng đề kháng...", price: 340000, image: "/images/mega-menu/kotimogin.png", unit: "Lọ" },
          { id: "md-3", name: "Siro tăng đề kháng Echina Immuno 120ml...", price: 320000, originalPrice: 350000, discountPercent: 8, image: "/images/mega-menu/echina.png", unit: "Chai" },
          { id: "md-4", name: "Đông trùng hạ thảo Cordyceps Pure Nutrition...", price: 680000, image: "/images/mega-menu/cordyceps.png", unit: "Hộp" },
          { id: "md-5", name: "Viên uống bổ phổi Lung Care tăng đề kháng thở...", price: 490000, image: "/images/mega-menu/lungcare.png", unit: "Lọ" }
        ]
      },
      {
        title: "Sinh lý - Nội tiết tố",
        iconName: "Scale",
        subCategoryParam: "Sinh lý - Nội tiết tố",
        quickCards: [
          { title: "Tăng sinh lý nam", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Sinh lý nam" },
          { title: "Cân bằng nội tiết nữ", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Nội tiết tố" },
          { title: "Hỗ trợ tuyến tiền liệt", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Tiền liệt tuyến" },
          { title: "Tinh chất hàu biển", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Hàu biển" },
          { title: "Hoa anh thảo", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Hoa anh thảo" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "sl-1", name: "Viên uống Sâm Angela Gold giúp tăng cường nội tiết tố nữ...", price: 720000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "sl-2", name: "Tinh chất hàu Oyster Plus Goodhealth New Zealand...", price: 420000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "sl-3", name: "Viên uống tinh dầu hoa anh thảo Blackmores Evening Primrose...", price: 580000, originalPrice: 650000, discountPercent: 11, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "sl-4", name: "Viên uống mầm đậu nành Non-GMO DHC Soy Isoflavones...", price: 260000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Gói" },
          { id: "sl-5", name: "Alipas New hỗ trợ tăng cường sinh lực phái mạnh...", price: 750000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Mắt - Thị lực",
        iconName: "Eye",
        subCategoryParam: "Mắt",
        quickCards: [
          { title: "Lutein & Zeaxanthin", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Lutein" },
          { title: "Bổ mắt việt quất", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Việt quất" },
          { title: "Dầu cá bổ mắt DHA", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Bổ mắt" },
          { title: "Nước mắt nhân tạo", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Nhỏ mắt" },
          { title: "Chống mỏi mắt vi tính", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Mỏi mắt" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "ey-1", name: "Viên uống bổ mắt WIT Ecogreen bảo vệ võng mạc và thủy tinh thể...", price: 330000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "ey-2", name: "Dầu cá Blackmores Fish Oil 1000mg không mùi tanh...", price: 490000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "ey-3", name: "Dung dịch nhỏ mắt Systane Ultra bôi trơn mắt nhân tạo...", price: 110000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "ey-4", name: "Viên sáng mắt Traphaco giảm cận thị và mỏi mắt...", price: 85000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "ey-5", name: "Ocuvite Lutein Bausch & Lomb chống thoái hóa điểm vàng...", price: 290000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Hộp" }
        ]
      },
      {
        title: "Tiêu hóa",
        iconName: "Apple",
        subCategoryParam: "Hỗ trợ tiêu hóa",
        quickCards: [
          { title: "Men vi sinh & Probiotic", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Men vi sinh" },
          { title: "Dạ dày & Men tiêu hóa", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Dạ dày" },
          { title: "Nhuận tràng ngừa táo", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Táo bón" },
          { title: "Bổ gan giải độc", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Bổ gan" },
          { title: "Đại tràng co thắt", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Đại tràng" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "th-1", name: "Men vi sinh Enterogermina 4 tỷ bào tử sống hỗ trợ đường ruột...", price: 235000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "th-2", name: "Bổ gan Boganic Premium Traphaco giải độc rượu bia...", price: 165000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "th-3", name: "Men vi sinh BioGaia Protectis dạng giọt cho trẻ sơ sinh...", price: 415000, originalPrice: 450000, discountPercent: 8, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "th-4", name: "Cốm vi sinh Bio-Acimin Gold cân bằng hệ vi sinh đường ruột...", price: 160000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "th-5", name: "Bột dạ dày Nano Curcumin OIC hỗ trợ lành vết loét...", price: 480000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Hộp" }
        ]
      },
      {
        title: "Thần kinh não",
        iconName: "Brain",
        subCategoryParam: "Thần kinh não",
        quickCards: [
          { title: "Ginkgo Biloba bổ não", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Ginkgo" },
          { title: "Hoạt huyết dưỡng não", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Hoạt huyết" },
          { title: "Giúp ngủ ngon Melatonin", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Melatonin" },
          { title: "Phòng ngừa đột quỵ", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Đột quỵ" },
          { title: "Vitamin 3B thần kinh", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Vitamin 3B" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "tk-1", name: "Viên uống OTIV Ecogreen tăng cường trí nhớ, giảm đau đầu...", price: 330000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "tk-2", name: "Ginkgo Biloba 120mg Nature's Bounty cải thiện tuần hoàn não...", price: 290000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "tk-3", name: "Viên ngủ ngon Natrol Melatonin 5mg hương dâu...", price: 280000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "tk-4", name: "Cerecaps Hoạt Huyết Đa Năng Traphaco...", price: 82000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "tk-5", name: "Nattokinase 2000FU Noguchi Nhật Bản tan cục máu đông...", price: 540000, originalPrice: 600000, discountPercent: 10, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Hỗ trợ làm đẹp",
        iconName: "Sparkles",
        subCategoryParam: "Làm đẹp",
        quickCards: [
          { title: "Collagen nước & viên", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80", search: "Collagen" },
          { title: "Vitamin E đỏ tự nhiên", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Vitamin E" },
          { title: "Trắng da Glutathione", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Trắng da" },
          { title: "Ngăn rụng & mọc tóc", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Biotin" },
          { title: "Chống lão hóa CoQ10", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Chống lão hóa" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "ld-1", name: "Nước uống Shiseido The Collagen Nhật Bản dưỡng da căng mọng...", price: 590000, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "ld-2", name: "Vitamin E đỏ Nga Mirrolla 400mg chống oxy hóa toàn diện...", price: 135000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "ld-3", name: "Viên uống mọc tóc Natrol Biotin 10,000mcg làm dày tóc...", price: 310000, originalPrice: 350000, discountPercent: 11, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "ld-4", name: "Viên uống sáng da DHC Coix Extract hạt ý dĩ...", price: 160000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Gói" },
          { id: "ld-5", name: "Collagen Youtheory Type 1 2 3 của Mỹ 390 viên...", price: 620000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Đường huyết - Tiểu đường",
        iconName: "Droplets",
        subCategoryParam: "Tiểu đường",
        quickCards: [
          { title: "Dây thìa canh hạ đường", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Dây thìa canh" },
          { title: "Đường ăn kiêng", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Đường ăn kiêng" },
          { title: "Sữa y học tiểu đường", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Tiểu đường" },
          { title: "Que thử đường huyết", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Que thử" },
          { title: "Khổ qua rừng thảo dược", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Khổ qua" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "td-1", name: "Viên uống Diabetna Dây thìa canh chuẩn hóa Nam Dược...", price: 115000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "td-2", name: "Sữa bột Glucerna Abbott 850g kiểm soát đường huyết...", price: 820000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lon" },
          { id: "td-3", name: "Đường ăn kiêng Canderel Stevia tự nhiên không calo...", price: 78000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "td-4", name: "Advanced Glucose Support ổn định chỉ số HbA1c...", price: 560000, originalPrice: 620000, discountPercent: 10, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "td-5", name: "Trà túi lọc Khổ Qua Rừng Mudaru thanh nhiệt hạ đường...", price: 125000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Hộp" }
        ]
      },
      {
        title: "Tim mạch - Huyết áp",
        iconName: "HeartPulse",
        subCategoryParam: "Tim mạch",
        quickCards: [
          { title: "Coenzyme Q10 tim mạch", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "CoQ10" },
          { title: "Giảm mỡ máu", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Mỡ máu" },
          { title: "Ổn định huyết áp", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Huyết áp" },
          { title: "Omega 3 tinh khiết", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Omega 3" },
          { title: "Tỏi đen lên men", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Tỏi đen" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "tm-1", name: "CoQ10 150mg Blackmores bảo vệ cơ tim, phòng suy tim...", price: 560000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "tm-2", name: "Tỏi đen Sakura Allium Sativum bền vững thành mạch...", price: 210000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "tm-3", name: "Viên hạ mỡ máu Lipixgo giảm cholesterol xấu LDL...", price: 450000, originalPrice: 500000, discountPercent: 10, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "tm-4", name: "Trà Hoa Hòe Thái Bình làm bền mao mạch, ngừa tai biến...", price: 65000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Gói" },
          { id: "tm-5", name: "Nattokinase Doctor's Best 2000FU của Mỹ...", price: 490000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Hô hấp - Tai mũi họng",
        iconName: "Wind",
        subCategoryParam: "Hô hấp",
        quickCards: [
          { title: "Bổ phổi giảm ho", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Siro ho" },
          { title: "Xịt họng keo ong", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Xịt họng" },
          { title: "Viên ngậm thông họng", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Viên ngậm" },
          { title: "Xịt mũi nước biển sâu", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Xịt mũi" },
          { title: "Xông mũi họng tinh dầu", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Tinh dầu xông" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "hh-1", name: "Siro ho Prospan Engelhard Đức chiết xuất lá thường xuân...", price: 135000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "hh-2", name: "Xịt họng Betadine Sore Throat Spray kháng khuẩn sâu...", price: 120000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "hh-3", name: "Xịt mũi nước biển sâu Xisat người lớn 75ml...", price: 38000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "hh-4", name: "Kẹo ngậm thảo dược Eugica giảm rát họng khản tiếng...", price: 42000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "hh-5", name: "Viên uống Lung Care bổ phổi ngừa viêm đường thở...", price: 490000, originalPrice: 550000, discountPercent: 11, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Cơ xương khớp",
        iconName: "Bone",
        subCategoryParam: "Cơ xương khớp",
        quickCards: [
          { title: "Glucosamine 1500mg", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Glucosamine" },
          { title: "Canxi Nano & D3 K2", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Canxi" },
          { title: "Collagen Type 2 sụn khớp", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Khớp" },
          { title: "Sụn vi cá mập", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Sụn vi cá" },
          { title: "Cao dán giảm đau", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Salonpas" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "xk-1", name: "Viên uống Glucosamine Orihiro 1500mg Nhật Bản tái tạo sụn...", price: 610000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "xk-2", name: "Viên bổ khớp JEX Max Peptan giảm đau thoái hóa khớp...", price: 350000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "xk-3", name: "Canxi hữu cơ sinh học Calci Mk7 Max Ba Lan 60 viên...", price: 390000, originalPrice: 430000, discountPercent: 9, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "xk-4", name: "Sụn vi cá mập Shark Cartilage Costar Úc 365 viên...", price: 680000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Lọ" },
          { id: "xk-5", name: "Cao dán giảm đau Salonpas Diclofenac Hisamitsu Nhật...", price: 55000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Gói" }
        ]
      }
    ]
  },
  {
    id: "duoc-my-pham",
    name: "Dược mỹ phẩm",
    categoryParam: "Dược mỹ phẩm",
    hasDropdown: true,
    subGroups: [
      {
        title: "Chăm sóc da mặt",
        iconName: "Sparkles",
        subCategoryParam: "Chăm sóc da mặt",
        quickCards: [
          { title: "Sữa rửa mặt", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80", search: "Sữa rửa mặt" },
          { title: "Kem chống nắng", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=80", search: "Kem chống nắng" },
          { title: "Serum phục hồi B5", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=80", search: "Serum B5" },
          { title: "Nước tẩy trang", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80", search: "Tẩy trang" },
          { title: "Xịt khoáng làm dịu", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=80", search: "Xịt khoáng" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "dmp-1", name: "Gel rửa mặt La Roche-Posay Effaclar cho da dầu mụn 200ml...", price: 385000, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "dmp-2", name: "Kem chống nắng La Roche-Posay Anthelios kiểm soát dầu 50ml...", price: 495000, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80", unit: "Tuýp" },
          { id: "dmp-3", name: "Nước tẩy trang Bioderma Sensibio H2O nắp hồng 500ml...", price: 420000, originalPrice: 470000, discountPercent: 11, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "dmp-4", name: "Sữa dưỡng ẩm CeraVe Daily Moisturizing Lotion 236ml...", price: 345000, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "dmp-5", name: "Serum cấp nước phục hồi da The Ordinary Hyaluronic Acid 2%...", price: 235000, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80", unit: "Lọ" }
        ]
      },
      {
        title: "Chăm sóc cơ thể & Tóc",
        iconName: "Apple",
        subCategoryParam: "Chăm sóc cơ thể",
        quickCards: [
          { title: "Sữa tắm dưỡng ẩm", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80", search: "Sữa tắm" },
          { title: "Dầu gội trị gàu", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Dầu gội" },
          { title: "Dưỡng thể", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&auto=format&fit=crop&q=80", search: "Dưỡng thể" },
          { title: "Lăn khử mùi", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=80", search: "Lăn khử mùi" },
          { title: "Dưỡng móng & tay", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=80", search: "Kem tay" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "ct-1", name: "Sữa tắm Eucerin pH5 dưỡng ẩm bảo vệ da nhạy cảm...", price: 290000, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "ct-2", name: "Dầu gội dược liệu Thái Dương 7 trị gàu ngứa...", price: 115000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "ct-3", name: "Lăn khử mùi Etiaxil đặc trị mồ hôi không mùi 15ml...", price: 240000, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "ct-4", name: "Kem dưỡng ẩm mờ sẹo Avene Cicalfate+ 40ml...", price: 330000, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&auto=format&fit=crop&q=80", unit: "Tuýp" },
          { id: "ct-5", name: "Sữa dưỡng thể phục hồi Cetaphil Moisturizing Lotion 591ml...", price: 410000, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80", unit: "Chai" }
        ]
      }
    ]
  },
  {
    id: "thuoc",
    name: "Thuốc",
    categoryParam: "Thuốc kháng sinh",
    hasDropdown: true,
    subGroups: [
      {
        title: "Thuốc kê đơn (Rx)",
        iconName: "Stethoscope",
        subCategoryParam: "Thuốc kê đơn",
        quickCards: [
          { title: "Kháng sinh đường uống", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Kháng sinh" },
          { title: "Thuốc tim mạch huyết áp", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Huyết áp" },
          { title: "Kháng đông & mạch máu", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Kháng đông" },
          { title: "Thuốc hướng thần kinh", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Thần kinh" },
          { title: "Thuốc tiểu đường insulin", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Tiểu đường" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "rx-1", name: "Augmentin 1g GlaxoSmithKline kháng sinh phổ rộng...", price: 215000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "rx-2", name: "Amlor 5mg Pfizer điều trị tăng huyết áp vô căn...", price: 345000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "rx-3", name: "Glucophage 500mg Merck điều trị đái tháo đường typ 2...", price: 125000, image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "rx-4", name: "Nexium Mups 40mg AstraZeneca trị trào ngược dạ dày...", price: 380000, image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "rx-5", name: "Lipitor 20mg Pfizer hạ mỡ máu phòng ngừa xơ vữa...", price: 495000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" }
        ]
      },
      {
        title: "Thuốc không kê đơn (OTC)",
        iconName: "Pill",
        subCategoryParam: "Thuốc không kê đơn",
        quickCards: [
          { title: "Giảm đau & Hạ sốt", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Giảm đau" },
          { title: "Thuốc ho cảm cúm", image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&auto=format&fit=crop&q=80", search: "Thuốc ho" },
          { title: "Dạ dày & Tiêu chảy", image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?w=200&auto=format&fit=crop&q=80", search: "Dạ dày" },
          { title: "Chống dị ứng mề đay", image: "https://images.unsplash.com/photo-1550572017-ed2364c76b9a?w=200&auto=format&fit=crop&q=80", search: "Dị ứng" },
          { title: "Miếng dán Salonpas", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Salonpas" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "otc-1", name: "Panadol Extra giảm đau hạ sốt đỏ hộp 15 vỉ x 12 viên...", price: 185000, image: "/images/mega-menu/bs_panadol.jpg", unit: "Hộp" },
          { id: "otc-2", name: "Efferalgan 500mg viên sủi hạ sốt nhanh vị chanh...", price: 68000, image: "/images/mega-menu/bs_efferalgan.jpg", unit: "Hộp" },
          { id: "otc-3", name: "Thuốc ho thảo dược Eugica đỏ viên nang mềm...", price: 65000, image: "/images/mega-menu/bs_eugica.jpg", unit: "Hộp" },
          { id: "otc-4", name: "Gói hỗ trợ trào ngược dạ dày Gaviscon Dual Action...", price: 165000, image: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "otc-5", name: "Smecta gói pha hỗn dịch điều trị tiêu chảy cấp...", price: 110000, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Hộp" }
        ]
      }
    ]
  },
  {
    id: "cham-soc-ca-nhan",
    name: "Chăm sóc cá nhân",
    categoryParam: "Chăm sóc cá nhân",
    hasDropdown: true,
    subGroups: [
      {
        title: "Vệ sinh hàng ngày",
        iconName: "Sparkles",
        subCategoryParam: "Vệ sinh hàng ngày",
        quickCards: [
          { title: "Dung dịch vệ sinh phụ nữ", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=80", search: "Dung dịch vệ sinh" },
          { title: "Nước súc miệng diệt khuẩn", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Nước súc miệng" },
          { title: "Băng vệ sinh thảo dược", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&auto=format&fit=crop&q=80", search: "Băng vệ sinh" },
          { title: "Bao cao su & Gel bôi trơn", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&auto=format&fit=crop&q=80", search: "Bao cao su" },
          { title: "Khăn ướt kháng khuẩn", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&auto=format&fit=crop&q=80", search: "Khăn ướt" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "cs-1", name: "Dung dịch vệ sinh Dạ Hương trà xanh làm sạch dịu nhẹ 120ml...", price: 38000, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "cs-2", name: "Nước súc miệng Listerine Cool Mint bạc hà the mát 750ml...", price: 135000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Chai" },
          { id: "cs-3", name: "Bao cao su Durex Fetherlite Ultima siêu mỏng hộp 12 cái...", price: 195000, image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "cs-4", name: "Kem đánh răng Sensodyne phục hồi răng ê buốt 100g...", price: 72000, image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&auto=format&fit=crop&q=80", unit: "Tuýp" },
          { id: "cs-5", name: "Dung dịch sát khuẩn tay nhanh Asirub 500ml...", price: 65000, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80", unit: "Chai" }
        ]
      }
    ]
  },
  {
    id: "thiet-bi-y-te",
    name: "Thiết bị y tế",
    categoryParam: "Thiết bị y tế",
    hasDropdown: true,
    subGroups: [
      {
        title: "Dụng cụ theo dõi sức khỏe",
        iconName: "Activity",
        subCategoryParam: "Dụng cụ theo dõi",
        quickCards: [
          { title: "Máy đo huyết áp Omron", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=80", search: "Máy đo huyết áp" },
          { title: "Máy & Que thử đường huyết", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80", search: "Que thử đường huyết" },
          { title: "Nhiệt kế hồng ngoại", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=200&auto=format&fit=crop&q=80", search: "Nhiệt kế" },
          { title: "Máy đo nồng độ SpO2", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=80", search: "SpO2" },
          { title: "Khẩu trang y tế 4 lớp", image: "https://images.unsplash.com/photo-1586942593568-29361efcd571?w=200&auto=format&fit=crop&q=80", search: "Khẩu trang" },
          { title: "Xem thêm", isMore: true }
        ],
        bestSellers: [
          { id: "tb-1", name: "Máy đo huyết áp bắp tay tự động Omron HEM-7120 Nhật Bản...", price: 890000, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&auto=format&fit=crop&q=80", unit: "Máy" },
          { id: "tb-2", name: "Máy đo đường huyết Accu-Chek Instant thế hệ mới...", price: 790000, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80", unit: "Bộ" },
          { id: "tb-3", name: "Nhiệt kế điện tử hồng ngoại đo trán Microlife NC200...", price: 780000, originalPrice: 850000, discountPercent: 8, image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80", unit: "Cái" },
          { id: "tb-4", name: "Hộp 50 chiếc khẩu trang y tế kháng khuẩn 4 lớp chuẩn Bộ Y Tế...", price: 35000, image: "https://images.unsplash.com/photo-1586942593568-29361efcd571?w=300&auto=format&fit=crop&q=80", unit: "Hộp" },
          { id: "tb-5", name: "Máy đo SpO2 kẹp ngón tay Yuwell YX301 có cảnh báo pin yếu...", price: 390000, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&auto=format&fit=crop&q=80", unit: "Cái" }
        ]
      }
    ]
  },
  {
    id: "tiem-chung",
    name: "Tiêm chủng",
    href: "/customer/shop?category=Thiết bị y tế",
    hasDropdown: false
  },
  {
    id: "benh-va-goc-suc-khoe",
    name: "Tư vấn AI & Bệnh",
    href: "/customer/ai-consult",
    hasDropdown: false
  },
  {
    id: "he-thong-nha-thuoc",
    name: "Hệ thống nhà thuốc",
    href: "/customer/shop",
    hasDropdown: false
  }
];

export interface CustomerHeaderProps {
  cartIconRef?: any;
}

export function CustomerHeader({ cartIconRef }: CustomerHeaderProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active Dropdown state for navigation menu
  const [hoveredMenuId, setHoveredMenuId] = useState<string | null>(null);
  const [activeSubGroupIndex, setActiveSubGroupIndex] = useState<number>(0);

  // User & Auth State
  const [userRole, setUserRole] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; fullName?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cart State
  const [cartCount, setCartCount] = useState(0);

  // Search Auto-complete State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Modals State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionSubmitted, setPrescriptionSubmitted] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    note: "",
    file: null as File | null
  });

  const [selectedMedicineForModal, setSelectedMedicineForModal] = useState<any | null>(null);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});

  // Sync search input if URL changes
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // Auth & Loyalty Loading
  const syncAuthState = () => {
    const curToken = localStorage.getItem("token") || "";
    const curRole = localStorage.getItem("userRole") || "";
    setToken(curToken);
    setUserRole(curRole);

    if (curToken) {
      api.get("/api/users/loyalty")
        .then((res) => {
          if (res.data && !res.data.error) {
            setLoyalty(res.data);
          }
        })
        .catch((err) => console.error("Error reading loyalty:", err));
    } else {
      setLoyalty(null);
    }
  };

  // Cart Count Loading
  const updateCartCount = async () => {
    try {
      const curToken = localStorage.getItem("token");
      if (!curToken) {
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        const count = items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
        return;
      }

      const res = await api.get("/api/users/cart");
      if (res.data && res.data.items) {
        const count = res.data.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
        setCartCount(count);
      }
    } catch (err) {
      console.error("Error reading cart count:", err);
    }
  };

  useEffect(() => {
    syncAuthState();
    updateCartCount();

    window.addEventListener("cartUpdated", updateCartCount);
    window.addEventListener("loyaltyUpdated", syncAuthState);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncAuthState);

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
      window.removeEventListener("loyaltyUpdated", syncAuthState);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncAuthState);
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

  // Submit Search
  const handleSearchSubmit = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    setShowSearchDropdown(false);
    const query = customQuery !== undefined ? customQuery : searchQuery;
    if (query.trim()) {
      navigate(`/customer/shop?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/customer/shop");
    }
  };

  // Quick Prescription Submit
  const handlePrescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrescriptionSubmitted(true);
    setTimeout(() => {
      setPrescriptionSubmitted(false);
      setIsPrescriptionModalOpen(false);
      setPrescriptionForm({ fullName: "", phoneNumber: "", address: "", note: "", file: null });
      alert("Đã gửi toa thuốc thành công! Dược sĩ chuyên môn ABC Pharmacy sẽ gọi điện tư vấn và báo giá trong 15 phút.");
    }, 1200);
  };

  // Add to cart from modal
  const handleAddToCart = async (med: any, qty: number = 1) => {
    const medId = med.id || med._id;
    const curToken = localStorage.getItem("token");

    if (!curToken) {
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

  const handleLogout = async () => {
    await authService.logout();
    notifyAuthTokenChanged();
    setShowProfileDropdown(false);
    navigate("/auth/login");
  };

  const getUserDisplayName = () => {
    if (loyalty?.fullName) return loyalty.fullName;
    if (userRole && userRole !== "user") return `Quản trị (${userRole.toUpperCase()})`;
    return "Khách Hàng";
  };

  const getUserInitials = () => {
    if (userRole && userRole !== "user") return userRole.substring(0, 2).toUpperCase();
    if (loyalty?.fullName) {
      const parts = loyalty.fullName.trim().split(" ");
      return parts[parts.length - 1].substring(0, 2).toUpperCase();
    }
    return loyalty?.tier?.substring(0, 2) || "KH";
  };

  const currentCategoryParam = searchParams.get("category") || "";
  const activeCategoryGroup = navigationCategoryGroups.find((g) => g.id === hoveredMenuId);
  const currentSubGroup = activeCategoryGroup?.subGroups?.[activeSubGroupIndex] || activeCategoryGroup?.subGroups?.[0];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. TOP UTILITY BAR (LONG CHAU STANDARD) */}
      {/* ========================================================================= */}
      <div className="bg-[#0047a5] text-white text-[11px] font-medium py-1 px-4 border-b border-blue-800/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left Highlights */}
          <div className="flex items-center gap-5">
            <span className="hidden sm:flex items-center gap-1.5 text-sky-100">
              <Smartphone size={12} className="text-sky-300" />
              <span>Tải ứng dụng ABC Pharmacy</span>
            </span>
            <span className="hidden sm:inline-block text-blue-300/30">|</span>
            <a href="tel:18006928" className="flex items-center gap-1.5 hover:text-sky-200 transition-colors font-bold">
              <PhoneCall size={12} className="text-amber-400" />
              <span>Tư vấn ngay: <strong className="text-amber-300 font-black">1800 6928</strong> (Miễn phí)</span>
            </a>
            <span className="hidden md:inline-block text-blue-300/30">|</span>
            <div className="hidden md:flex items-center gap-1.5 text-sky-100">
              <Truck size={12} className="text-emerald-400" />
              <span>Giao siêu tốc <strong className="text-white">2 Giờ</strong> • Freeship từ 150k</span>
            </div>
            <span className="hidden lg:inline-block text-blue-300/30">|</span>
            <div className="hidden lg:flex items-center gap-1.5 text-sky-100">
              <ShieldCheck size={12} className="text-cyan-300" />
              <span>Chuỗi 1.800+ Nhà thuốc chuẩn <strong className="text-white">GPP Bộ Y Tế</strong></span>
            </div>
          </div>

          {/* Right Links */}
          <div className="flex items-center gap-4 text-sky-100">
            <button
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="hover:text-white transition-colors flex items-center gap-1 font-bold cursor-pointer"
            >
              <FileText size={12} className="text-amber-300" /> Gửi đơn thuốc
            </button>
            <span className="text-blue-300/30">|</span>
            <Link to="/customer/shop" className="hover:text-white transition-colors flex items-center gap-1">
              <MapPin size={12} className="text-emerald-300" /> Hệ thống nhà thuốc
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN BLUE HEADER BAR (LONG CHAU STANDARD) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0057cd] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-4">

          {/* Brand Logo (White highlight) */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="p-1 rounded-2xl bg-white/10 backdrop-blur-xs group-hover:bg-white/20 transition-colors">
              <MascotLogoIcon size="md" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-widest text-sky-200 uppercase leading-none">NHÀ THUỐC</span>
              </div>
              <span className="font-black text-xl text-white tracking-tight leading-none mt-0.5">
                ABC PHARMACY
              </span>
            </div>
          </Link>

          {/* Center Smart Live Search Bar with Auto-Complete Dropdown & Trending Tags */}
          <div className="flex-1 max-w-2xl hidden md:flex flex-col gap-1.5 relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Tìm tên thuốc, bệnh lý, TPCN..."
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="w-full pl-5 pr-28 py-2.5 bg-white text-slate-800 rounded-full text-xs font-semibold placeholder:text-slate-400 outline-none shadow-sm focus:ring-2 focus:ring-amber-300 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1.5 text-slate-400">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  title="Tìm bằng giọng nói"
                  onClick={() => navigate("/customer/ai-consult")}
                  className="p-1.5 hover:text-[#0057cd] hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                >
                  <Mic size={15} />
                </button>
                <button
                  type="button"
                  title="Quét mã toa thuốc"
                  onClick={() => setIsPrescriptionModalOpen(true)}
                  className="p-1.5 hover:text-[#0057cd] hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                >
                  <ScanLine size={15} />
                </button>
                <button
                  type="submit"
                  className="bg-[#0047a5] hover:bg-[#003882] text-white p-1.5 rounded-full transition-all cursor-pointer"
                >
                  {isSearchingLive ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                </button>
              </div>
            </form>

            {/* Trending Hot Keywords row directly under search bar (Exact Long Chau style) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px] text-sky-100 font-medium px-1">
              {headerTrendingTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSearchQuery(tag);
                    handleSearchSubmit(undefined, tag);
                  }}
                  className="hover:text-white hover:underline whitespace-nowrap transition-colors cursor-pointer text-sky-100/90"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Live Search Auto-Complete Mega Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-12 left-0 right-0 bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200/90 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-y-auto max-h-[min(540px,calc(100vh-100px))] overscroll-contain text-left custom-scrollbar">
                
                {/* 2-Column Split Grid */}
                <div className="grid grid-cols-12 min-h-full">
                  
                  {/* Left Column (4/12 cols): Trending keywords, Popular categories, Hotline */}
                  <div className="col-span-4 bg-slate-50/80 border-r border-slate-100 p-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Trending Keywords */}
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-600 uppercase tracking-wider mb-2.5">
                          <Flame size={14} className="text-rose-500 fill-rose-500" />
                          <span>Từ khóa tìm kiếm Hot</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {headerTrendingTags.map((tag, idx) => (
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
                            { name: "Thuốc Kháng Sinh (Rx)", val: "Thuốc kháng sinh" },
                            { name: "Giảm Đau & Hạ Sốt", val: "Thuốc giảm đau hạ sốt" },
                            { name: "Đường Hô Hấp & Cảm Cúm", val: "Thuốc trị ho cảm" },
                            { name: "Dạ Dày & Tiêu Hóa", val: "Thuốc dạ dày" },
                            { name: "Vitamin & Khoáng Chất", val: "Thuốc bổ" },
                            { name: "Dược Mỹ Phẩm Chính Hãng", val: "Dược mỹ phẩm" },
                          ].map((cat, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setShowSearchDropdown(false);
                                navigate(`/customer/shop?category=${encodeURIComponent(cat.val)}`);
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#0057cd] transition-colors text-left cursor-pointer"
                            >
                              <span className="truncate">{cat.name}</span>
                              <ChevronRight size={12} className="text-slate-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pharmacist Consultation Tile */}
                    <div className="mt-4 p-3 bg-gradient-to-tr from-[#0057cd] to-sky-600 rounded-2xl text-white text-xs shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <span className="text-amber-300">✨</span>
                        <span>Dược sĩ tư vấn 1:1</span>
                      </div>
                      <p className="text-[11px] text-blue-100 mb-2 leading-relaxed">
                        Cần tìm thuốc kê đơn đặc trị hoặc hỗ trợ liều dùng?
                      </p>
                      <a
                        href="tel:18006928"
                        className="inline-flex items-center justify-center w-full py-1.5 bg-white text-[#0057cd] font-black rounded-xl text-[11px] uppercase tracking-wider shadow-sm hover:bg-blue-50 transition-colors"
                      >
                        <PhoneCall size={12} className="mr-1 text-emerald-600" /> Gọi 1800 6928
                      </a>
                    </div>
                  </div>

                  {/* Right Column (8/12 cols): Search Results / Product Cards */}
                  <div className="col-span-8 p-4 flex flex-col justify-between bg-white">
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
                      ) : searchResults.length > 0 ? (
                        /* 2-Column Product Grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {searchResults.map((med) => {
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
                            Không tìm thấy thuốc nào khớp với từ khóa "<strong className="text-slate-700">{searchQuery}</strong>".
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
                        onClick={() => handleSearchSubmit()}
                        className="py-2 px-4 bg-[#0057cd] hover:bg-[#0b5ed7] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Xem tất cả kết quả {searchQuery ? `cho "${searchQuery}"` : "trong Cửa hàng"}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Actions: Login & Pill-shaped Cart button */}
          <div className="flex items-center gap-3 shrink-0">
            {/* User Account / Profile */}
            {token ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-2xl transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-white text-[#0057cd] flex items-center justify-center font-black text-xs shadow-sm uppercase">
                    {getUserInitials()}
                  </div>
                  <div className="flex flex-col text-left hidden lg:flex">
                    <span className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-[10px] text-sky-200">
                      {userRole && userRole !== 'user' ? `Tài khoản ${userRole}` : `Hạng ${loyalty?.tier || "Bronze"}`}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-sky-200" />
                </button>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 text-left">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tài khoản</p>
                        <p className="text-sm font-black text-slate-900 truncate">{getUserDisplayName()}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 bg-sky-50 text-[#0057cd] border border-sky-200">
                          {userRole && userRole !== 'user' ? `Quản trị (${userRole.toUpperCase()})` : `Hạng ${loyalty?.tier || "Bronze"} • ${loyalty?.points?.toLocaleString() || 0}đ`}
                        </span>
                      </div>

                      <div className="py-1">
                        {userRole && userRole !== 'user' && (
                          <Link
                            to={userRole === 'director' || userRole === 'head_branch' ? '/director' : userRole === 'admin' ? '/admin' : userRole === 'warehouse' ? '/warehouse' : userRole === 'branch' ? '/branch' : userRole === 'pharmacist' ? '/pharmacist' : '/admin'}
                            onClick={() => setShowProfileDropdown(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-black text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all mb-1"
                          >
                            <User size={15} className="text-indigo-600" />
                            <span>Vào Bảng Quản Trị ({userRole.toUpperCase()})</span>
                          </Link>
                        )}
                        <Link
                          to="/customer/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[#0057cd] hover:bg-blue-50 transition-colors"
                        >
                          <User size={16} className="text-[#0057cd]" />
                          <span>Hồ sơ & Điểm tích lũy</span>
                        </Link>
                        <Link
                          to="/customer/orders"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ClipboardList size={15} className="text-slate-400" />
                          <span>Lịch sử đơn thuốc & Mua sắm</span>
                        </Link>
                        <Link
                          to="/feedback"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all"
                        >
                          <Star size={15} className="fill-amber-500 text-amber-500" />
                          <span>Đánh giá & Nhận thưởng (+2kđ)</span>
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
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="flex items-center gap-2 py-2 px-3.5 hover:bg-white/10 rounded-full font-bold text-xs uppercase tracking-wider text-white transition-all"
              >
                <User size={16} />
                <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
            )}

            {/* Long Chau Pill-shaped Cart Button */}
            <Link
              ref={cartIconRef}
              id="cart-icon-btn"
              to="/customer/cart"
              className="flex items-center gap-2 bg-[#0047a5] hover:bg-[#003c8c] text-white px-4 py-2 rounded-full font-bold text-xs transition-all shadow-sm relative group cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 min-w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 border border-white shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Giỏ hàng</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-white/10 md:hidden rounded-xl focus:outline-none"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Only visible on screens < md) */}
        <div className="px-4 pb-2.5 md:hidden bg-[#0057cd]">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Tìm tên thuốc, bệnh lý, TPCN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white text-slate-800 rounded-full text-xs font-semibold placeholder:text-slate-400 outline-none"
            />
            <button
              type="submit"
              className="absolute right-1.5 bg-[#0047a5] text-white p-1 rounded-full text-xs"
            >
              <Search size={14} />
            </button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORY NAVIGATION BAR WITH DROP MENU (LONG CHAU STANDARD) */}
        {/* ========================================================================= */}
        <div
          className="bg-white text-slate-800 border-t border-slate-200/80 shadow-xs relative z-40"
          onMouseLeave={() => setHoveredMenuId(null)}
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center overflow-x-auto scrollbar-none py-1">
              
              {/* Render Navigation Category Items with Dropdown indicator */}
              {navigationCategoryGroups.map((group) => {
                const isHovered = hoveredMenuId === group.id;
                const isCurrentCategoryActive = group.categoryParam && currentCategoryParam === group.categoryParam;
                const isTabActive = hoveredMenuId ? isHovered : isCurrentCategoryActive;

                return (
                  <div
                    key={group.id}
                    className="relative"
                    onMouseEnter={() => {
                      if (group.hasDropdown) {
                        setHoveredMenuId(group.id);
                        setActiveSubGroupIndex(0);
                      } else {
                        setHoveredMenuId(null);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHoveredMenuId(null);
                        if (group.href) {
                          navigate(group.href);
                        } else if (group.categoryParam) {
                          navigate(`/customer/shop?category=${encodeURIComponent(group.categoryParam)}`);
                        }
                      }}
                      className={`px-3 py-2.5 flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer text-xs font-bold border-b-2 -mb-[1px] ${
                        isTabActive
                          ? "text-[#0057cd] font-black border-[#0057cd] bg-blue-50/40"
                          : "text-slate-700 hover:text-[#0057cd] border-transparent"
                      }`}
                    >
                      <span>{group.name}</span>
                      {group.hasDropdown && (
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${
                            isHovered ? "rotate-180 text-[#0057cd]" : "text-slate-400"
                          }`}
                        />
                      )}
                    </button>
                  </div>
                );
              })}

            </div>

            {/* Right badges */}
            <div className="hidden xl:flex items-center gap-4 pl-4 border-l border-slate-200 shrink-0 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1 text-emerald-700 font-bold"><Award size={13} className="text-amber-500" /> 100% Thuốc chính hãng</span>
              <span className="flex items-center gap-1 text-blue-700 font-bold"><Truck size={13} className="text-emerald-500" /> Giao hàng 2H</span>
            </div>
          </div>

          {/* Floating Mega Dropdown Menu (Centered w-[1080px], matching Long Chau standard) */}
          {hoveredMenuId && activeCategoryGroup?.hasDropdown && activeCategoryGroup.subGroups && currentSubGroup && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-[1080px] max-w-[96vw] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 z-50 overflow-hidden flex flex-row min-h-[500px] animate-in fade-in zoom-in-95 duration-150 text-left before:content-[''] before:absolute before:-top-3 before:inset-x-0 before:h-4"
              onMouseEnter={() => setHoveredMenuId(activeCategoryGroup.id)}
              onMouseLeave={() => setHoveredMenuId(null)}
            >
              {/* Left Column: Sub-groups List (w-[270px], scrollbar hidden) */}
              <div className="w-[270px] shrink-0 bg-[#f8fafc] border-r border-slate-200/80 p-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-0.5">
                {activeCategoryGroup.subGroups.map((sub, idx) => {
                  const IconComp = getSubCategoryIcon(sub.iconName);
                  const isActive = activeSubGroupIndex === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => setActiveSubGroupIndex(idx)}
                      onClick={() => {
                        setHoveredMenuId(null);
                        if (sub.subCategoryParam) {
                          navigate(
                            `/customer/shop?category=${encodeURIComponent(
                              activeCategoryGroup.categoryParam || ""
                            )}&subCategory=${encodeURIComponent(sub.subCategoryParam)}`
                          );
                        } else {
                          navigate(
                            `/customer/shop?category=${encodeURIComponent(
                              activeCategoryGroup.categoryParam || ""
                            )}`
                          );
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? "bg-[#e2e8f0] text-slate-900 font-bold shadow-xs"
                          : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900"
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center shrink-0 text-[#0057cd]">
                        <IconComp size={16} />
                      </span>
                      <span className="truncate flex-1">{sub.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Quick Cards & Best Seller Products */}
              <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto bg-white">
                <div>
                  {/* Top: 3x2 Grid of Quick-access Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {currentSubGroup.quickCards?.map((card, cIdx) => (
                      <div
                        key={cIdx}
                        onClick={() => {
                          setHoveredMenuId(null);
                          if (card.isMore) {
                            if (currentSubGroup.subCategoryParam) {
                              navigate(
                                `/customer/shop?category=${encodeURIComponent(
                                  activeCategoryGroup.categoryParam || ""
                                )}&subCategory=${encodeURIComponent(currentSubGroup.subCategoryParam)}`
                              );
                            }
                          } else if (card.search) {
                            navigate(
                              `/customer/shop?category=${encodeURIComponent(
                                activeCategoryGroup.categoryParam || ""
                              )}&search=${encodeURIComponent(card.search)}`
                            );
                          }
                        }}
                        className="bg-[#f1f5f9] hover:bg-[#e2e8f0]/80 p-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border border-slate-200/60 hover:shadow-xs group h-[64px]"
                      >
                        {card.isMore ? (
                          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-500 border border-slate-200/70 shrink-0 group-hover:scale-105 transition-transform">
                            <MoreHorizontal size={18} />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200/70 shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                            <img
                              src={card.image}
                              alt={card.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#0057cd] transition-colors">
                          {card.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom: Best Seller Section */}
                  <div className="pt-3 border-t border-slate-200/80">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-black text-slate-900">Bán chạy nhất</span>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setHoveredMenuId(null);
                          if (currentSubGroup.subCategoryParam) {
                            navigate(
                              `/customer/shop?category=${encodeURIComponent(
                                activeCategoryGroup.categoryParam || ""
                              )}&subCategory=${encodeURIComponent(currentSubGroup.subCategoryParam)}`
                            );
                          } else {
                            navigate(
                              `/customer/shop?category=${encodeURIComponent(
                                activeCategoryGroup.categoryParam || ""
                              )}`
                            );
                          }
                        }}
                        className="text-xs font-bold text-[#0057cd] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        Xem tất cả <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* 5-Column Product Cards Row */}
                    <div className="grid grid-cols-5 gap-3">
                      {currentSubGroup.bestSellers?.slice(0, 5).map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setHoveredMenuId(null);
                            navigate(`/customer/shop?search=${encodeURIComponent(prod.name.split(" ")[0] || "")}`);
                          }}
                          className="group p-2.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                        >
                          {/* Thumbnail & Discount badge */}
                          <div className="relative w-full aspect-square rounded-xl bg-slate-50/60 p-2 flex items-center justify-center overflow-hidden mb-2">
                            {prod.discountPercent && (
                              <span className="absolute top-1 left-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs z-10">
                                -{prod.discountPercent}%
                              </span>
                            )}
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>

                          {/* Title & Price */}
                          <div className="flex-1 flex flex-col justify-between">
                            <h5 className="text-[11px] font-semibold text-slate-800 line-clamp-2 leading-tight group-hover:text-[#0057cd] transition-colors mb-2">
                              {prod.name}
                            </h5>
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs font-black text-[#0057cd]">
                                  {prod.price.toLocaleString("vi-VN")}đ
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">/ {prod.unit || "Hộp"}</span>
                              </div>
                              {prod.originalPrice && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  {prod.originalPrice.toLocaleString("vi-VN")}đ
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dark Backdrop Overlay Dimming the Content Below */}
        {hoveredMenuId && activeCategoryGroup?.hasDropdown && (
          <div
            className="fixed inset-0 top-[110px] bg-slate-900/60 backdrop-blur-[2px] z-30 transition-opacity duration-200"
            onClick={() => setHoveredMenuId(null)}
          />
        )}


        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white text-slate-800 px-4 py-4 space-y-2.5 shadow-xl animate-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
            <div className="font-black text-xs uppercase tracking-wider text-slate-400 mb-1">Danh mục sản phẩm</div>
            {navigationCategoryGroups.map((group) => (
              <div key={group.id} className="border-b border-slate-100 pb-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (group.href) navigate(group.href);
                    else if (group.categoryParam) navigate(`/customer/shop?category=${encodeURIComponent(group.categoryParam)}`);
                  }}
                  className="w-full text-left font-bold text-xs text-slate-800 py-1.5 flex items-center justify-between"
                >
                  <span>{group.name}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              </div>
            ))}

            <div className="pt-2 space-y-2">
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/customer/ai-consult"); }}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 text-left flex items-center gap-2"
              >
                <BrainCircuit size={15} /> Tư Vấn AI (Giọng Nói 24/7)
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); setIsPrescriptionModalOpen(true); }}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 text-left flex items-center gap-2"
              >
                <UploadCloud size={15} /> Gửi Toa Thuốc Nhanh
              </button>
            </div>

            {token ? (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link to="/customer/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {getUserInitials()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{getUserDisplayName()}</span>
                    <span className="text-[10px] text-blue-500 font-medium">Hồ sơ & Điểm tích lũy</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-[#0057cd] hover:bg-[#0b5ed7] text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Đăng Nhập
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 4. QUICK PRESCRIPTION UPLOAD MODAL */}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên quý khách <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ giao hàng (nếu cần giao tận nhà)
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={prescriptionForm.address}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0057cd] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ảnh chụp toa thuốc / bệnh án
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-[#0057cd] rounded-xl p-4 text-center cursor-pointer bg-slate-50 transition-colors">
                  <UploadCloud size={28} className="mx-auto text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Kéo thả ảnh hoặc bấm để chọn tệp</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, PDF (Tối đa 10MB)</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    id="customer-prescription-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPrescriptionForm({ ...prescriptionForm, file: e.target.files[0] });
                      }
                    }}
                  />
                  <label htmlFor="customer-prescription-upload" className="inline-block mt-2 px-3 py-1 bg-white border border-slate-200 text-[#0057cd] text-xs font-bold rounded-lg cursor-pointer">
                    {prescriptionForm.file ? `Đã chọn: ${prescriptionForm.file.name}` : "Chọn ảnh toa thuốc"}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú cho Dược sĩ (triệu chứng, tiền sử dị ứng...)
                </label>
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
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {prescriptionSubmitted ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang gửi thông tin...</span>
                  </>
                ) : (
                  <span>Gửi Toa Thuốc Ngay</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MEDICINE DETAIL MODAL (ON CLICK FROM SEARCH DROPDOWN) */}
      {/* ========================================================================= */}
      {selectedMedicineForModal && (
        <MedicineDetailModal
          medicine={selectedMedicineForModal}
          isOpen={!!selectedMedicineForModal}
          onClose={() => setSelectedMedicineForModal(null)}
          onAddToCart={handleAddToCart}
          addedItems={addedItems}
        />
      )}
    </>
  );
}
