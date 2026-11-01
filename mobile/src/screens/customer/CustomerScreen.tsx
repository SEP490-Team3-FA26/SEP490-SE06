import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  RefreshControl,
  Clipboard,
  Image,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { Medicine, CartItem, Order, Voucher, Branch } from '../../types/pharmacy.types';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import { parseOrderToReminder, createRemindersFromOrder } from '../../services/reminderStorage.service';
import { MedicineReminderService } from '../../services/medicineReminder.service';
import {
  AnimatedPressable,
  ClinicalButton,
  ClinicalCard,
  ClinicalBadge,
  ClinicalModalSheet,
  ClinicalSkeleton,
  ClinicalMedicineSkeletonGrid,
  DigitalHealthPassportModal,
} from '../../components/clinical';
import { FlatModal } from '../../components/flat/FlatModal';
import { FullSearchModal } from '../../components/search/FullSearchModal';
import {
  SEASONAL_BLOGS,
  filterRecommendedMedicines,
  HealthBlogCategory,
} from '../../services/healthBlog.service';
import { getTopBestSellers, BestSellerProduct } from '../../services/bestSeller.service';
import {
  formatMinimalVoucherBadge,
  LoyaltyGiftItem,
  PointsHistoryItem,
  DEFAULT_LOYALTY_GIFTS,
  DEFAULT_POINTS_HISTORY,
  filterGiftsByPointsTier,
  calculatePointsAfterRedeem,
  formatPointsDisplay,
} from '../../services/loyaltyRewards.service';
import { PointsHistoryScreen } from './PointsHistoryScreen';
import { CustomerAccountService } from '../../services/customerAccount.service';
import { HomeBannerCarousel, CarouselBannerItem } from '../../components/carousel/HomeBannerCarousel';
import { ClinicalSidebarDrawer, DrawerMenuItem } from '../../components/clinical/ClinicalSidebarDrawer';
import {
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  MotionTokens,
} from '../../theme/tokens';

// Sub-component FlashSaleCountdown độc lập, tự quản lý timer đếm giây, không kích hoạt re-render toàn màn hình
const FlashSaleCountdown: React.FC = React.memo(() => {
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 3,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 3, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.countdownRow}>
      <Text style={styles.countdownLabel}>Kết thúc trong: </Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>
          {String(countdown.hours).padStart(2, '0')}
        </Text>
      </View>
      <Text style={styles.timerColon}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>
          {String(countdown.minutes).padStart(2, '0')}
        </Text>
      </View>
      <Text style={styles.timerColon}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>
          {String(countdown.seconds).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
});

export const CustomerScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { user, auth, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadCount = 0 } = useNotification();
  const initialWebTab = useMemo(() => {
    if (typeof window !== 'undefined' && window.location) {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p && ['STORE', 'REWARDS', 'AI_CHAT', 'CART', 'ACCOUNT', 'VOUCHERS', 'ORDERS'].includes(p)) {
        return p as 'STORE' | 'REWARDS' | 'AI_CHAT' | 'CART' | 'ACCOUNT' | 'VOUCHERS' | 'ORDERS';
      }
    }
    return (route?.params?.initialTab as any) || 'STORE';
  }, [route?.params?.initialTab]);
  // 5 Tabs chuẩn: Trang chủ (STORE) - Điểm thưởng (REWARDS) - Tư vấn AI (AI_CHAT) - Giỏ hàng (CART) - Tài khoản (ACCOUNT)
  const [activeTab, setActiveTab] = useState<'STORE' | 'REWARDS' | 'AI_CHAT' | 'CART' | 'ACCOUNT' | 'VOUCHERS' | 'ORDERS'>(initialWebTab);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Mở màn hình tìm kiếm lớn (Full Search Modal) & Menu Drawer Hamburger
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);

  // Sản phẩm đã xem gần đây (Recently Viewed)
  const [recentlyViewed, setRecentlyViewed] = useState<Medicine[]>([]);

  // Modals in-app thay thế OS Alert
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showLoginPromptModal, setShowLoginPromptModal] = useState<boolean>(false);

  // Thông tin Loyalty / Điểm thưởng thành viên
  const [loyaltyInfo, setLoyaltyInfo] = useState<{
    points?: number;
    accumulatedPoints?: number;
    tier?: string;
    multiplier?: number;
    conversionRate?: number;
  } | null>(null);

  // State quản lý Điểm Thưởng & Đổi Quà FPT Long Châu
  const [showPointsHistoryModal, setShowPointsHistoryModal] = useState<boolean>(false);
  const [showRedeemGiftModal, setShowRedeemGiftModal] = useState<boolean>(false);
  const [selectedGiftToRedeem, setSelectedGiftToRedeem] = useState<LoyaltyGiftItem | null>(null);
  const [redeemQuantity, setRedeemQuantity] = useState<number>(1);
  const [selectedGiftPointsTier, setSelectedGiftPointsTier] = useState<number>(1500);
  const [loyaltyGifts] = useState<LoyaltyGiftItem[]>(DEFAULT_LOYALTY_GIFTS);
  const [pointsHistory] = useState<PointsHistoryItem[]>(DEFAULT_POINTS_HISTORY);

  // Landing Page Tri-Pharmacy States (Pharmacity + Long Châu + An Khang)
  const [flashSaleSlot, setFlashSaleSlot] = useState<'SLOT_1' | 'SLOT_2' | 'SLOT_3'>('SLOT_1');
  const [seasonalCategory, setSeasonalCategory] = useState<'FLU' | 'STOMACH' | 'ALLERGY' | 'IMMUNITY'>('FLU');
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);

  // Products & Categories
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [visibleMedicineCount, setVisibleMedicineCount] = useState<number>(24);

  // Advanced Filters & Sorting for Store Tab
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<'ALL' | 'UNDER_100' | '100_300' | 'OVER_300'>('ALL');
  const [selectedRxFilter, setSelectedRxFilter] = useState<'ALL' | 'RX' | 'OTC'>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC'>('DEFAULT');

  // Tự động reset số lượng thuốc hiển thị khi đổi bộ lọc
  useEffect(() => {
    setVisibleMedicineCount(24);
  }, [searchQuery, selectedCategory, selectedRxFilter, selectedPriceFilter, sortBy]);

  // Order status filter tab
  const [orderStatusTab, setOrderStatusTab] = useState<'ALL' | 'PENDING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Cart & Vouchers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');

  // Wishlist State (Danh sách sản phẩm yêu thích)
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [wishlistTotalCount, setWishlistTotalCount] = useState<number>(0);

  // Tìm kiếm mã Voucher trong tab Điểm Thưởng & Săn Voucher
  const [voucherSearchInput, setVoucherSearchInput] = useState<string>('');

  // AI Chat & Voice Consultant
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; recommendedMeds?: Medicine[] }>>([
    {
      role: 'ai',
      text: 'Xin chào! Tôi là Dược Sĩ AI ABC Pharmacy. Bạn có thể mô tả triệu chứng (ho, sốt, sổ mũi, đau dạ dày...) hoặc bấm nút Ghi Âm để tôi tư vấn thuốc an toàn nhé!',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);

  // Orders & Feedback
  const [orders, setOrders] = useState<Order[]>([]);
  const [medImageMap, setMedImageMap] = useState<Record<string, string>>({});
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [selectedOrderQR, setSelectedOrderQR] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);
  // Tự động tải hình ảnh thuốc chuẩn xác từ Database cho lịch sử đơn hàng
  useEffect(() => {
    if (orders.length > 0) {
      const missingIds = new Set<string>();
      const existingMap: Record<string, string> = { ...medImageMap };

      orders.forEach((ord) => {
        (ord.items || []).forEach((it) => {
          const mId = it.medicineId || (it as any).id || (it as any)._id;
          if (mId && !existingMap[mId]) {
            const matched = medicines.find(
              (m) => (m.id && String(m.id) === String(mId)) ||
                     (m._id && String(m._id) === String(mId)) ||
                     (m.name && it.name && m.name.toLowerCase().trim() === it.name.toLowerCase().trim())
            );
            if (matched && (matched.image || matched.image_url)) {
              existingMap[mId] = matched.image || matched.image_url || '';
            } else {
              missingIds.add(mId);
            }
          }
        });
      });

      if (missingIds.size > 0) {
        Promise.all(
          Array.from(missingIds).slice(0, 15).map(async (id) => {
            try {
              const med = await ApiService.getMedicineById(id);
              if (med && (med.image || med.image_url)) {
                return { id, image: med.image || med.image_url || (med.images && med.images[0]) || '' };
              }
            } catch (e) {}
            return null;
          })
        ).then((results) => {
          results.forEach((r) => {
            if (r && r.image) existingMap[r.id] = r.image;
          });
          setMedImageMap(existingMap);
        });
      } else {
        setMedImageMap(existingMap);
      }
    }
  }, [orders, medicines]);

  // Hàm lấy hình ảnh thuốc chuẩn từ Database hoặc danh mục đã tải
  const getMedicineImage = (item: any): string => {
    if (item.image && typeof item.image === 'string' && item.image.trim().length > 0) return item.image;
    if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim().length > 0) return item.imageUrl;
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim().length > 0) return item.image_url;

    const mId = item.medicineId || item.id || item._id;
    if (mId && medImageMap[mId]) {
      return medImageMap[mId];
    }

    const cleanName = String(item.name || '').toLowerCase().trim();
    const matched = medicines.find(
      (m) =>
        (m.id && String(m.id) === String(mId)) ||
        (m._id && String(m._id) === String(mId)) ||
        (m.name && m.name.toLowerCase().trim() === cleanName) ||
        (cleanName.length > 5 && m.name && m.name.toLowerCase().includes(cleanName.slice(0, 15)))
    );

    if (matched) {
      if (matched.image && matched.image.trim().length > 0) return matched.image;
      if (matched.image_url && matched.image_url.trim().length > 0) return matched.image_url;
      if (Array.isArray(matched.images) && matched.images.length > 0 && matched.images[0]) return matched.images[0];
    }

    const defaultMedImages: Record<string, string> = {
      'Kháng sinh': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
      'Giảm đau': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=500&auto=format&fit=crop&q=80',
      'Hô hấp': 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop&q=80',
      'Tiêu hóa': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=80',
      'Vitamin': 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    };
    const cat = matched?.category || '';
    const matchedKey = Object.keys(defaultMedImages).find((k) => cat.includes(k));
    return matchedKey ? defaultMedImages[matchedKey] : 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';
  };


  // Sổ Sức Khỏe Số & Onboarding khai báo ban đầu (UC-106)
  const [showPassportModal, setShowPassportModal] = useState<boolean>(false);
  const [isOnboardingHealth, setIsOnboardingHealth] = useState<boolean>(false);
  const [clinicalSafety, setClinicalSafety] = useState<any>(null);

  // Tự động kiểm tra nếu khách hàng đăng nhập chưa hoàn thành onboarding y tế
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    ApiService.getMyClinicalSafety()
      .then((data) => {
        if (isMounted && data) {
          setClinicalSafety(data);
          if (data.hasCompletedHealthOnboarding === false) {
            setIsOnboardingHealth(true);
            setShowPassportModal(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Khôi phục danh sách sản phẩm đã xem và điểm thưởng từ AsyncStorage / API
  useEffect(() => {
    AsyncStorage.getItem('abc_recently_viewed')
      .then((stored) => {
        if (stored) {
          try {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) setRecentlyViewed(list);
          } catch {}
        }
      })
      .catch(() => {});

    ApiService.getMyLoyalty()
      .then((data) => {
        if (data) setLoyaltyInfo(data);
      })
      .catch(() => {});
  }, [user]);

  // Thêm sản phẩm vào danh sách xem gần đây (tối đa 12 sản phẩm)
  const addRecentlyViewed = useCallback((med: Medicine) => {
    if (!med) return;
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((m) => (m.id || (m as any)._id) !== (med.id || (med as any)._id));
      const nextList = [med, ...filtered].slice(0, 12);
      AsyncStorage.setItem('abc_recently_viewed', JSON.stringify(nextList)).catch(() => {});
      return nextList;
    });
  }, []);

  // Chuyển hướng sang Màn hình Chi Tiết Thuốc riêng biệt và tự động lưu vào sản phẩm đã xem
  const openMedicineDetail = useCallback(
    (med: Medicine) => {
      if (!med) return;
      addRecentlyViewed(med);
      navigation.navigate('MedicineDetailScreen', {
        medicine: med,
        medicineId: med.id || (med as any)._id,
      });
    },
    [addRecentlyViewed, navigation]
  );

  // Xóa trực tiếp sản phẩm khỏi giỏ hàng
  const removeFromCart = useCallback((medId: string) => {
    setCart((prev) => prev.filter((i) => i.medicine.id !== medId));
    showToast.info('Đã xóa', 'Đã bỏ sản phẩm khỏi giỏ hàng.');
  }, []);

  const handleOpenFeedback = (ord: Order) => {
    setFeedbackOrder(ord);
    setFeedbackRating(5);
    setFeedbackTags(['Dược sĩ tận tâm', 'Thuốc chuẩn chính hãng']);
    setFeedbackComment('');
  };

  // [REVIEWER_HOOK_CUSTOMER]
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const modal = params.get('modal');
      const search = params.get('search');
      if (search) {
        setSearchQuery(search);
      }
      if (modal === 'branch') setShowBranchModal(true);
      if (modal === 'filter') setShowFilterModal(true);
      if (modal === 'scanner') setShowScanner(true);
      if (modal === 'med_detail') {
        const demoMed = medicines[0] || {
          id: 'med_demo_01',
          name: 'Viên sủi Berocca Performance bồi bổ năng lượng, giảm mệt mỏi (Hộp 10 viên)',
          active: 'Vitamin C 500mg, Vitamin B-Complex, Kẽm 10mg',
          category: 'Vitamin & Khoáng chất',
          price: 92000,
          unit: 'Hộp',
          stock: 85,
          rating: 4.9,
          dosage: '1 viên/ngày hòa tan trong 200ml nước',
          indication: 'Hỗ trợ tăng cường sức đề kháng, giảm căng thẳng thần kinh',
          sku: 'MED-BEROCCA-10T',
          barcode: '8935001709999',
        };
        setSelectedMedDetail(demoMed as any);
      }
      if (modal === 'order_qr') {
        const demoOrder = orders[0] || {
          id: 'ORD-ABC-9921',
          code: 'ORD-ABC-9921',
          totalAmount: 185000,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          customerName: 'Nguyễn Văn A',
          customerPhone: '0901234567',
        };
        setSelectedOrderQR(demoOrder as any);
      }
      if (modal === 'order_feedback') {
        const demoOrder = orders[0] || {
          id: 'ORD-ABC-9921',
          code: 'ORD-ABC-9921',
          totalAmount: 185000,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          customerName: 'Nguyễn Văn A',
        };
        handleOpenFeedback(demoOrder as any);
      }
    }
  }, [medicines, orders]);

  const handleToggleTag = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackOrder) return;
    try {
      setFeedbackSubmitting(true);
      const res = await ApiService.submitFeedback({
        orderCode: feedbackOrder.orderCode || feedbackOrder.id,
        branchId: (feedbackOrder as any).branchId || (feedbackOrder as any).branch || 'CN-01',
        rating: feedbackRating,
        comment: feedbackComment,
        tags: feedbackTags,
        customerPhone: user?.phone || searchPhone || (feedbackOrder as any).phone || '',
        customerName: (user as any)?.fullName || user?.name || (feedbackOrder as any).patientName || 'Khách hàng',
      });

      if (res.success) {
        showToast.success(
          'Đánh giá thành công!',
          `Đã cộng +${res.data?.rewardPoints || 1000}đ điểm thưởng & gửi voucher giảm giá vào tài khoản!`
        );
        setFeedbackOrder(null);
      } else {
        showToast.error('Không thành công', res.error || 'Có lỗi xảy ra');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message || 'Lỗi gửi đánh giá');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Xử lý điều hướng khi bấm vào banner khuyến mãi trong Carousel
  const handleSelectBanner = useCallback((banner: CarouselBannerItem) => {
    if (banner.actionTab) {
      setActiveTab(banner.actionTab as any);
    } else if (banner.category) {
      setSelectedCategory(banner.category);
    }
  }, []);

  const categoriesList = useMemo(() => {
    const unique = new Set<string>();
    medicines.forEach((m) => {
      if (m.category && m.category.trim().length > 0) {
        unique.add(m.category.trim());
      }
    });
    return [
      { id: 'ALL', label: 'Tất cả' },
      ...Array.from(unique).map((cat) => ({ id: cat, label: cat })),
    ];
  }, [medicines]);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [medList, voucherList, orderList, branchList, wishlistRes] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getVouchers(),
        ApiService.getMyOrders(searchPhone || user?.phone),
        ApiService.getBranches(),
        ApiService.getWishlist(),
      ]);

      if (medList && medList.length > 0) {
        setMedicines(medList);
        // Detect nếu đang dùng fallback offline (id có prefix fallback_)
        const usingFallback = medList.some((m: any) => String(m.id || '').startsWith('fallback_'));
        setIsOfflineMode(usingFallback);
      }
      setVouchers(voucherList || []);
      setOrders(orderList || []);
      if (branchList && Array.isArray(branchList) && branchList.length > 0) {
        setBranches(branchList);
      }
      if (wishlistRes) {
        setWishlistItems(wishlistRes.items || []);
        setWishlistTotalCount(wishlistRes.totalCount || (wishlistRes.items || []).length);
      }
    } catch (e) {
      console.warn('Error loading customer data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, searchPhone, user?.phone]);

  // Kiểm tra sản phẩm đã nằm trong Wishlist hay chưa
  const isWishlisted = useCallback(
    (medId: string) => {
      if (!medId) return false;
      return wishlistItems.some((it) => (it.id || it._id) === medId);
    },
    [wishlistItems]
  );

  // Thêm / Xóa nhanh sản phẩm yêu thích (Optimistic UI)
  const toggleWishlist = async (med: any) => {
    const medId = med.id || (med as any)._id || (med as any).sku;
    if (!medId) return;

    const exists = isWishlisted(medId);
    if (exists) {
      setWishlistItems((prev) => prev.filter((it) => (it.id || it._id) !== medId));
      setWishlistTotalCount((prev) => Math.max(0, prev - 1));
      showToast.success('Đã bỏ yêu thích', `Đã xóa "${med.name}" khỏi danh sách`);
      await ApiService.removeFromWishlist(medId);
    } else {
      const newItem = {
        id: medId,
        _id: medId,
        name: med.name,
        price: med.price || 0,
        unit: med.unit || 'Hộp',
        image: med.image || '',
        active: med.active || med.active_ingredient || '',
        category: med.category || 'Dược phẩm',
        stock: med.stock !== undefined ? med.stock : 999,
      };
      setWishlistItems((prev) => [newItem, ...prev]);
      setWishlistTotalCount((prev) => prev + 1);
      showToast.success('Đã yêu thích', `Đã thêm "${med.name}" vào yêu thích!`);
      await ApiService.addToWishlist(med);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tự động làm tươi Wishlist và Giỏ hàng mỗi khi màn hình CustomerScreen được focus lại
  useFocusEffect(
    useCallback(() => {
      ApiService.getWishlist()
        .then((res) => {
          if (res) {
            setWishlistItems(res.items || []);
            setWishlistTotalCount(res.totalCount || (res.items || []).length);
          }
        })
        .catch(() => {});

      AsyncStorage.getItem(GUEST_CART_KEY)
        .then((cached) => {
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                setCart(parsed);
              }
            } catch {}
          }
        })
        .catch(() => {});
    }, [])
  );

  // ─── 5 Recent Searches & Guest Cart Persistence ────────────────────────────
  const RECENT_SEARCHES_KEY = '@abc_recent_searches_v1';
  const GUEST_CART_KEY = '@abc_guest_cart';
  const SELECTED_BRANCH_KEY = '@abc_selected_branch';

  useEffect(() => {
    // Load 5 recent search keywords
    AsyncStorage.getItem(RECENT_SEARCHES_KEY).then((data) => {
      if (data) {
        try {
          const list = JSON.parse(data);
          if (Array.isArray(list)) setRecentSearches(list.slice(0, 5));
        } catch {}
      }
    });

    // Load guest cart
    AsyncStorage.getItem(GUEST_CART_KEY).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCart(parsed);
          }
        } catch {}
      }
    });

    // Load persisted selected branch
    AsyncStorage.getItem(SELECTED_BRANCH_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed && (parsed.id || parsed._id)) {
            setSelectedBranch(parsed);
          }
        } catch {}
      }
    });
  }, []);

  const handleSelectBranch = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    AsyncStorage.setItem(SELECTED_BRANCH_KEY, JSON.stringify(branch)).catch(() => {});
    showToast.success('Đã chọn cơ sở', `Đang kết nối kho hàng cơ sở ${branch.name}`);
    setShowBranchModal(false);
  }, []);

  // Ref điều khiển cuộn trang chủ mượt mà
  const mainScrollRef = useRef<any>(null);

  // Lọc danh sách thuốc gợi ý phù hợp theo từng chủ đề blog y khoa từ dịch vụ
  const seasonalMedicines = useMemo(() => {
    return filterRecommendedMedicines(medicines, seasonalCategory);
  }, [medicines, seasonalCategory]);

  // Top 3 sản phẩm bán chạy nhất kèm chỉ số bán hàng nổi bật
  const topBestSellers = useMemo(() => {
    return getTopBestSellers(medicines, 3);
  }, [medicines]);

  // Xử lý khi người dùng ấn nút "Xem tất cả" tại khối Sản Phẩm Bán Chạy
  const handleViewAllBestSellers = useCallback(() => {
    setSelectedCategory('ALL');
    mainScrollRef.current?.scrollTo({ y: 1550, animated: true });
    showToast.info('Xem tất cả', 'Đang chuyển đến danh sách sản phẩm chính hãng');
  }, []);

  const handleSaveSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 5);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const handleClearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  // Đồng bộ giỏ hàng vào storage, xóa bỏ giỏ khi rỗng để tránh bug hồi sinh giỏ hàng ma
  useEffect(() => {
    if (cart.length > 0) {
      AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart)).catch(() => {});
    } else {
      AsyncStorage.removeItem(GUEST_CART_KEY).catch(() => {});
    }
  }, [cart]);

  // Voice recording simulation timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Cart operations with stock limit checking
  const addToCart = (med: Medicine) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.medicine.id === med.id);
      const currentQty = idx >= 0 ? prev[idx].quantity : 0;
      const maxStock = med.stock || (med as any).totalBranchStock || 999;
      if (currentQty + 1 > maxStock) {
        showToast.info('Tồn kho có hạn', `Chỉ còn ${maxStock} sản phẩm khả dụng trong kho.`);
        return prev;
      }
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: currentQty + 1 };
        return next;
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const updateQuantity = (medId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine.id === medId) {
            const nextQty = item.quantity + delta;
            const maxStock = item.medicine.stock || (item.medicine as any).totalBranchStock || 999;
            if (delta > 0 && nextQty > maxStock) {
              showToast.info('Tồn kho có hạn', `Chỉ còn ${maxStock} sản phẩm khả dụng trong kho.`);
              return item;
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.medicine.price * i.quantity, 0);
  const discount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if ((appliedVoucher as any).discount != null) {
      return Number((appliedVoucher as any).discount);
    }
    const val = Number(appliedVoucher.discountValue ?? 0);
    const type = appliedVoucher.discountType ?? 'FIXED_AMOUNT';
    if (type === 'PERCENT' || type === 'PERCENTAGE') {
      let d = (subtotal * val) / 100;
      const maxDisc = Number(
        (appliedVoucher as any).maxDiscountValue ??
        (appliedVoucher as any).maxDiscount ??
        0
      );
      if (maxDisc > 0 && d > maxDisc) d = maxDisc;
      return d;
    }
    return Math.min(val, subtotal);
  }, [appliedVoucher, subtotal]);
  const finalTotal = Math.max(0, subtotal - discount);

  const applyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      showToast.info('Thông báo', 'Vui lòng nhập mã voucher.');
      return;
    }
    try {
      const res = await ApiService.validateVoucher(code, subtotal);
      if (res?.success === true) {
        setAppliedVoucher({
          id: res.code || code,
          code: res.code || code,
          title: `Giảm ${res.discountType === 'PERCENTAGE' ? `${res.discountValue}%` : `${res.discountValue?.toLocaleString('vi-VN')} ₫`}`,
          description: `Được giảm ${res.discount?.toLocaleString('vi-VN') || 0} ₫`,
          discountType: res.discountType,
          discountValue: res.discountValue,
          maxDiscountValue: res.maxDiscountValue,
          discount: res.discount,
        } as any);
        setVoucherCodeInput(code);
        showToast.success('Thành công', `Đã áp dụng mã giảm giá ${res.code || code}!`);
      } else {
        // Fallback to local search if offline or network error
        const found = vouchers.find((v) => v.code.toUpperCase() === code);
        if (found) {
          if (found.minOrderValue && subtotal < found.minOrderValue) {
            showToast.info(
              'Chưa đủ điều kiện',
              `Voucher ${code} chỉ áp dụng cho đơn từ ${found.minOrderValue.toLocaleString('vi-VN')} ₫. Giỏ hàng hiện tại: ${subtotal.toLocaleString('vi-VN')} ₫.`
            );
            return;
          }
          setAppliedVoucher(found);
          setVoucherCodeInput(code);
          showToast.success('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
        } else {
          showToast.error('Voucher không hợp lệ', res?.message || 'Mã voucher không tồn tại hoặc đã hết hạn.');
        }
      }
    } catch {
      const found = vouchers.find((v) => v.code.toUpperCase() === code);
      if (found) {
        setAppliedVoucher(found);
        setVoucherCodeInput(code);
        showToast.success('Thành công', `Đã áp dụng mã giảm giá ${code}!`);
      } else {
        showToast.error('Lỗi', 'Không thể xác thực mã giảm giá.');
      }
    }
  };

  // Barcode Scan for Customer (quét vỏ hộp thuốc tại nhà)
  const handleScanBarcode = async (code: string) => {
    setShowScanner(false);
    try {
      const res = await ApiService.getByBarcode(code);
      if (res && res.medicine) {
        openMedicineDetail(res.medicine);
        showToast.success('Tìm Thấy Thuốc', `Đã nhận diện: ${res.medicine.name}`);
      } else {
        const local = medicines.find(
          (m) =>
            m.barcode === code ||
            m.sku === code ||
            m.name.toLowerCase().includes(code.toLowerCase()) ||
            m.units?.some((u) => u.barcode === code)
        );
        if (local) {
          openMedicineDetail(local);
          showToast.success('Tìm Thấy Thuốc', `Đã nhận diện: ${local.name}`);
        } else {
          setSearchQuery(code);
          showToast.info('Thông báo', `Không tìm thấy chính xác thuốc với mã: ${code}. Đã điền vào ô tìm kiếm.`);
        }
      }
    } catch (e) {
      console.warn('Lỗi quét barcode:', e);
      showToast.error('Lỗi', 'Không thể kết nối máy chủ tra cứu mã vạch.');
    }
  };

  // AI Chat Logic
  const handleSendChat = async (overrideText?: string) => {
    const userMsg = overrideText || chatInput.trim();
    if (!userMsg) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);

    setAiThinking(true);
    try {
      const res = await ApiService.getTextPrescription(userMsg);
      setAiThinking(false);

      // Find matching medicines in local catalog
      const matchedMeds = medicines.filter(
        (m) =>
          userMsg.toLowerCase().includes(m.name.toLowerCase()) ||
          userMsg.toLowerCase().includes(m.active.toLowerCase()) ||
          (userMsg.includes('đau') && m.category.includes('Giảm đau')) ||
          (userMsg.includes('ho') && m.category.includes('Hô hấp')) ||
          (userMsg.includes('kháng sinh') && m.category.includes('Kháng sinh'))
      ).slice(0, 2);

      if (res?.advice || res?.diagnosis) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `${res.diagnosis ? `📋 Chẩn đoán sơ bộ: ${res.diagnosis}\n\n` : ''}${res.advice || 'Bạn nên dùng các thuốc hỗ trợ giảm triệu chứng, uống nhiều nước ấm và nghỉ ngơi hợp lý.'}`,
            recommendedMeds: matchedMeds.length > 0 ? matchedMeds : undefined,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `Dựa trên triệu chứng "${userMsg}":\n• Nếu đau đầu, hạ sốt: Có thể dùng Panadol Extra (1 viên khi sốt > 38.5°C).\n• Nếu đau họng, ho nhẹ: Ngậm Strepsils Cool giảm đau rát họng.\n• Uống nhiều nước, giữ ấm cơ thể. Nếu triệu chứng kéo dài trên 3 ngày bạn hãy đi khám bác sĩ nhé!`,
            recommendedMeds: matchedMeds.length > 0 ? matchedMeds : undefined,
          },
        ]);
      }
    } catch {
      setAiThinking(false);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Xin lỗi, hệ thống AI tư vấn đang bận. Bạn có thể liên hệ trực tiếp Dược sĩ qua hotline nhé!',
        },
      ]);
    }
  };

  const toggleVoiceRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
    } else {
      setIsRecording(false);
      // Simulate speech to text transcription
      const voicePrompts = [
        'Tôi bị đau họng, ho khan và sốt nhẹ từ hôm qua',
        'Tôi bị cảm cúm nhức đầu và nghẹt mũi',
        'Tôi cần mua thuốc đau dạ dày trào ngược',
      ];
      const randomPrompt = voicePrompts[Math.floor(Math.random() * voicePrompts.length)];
      handleSendChat(`🎙️ [Giọng nói]: ${randomPrompt}`);
    }
  };

  // Advanced Filter & Sort for Store
  const filteredMedicines = useMemo(() => {
    let list = medicines.filter((m) => {
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name && m.name.toLowerCase().includes(q);
        const matchesActive =
          (m.active && m.active.toLowerCase().includes(q)) ||
          ((m as any).active_ingredient && (m as any).active_ingredient.toLowerCase().includes(q));
        const matchesCat = m.category && m.category.toLowerCase().includes(q);
        if (!matchesName && !matchesActive && !matchesCat) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory && !m.category.includes(selectedCategory)) {
        return false;
      }
      // Rx prescription filter
      if (selectedRxFilter === 'RX' && !m.isRx) return false;
      if (selectedRxFilter === 'OTC' && m.isRx) return false;

      // Price range filter
      const price = m.price || 0;
      if (selectedPriceFilter === 'UNDER_100' && price >= 100000) return false;
      if (selectedPriceFilter === '100_300' && (price < 100000 || price > 300000)) return false;
      if (selectedPriceFilter === 'OVER_300' && price <= 300000) return false;

      return true;
    });

    if (sortBy === 'PRICE_ASC') {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'PRICE_DESC') {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [medicines, searchQuery, selectedCategory, selectedRxFilter, selectedPriceFilter, sortBy]);

  // Status Filter for Orders
  const filteredOrders = useMemo(() => {
    if (orderStatusTab === 'ALL') return orders;
    return orders.filter((ord) => {
      const st = String(ord.status || '').toUpperCase();
      const paySt = String(ord.paymentStatus || '').toUpperCase();
      if (orderStatusTab === 'PENDING') {
        return st === 'PENDING' || st === 'SUBMITTED' || paySt === 'PENDING';
      }
      if (orderStatusTab === 'SHIPPING') {
        return st === 'DELIVERING' || st === 'SHIPPING' || st === 'PROCESSING' || st === 'CONFIRMED';
      }
      if (orderStatusTab === 'COMPLETED') {
        return st === 'COMPLETED' || st === 'DELIVERED' || paySt === 'PAID';
      }
      if (orderStatusTab === 'CANCELLED') {
        return st === 'CANCELLED' || st === 'FAILED' || paySt === 'CANCELLED';
      }
      return true;
    });
  }, [orders, orderStatusTab]);

  // Thống kê đơn hàng và định dạng thông tin tài khoản chuẩn Long Châu
  const orderCounts = useMemo(
    () => CustomerAccountService.getOrderStatusCounts(orders),
    [orders]
  );

  const formattedProfile = useMemo(
    () => CustomerAccountService.formatUserDisplay(user, loyaltyInfo),
    [user, loyaltyInfo]
  );

  const healthSummary = useMemo(
    () => CustomerAccountService.getHealthSummaryBadges(clinicalSafety),
    [clinicalSafety]
  );

  // Map category keyword sang Ionicons icon
  const getCategoryIcon = (label: string): keyof typeof Ionicons.glyphMap => {
    const l = label.toLowerCase();
    if (l === 'tất cả') return 'apps';
    if (l.includes('đau') || l.includes('sốt') || l.includes('hạ nhiệt')) return 'thermometer';
    if (l.includes('tiêu hóa') || l.includes('dạ dày') || l.includes('gan')) return 'nutrition';
    if (l.includes('hô hấp') || l.includes('ho') || l.includes('phổi')) return 'cloudy';
    if (l.includes('vitamin') || l.includes('bổ sung') || l.includes('khoáng')) return 'leaf';
    if (l.includes('cơ') || l.includes('xương') || l.includes('khớp')) return 'body';
    if (l.includes('tim') || l.includes('huyết áp') || l.includes('mạch')) return 'heart';
    if (l.includes('da') || l.includes('derm') || l.includes('ngoài da')) return 'water';
    if (l.includes('mắt') || l.includes('nhỏ mắt')) return 'eye';
    if (l.includes('tai') || l.includes('mũi') || l.includes('họng')) return 'ear';
    if (l.includes('kháng sinh') || l.includes('antibio')) return 'shield';
    if (l.includes('cá nhân') || l.includes('vệ sinh') || l.includes('chăm sóc')) return 'sparkles';
    if (l.includes('miếng dán') || l.includes('dán')) return 'bandage';
    if (l.includes('dầu') || l.includes('xoa') || l.includes('bôi')) return 'flask';
    return 'medical';
  };

  const cartTotalCount = cart.reduce((a, b) => a + b.quantity, 0);
  const hasActiveFilter = selectedRxFilter !== 'ALL' || selectedPriceFilter !== 'ALL';
  const activeFilterCount = (selectedRxFilter !== 'ALL' ? 1 : 0) + (selectedPriceFilter !== 'ALL' ? 1 : 0);

  // Danh mục menu Drawer trượt trái chuẩn Apple iOS
  const drawerMenuItems: DrawerMenuItem[] = useMemo(
    () => [
      {
        id: 'store',
        label: 'Trang chủ mua sắm',
        iconName: 'home-outline',
        onPress: () => {
          setShowDrawer(false);
          setActiveTab('STORE');
        },
        active: activeTab === 'STORE',
      },
      {
        id: 'rewards',
        label: 'Điểm thưởng ABC Club',
        iconName: 'gift-outline',
        badge: loyaltyInfo?.points ? `${loyaltyInfo.points}đ` : 'Ưu đãi',
        badgeVariant: 'warning',
        onPress: () => {
          setShowDrawer(false);
          setActiveTab('REWARDS');
        },
        active: activeTab === 'REWARDS',
      },
      {
        id: 'passport',
        label: 'Sổ sức khỏe số (Health QR)',
        iconName: 'qr-code-outline',
        badge: 'AI Safe',
        badgeVariant: 'success',
        onPress: () => {
          setShowDrawer(false);
          setIsOnboardingHealth(false);
          setShowPassportModal(true);
        },
      },
      {
        id: 'wishlist',
        label: 'Sản phẩm yêu thích',
        iconName: 'heart-outline',
        badge: wishlistTotalCount > 0 ? `${wishlistTotalCount}` : undefined,
        badgeVariant: 'danger',
        onPress: () => {
          setShowDrawer(false);
          navigation.navigate('CustomerWishlistScreen', {
            onAddToCart: (item: any) => addToCart(item),
          });
        },
      },
      {
        id: 'reminder',
        label: 'Lịch nhắc uống thuốc',
        iconName: 'alarm-outline',
        onPress: () => {
          setShowDrawer(false);
          navigation.navigate('MedicineReminderScreen');
        },
      },
      {
        id: 'branches',
        label: 'Hệ thống nhà thuốc GPP',
        iconName: 'storefront-outline',
        onPress: () => {
          setShowDrawer(false);
          setShowBranchModal(true);
        },
      },
      {
        id: 'ai_chat',
        label: 'Tư vấn Dược sĩ AI 24/7',
        iconName: 'chatbubbles-outline',
        badge: '24/7',
        badgeVariant: 'info',
        onPress: () => {
          setShowDrawer(false);
          setActiveTab('AI_CHAT');
        },
        active: activeTab === 'AI_CHAT',
      },
      {
        id: 'cart',
        label: 'Giỏ hàng của tôi',
        iconName: 'cart-outline',
        badge: cartTotalCount > 0 ? `${cartTotalCount}` : undefined,
        badgeVariant: 'info',
        onPress: () => {
          setShowDrawer(false);
          setActiveTab('CART');
        },
        active: activeTab === 'CART',
      },
      {
        id: 'account',
        label: 'Tài khoản & Đơn mua',
        iconName: 'person-circle-outline',
        onPress: () => {
          setShowDrawer(false);
          setActiveTab('ACCOUNT');
        },
        active: activeTab === 'ACCOUNT',
      },
    ],
    [activeTab, loyaltyInfo, wishlistTotalCount, cartTotalCount, navigation]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Modern Medical Sky Blue Header (Chuẩn FPT Long Châu Tối Giản) ── */}
      {activeTab !== 'ACCOUNT' && activeTab !== 'ORDERS' && activeTab !== 'REWARDS' && (
        <LinearGradient
          colors={['#0369A1', '#0284C7', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.9 }}
          style={styles.customHeader}
        >
          <StatusBar barStyle="light-content" />

          {/* HÀNG 1: Brand & Vị trí giao hàng (Trái) + 4 Nút chức năng tròn 34px tối giản (Phải) */}
          <View style={styles.headerTopRow}>
            {/* Cụm Bên Trái: Nút Menu Hamburger + Thương Hiệu ABC Pharmacy Tối Giản */}
            <View style={styles.headerLeftGroup}>
              <AnimatedTouchable
                onPress={() => setShowDrawer(true)}
                style={styles.headerHamburgerBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="menu" size={24} color="#FFFFFF" />
              </AnimatedTouchable>

              {/* Tên thương hiệu ABC Pharmacy Tối Giản Căn Giữa Đẹp Mắt */}
              <View style={styles.brandTitleRow}>
                <View style={styles.brandIconCircle}>
                  <Ionicons name="medkit" size={13} color="#0284C7" />
                </View>
                <Text style={styles.brandTitleText}>ABC PHARMACY</Text>
              </View>
            </View>

            {/* Cụm Bên Phải: 4 Nút Tròn 34px Đồng Nhất - Tối Giản & Hiện Đại */}
            <View style={styles.headerActionRow}>
              {/* 1. Sổ Sức Khỏe Số QR */}
              {user && (
                <AnimatedTouchable
                  onPress={() => {
                    setIsOnboardingHealth(false);
                    setShowPassportModal(true);
                  }}
                  style={styles.headerRoundBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                </AnimatedTouchable>
              )}

              {/* 2. Chuông Thông Báo (kèm chấm đỏ khi có tin mới) */}
              <AnimatedTouchable
                onPress={() => navigation.navigate('NotificationListScreen')}
                style={styles.headerRoundBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
                {unreadCount > 0 && <View style={styles.headerNotificationDot} />}
              </AnimatedTouchable>

              {/* 3. Giỏ Hàng Nhanh (kèm badge đếm số lượng thuốc) */}
              <AnimatedTouchable
                onPress={() => setActiveTab('CART')}
                style={styles.headerRoundBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="cart-outline" size={19} color="#FFFFFF" />
                {cartTotalCount > 0 && (
                  <View style={styles.headerCartBadge}>
                    <Text style={styles.headerCartBadgeText}>
                      {cartTotalCount > 99 ? '99+' : cartTotalCount}
                    </Text>
                  </View>
                )}
              </AnimatedTouchable>

              {/* 4. Tài Khoản / Đăng Nhập Nút Tròn Tinh Tế */}
              {user ? (
                <AnimatedTouchable
                  onPress={() => setActiveTab('ACCOUNT')}
                  style={styles.headerAvatarCircle}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="person" size={16} color="#0284C7" />
                </AnimatedTouchable>
              ) : (
                <AnimatedTouchable
                  onPress={() => navigation.navigate('LoginScreen')}
                  style={styles.headerRoundBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                </AnimatedTouchable>
              )}
            </View>
          </View>

          {/* HÀNG 2: Thanh Tìm Kiếm - Phân luồng: Tab Voucher tìm Voucher, Tab Store tìm Thuốc */}
          {(activeTab === 'VOUCHERS') ? (
            <View style={styles.floatingSearchContainer}>
              <View style={styles.floatingSearchBox}>
                <Ionicons name="pricetag-outline" size={17} color="#0284C7" style={styles.searchIcon} />
                <TextInput
                  style={styles.voucherSearchTextInput}
                  placeholder="Nhập mã voucher, tìm ưu đãi..."
                  placeholderTextColor="#94A3B8"
                  value={voucherSearchInput}
                  onChangeText={setVoucherSearchInput}
                  autoCapitalize="characters"
                  returnKeyType="search"
                />
                {voucherSearchInput.length > 0 ? (
                  <AnimatedTouchable
                    onPress={() => setVoucherSearchInput('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </AnimatedTouchable>
                ) : (
                  <View style={styles.applyVoucherPillBadge}>
                    <Text style={styles.applyVoucherPillText}>Voucher</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <AnimatedTouchable
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.92}
              style={styles.floatingSearchContainer}
            >
              <View style={styles.floatingSearchBox}>
                <Ionicons name="search" size={17} color="#0284C7" style={styles.searchIcon} />
                <Text style={styles.floatingSearchPlaceholder} numberOfLines={1}>
                  {searchQuery || 'Tìm tên thuốc, triệu chứng, TPCN...'}
                </Text>
                <View style={styles.searchActionGroup}>
                  {/* Mic Tư Vấn Dược Sĩ AI */}
                  <AnimatedTouchable
                    onPress={() => setActiveTab('AI_CHAT')}
                    style={styles.searchSubBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons name="mic-outline" size={18} color="#0284C7" />
                  </AnimatedTouchable>

                  {/* Vách ngăn mỏng divider */}
                  <View style={styles.searchDivider} />

                  {/* Quét Mã Vạch Thuốc & Đơn Hàng */}
                  <AnimatedTouchable
                    onPress={() => setShowScanner(true)}
                    style={styles.searchSubBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons name="barcode-outline" size={18} color="#0284C7" />
                  </AnimatedTouchable>
                </View>
              </View>
            </AnimatedTouchable>
          )}
        </LinearGradient>
      )}

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          (activeTab === 'ACCOUNT' || activeTab === 'ORDERS' || activeTab === 'REWARDS' || activeTab === 'VOUCHERS') && { padding: 0 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284C7']} />}
      >
        {/* TAB 1: STORE - Master Tri-Pharmacy Landing Page */}
        <View style={{ display: activeTab === 'STORE' ? 'flex' : 'none' }}>
          <View>
            {/* 1. Interactive Callout: Dược Sĩ AI & Tư Vấn 24/7 (Long Châu & An Khang) */}
            <View style={styles.consultantCalloutCard}>
              <View style={styles.consultantCalloutLeft}>
                <View style={styles.consultantAvatarCircle}>
                  <Ionicons name="headset" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.consultantCalloutTitle}>
                    Dược Sĩ ABC & AI Sẵn Sàng 24/7
                  </Text>
                  <Text style={styles.consultantCalloutSub}>
                    Bạn cần hỏi về triệu chứng, đơn thuốc hay cách dùng thuốc an toàn?
                  </Text>
                </View>
              </View>
              <AnimatedTouchable
                onPress={() => setActiveTab('AI_CHAT')}
                style={styles.consultantCalloutBtn}
              >
                <Ionicons name="chatbubbles" size={15} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.consultantCalloutBtnText}>Tư vấn ngay</Text>
              </AnimatedTouchable>
            </View>

            {/* 2. Hai Thẻ Tiện Ích Chuẩn FPT Long Châu Tối Giản */}
            <View style={styles.twoPillarsRow}>
              <AnimatedTouchable
                onPress={() => setShowScanner(true)}
                style={[styles.pillarCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
              >
                <View style={[styles.pillarIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="barcode-outline" size={26} color="#0284C7" />
                </View>
                <Text style={styles.pillarTitle}>Tra cứu toa & Quét mã</Text>
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => navigation.navigate('MedicineReminderScreen')}
                style={[styles.pillarCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              >
                <View style={[styles.pillarIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="alarm" size={26} color="#16A34A" />
                </View>
                <Text style={[styles.pillarTitle, { color: '#15803D' }]}>Nhắc uống thuốc</Text>
              </AnimatedTouchable>
            </View>

            {/* 3. Lưới Hành Động Nhanh Chuẩn FPT Long Châu (Cỡ chữ to rõ, 1 dòng sạch sẽ, không chữ phụ rối mắt) */}
            <View style={styles.quickActionGridContainer}>
              {[
                { id: 'STORE', title: 'Tủ thuốc', icon: 'medkit', color: '#0284C7', bg: '#E0F2FE', action: () => { setSelectedCategory('ALL'); setSearchQuery(''); } },
                { id: 'AI_CHAT', title: 'Dược sĩ AI', icon: 'chatbubble-ellipses', color: '#0EA5E9', bg: '#E0F2FE', action: () => setActiveTab('AI_CHAT') },
                { id: 'REMINDER', title: 'Nhắc thuốc', icon: 'alarm', color: '#F59E0B', bg: '#FEF3C7', action: () => navigation.navigate('MedicineReminderScreen') },
                { id: 'SCAN', title: 'Quét mã', icon: 'barcode', color: '#8B5CF6', bg: '#EDE9FE', action: () => setShowScanner(true) },
                { id: 'BRANCHES', title: 'Nhà thuốc', icon: 'storefront', color: '#0EA5E9', bg: '#E0F2FE', action: () => setShowBranchModal(true) },
                { id: 'VOUCHERS', title: 'Săn voucher', icon: 'pricetags', color: '#EC4899', bg: '#FCE7F3', action: () => setActiveTab('VOUCHERS') },
                { id: 'HEALTH_PASSPORT', title: 'Sổ sức khỏe', icon: 'shield-checkmark', color: '#0D9488', bg: '#CCFBF1', action: () => { setIsOnboardingHealth(false); setShowPassportModal(true); } },
                { id: 'ORDERS', title: 'Đơn của tôi', icon: 'receipt', color: '#6366F1', bg: '#E0E7FF', action: () => setActiveTab('ORDERS') },
              ].map((item) => (
                <AnimatedTouchable
                  key={item.id}
                  onPress={item.action}
                  style={styles.quickGridItem}
                >
                  <View style={[styles.quickGridIconBox, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={25} color={item.color} />
                  </View>
                  <Text style={styles.quickGridTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            {/* 4. Banner Carousel Khuyến Mãi Tự Động Trượt Chuẩn FPT Long Châu */}
            <HomeBannerCarousel onSelectBanner={handleSelectBanner} />

            {/* 5. Khung Giờ Vàng Flash Sale Full Màn Hình (Edge-to-Edge) Chuẩn E-Commerce Y Tế */}
            <View style={styles.flashSaleFullSection}>
              {/* Nền Gradient mờ nhẹ y tế ấm áp */}
              <LinearGradient
                colors={['#FFF5F5', '#FFF1F2', '#FEF2F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.flashSaleGradientInner}
              >
                {/* 5.1. Header Khung Giờ Săn Sale (Tabs Khung Giờ) */}
                <View style={styles.flashSlotTabsRow}>
                  <AnimatedTouchable
                    onPress={() => setFlashSaleSlot('SLOT_1')}
                    style={[styles.flashSlotTab, flashSaleSlot === 'SLOT_1' && styles.flashSlotTabActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.flashSlotTime, flashSaleSlot === 'SLOT_1' && styles.flashSlotTimeActive]}>
                      08:00 - 12:00
                    </Text>
                    <View style={styles.flashStatusBadgeRow}>
                      {flashSaleSlot === 'SLOT_1' && (
                        <Ionicons name="flame" size={12} color="#FFFFFF" style={{ marginRight: 2 }} />
                      )}
                      <Text style={[styles.flashSlotStatus, flashSaleSlot === 'SLOT_1' && styles.flashSlotStatusActive]}>
                        Đang diễn ra
                      </Text>
                    </View>
                  </AnimatedTouchable>

                  <AnimatedTouchable
                    onPress={() => setFlashSaleSlot('SLOT_2')}
                    style={[styles.flashSlotTab, flashSaleSlot === 'SLOT_2' && styles.flashSlotTabActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.flashSlotTime, flashSaleSlot === 'SLOT_2' && styles.flashSlotTimeActive]}>
                      12:00 - 18:00
                    </Text>
                    <Text style={[styles.flashSlotStatus, flashSaleSlot === 'SLOT_2' && styles.flashSlotStatusActive]}>
                      Sắp diễn ra
                    </Text>
                  </AnimatedTouchable>

                  <AnimatedTouchable
                    onPress={() => setFlashSaleSlot('SLOT_3')}
                    style={[styles.flashSlotTab, flashSaleSlot === 'SLOT_3' && styles.flashSlotTabActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.flashSlotTime, flashSaleSlot === 'SLOT_3' && styles.flashSlotTimeActive]}>
                      18:00 - 22:00
                    </Text>
                    <Text style={[styles.flashSlotStatus, flashSaleSlot === 'SLOT_3' && styles.flashSlotStatusActive]}>
                      Tối nay
                    </Text>
                  </AnimatedTouchable>
                </View>

                {/* 5.2. Thanh Tiêu Đề Flash Sale & Bộ Đếm Giờ Ngược Countdown */}
                <View style={styles.flashCountdownBar}>
                  <View style={styles.flashTitleGroup}>
                    <View style={styles.flashIconBadge}>
                      <Ionicons name="flash" size={15} color="#FFFFFF" />
                    </View>
                    <Text style={styles.flashSaleTitle}>FLASH SALE GIÁ TỐT</Text>
                  </View>

                  {/* Bộ Đếm Ngược Countdown */}
                  <FlashSaleCountdown />
                </View>

                {/* 5.3. Danh Sách Sản Phẩm Flash Sale Vuốt Ngang (To Rõ, Đẹp Mắt) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.flashProductsScroll}
                >
                  {(medicines.length > 0 ? medicines.slice(0, 8) : []).map((med, idx) => {
                    const originalPrice = Math.round((med.price || 50000) * 1.35);
                    const soldCount = 15 + (idx * 3);
                    const percentSold = Math.min(95, 60 + ((idx * 7) % 35));
                    return (
                      <AnimatedPressable
                        key={`flash-${med.id || idx}`}
                        onPress={() => openMedicineDetail(med)}
                        style={styles.flashCard}
                        pressedScale={0.97}
                      >
                        {/* Badge Giảm Giá Đỏ Cam Nổi Bật */}
                        <View style={styles.flashDiscountBadge}>
                          <Text style={styles.flashDiscountText}>-35%</Text>
                        </View>

                        {/* Nút Tim Yêu Thích Tròn Nhẹ Nhàng */}
                        <AnimatedTouchable
                          onPress={() => toggleWishlist(med)}
                          style={styles.flashWishlistBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isWishlisted(med.id || (med as any)._id) ? 'heart' : 'heart-outline'}
                            size={16}
                            color={isWishlisted(med.id || (med as any)._id) ? '#EF4444' : '#94A3B8'}
                          />
                        </AnimatedTouchable>

                        {/* Hộp Ảnh Thuốc Có Nền Sáng */}
                        <View style={styles.flashThumbBox}>
                          <Image
                            source={{ uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                            style={styles.flashThumb}
                            resizeMode="contain"
                          />
                        </View>

                        {/* Tên Thuốc To Rõ 2 Dòng */}
                        <Text style={styles.flashMedName} numberOfLines={2}>
                          {med.name}
                        </Text>

                        {/* Giá Gốc Gạch Ngang & Giá Flash Sale Siêu Tốt */}
                        <View style={styles.flashPriceRow}>
                          <Text style={styles.flashOriginalPrice}>
                            {originalPrice.toLocaleString('vi-VN')} ₫
                          </Text>
                          <Text style={[styles.flashSalePrice, TypographyTokens.tabularNums]}>
                            {med.price.toLocaleString('vi-VN')} ₫
                          </Text>
                        </View>

                        {/* Thanh Tiến Độ Đã Bán Lửa Nhiệt (Fire Stock Bar) */}
                        <View style={styles.flashStockBar}>
                          <View style={[styles.flashStockProgress, { width: `${percentSold}%` }]} />
                          <View style={styles.flashStockTextWrap}>
                            <Ionicons name="flame" size={11} color="#DC2626" style={{ marginRight: 2 }} />
                            <Text style={styles.flashStockText}>
                              Đã bán {soldCount}
                            </Text>
                          </View>
                        </View>

                        {/* Nút Chọn Mua Thân Thiện To Rõ */}
                        <AnimatedTouchable
                          onPress={() => {
                            addToCart(med);
                            showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                          }}
                          style={styles.flashAddToCartBtn}
                        >
                          <Ionicons name="cart" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.flashAddToCartText}>Chọn mua</Text>
                        </AnimatedTouchable>
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </LinearGradient>
            </View>

            {/* 6. Top 3 Sản Phẩm Bán Chạy Nhất (Layout To Đùng + Xem Tất Cả) - KHÔNG DÙNG BORDER */}
            <View style={styles.bestSellerSection}>
              {/* Header: Tiêu Đề Nổi Bật & Nút Xem Tất Cả */}
              <View style={styles.bestSellerHeaderRow}>
                <View style={styles.bestSellerTitleGroup}>
                  <View style={styles.bestSellerIconBadge}>
                    <Ionicons name="flame" size={17} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.bestSellerSectionTitle}>Sản Phẩm Bán Chạy</Text>
                    <Text style={styles.bestSellerSectionSub}>Top 3 sản phẩm tin dùng nhiều nhất tuần này</Text>
                  </View>
                </View>
                <AnimatedTouchable
                  onPress={handleViewAllBestSellers}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.bestSellerViewAllBtn}
                >
                  <Text style={styles.bestSellerViewAllText}>Xem tất cả</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </AnimatedTouchable>
              </View>

              {/* Danh Sách 3 Thẻ Sản Phẩm To Đùng */}
              <View style={styles.bestSellerCardsList}>
                {topBestSellers.map((med, index) => {
                  const wishlisted = isWishlisted(med.id);
                  return (
                    <AnimatedPressable
                      key={`bestseller-${med.id || index}`}
                      onPress={() => openMedicineDetail(med)}
                      style={styles.bestSellerBigCard}
                      pressedScale={0.98}
                    >
                      {/* Hàng Top Thẻ: Huy Hiệu TOP RANK & Nút Tim Yêu Thích */}
                      <View style={styles.bestSellerCardTopRow}>
                        <View style={[styles.bestSellerRankBadge, { backgroundColor: med.badgeColor }]}>
                          <Ionicons
                            name={med.rank === 1 ? 'trophy' : med.rank === 2 ? 'ribbon' : 'medal'}
                            size={12}
                            color="#FFFFFF"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.bestSellerRankBadgeText}>{med.badgeLabel}</Text>
                        </View>

                        <View style={styles.bestSellerTopRightGroup}>
                          <Text style={styles.bestSellerRatingText}>⭐ {med.ratingText}</Text>
                          <AnimatedTouchable
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleWishlist(med);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.bestSellerWishlistBtn}
                          >
                            <Ionicons
                              name={wishlisted ? 'heart' : 'heart-outline'}
                              size={18}
                              color={wishlisted ? '#EF4444' : '#94A3B8'}
                            />
                          </AnimatedTouchable>
                        </View>
                      </View>

                      {/* Thân Thẻ To Đùng: Ảnh lớn bên trái (110x110), Chi tiết bên phải */}
                      <View style={styles.bestSellerBodyRow}>
                        <View style={styles.bestSellerBigImageBox}>
                          <Image
                            source={{
                              uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                            }}
                            style={styles.bestSellerBigImage}
                            resizeMode="contain"
                          />
                          <View style={styles.bestSellerDiscountBadge}>
                            <Text style={styles.bestSellerDiscountText}>-{med.discountPercent}%</Text>
                          </View>
                        </View>

                        <View style={styles.bestSellerDetailsCol}>
                          <Text style={styles.bestSellerMedName} numberOfLines={2}>
                            {med.name}
                          </Text>

                          {med.active ? (
                            <View style={styles.bestSellerActiveRow}>
                              <Ionicons name="medical" size={11} color="#0284C7" style={{ marginRight: 4 }} />
                              <Text style={styles.bestSellerActiveText} numberOfLines={1}>
                                {med.active}
                              </Text>
                            </View>
                          ) : null}

                          <View style={styles.bestSellerCategoryUnitRow}>
                            <View style={styles.bestSellerCategoryTag}>
                              <Text style={styles.bestSellerCategoryTagText}>
                                {med.category || 'Thuốc chính hãng'}
                              </Text>
                            </View>
                            <Text style={styles.bestSellerUnitText}>{med.unit || 'Hộp'}</Text>
                          </View>

                          <View style={styles.bestSellerPriceBlock}>
                            <Text style={[styles.bestSellerPrice, TypographyTokens.tabularNums]}>
                              {med.price.toLocaleString('vi-VN')} ₫
                            </Text>
                            <Text style={[styles.bestSellerOriginalPrice, TypographyTokens.tabularNums]}>
                              {med.originalPrice.toLocaleString('vi-VN')} ₫
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Hàng Chân Thẻ: Thanh Nhiệt Tiến Độ Bán & Nút Chọn Mua To Rõ */}
                      <View style={styles.bestSellerFooterRow}>
                        <View style={styles.bestSellerProgressCol}>
                          <View style={styles.bestSellerProgressBarTrack}>
                            <View
                              style={[
                                styles.bestSellerProgressBarFill,
                                { width: `${med.progressPercent}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.bestSellerSoldText}>🔥 {med.soldCountText}</Text>
                        </View>

                        <AnimatedTouchable
                          onPress={(e) => {
                            e.stopPropagation();
                            addToCart(med);
                            showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                          }}
                          style={styles.bestSellerAddToCartBtn}
                        >
                          <Ionicons name="cart" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.bestSellerAddToCartText}>Chọn mua</Text>
                        </AnimatedTouchable>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {/* 7. Danh Mục Nổi Bật (Featured Categories) - Nền Phẳng, Không Border */}
            <View style={styles.categoryHeaderRow}>
              <View style={styles.categoryHeaderTitleGroup}>
                <Ionicons name="grid" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Danh Mục Nổi Bật</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {categoriesList.length} nhóm thuốc chuẩn hóa
              </Text>
            </View>

            <View style={styles.categoryGrid}>
              {categoriesList.map((c, idx) => (
                <AnimatedTouchable
                  key={c.id || `cat-${idx}`}
                  onPress={() => setSelectedCategory(c.id)}
                  style={[
                    styles.categoryGridItem,
                    selectedCategory === c.id && styles.categoryGridItemActive,
                  ]}
                >
                  <View style={[
                    styles.categoryGridIconBox,
                    selectedCategory === c.id && styles.categoryGridIconBoxActive,
                  ]}>
                    <Ionicons
                      name={getCategoryIcon(c.label)}
                      size={22}
                      color={selectedCategory === c.id ? '#FFFFFF' : '#0284C7'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryGridLabel,
                      selectedCategory === c.id && styles.categoryGridLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {c.label}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            {/* 8. Góc Sức Khỏe & Cẩm Nang Bệnh (Blog Y Khoa & Thuốc Gợi Ý) - KHÔNG DÙNG BORDER */}
            <View style={styles.healthBlogSection}>
              {/* Tiêu đề mục Blog */}
              <View style={styles.healthBlogHeaderRow}>
                <View style={styles.healthBlogTitleGroup}>
                  <View style={styles.healthBlogIconBadge}>
                    <Ionicons name="newspaper" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.healthBlogSectionTitle}>Góc Sức Khỏe & Cẩm Nang Bệnh</Text>
                </View>
                <AnimatedTouchable
                  onPress={() => setActiveTab('AI_CHAT')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.healthBlogMoreText}>Hỏi Dược Sĩ AI ›</Text>
                </AnimatedTouchable>
              </View>

              {/* Dải Tabs Phân Loại Chủ Đề Blog (Flat, Không Border) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.healthBlogTabsScroll}
              >
                {[
                  { id: 'FLU', label: 'Cảm cúm & Sốt' },
                  { id: 'STOMACH', label: 'Dạ dày & Tiêu hóa' },
                  { id: 'ALLERGY', label: 'Dị ứng & Da liễu' },
                  { id: 'IMMUNITY', label: 'Tăng sức đề kháng' },
                ].map((s) => (
                  <AnimatedTouchable
                    key={s.id}
                    onPress={() => setSeasonalCategory(s.id as any)}
                    style={[
                      styles.healthBlogTabPill,
                      seasonalCategory === s.id && styles.healthBlogTabPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.healthBlogTabPillText,
                        seasonalCategory === s.id && styles.healthBlogTabPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </AnimatedTouchable>
                ))}
              </ScrollView>

              {/* Thẻ Bài Viết Blog Y Khoa Lớn (Không Border, Shadow Mềm) */}
              <View style={styles.blogArticleCard}>
                <Image
                  source={{ uri: SEASONAL_BLOGS[seasonalCategory]?.imageUrl }}
                  style={styles.blogArticleImage}
                  resizeMode="cover"
                />
                <View style={styles.blogArticleContent}>
                  <View style={styles.blogCategoryBadge}>
                    <Text style={styles.blogCategoryBadgeText}>
                      {SEASONAL_BLOGS[seasonalCategory]?.categoryName}
                    </Text>
                  </View>

                  <Text style={styles.blogArticleTitle} numberOfLines={2}>
                    {SEASONAL_BLOGS[seasonalCategory]?.title}
                  </Text>

                  <View style={styles.blogAuthorRow}>
                    <Ionicons name="person-circle-outline" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                    <Text style={styles.blogAuthorText}>
                      {SEASONAL_BLOGS[seasonalCategory]?.author}
                    </Text>
                    <Text style={styles.blogDotSeparator}>•</Text>
                    <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 3 }} />
                    <Text style={styles.blogReadTimeText}>
                      {SEASONAL_BLOGS[seasonalCategory]?.readTime}
                    </Text>
                  </View>

                  <Text style={styles.blogArticleSummary}>
                    {SEASONAL_BLOGS[seasonalCategory]?.summary}
                  </Text>

                  <View style={styles.blogAdviceBox}>
                    <Text style={styles.blogAdviceLabel}>Lời khuyên dược sĩ:</Text>
                    <Text style={styles.blogAdviceText}>
                      {SEASONAL_BLOGS[seasonalCategory]?.advice}
                    </Text>
                  </View>

                  {/* Triệu chứng nhận biết (Không border) */}
                  <View style={styles.blogSymptomsRow}>
                    {SEASONAL_BLOGS[seasonalCategory]?.symptoms.map((symptom, si) => (
                      <View key={`sym-${si}`} style={styles.blogSymptomChip}>
                        <Ionicons name="checkmark-circle" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                        <Text style={styles.blogSymptomText}>{symptom}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* KHU VỰC THUỐC GỢI Ý ĐIỀU TRỊ / HỖ TRỢ (Không Border) */}
                <View style={styles.recommendedMedsSection}>
                  <View style={styles.recommendedMedsHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="medkit" size={15} color="#0284C7" style={{ marginRight: 6 }} />
                      <Text style={styles.recommendedMedsTitle}>Thuốc & Sản phẩm khuyên dùng</Text>
                    </View>
                    <Text style={styles.recommendedMedsCount}>
                      {seasonalMedicines.length} gợi ý
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recommendedMedsScroll}
                  >
                    {seasonalMedicines.map((med, idx) => (
                      <AnimatedPressable
                        key={`rec-${med.id || idx}`}
                        onPress={() => openMedicineDetail(med)}
                        style={styles.recommendedMedCard}
                        pressedScale={0.96}
                      >
                        <View style={styles.recommendedMedThumbBox}>
                          <Image
                            source={{ uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80' }}
                            style={styles.recommendedMedThumb}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={styles.recommendedMedName} numberOfLines={2}>
                          {med.name}
                        </Text>
                        <Text style={[styles.recommendedMedPrice, TypographyTokens.tabularNums]}>
                          {med.price.toLocaleString('vi-VN')} ₫
                        </Text>
                        <AnimatedTouchable
                          onPress={() => {
                            addToCart(med);
                            showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                          }}
                          style={styles.recommendedMedAddBtn}
                        >
                          <Ionicons name="cart-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                          <Text style={styles.recommendedMedAddText}>Chọn mua</Text>
                        </AnimatedTouchable>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Banner cảnh báo dữ liệu ngoại tuyến (nếu có) */}
            {isOfflineMode && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={styles.offlineBannerText}>
                  Đang hiển thị dữ liệu mẫu y tế. Kéo xuống để đồng bộ khi máy chủ sẵn sàng.
                </Text>
              </View>
            )}

            {/* 8. Filter & Sort bar */}
            <View style={styles.filterBarRow}>
              <AnimatedTouchable
                onPress={() => setShowFilterModal(true)}
                style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={hasActiveFilter ? '#0284C7' : '#475569'}
                />
                <Text style={[styles.filterBtnText, hasActiveFilter && styles.filterBtnTextActive]}>
                  Bộ lọc
                </Text>
                {hasActiveFilter && (
                  <View style={styles.filterActiveBadge}>
                    <Text style={styles.filterActiveBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => {
                  setSortBy((prev) => {
                    if (prev === 'DEFAULT') return 'PRICE_ASC';
                    if (prev === 'PRICE_ASC') return 'PRICE_DESC';
                    return 'DEFAULT';
                  });
                }}
                style={[styles.sortBtn, sortBy !== 'DEFAULT' && styles.activeSortBtn]}
              >
                <Ionicons
                  name={sortBy === 'PRICE_ASC' ? 'trending-up' : sortBy === 'PRICE_DESC' ? 'trending-down' : 'swap-vertical'}
                  size={14}
                  color={sortBy !== 'DEFAULT' ? '#0284C7' : '#64748B'}
                />
                <Text style={[styles.sortBtnText, sortBy !== 'DEFAULT' && styles.activeSortBtnText]}>
                  {sortBy === 'PRICE_ASC' ? 'Giá tăng dần' : sortBy === 'PRICE_DESC' ? 'Giá giảm dần' : 'Sắp xếp giá'}
                </Text>
              </AnimatedTouchable>
            </View>

            {/* 9. Danh Sách Sản Phẩm Thuốc Chính Hãng */}
            <View style={styles.productListHeader}>
              <Text style={styles.sectionTitle}>
                Sản Phẩm Thuốc & Dược Phẩm ({filteredMedicines.length})
              </Text>
            </View>

            {refreshing && medicines.length === 0 ? (
              <ClinicalMedicineSkeletonGrid count={4} />
            ) : (
              <>
                {filteredMedicines.slice(0, visibleMedicineCount).map((med, idx) => (
                  <View
                    key={med.id || (med as any)._id || (med as any).sku || `med-${idx}`}
                    style={styles.productCardWrapper}
                  >
                    <View style={styles.productCard}>
                      <AnimatedPressable
                        onPress={() => openMedicineDetail(med)}
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        pressedScale={0.98}
                      >
                        <Image
                          source={{ uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                          style={styles.productThumb}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={styles.productName} numberOfLines={2}>{med.name}</Text>
                            {med.isRx ? (
                              <View style={styles.rxBadge}>
                                <Text style={styles.rxBadgeText}>Rx</Text>
                              </View>
                            ) : (
                              <View style={styles.otcBadge}>
                                <Text style={styles.otcBadgeText}>OTC</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.productActive} numberOfLines={1}>
                            {med.active || med.active_ingredient || 'Đang cập nhật hoạt chất'}
                          </Text>
                          <Text style={[styles.productPrice, TypographyTokens.tabularNums]}>
                            {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                          </Text>
                        </View>
                      </AnimatedPressable>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AnimatedPressable
                          onPress={() => toggleWishlist(med)}
                          style={[
                            styles.wishlistCardBtn,
                            isWishlisted(med.id || (med as any)._id) && styles.wishlistCardBtnActive,
                          ]}
                          pressedScale={0.88}
                        >
                          <Ionicons
                            name={isWishlisted(med.id || (med as any)._id) ? 'heart' : 'heart-outline'}
                            size={18}
                            color={isWishlisted(med.id || (med as any)._id) ? '#EF4444' : '#94A3B8'}
                          />
                        </AnimatedPressable>

                        <AnimatedPressable
                          onPress={() => {
                            addToCart(med);
                            showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                          }}
                          style={styles.addToCartBtn}
                          pressedScale={0.90}
                        >
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        </AnimatedPressable>
                      </View>
                    </View>
                  </View>
                ))}

                {filteredMedicines.length > visibleMedicineCount && (
                  <TouchableOpacity
                    onPress={() => setVisibleMedicineCount((prev) => prev + 24)}
                    style={styles.loadMoreMedicinesBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreMedicinesText}>
                      Xem thêm ({filteredMedicines.length - visibleMedicineCount} sản phẩm khác)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#0284C7" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* 10. Bốn Cam Kết Vàng Dịch Vụ Y Tế (FPT Long Châu Footer) */}
            <View style={styles.trustFooterBox}>
              <View style={styles.trustGrid}>
                <View style={styles.trustItem}>
                  <View style={styles.trustIconCircle}>
                    <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.trustTitle}>Thuốc chính hãng</Text>
                  <Text style={styles.trustSub}>100% chuẩn GPP Bộ Y Tế</Text>
                </View>

                <View style={styles.trustItem}>
                  <View style={styles.trustIconCircle}>
                    <Ionicons name="refresh-circle" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.trustTitle}>Đổi trả trong 30 ngày</Text>
                  <Text style={styles.trustSub}>Kể từ ngày mua hàng</Text>
                </View>

                <View style={styles.trustItem}>
                  <View style={styles.trustIconCircle}>
                    <Ionicons name="ribbon" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.trustTitle}>Dược sĩ tư vấn</Text>
                  <Text style={styles.trustSub}>Chuyên môn đại học 24/7</Text>
                </View>

                <View style={styles.trustItem}>
                  <View style={styles.trustIconCircle}>
                    <Ionicons name="bicycle" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.trustTitle}>Giao siêu tốc 2H</Text>
                  <Text style={styles.trustSub}>Giao nhanh tận nhà</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* TAB 4 (TRƯỚC ĐÂY LÀ TAB 2): CART - GIỎ HÀNG TỐI GIẢN UI/UX */}
        <View style={{ display: activeTab === 'CART' ? 'flex' : 'none' }}>
          <View>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyCartTitle}>Giỏ hàng của bạn đang trống</Text>
                <Text style={styles.emptyCartSub}>Hãy chọn các loại dược phẩm cần thiết từ Cửa hàng.</Text>
                <AnimatedTouchable
                  onPress={() => setActiveTab('STORE')}
                  style={styles.emptyCartExploreBtn}
                >
                  <Ionicons name="storefront-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyCartExploreText}>Khám Phá Nhà Thuốc Ngay</Text>
                </AnimatedTouchable>
              </View>
            ) : (
              <>
                <View style={styles.cartHeaderBar}>
                  <Text style={styles.sectionTitle}>Giỏ Hàng Của Bạn ({cart.length})</Text>
                  <AnimatedTouchable onPress={() => setCart([])}>
                    <Text style={styles.clearCartText}>Xóa tất cả</Text>
                  </AnimatedTouchable>
                </View>

                {cart.map((item, idx) => (
                  <View key={item.medicine.id || (item.medicine as any)._id || `cart-${idx}`} style={styles.cartCardMinimal}>
                    <Image
                      source={{ uri: item.medicine.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                      style={styles.cartThumbMinimal}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cartItemNameMinimal} numberOfLines={2}>{item.medicine.name}</Text>
                      <Text style={styles.cartItemPriceMinimal}>
                        {item.medicine.price.toLocaleString('vi-VN')} ₫ <Text style={styles.cartItemUnitText}>/ {item.medicine.unit || 'Hộp'}</Text>
                      </Text>
                    </View>

                    <View style={styles.cartRightActions}>
                      <View style={styles.qtyCapsule}>
                        <AnimatedTouchable
                          onPress={() => updateQuantity(item.medicine.id, -1)}
                          style={styles.qtyCapsuleBtn}
                        >
                          <Ionicons name="remove" size={14} color="#334155" />
                        </AnimatedTouchable>
                        <Text style={styles.qtyCapsuleVal}>{item.quantity}</Text>
                        <AnimatedTouchable
                          onPress={() => updateQuantity(item.medicine.id, 1)}
                          style={styles.qtyCapsuleBtn}
                        >
                          <Ionicons name="add" size={14} color="#334155" />
                        </AnimatedTouchable>
                      </View>

                      <AnimatedTouchable
                        onPress={() => removeFromCart(item.medicine.id)}
                        style={styles.cartDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </AnimatedTouchable>
                    </View>
                  </View>
                ))}

                {/* Voucher input & Phím tắt xem Điểm Thưởng */}
                <View style={styles.voucherBoxMinimal}>
                  <TextInput
                    style={styles.voucherInputMinimal}
                    placeholder="Nhập mã ưu đãi (PHARMA10...)"
                    placeholderTextColor="#94A3B8"
                    value={voucherCodeInput}
                    onChangeText={setVoucherCodeInput}
                    autoCapitalize="characters"
                  />
                  <AnimatedTouchable onPress={() => applyVoucher()} style={styles.applyVoucherBtnMinimal}>
                    <Text style={styles.applyVoucherText}>ÁP DỤNG</Text>
                  </AnimatedTouchable>
                </View>

                {/* Phím tắt xem Điểm thưởng & Kho Voucher */}
                <AnimatedTouchable
                  onPress={() => setActiveTab('REWARDS')}
                  style={styles.rewardsShortcutBar}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="gift-outline" size={16} color="#0284C7" />
                    <Text style={styles.rewardsShortcutText}>
                      Kho Voucher & Điểm Thưởng của bạn ({vouchers.length} ưu đãi)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </AnimatedTouchable>

                {/* Summary Card Tối Giản */}
                <View style={styles.priceSummaryCardMinimal}>
                  <View style={styles.summaryRowMinimal}>
                    <Text style={styles.summaryLabelMinimal}>Tạm tính:</Text>
                    <Text style={styles.summaryValMinimal}>{subtotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  {appliedVoucher ? (
                    <View style={styles.summaryRowMinimal}>
                      <Text style={[styles.summaryLabelMinimal, { color: '#0284C7' }]}>
                        Khuyến mãi ({appliedVoucher.code}):
                      </Text>
                      <Text style={[styles.summaryValMinimal, { color: '#0284C7', fontWeight: '800' }]}>
                        -{discount.toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.summaryRowMinimal, styles.summaryTotalRow]}>
                    <Text style={styles.totalLabelMinimal}>Tổng Thanh Toán:</Text>
                    <Text style={styles.totalValMinimal}>{finalTotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                </View>

                <ClinicalButton
                  title="TIẾN HÀNH ĐẶT HÀNG"
                  onPress={() => {
                    if (!user) {
                      setShowLoginPromptModal(true);
                      return;
                    }
                    navigation.navigate('CustomerCheckoutScreen', {
                      cart,
                      appliedVoucher,
                      subtotal,
                      finalTotal,
                    });
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                  style={{ marginTop: 14 }}
                />
              </>
            )}

            {/* ─── KHU VỰC: SẢN PHẨM ĐÃ XEM GẦN ĐÂY ─── */}
            {recentlyViewed.length > 0 && (
              <View style={styles.recentViewedSection}>
                <View style={styles.recentViewedHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time" size={18} color="#0284C7" />
                    <Text style={styles.recentViewedTitle}>Sản Phẩm Đã Xem Gần Đây</Text>
                  </View>
                  <Text style={styles.recentViewedCount}>({recentlyViewed.length})</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentViewedScroll}
                >
                  {recentlyViewed.map((item, idx) => (
                    <View
                      key={item.id || (item as any)._id || `recently-${idx}`}
                      style={styles.recentProductCard}
                    >
                      <AnimatedPressable
                        onPress={() => openMedicineDetail(item)}
                        pressedScale={0.96}
                        style={{ flex: 1 }}
                      >
                        <Image
                          source={{
                            uri:
                              item.image ||
                              'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                          }}
                          style={styles.recentProductThumb}
                          resizeMode="cover"
                        />
                        <Text style={styles.recentProductName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.recentProductPrice}>
                          {(item.price || 0).toLocaleString('vi-VN')} ₫
                        </Text>
                      </AnimatedPressable>

                      <AnimatedTouchable
                        onPress={() => {
                          addToCart(item);
                          showToast.success('Đã thêm', `Đã thêm ${item.name} vào giỏ hàng!`);
                        }}
                        style={styles.recentQuickAddBtn}
                      >
                        <Ionicons name="cart" size={12} color="#0284C7" />
                        <Text style={styles.recentQuickAddText}>+ Thêm</Text>
                      </AnimatedTouchable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* TAB 3: AI CHAT & VOICE CONSULTANT */}
        <View style={{ display: activeTab === 'AI_CHAT' ? 'flex' : 'none' }}>
          <View>
            <View style={styles.aiHeaderCard}>
              <View style={styles.aiAvatar}>
                <Ionicons name="medical" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiHeaderTitle}>Dược Sĩ AI Lâm Sàng 24/7</Text>
                <Text style={styles.aiHeaderSub}>Tư vấn bằng giọng nói & Phân tích tương tác an toàn</Text>
              </View>
            </View>

            {/* Voice recording floating indicator */}
            {isRecording && (
              <View style={styles.voiceRecordingBox}>
                <View style={styles.pulsingDot} />
                <Text style={styles.voiceRecordingText}>
                  Đang ghi âm triệu chứng: {recordDuration}s (Bấm mic lần nữa để gửi)
                </Text>
              </View>
            )}

            <View style={styles.chatContainer}>
              {chatMessages.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      msg.role === 'user' ? styles.userChatText : styles.aiChatText,
                    ]}
                  >
                    {msg.text}
                  </Text>

                  {/* Recommended Meds Chips */}
                  {msg.recommendedMeds && msg.recommendedMeds.length > 0 && (
                    <View style={styles.medsSuggestBox}>
                      <Text style={styles.medsSuggestTitle}>Thuốc gợi ý an toàn:</Text>
                      {msg.recommendedMeds.map((med, mIdx) => (
                        <View key={med.id || (med as any)._id || `rec-${mIdx}`} style={styles.suggestItem}>
                          <Image
                            source={{
                              uri:
                                med.image ||
                                med.image_url ||
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                            }}
                            style={styles.suggestMedThumb}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestMedName}>{med.name}</Text>
                            <Text style={styles.suggestMedPrice}>
                              {med.price.toLocaleString('vi-VN')} ₫ / {med.unit}
                            </Text>
                          </View>
                          <AnimatedTouchable
                            onPress={() => {
                              addToCart(med);
                              showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                            }}
                            style={styles.addSuggestBtn}
                          >
                            <Ionicons name="cart" size={14} color="#FFFFFF" />
                            <Text style={styles.addSuggestText}>Thêm</Text>
                          </AnimatedTouchable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {aiThinking && (
                <View style={[styles.chatBubble, styles.aiBubble]}>
                  <Text style={styles.aiChatText}>Dược sĩ AI đang phân tích dữ liệu lâm sàng...</Text>
                </View>
              )}
            </View>

            <View style={styles.chatInputRow}>
              <AnimatedTouchable
                onPress={toggleVoiceRecording}
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color={isRecording ? "#DC2626" : "#0284C7"}
                />
              </AnimatedTouchable>

              <TextInput
                style={styles.chatTextInput}
                placeholder="Mô tả triệu chứng (vd: sốt cao, ho có đờm...)"
                placeholderTextColor="#94A3B8"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={() => handleSendChat()}
              />

              <AnimatedTouchable onPress={() => handleSendChat()} style={styles.sendChatBtn}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </AnimatedTouchable>
            </View>
          </View>
        </View>

        {/* TAB 2: ĐIỂM THƯỞNG & KHO VOUCHER (CHUẨN FPT LONG CHÂU - QUÀ TẶNG & LỊCH SỬ ĐIỂM) */}
        <View style={{ display: (activeTab === 'REWARDS' || activeTab === 'VOUCHERS') ? 'flex' : 'none' }}>
          {/* 1. Header Điểm Thưởng Chuẩn FPT Long Châu (Xanh Auth Liền Mạch) */}
          <LinearGradient
            colors={['#0369A1', '#0284C7', '#0EA5E9']}
            style={styles.longChauRewardsHeader}
          >
            {/* Hàng 2 Nút Pill: [🎁 Quà của tôi] & [📄 Lịch sử] */}
            <View style={styles.longChauRewardsTopActions}>
              <AnimatedTouchable
                style={[styles.longChauActionPill, styles.longChauActionPillActive]}
                activeOpacity={0.85}
              >
                <Ionicons name="gift" size={16} color="#0284C7" />
                <Text style={styles.longChauActionPillTextActive}>Quà của tôi</Text>
              </AnimatedTouchable>

              <AnimatedTouchable
                style={styles.longChauActionPill}
                onPress={() => setShowPointsHistoryModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text" size={16} color="#FFFFFF" />
                <Text style={styles.longChauActionPillText}>Lịch sử</Text>
              </AnimatedTouchable>
            </View>

            {/* Khối Điểm Thưởng & Hũ Thủy Tinh Tiết Kiệm Long Châu */}
            <View style={styles.longChauRewardsHeroRow}>
              <View style={styles.longChauRewardsHeroCol}>
                <Text style={styles.longChauRewardsHeroSub}>Điểm thưởng của tôi</Text>
                <View style={styles.longChauRewardsCoinRow}>
                  <Text style={styles.longChauRewardsCoinIcon}>🪙</Text>
                  <Text style={styles.longChauRewardsCoinVal}>
                    {(loyaltyInfo?.points ?? (user as any)?.points ?? 0).toLocaleString('vi-VN')}
                  </Text>
                </View>
                <AnimatedTouchable
                  style={styles.longChauRewardsRulesLink}
                  onPress={() => showToast.info('Thể lệ tích điểm', 'Tích 1% giá trị đơn hàng, quy đổi trực tiếp 1 điểm = 1đ và đổi quà tặng đặc quyền.')}
                >
                  <Text style={styles.longChauRewardsRulesText}>Xem thể lệ</Text>
                  <Ionicons name="chevron-forward" size={13} color="#BAE6FD" />
                </AnimatedTouchable>
              </View>
              {/* Hũ thủy tinh tích điểm 3D */}
              <View style={styles.longChauRewardsJarContainer}>
                <View style={styles.longChauJarGraphic}>
                  <View style={styles.longChauJarCap} />
                  <View style={styles.longChauJarBody}>
                    <Text style={{ fontSize: 24 }}>🍯</Text>
                  </View>
                  <View style={styles.longChauJarTag}>
                    <Text style={{ fontSize: 9, color: '#0284C7', fontWeight: '800' }}>ABC</Text>
                  </View>
                </View>
              </View>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* 2. Banner Chiến Dịch Hope Foundation (Góp Hy Vọng Vì Bệnh Nhân Ung Thư) */}
          <View style={styles.longChauHopeBanner}>
            <View style={styles.longChauHopeTopRow}>
              <Text style={styles.longChauHopeBrand}>HOPE FOUNDATION • ABC PHARMACY</Text>
              <Ionicons name="heart" size={16} color="#E11D48" />
            </View>
            <Text style={styles.longChauHopeTitle}>San sẻ gánh nặng điều trị</Text>
            <Text style={styles.longChauHopeSub}>GÓP HY VỌNG VÌ BỆNH NHÂN UNG THƯ</Text>

            <AnimatedTouchable
              style={styles.longChauHopeJoinBtn}
              onPress={() => showToast.success('Cảm ơn bạn', 'Đã ghi nhận sự quan tâm của bạn đến quỹ Hy Vọng!')}
            >
              <Text style={styles.longChauHopeJoinText}>THAM GIA NGAY</Text>
            </AnimatedTouchable>

            <View style={styles.longChauHopeFooter}>
              <Ionicons name="heart" size={14} color="#E11D48" />
              <Text style={styles.longChauHopeFooterText}>
                Cộng đồng đã quyên góp <Text style={{ fontWeight: '800', color: '#D97706' }}>15.336.500 đồng</Text>
              </Text>
            </View>
          </View>

          {/* 3. Khu Vực Quà Tặng Đổi Điểm Chuẩn FPT Long Châu */}
          <View style={styles.longChauGiftsSection}>
            <View style={styles.longChauGiftsHeader}>
              <Text style={styles.longChauGiftsTitle}>Quà tặng</Text>
              <AnimatedTouchable onPress={() => setSelectedGiftPointsTier(0)}>
                <Text style={styles.longChauGiftsViewAll}>Xem tất cả</Text>
              </AnimatedTouchable>
            </View>
            <Text style={styles.longChauGiftsSub}>Tích điểm đổi quà với giá 1.000 đồng.</Text>

            {/* Filter Pills Điểm Thưởng: 1.500 điểm ✓ | 3.000 điểm | 4.500 điểm */}
            <View style={styles.longChauGiftsFilterRow}>
              {[1500, 3000, 4500].map((tier) => {
                const isSelected = selectedGiftPointsTier === tier;
                return (
                  <AnimatedTouchable
                    key={`tier-${tier}`}
                    style={[styles.longChauGiftTierPill, isSelected && styles.longChauGiftTierPillActive]}
                    onPress={() => setSelectedGiftPointsTier(isSelected ? 0 : tier)}
                  >
                    <Text style={[styles.longChauGiftTierText, isSelected && styles.longChauGiftTierTextActive]}>
                      {tier.toLocaleString('vi-VN')} điểm
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#0284C7" />}
                  </AnimatedTouchable>
                );
              })}
            </View>

            {/* Grid 2 Cột Quà Tặng */}
            <View style={styles.longChauGiftsGrid}>
              {filterGiftsByPointsTier(loyaltyGifts, selectedGiftPointsTier).map((gift) => (
                <View key={gift.id} style={styles.longChauGiftCard}>
                  <Image source={{ uri: gift.image }} style={styles.longChauGiftImg} resizeMode="contain" />
                  <Text style={styles.longChauGiftName} numberOfLines={2}>
                    {gift.name}
                  </Text>
                  <Text style={styles.longChauGiftPrice}>
                    {gift.price.toLocaleString('vi-VN')}đ / {gift.unit}
                  </Text>
                  <View style={styles.longChauGiftPointsRow}>
                    <Text style={styles.longChauGiftPointsText}>🪙 {gift.requiredPoints.toLocaleString('vi-VN')}</Text>
                    <AnimatedTouchable
                      style={styles.longChauGiftRedeemBtn}
                      onPress={() => {
                        setSelectedGiftToRedeem(gift);
                        setRedeemQuantity(1);
                        setShowRedeemGiftModal(true);
                      }}
                    >
                      <Text style={styles.longChauGiftRedeemText}>Đổi ngay</Text>
                    </AnimatedTouchable>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Danh Sách Voucher Khả Dụng & Thanh Tìm Kiếm Voucher */}
          <View style={styles.simpleRewardsContainer}>
            <View style={styles.simpleVouchersSection}>
              {(() => {
                const filteredVouchers = vouchers.filter((v) => {
                  if (!voucherSearchInput.trim()) return true;
                  const q = voucherSearchInput.trim().toUpperCase();
                  return (
                    v.code.toUpperCase().includes(q) ||
                    (v.description && v.description.toUpperCase().includes(q))
                  );
                });

                return (
                  <>
                    <View style={styles.simpleVoucherHeader}>
                      <Text style={styles.simpleSectionTitle}>Mã Giảm Giá Của Bạn</Text>
                      <Text style={styles.simpleVoucherCount}>{filteredVouchers.length} mã khả dụng</Text>
                    </View>

                    {filteredVouchers.length === 0 ? (
                      <View style={styles.voucherSearchEmptyBox}>
                        <Ionicons name="pricetag-outline" size={32} color="#CBD5E1" />
                        <Text style={styles.voucherSearchEmptyTitle}>
                          Không tìm thấy mã voucher "{voucherSearchInput}"
                        </Text>
                        <Text style={styles.voucherSearchEmptySub}>
                          Vui lòng kiểm tra lại ký tự hoặc nhập mã voucher khác.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.simpleVoucherListCard}>
                        {filteredVouchers.map((v, idx) => (
                          <View
                            key={v.id || (v as any)._id || v.code || `voucher-${idx}`}
                            style={[
                              styles.simpleVoucherRow,
                              idx === filteredVouchers.length - 1 && styles.simpleVoucherRowLast,
                            ]}
                          >
                            {/* Badge giảm giá gọn gàng bên trái */}
                            <View style={styles.simpleVoucherDiscountBox}>
                              <Text style={styles.simpleVoucherDiscountValue}>
                                {formatMinimalVoucherBadge(v.discountType, v.discountValue)}
                              </Text>
                              <Text style={styles.simpleVoucherDiscountSub}>GIẢM</Text>
                            </View>

                            {/* Thông tin voucher ở giữa */}
                            <View style={styles.simpleVoucherInfoCol}>
                              <Text style={styles.simpleVoucherCode}>{v.code}</Text>
                              <Text style={styles.simpleVoucherDesc} numberOfLines={1}>
                                {v.description || 'Ưu đãi dành riêng cho bạn'}
                              </Text>
                              <Text style={styles.simpleVoucherCondition}>
                                {v.minOrderValue
                                  ? `Đơn từ ${v.minOrderValue.toLocaleString('vi-VN')} ₫`
                                  : 'Mọi đơn hàng'}
                              </Text>
                            </View>

                            {/* Nút Áp Dụng bên phải */}
                            <AnimatedTouchable
                              onPress={() => {
                                Clipboard.setString(v.code);
                                applyVoucher(v.code);
                                setActiveTab('CART');
                                showToast.success('Đã áp dụng mã', `Mã ${v.code} đã sẵn sàng trong giỏ hàng!`);
                              }}
                              style={styles.simpleVoucherApplyBtn}
                            >
                              <Text style={styles.simpleVoucherApplyText}>Dùng</Text>
                            </AnimatedTouchable>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        </View>

        {/* TAB 5: TÀI KHOẢN & ĐƠN MUA (NAV BAR: TÀI KHOẢN) - GIAO DIỆN CHUẨN FPT LONG CHÂU */}
        <View style={{ display: (activeTab === 'ACCOUNT' || activeTab === 'ORDERS') ? 'flex' : 'none' }}>
          {/* Header Thông Tin Khách Hàng Chuẩn Long Châu (Nền Xanh Đại Dương) */}
          <LinearGradient
            colors={['#0369A1', '#0284C7', '#0EA5E9']}
            style={styles.accountLongChauHeader}
          >
            <View style={styles.accountLongChauHeaderRow}>
              <View style={styles.accountLongChauUserInfo}>
                <View style={styles.accountLongChauAvatar}>
                  <Ionicons name="person" size={28} color="#0284C7" />
                </View>
                <View style={styles.accountLongChauNameCol}>
                  <Text style={styles.accountLongChauName} numberOfLines={1}>
                    {formattedProfile.displayName}
                  </Text>
                  <Text style={styles.accountLongChauPhone} numberOfLines={1}>
                    {formattedProfile.displayPhone}
                  </Text>
                </View>
              </View>

              {/* Huy hiệu Điểm Thưởng Xu Vàng */}
              <AnimatedTouchable
                onPress={() => setActiveTab('REWARDS')}
                style={styles.accountLongChauCoinPill}
              >
                <Text style={styles.accountLongChauCoinIcon}>🪙</Text>
                <Text style={styles.accountLongChauCoinText}>{formattedProfile.points}</Text>
              </AnimatedTouchable>
            </View>
          </LinearGradient>

          {activeTab === 'ACCOUNT' ? (
            /* =========================================================================
               MÀN HÌNH TÀI KHOẢN CHÍNH (CHUẨN LONG CHÂU - ZERO BORDER - FONT TO DỄ NHÌN)
               ========================================================================= */
            <View style={styles.accountLongChauBody}>
              {/* 1. KHỐI ĐƠN CỦA TÔI */}
              <View style={styles.accountLongChauSectionHeader}>
                <Text style={styles.accountLongChauSectionTitle}>Đơn của tôi</Text>
                <AnimatedTouchable
                  onPress={() => {
                    setOrderStatusTab('ALL');
                    setActiveTab('ORDERS');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={styles.accountLongChauViewAllText}>Xem tất cả</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </AnimatedTouchable>
              </View>

              <View style={styles.accountLongChauCard}>
                <View style={styles.accountOrdersGrid}>
                  {/* Đang xử lý */}
                  <AnimatedTouchable
                    style={styles.accountOrderGridItem}
                    onPress={() => {
                      setOrderStatusTab('PENDING');
                      setActiveTab('ORDERS');
                    }}
                  >
                    <View style={styles.accountOrderIconBox}>
                      <Ionicons name="cube-outline" size={24} color="#0284C7" />
                      {orderCounts.pendingCount > 0 && (
                        <View style={styles.accountOrderBadge}>
                          <Text style={styles.accountOrderBadgeText}>{orderCounts.pendingCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.accountOrderGridLabel}>Đang xử lý</Text>
                  </AnimatedTouchable>

                  {/* Đang giao */}
                  <AnimatedTouchable
                    style={styles.accountOrderGridItem}
                    onPress={() => {
                      setOrderStatusTab('SHIPPING');
                      setActiveTab('ORDERS');
                    }}
                  >
                    <View style={styles.accountOrderIconBox}>
                      <Ionicons name="car-outline" size={24} color="#0284C7" />
                    </View>
                    <Text style={styles.accountOrderGridLabel}>Đang giao</Text>
                  </AnimatedTouchable>

                  {/* Đã giao */}
                  <AnimatedTouchable
                    style={styles.accountOrderGridItem}
                    onPress={() => {
                      setOrderStatusTab('COMPLETED');
                      setActiveTab('ORDERS');
                    }}
                  >
                    <View style={styles.accountOrderIconBox}>
                      <Ionicons name="checkbox-outline" size={24} color="#0284C7" />
                    </View>
                    <Text style={styles.accountOrderGridLabel}>Đã giao</Text>
                  </AnimatedTouchable>

                  {/* Đổi/Trả */}
                  <AnimatedTouchable
                    style={styles.accountOrderGridItem}
                    onPress={() => {
                      setOrderStatusTab('CANCELLED');
                      setActiveTab('ORDERS');
                    }}
                  >
                    <View style={styles.accountOrderIconBox}>
                      <Ionicons name="swap-horizontal-outline" size={24} color="#0284C7" />
                    </View>
                    <Text style={styles.accountOrderGridLabel}>Đổi/Trả</Text>
                  </AnimatedTouchable>
                </View>
              </View>

              {/* 2. KHỐI HỒ SƠ Y TẾ & BỆNH ÁN SỐ (XEM ĐƯỢC HỒ SƠ Y TẾ) */}
              <View style={styles.accountLongChauSectionHeader}>
                <Text style={styles.accountLongChauSectionTitle}>Hồ sơ y tế & Sức khỏe</Text>
                <AnimatedTouchable
                  onPress={() => {
                    setIsOnboardingHealth(false);
                    setShowPassportModal(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={styles.accountLongChauViewAllText}>Chi tiết</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0284C7" />
                </AnimatedTouchable>
              </View>

              <AnimatedTouchable
                style={styles.accountHealthCard}
                onPress={() => {
                  setIsOnboardingHealth(false);
                  setShowPassportModal(true);
                }}
              >
                <View style={styles.accountHealthTopRow}>
                  <View style={styles.accountHealthIconCircle}>
                    <Ionicons name="shield-checkmark" size={24} color="#0284C7" />
                  </View>
                  <View style={styles.accountHealthMetaCol}>
                    <View style={styles.accountHealthTitleRow}>
                      <Text style={styles.accountHealthTitle}>Sổ Sức Khỏe & Mã QR Y Tế</Text>
                      <View style={styles.accountHealthTag}>
                        <Text style={styles.accountHealthTagText}>Chuẩn GPP / BYT</Text>
                      </View>
                    </View>
                    <Text style={styles.accountHealthSubtitle}>
                      Mã QR khám bệnh, lịch sử dị ứng thuốc & tiền sử bệnh nền
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </View>

                {/* Dải thông tin y tế tóm tắt */}
                <View style={styles.accountHealthDivider} />
                <View style={styles.accountHealthPillsRow}>
                  <View style={styles.accountHealthPill}>
                    <Ionicons name="water" size={12} color="#EF4444" />
                    <Text style={styles.accountHealthPillText}>Nhóm máu: {healthSummary.bloodType}</Text>
                  </View>
                  <View style={styles.accountHealthPill}>
                    <Ionicons name="warning" size={12} color="#D97706" />
                    <Text style={styles.accountHealthPillText}>{healthSummary.allergyLabel}</Text>
                  </View>
                  <View style={styles.accountHealthPill}>
                    <Ionicons name="fitness" size={12} color="#0284C7" />
                    <Text style={styles.accountHealthPillText}>{healthSummary.conditionLabel}</Text>
                  </View>
                </View>
              </AnimatedTouchable>

              {/* 3. KHỐI TÀI KHOẢN (MENU DANH MỤC TIỆN ÍCH) */}
              <View style={styles.accountLongChauSectionHeader}>
                <Text style={styles.accountLongChauSectionTitle}>Tài khoản</Text>
              </View>

              <View style={styles.accountMenuListCard}>
                {/* Mã QR của tôi */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() => {
                    setIsOnboardingHealth(false);
                    setShowPassportModal(true);
                  }}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="qr-code-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Mã QR của tôi</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Thông tin cá nhân */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() => navigation.navigate('ProfileScreen')}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="person-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Thông tin cá nhân</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Quản lý sổ địa chỉ */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() => navigation.navigate('ProfileScreen')}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="location-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Quản lý sổ địa chỉ</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Quản lý phương thức thanh toán */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() =>
                    showToast.info(
                      'Phương thức thanh toán',
                      'Hệ thống hỗ trợ VietQR Napas247 tự động, COD và Thẻ ATM/Visa.'
                    )
                  }
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="card-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Quản lý phương thức thanh toán</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Lịch sử tư vấn */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() => setActiveTab('AI_CHAT')}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Lịch sử tư vấn & Dược sĩ AI</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Tủ thuốc & Nhắc uống thuốc */}
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() => navigation.navigate('MedicineReminderScreen')}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="alarm-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Tủ thuốc & Nhắc uống thuốc</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Danh sách yêu thích */}
                <AnimatedTouchable
                  style={[styles.accountMenuItemRow, styles.accountMenuItemLast]}
                  onPress={() => navigation.navigate('CustomerWishlistScreen')}
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="heart-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Sản phẩm yêu thích ({wishlistTotalCount})</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>
              </View>

              {/* 4. KHỐI VỀ NHÀ THUỐC ABC PHARMACY */}
              <View style={styles.accountLongChauSectionHeader}>
                <Text style={styles.accountLongChauSectionTitle}>Về Nhà thuốc ABC PHARMACY</Text>
              </View>

              <View style={styles.accountMenuListCard}>
                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() =>
                    showToast.info(
                      'Nhà thuốc ABC PHARMACY',
                      'Hệ thống chuỗi nhà thuốc đạt chuẩn GPP toàn quốc - Cung cấp 100% thuốc và dược mỹ phẩm chính hãng.'
                    )
                  }
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="help-circle-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Giới thiệu nhà thuốc</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() =>
                    showToast.success(
                      'Chuẩn GPP Bộ Y Tế',
                      'Giấy chứng nhận Thực hành tốt nhà thuốc GPP số 0108889999/SYT-GPP.'
                    )
                  }
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Giấy phép kinh doanh</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                <AnimatedTouchable
                  style={styles.accountMenuItemRow}
                  onPress={() =>
                    showToast.info(
                      'Quy chế hoạt động',
                      'Cam kết bán thuốc đúng giá niêm yết, tư vấn chuyên môn bởi Dược sĩ có chứng chỉ hành nghề.'
                    )
                  }
                >
                  <View style={styles.accountMenuItemIconBox}>
                    <Ionicons name="document-text-outline" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.accountMenuItemTitle}>Quy chế hoạt động</Text>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </AnimatedTouchable>

                {/* Đăng Xuất hoặc Đăng Nhập */}
                {user ? (
                  <AnimatedTouchable
                    style={[styles.accountMenuItemRow, styles.accountMenuItemLast]}
                    onPress={() => setShowLogoutModal(true)}
                  >
                    <View style={[styles.accountMenuItemIconBox, { backgroundColor: '#FEF2F2' }]}>
                      <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    </View>
                    <Text style={[styles.accountMenuItemTitle, { color: '#EF4444' }]}>Đăng xuất tài khoản</Text>
                    <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                  </AnimatedTouchable>
                ) : (
                  <AnimatedTouchable
                    style={[styles.accountMenuItemRow, styles.accountMenuItemLast]}
                    onPress={() => navigation.navigate('LoginScreen')}
                  >
                    <View style={[styles.accountMenuItemIconBox, { backgroundColor: '#F0F9FF' }]}>
                      <Ionicons name="log-in-outline" size={18} color="#0284C7" />
                    </View>
                    <Text style={[styles.accountMenuItemTitle, { color: '#0284C7' }]}>Đăng nhập / Đăng ký</Text>
                    <Ionicons name="chevron-forward" size={18} color="#0284C7" />
                  </AnimatedTouchable>
                )}
              </View>

              <View style={{ height: 32 }} />
            </View>
          ) : (
            /* =========================================================================
               SUB-VIEW: QUẢN LÝ ĐƠN HÀNG CHI TIẾT (activeTab === 'ORDERS')
               ========================================================================= */
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              {/* Nút quay lại màn hình Tài khoản */}
              <AnimatedTouchable
                onPress={() => setActiveTab('ACCOUNT')}
                style={styles.ordersBackBtn}
              >
                <Ionicons name="chevron-back" size={20} color="#0284C7" />
                <Text style={styles.ordersBackBtnText}>Quay lại Tài khoản</Text>
              </AnimatedTouchable>

              {/* Phone search bar */}
              <View style={styles.searchBox}>
                <Ionicons name="call-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Nhập SĐT để tra cứu lịch sử đơn..."
                  placeholderTextColor="#94A3B8"
                  value={searchPhone}
                  onChangeText={setSearchPhone}
                  keyboardType="phone-pad"
                />
                <AnimatedTouchable onPress={loadData} style={styles.searchPhoneBtn}>
                  <Ionicons name="search" size={16} color="#FFFFFF" />
                </AnimatedTouchable>
              </View>

              <Text style={styles.sectionTitle}>Đơn Mua Của Tôi ({orders.length})</Text>

              {/* Order status chips scroll */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {[
                  { id: 'ALL', label: 'Tất cả', count: orders.length },
                  {
                    id: 'PENDING',
                    label: 'Chờ thanh toán',
                    count: orderCounts.pendingCount,
                  },
                  {
                    id: 'SHIPPING',
                    label: 'Đang giao',
                    count: orderCounts.deliveringCount,
                  },
                  {
                    id: 'COMPLETED',
                    label: 'Đã hoàn tất',
                    count: orderCounts.deliveredCount,
                  },
                  {
                    id: 'CANCELLED',
                    label: 'Đã hủy',
                    count: orderCounts.returnedCount,
                  },
                ].map((tab) => (
                  <AnimatedTouchable
                    key={tab.id}
                    onPress={() => setOrderStatusTab(tab.id as any)}
                    style={[styles.orderStatusPill, orderStatusTab === tab.id && styles.activeOrderStatusPill]}
                  >
                    <Text style={[styles.orderStatusPillText, orderStatusTab === tab.id && styles.activeOrderStatusPillText]}>
                      {tab.label} ({tab.count})
                    </Text>
                  </AnimatedTouchable>
                ))}
              </ScrollView>

              {filteredOrders.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Ionicons name="receipt-outline" size={54} color="#CBD5E1" />
                  <Text style={styles.emptyCartTitle}>Không có đơn hàng nào</Text>
                  <Text style={styles.emptyCartSub}>
                    {orders.length === 0
                      ? 'Hãy đặt các đơn thuốc đầu tiên để theo dõi tại đây.'
                      : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc trạng thái.'}
                  </Text>
                </View>
              ) : (
                filteredOrders.map((ord, idx) => (
                  <View key={ord.id || (ord as any)._id || ord.orderCode || `order-${idx}`} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderCode}>{ord.orderCode || ord.id}</Text>
                      <View
                        style={[
                          styles.orderStatusTag,
                          ord.paymentStatus === 'PAID' ? styles.statusPaid : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.orderStatusText,
                            ord.paymentStatus === 'PAID' ? styles.statusPaidText : styles.statusPendingText,
                          ]}
                        >
                          {ord.paymentStatus === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.orderDate}>
                      Ngày đặt: {new Date(ord.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                    </Text>

                    <View style={styles.orderItemsBox}>
                      {ord.items.map((it, idx) => {
                        const instructionText = it.cach_dung || (it as any).dosageInstructions;
                        return (
                          <View key={idx} style={styles.orderItemCardRow}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.orderItemTitle}>
                                • {it.name} x {it.quantity} {it.unit}
                              </Text>
                              <Text style={styles.orderItemSub}>
                                {typeof it.price === 'number' ? `${it.price.toLocaleString('vi-VN')} ₫` : ''}
                              </Text>
                              {/* Hiển thị chi tiết cách dùng và liều dùng */}
                              {instructionText ? (
                                <View style={styles.instructionBadgeBox}>
                                  <Ionicons name="medical" size={12} color="#0891B2" />
                                  <Text style={styles.instructionBadgeText}>
                                    {instructionText}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <AnimatedTouchable
                              style={styles.setReminderBtn}
                              onPress={() => {
                                const parsed = parseOrderToReminder(it, ord.orderCode || ord.id || (ord as any)._id);
                                navigation.navigate('MedicineReminderScreen', { autoFill: parsed });
                              }}
                            >
                              <Ionicons name="alarm" size={13} color="#0891B2" />
                              <Text style={styles.setReminderBtnText}>Nhắc Uống</Text>
                            </AnimatedTouchable>
                          </View>
                        );
                      })}

                      {/* Nút 1-Chạm: Tự Động Tạo Lịch Nhắc Toàn Bộ Đơn Thuốc */}
                      {ord.items.length > 0 && (
                        <AnimatedTouchable
                          style={styles.autoCreateAllRemindersBtn}
                          onPress={async () => {
                            try {
                              const created = await createRemindersFromOrder(ord);
                              if (created.length > 0) {
                                for (const rem of created) {
                                  await MedicineReminderService.scheduleReminderSlidingWindow(rem, 7);
                                }
                                showToast.success(
                                  'Tạo Lịch Thành Công!',
                                  `Đã tự động tạo lịch nhắc uống cho ${created.length} loại thuốc!`
                                );
                              } else {
                                showToast.info('Thông báo', 'Đơn hàng không có thuốc nào để tạo lịch');
                              }
                            } catch (e: any) {
                              showToast.error('Lỗi', e.message || 'Không thể tạo lịch nhắc');
                            }
                          }}
                        >
                          <Ionicons name="sparkles" size={14} color="#0284C7" />
                          <Text style={styles.autoCreateAllRemindersBtnText}>
                            Tạo Lịch Nhắc Uống Toàn Bộ Đơn ({ord.items.length} thuốc)
                          </Text>
                        </AnimatedTouchable>
                      )}
                    </View>

                    <View style={styles.orderFooter}>
                      <View>
                        <Text style={styles.payMethodText}>Hình thức: {ord.paymentMethod}</Text>
                        <Text style={styles.orderTotalAmount}>
                          {ord.finalAmount.toLocaleString('vi-VN')} ₫
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <AnimatedTouchable
                          onPress={() => handleOpenFeedback(ord)}
                          style={[styles.qrOrderBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                        >
                          <Ionicons name="star" size={15} color="#0284C7" />
                          <Text style={[styles.qrOrderBtnText, { color: '#0284C7', fontWeight: '700' }]}>Đánh Giá</Text>
                        </AnimatedTouchable>

                        <AnimatedTouchable
                          onPress={() => setSelectedOrderQR(ord)}
                          style={styles.qrOrderBtn}
                        >
                          <Ionicons name="qr-code-outline" size={16} color="#0284C7" />
                          <Text style={styles.qrOrderBtnText}>Mã QR</Text>
                        </AnimatedTouchable>
                      </View>
                    </View>
                  </View>
                ))
              )}

              {/* Nút Đăng Xuất An Toàn hoặc Đăng Nhập */}
              <View style={{ marginTop: 24, marginBottom: 20 }}>
                {user ? (
                  <AnimatedTouchable
                    onPress={() => setShowLogoutModal(true)}
                    style={styles.accountLogoutBtn}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.accountLogoutText}>Đăng Xuất Tài Khoản</Text>
                  </AnimatedTouchable>
                ) : (
                  <ClinicalButton
                    title="ĐĂNG NHẬP / TẠO TÀI KHOẢN"
                    onPress={() => navigation.navigate('LoginScreen')}
                    variant="primary"
                    size="lg"
                    fullWidth
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Modal Đổi Quà Chuẩn FPT Long Châu ─── */}
      <Modal
        visible={showRedeemGiftModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRedeemGiftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.redeemModalCard}>
            {/* Header */}
            <View style={styles.redeemModalHeader}>
              <Text style={styles.redeemModalTitle}>Đổi quà</Text>
              <AnimatedTouchable
                onPress={() => setShowRedeemGiftModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </AnimatedTouchable>
            </View>

            {/* Sản phẩm đổi quà */}
            {selectedGiftToRedeem && (
              <View style={styles.redeemModalItemBox}>
                <Image
                  source={{ uri: selectedGiftToRedeem.image }}
                  style={styles.redeemModalItemThumb}
                  resizeMode="contain"
                />
                <Text style={styles.redeemModalItemName} numberOfLines={2}>
                  {selectedGiftToRedeem.name}
                </Text>
              </View>
            )}

            {/* Hàng chọn số lượng */}
            <View style={styles.redeemModalQtyRow}>
              <Text style={styles.redeemModalQtyLabel}>Số lượng:</Text>
              <View style={styles.redeemModalStepper}>
                <AnimatedTouchable
                  style={styles.redeemModalStepBtn}
                  onPress={() => setRedeemQuantity(Math.max(1, redeemQuantity - 1))}
                >
                  <Ionicons name="remove" size={18} color="#64748B" />
                </AnimatedTouchable>
                <Text style={styles.redeemModalQtyVal}>{redeemQuantity}</Text>
                <AnimatedTouchable
                  style={styles.redeemModalStepBtn}
                  onPress={() => setRedeemQuantity(redeemQuantity + 1)}
                >
                  <Ionicons name="add" size={18} color="#64748B" />
                </AnimatedTouchable>
              </View>
            </View>

            {/* Điểm sử dụng */}
            <View style={styles.redeemModalPointsRow}>
              <Text style={styles.redeemModalPointsLabel}>Điểm sử dụng:</Text>
              <Text style={styles.redeemModalPointsUsed}>
                🪙 -{((selectedGiftToRedeem?.requiredPoints || 1500) * redeemQuantity).toLocaleString('vi-VN')}
              </Text>
            </View>

            {/* Điểm hiện có */}
            <View style={styles.redeemModalPointsRow}>
              <Text style={styles.redeemModalPointsLabel}>Điểm hiện có:</Text>
              <Text style={styles.redeemModalPointsCurrent}>
                {(loyaltyInfo?.points ?? (user as any)?.points ?? 0).toLocaleString('vi-VN')}
              </Text>
            </View>

            {/* Thông báo lỗi không đủ điểm (giống hệt ảnh user gửi) */}
            {(loyaltyInfo?.points ?? (user as any)?.points ?? 0) < ((selectedGiftToRedeem?.requiredPoints || 1500) * redeemQuantity) && (
              <View style={styles.redeemModalWarning}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.redeemModalWarningText}>Không đủ điểm thưởng.</Text>
              </View>
            )}

            {/* Nút Xác Nhận */}
            <AnimatedTouchable
              style={[
                styles.redeemModalConfirmBtn,
                ((loyaltyInfo?.points ?? (user as any)?.points ?? 0) < ((selectedGiftToRedeem?.requiredPoints || 1500) * redeemQuantity)) &&
                  styles.redeemModalConfirmBtnDisabled,
              ]}
              disabled={((loyaltyInfo?.points ?? (user as any)?.points ?? 0) < ((selectedGiftToRedeem?.requiredPoints || 1500) * redeemQuantity))}
              onPress={() => {
                showToast.success('Đổi quà thành công!', 'Quà tặng đã được lưu vào ví quà của bạn.');
                setShowRedeemGiftModal(false);
              }}
            >
              <Text
                style={[
                  styles.redeemModalConfirmText,
                  ((loyaltyInfo?.points ?? (user as any)?.points ?? 0) < ((selectedGiftToRedeem?.requiredPoints || 1500) * redeemQuantity)) &&
                    styles.redeemModalConfirmTextDisabled,
                ]}
              >
                Xác nhận
              </Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Màn Hình Lịch Sử Điểm Thưởng FPT Long Châu ─── */}
      <Modal
        visible={showPointsHistoryModal}
        animationType="slide"
        onRequestClose={() => setShowPointsHistoryModal(false)}
      >
        <PointsHistoryScreen
          currentPoints={(loyaltyInfo?.points ?? (user as any)?.points ?? 0)}
          tierName={loyaltyInfo?.tier ? `Hạng ${loyaltyInfo.tier}` : 'Hạng Vàng'}
          onBack={() => setShowPointsHistoryModal(false)}
          transactions={pointsHistory}
        />
      </Modal>

      {/* Order QR Code Modal */}
      <Modal visible={selectedOrderQR !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.universalModalHeader}>
              <View style={styles.universalModalTitleCol}>
                <Text style={styles.qrModalTitle}>Mã QR Đơn Hàng</Text>
                <Text style={styles.qrModalSub}>Mã đơn: {selectedOrderQR?.orderCode || selectedOrderQR?.id}</Text>
              </View>
              <AnimatedTouchable
                onPress={() => setSelectedOrderQR(null)}
                style={styles.universalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </AnimatedTouchable>
            </View>

            <View style={styles.qrHolder}>
              <QRCode
                value={selectedOrderQR?.orderCode || selectedOrderQR?.id || 'ORD-ABC'}
                size={180}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrHint}>Xuất trình mã này tại quầy để nhận đơn hoặc tra cứu</Text>

            <AnimatedTouchable
              onPress={() => setSelectedOrderQR(null)}
              style={styles.closeQrBtn}
            >
              <Text style={styles.closeQrBtnText}>Đóng</Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Modal>

      {/* Customer Branch Feedback Modal */}
      <Modal visible={feedbackOrder !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.universalModalHeader}>
              <View style={styles.universalModalTitleCol}>
                <Text style={styles.modalTitle}>Đánh Giá Trải Nghiệm</Text>
                <Text style={styles.modalSub}>
                  Đơn #{feedbackOrder?.orderCode || feedbackOrder?.id}
                </Text>
              </View>
              <AnimatedTouchable
                onPress={() => setFeedbackOrder(null)}
                style={styles.universalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </AnimatedTouchable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Reward incentive banner */}
              <View style={styles.feedbackRewardBanner}>
                <Ionicons name="gift" size={22} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.feedbackRewardTitle}>Nhận Ngay Điểm Thưởng & Quà Tặng</Text>
                  <Text style={styles.feedbackRewardSub}>
                    Cộng ngay <Text style={{ fontWeight: '700', color: '#0284C7' }}>+1.000đ - 2.000đ</Text> vào điểm tích lũy & Voucher 5.000đ cho đơn sau!
                  </Text>
                </View>
              </View>

              {/* Star Rating selector */}
              <View style={styles.ratingBox}>
                <Text style={styles.ratingHeading}>Mức độ hài lòng của bạn</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <AnimatedTouchable
                      key={star}
                      onPress={() => setFeedbackRating(star)}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name={star <= feedbackRating ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= feedbackRating ? '#F59E0B' : '#CBD5E1'}
                      />
                    </AnimatedTouchable>
                  ))}
                </View>
                <Text style={styles.ratingLabel}>
                  {feedbackRating === 5 && '🌟 Cực kỳ hài lòng, vượt mong đợi'}
                  {feedbackRating === 4 && '😊 Hài lòng với dịch vụ & thuốc'}
                  {feedbackRating === 3 && '😐 Tạm ổn, cần cải thiện thêm'}
                  {feedbackRating === 2 && '🙁 Chưa hài lòng, phục vụ chưa tốt'}
                  {feedbackRating === 1 && '😡 Rất thất vọng, khiếu nại dịch vụ'}
                </Text>
              </View>

              {/* Quick tags */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.secTitle}>Điểm bạn ấn tượng hoặc muốn góp ý:</Text>
                <View style={styles.tagsContainer}>
                  {[
                    'Dược sĩ tận tâm',
                    'Thuốc chuẩn chính hãng',
                    'Không gian sạch sẽ',
                    'Tư vấn dễ hiểu',
                    'Giá cả minh bạch',
                    'Thời gian chờ lâu',
                    'Cần tư vấn kỹ hơn',
                    'Thiếu thuốc theo đơn',
                  ].map((tag) => {
                    const isSelected = feedbackTags.includes(tag);
                    return (
                      <AnimatedTouchable
                        key={tag}
                        onPress={() => handleToggleTag(tag)}
                        style={[
                          styles.tagPill,
                          isSelected && styles.tagPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagPillText,
                            isSelected && styles.tagPillTextSelected,
                          ]}
                        >
                          {isSelected ? '✓ ' : ''}{tag}
                        </Text>
                      </AnimatedTouchable>
                    );
                  })}
                </View>
              </View>

              {/* Comment text */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.secTitle}>Cảm nhận chi tiết của bạn:</Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Chia sẻ thêm về trải nghiệm mua thuốc hoặc thái độ của dược sĩ tại chi nhánh..."
                  placeholderTextColor="#94A3B8"
                  value={feedbackComment}
                  onChangeText={setFeedbackComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
              <AnimatedTouchable
                onPress={() => setFeedbackOrder(null)}
                style={styles.closeBtn}
                disabled={feedbackSubmitting}
              >
                <Text style={styles.closeBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title={feedbackSubmitting ? 'ĐANG GỬI...' : 'GỬI ĐÁNH GIÁ & NHẬN THƯỞNG'}
                onPress={handleSubmitFeedback}
                gradientVariant="primary"
                size="md"
                disabled={feedbackSubmitting}
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal for Customer */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanBarcode}
        title="Quét Mã Vạch Hộp Thuốc"
        subtitle="Hướng camera vào mã vạch trên vỏ hộp thuốc tại nhà để tìm sản phẩm chính hãng"
      />

      {/* Filter Modal */}
      <ClinicalModalSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Bộ Lọc Sản Phẩm"
        subtitle="Lọc theo loại thuốc và khoảng giá"
      >
        <Text style={styles.filterModalSectionTitle}>Loại thuốc</Text>
        <View style={styles.filterModalOptions}>
          {([{ id: 'ALL', label: 'Tất cả' }, { id: 'OTC', label: 'Thuốc không kê đơn (OTC)' }, { id: 'RX', label: 'Thuốc kê đơn (Rx)' }] as const).map((opt) => (
            <AnimatedTouchable
              key={opt.id}
              onPress={() => setSelectedRxFilter(opt.id)}
              style={[
                styles.filterModalOption,
                selectedRxFilter === opt.id && styles.filterModalOptionActive,
              ]}
            >
              <Ionicons
                name={selectedRxFilter === opt.id ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selectedRxFilter === opt.id ? '#0284C7' : '#94A3B8'}
              />
              <Text style={[
                styles.filterModalOptionText,
                selectedRxFilter === opt.id && styles.filterModalOptionTextActive,
              ]}>
                {opt.label}
              </Text>
            </AnimatedTouchable>
          ))}
        </View>

        <Text style={[styles.filterModalSectionTitle, { marginTop: 16 }]}>Khoảng giá</Text>
        <View style={styles.filterModalOptions}>
          {([{ id: 'ALL', label: 'Tất cả mức giá' }, { id: 'UNDER_100', label: 'Dưới 100.000 ₫' }, { id: '100_300', label: '100.000 – 300.000 ₫' }, { id: 'OVER_300', label: 'Trên 300.000 ₫' }] as const).map((opt) => (
            <AnimatedTouchable
              key={opt.id}
              onPress={() => setSelectedPriceFilter(opt.id)}
              style={[
                styles.filterModalOption,
                selectedPriceFilter === opt.id && styles.filterModalOptionActive,
              ]}
            >
              <Ionicons
                name={selectedPriceFilter === opt.id ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selectedPriceFilter === opt.id ? '#0284C7' : '#94A3B8'}
              />
              <Text style={[
                styles.filterModalOptionText,
                selectedPriceFilter === opt.id && styles.filterModalOptionTextActive,
              ]}>
                {opt.label}
              </Text>
            </AnimatedTouchable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <ClinicalButton
            title="Xóa bộ lọc"
            variant="outline"
            size="md"
            onPress={() => {
              setSelectedRxFilter('ALL');
              setSelectedPriceFilter('ALL');
              setShowFilterModal(false);
            }}
            style={{ flex: 1 }}
          />
          <ClinicalButton
            title="Áp dụng"
            variant="primary"
            size="md"
            onPress={() => setShowFilterModal(false)}
            style={{ flex: 1 }}
          />
        </View>
      </ClinicalModalSheet>

      {/* ABC Pharmacy Branches Modal (Hệ thống nhà thuốc) */}
      <Modal visible={showBranchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.universalModalHeader}>
              <View style={styles.universalModalTitleCol}>
                <Text style={styles.modalTitle}>Hệ Thống Nhà Thuốc ABC</Text>
                <Text style={styles.modalSub}>
                  Chi nhánh đạt chuẩn GPP & Bán kính Geofencing điểm danh
                </Text>
              </View>
              <AnimatedTouchable
                onPress={() => setShowBranchModal(false)}
                style={styles.universalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color="#334155" />
              </AnimatedTouchable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingBranches && branches.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Đang tải danh sách chi nhánh...</Text>
                </View>
              ) : branches.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>Chưa có chi nhánh nào khả dụng</Text>
                </View>
              ) : (
                branches.map((b) => {
                  const bId = b.id || b._id || b.branchCode || '';
                  const isSelected = selectedBranch && (selectedBranch.id === bId || selectedBranch._id === bId);
                  return (
                    <View
                      key={bId}
                      style={[
                        styles.branchCardItem,
                        isSelected && { borderColor: '#0284C7', backgroundColor: '#F0F9FF' },
                      ]}
                    >
                      <View style={[styles.branchIconCol, isSelected && { backgroundColor: '#0284C7' }]}>
                        <Ionicons name="storefront" size={22} color={isSelected ? '#FFFFFF' : '#0284C7'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.branchNameText, isSelected && { color: '#0284C7' }]}>{b.name}</Text>
                          <View style={styles.branchDistanceBadge}>
                            <Text style={styles.branchDistanceText}>
                              {b.checkInRadiusMeters ? `${b.checkInRadiusMeters}m` : 'Chuẩn GPP'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.branchAddressText}>{b.address}</Text>
                        <View style={styles.branchFooterRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="call-outline" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                            <Text style={styles.branchHotlineText}>{b.phone || '1800 6821'}</Text>
                          </View>
                          <AnimatedTouchable
                            onPress={() => handleSelectBranch(b)}
                            style={[styles.selectBranchBtn, isSelected && { backgroundColor: '#0284C7' }]}
                          >
                            <Text style={styles.selectBranchBtnText}>
                              {isSelected ? 'Đang chọn' : 'Chọn cơ sở'}
                            </Text>
                          </AnimatedTouchable>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Elevated 5-Tab Bottom Navigation Bar (Tri-Pharmacy Standard) ── */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {/* Tab 1: Trang chủ */}
        <AnimatedTouchable
          onPress={() => setActiveTab('STORE')}
          style={styles.bottomNavItem}
        >
          <Ionicons
            name={activeTab === 'STORE' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'STORE' ? '#0284C7' : '#94A3B8'}
          />
          <Text style={[styles.bottomNavLabel, activeTab === 'STORE' && styles.bottomNavLabelActive]}>
            Trang chủ
          </Text>
        </AnimatedTouchable>

        {/* Tab 2: Điểm thưởng (thay thế Danh mục) */}
        <AnimatedTouchable
          onPress={() => setActiveTab('REWARDS')}
          style={styles.bottomNavItem}
        >
          <Ionicons
            name={activeTab === 'REWARDS' ? 'gift' : 'gift-outline'}
            size={22}
            color={activeTab === 'REWARDS' ? '#0284C7' : '#94A3B8'}
          />
          <Text style={[styles.bottomNavLabel, activeTab === 'REWARDS' && styles.bottomNavLabelActive]}>
            Điểm thưởng
          </Text>
        </AnimatedTouchable>

        {/* Tab 3: Raised Center Floating Button - Dược Sĩ AI */}
        <View style={styles.raisedCenterBtnContainer}>
          <AnimatedTouchable
            onPress={() => setActiveTab('AI_CHAT')}
            style={styles.raisedCenterBtn}
          >
            <LinearGradient
              colors={['#0284C7', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.raisedCenterInner}
            >
              <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
            </LinearGradient>
          </AnimatedTouchable>
          <Text style={[styles.bottomNavLabel, activeTab === 'AI_CHAT' && styles.bottomNavLabelActive, { marginTop: 2 }]}>
            Tư vấn AI
          </Text>
        </View>

        {/* Tab 4: Giỏ hàng */}
        <AnimatedTouchable
          onPress={() => setActiveTab('CART')}
          style={styles.bottomNavItem}
        >
          <View>
            <Ionicons
              name={activeTab === 'CART' ? 'cart' : 'cart-outline'}
              size={22}
              color={activeTab === 'CART' ? '#0284C7' : '#94A3B8'}
            />
            {cartTotalCount > 0 && (
              <View style={styles.bottomNavBadge}>
                <Text style={styles.bottomNavBadgeText}>
                  {cartTotalCount > 99 ? '99+' : cartTotalCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.bottomNavLabel, activeTab === 'CART' && styles.bottomNavLabelActive]}>
            Giỏ hàng
          </Text>
        </AnimatedTouchable>

        {/* Tab 5: Tài khoản (thay thế Đơn mua) */}
        <AnimatedTouchable
          onPress={() => setActiveTab('ACCOUNT')}
          style={styles.bottomNavItem}
        >
          <Ionicons
            name={(activeTab === 'ACCOUNT' || activeTab === 'ORDERS') ? 'person-circle' : 'person-circle-outline'}
            size={22}
            color={(activeTab === 'ACCOUNT' || activeTab === 'ORDERS') ? '#0284C7' : '#94A3B8'}
          />
          <Text style={[styles.bottomNavLabel, (activeTab === 'ACCOUNT' || activeTab === 'ORDERS') && styles.bottomNavLabelActive]}>
            Tài khoản
          </Text>
        </AnimatedTouchable>
      </View>

      {/* Sổ Sức Khỏe Số Modal (Digital Health Passport - UC-106) */}
      <DigitalHealthPassportModal
        visible={showPassportModal}
        isOnboardingMode={isOnboardingHealth}
        onClose={() => setShowPassportModal(false)}
        onSaved={() => {
          setIsOnboardingHealth(false);
          setShowPassportModal(false);
          if (user) {
            ApiService.getMyClinicalSafety().then((data) => setClinicalSafety(data)).catch(() => {});
          }
        }}
      />

      {/* Modal Xác Nhận Đăng Xuất Chuẩn In-App UI (thay thế Alert OS) */}
      <FlatModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Đăng Xuất Tài Khoản"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không? Mọi thông tin giỏ hàng và dữ liệu sẽ được lưu an toàn."
        icon="log-out-outline"
        iconColor="#EF4444"
        confirmText="Đăng xuất"
        confirmVariant="danger"
        cancelText="Hủy bỏ"
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      {/* Modal Nhắc Nhở Đăng Nhập Chuẩn In-App UI (thay thế Alert OS) */}
      <FlatModal
        visible={showLoginPromptModal}
        onClose={() => setShowLoginPromptModal(false)}
        title="Yêu Cầu Đăng Nhập"
        message="Vui lòng đăng nhập hoặc tạo tài khoản để thực hiện đặt hàng và tích lũy điểm thưởng thành viên ABC Pharmacy Club."
        icon="person-circle-outline"
        iconColor="#0284C7"
        confirmText="Đăng nhập ngay"
        confirmVariant="primary"
        cancelText="Để sau"
        onCancel={() => setShowLoginPromptModal(false)}
        onConfirm={() => {
          setShowLoginPromptModal(false);
          navigation.navigate('LoginScreen');
        }}
      />

      {/* ─── Trang Tìm Kiếm Toàn Diện Lớn (FullSearchModal - Chuẩn Hình 2) ─── */}
      <FullSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        medicines={medicines}
        onSelectMedicine={openMedicineDetail}
        onAddToCart={addToCart}
        onOpenScanner={() => {
          setShowSearchModal(false);
          setShowScanner(true);
        }}
        onOpenVoiceAI={() => {
          setShowSearchModal(false);
          setActiveTab('AI_CHAT');
        }}
        initialQuery={searchQuery}
      />

      {/* ─── Menu Ngăn Kéo Hamburger Chuẩn Apple iOS (ClinicalSidebarDrawer) ─── */}
      <ClinicalSidebarDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        user={user}
        roleTitle={user ? 'Khách Hàng Thành Viên' : 'Khách Vãng Lai'}
        menuItems={drawerMenuItems}
        onLogout={() => {
          setShowDrawer(false);
          setShowLogoutModal(true);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  // ─── Custom Medical Sky Blue Header (Chuẩn FPT Long Châu Tối Giản) ───
  customHeader: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerHamburgerBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRoundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  headerNotificationDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  headerCartBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingSearchContainer: {
    marginBottom: 2,
    marginTop: 2,
  },
  floatingSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 6,
  },
  floatingSearchPlaceholder: {
    flex: 1,
    fontSize: 12.5,
    color: '#94A3B8',
    fontWeight: '400',
  },
  voucherSearchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
  },
  applyVoucherPillBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  applyVoucherPillText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
  },
  voucherSearchEmptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  voucherSearchEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    textAlign: 'center',
  },
  voucherSearchEmptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  searchActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchSubBtn: {
    padding: 4,
  },
  searchDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },

  // ─── Interactive Callout & Feature Pillars ────────────────
  consultantCalloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  consultantCalloutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultantAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consultantCalloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  consultantCalloutSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 1,
  },
  consultantCalloutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  consultantCalloutBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  twoPillarsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  pillarCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  pillarIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pillarTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0284C7',
    textAlign: 'center',
    lineHeight: 19,
  },
  pillarSub: {
    display: 'none',
  },

  // ─── Quick Action Grid 2x4 Chuẩn Long Châu (Cỡ chữ to rõ, 1 dòng sạch sẽ) ───
  quickActionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickGridItem: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGridIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickGridTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  quickGridSub: {
    display: 'none',
  },

  // ─── Flash Sale Full Width Section (Tràn Viền 100% Màn Hình Mobile) ───
  flashSaleFullSection: {
    marginHorizontal: -16, // Phá vỡ padding của ScrollView để tràn sát 2 mép màn hình
    marginBottom: 16,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FECDD3',
  },
  flashSaleGradientInner: {
    paddingVertical: 14,
  },
  flashSlotTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  flashSlotTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  flashSlotTabActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  flashSlotTime: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 1,
  },
  flashSlotTimeActive: {
    color: '#FFFFFF',
  },
  flashStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashSlotStatus: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  flashSlotStatusActive: {
    color: '#FEF08A',
    fontWeight: '700',
  },
  flashCountdownBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  flashTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flashIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashSaleTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  countdownLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginRight: 2,
  },
  timerBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 22,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerColon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginHorizontal: 1,
  },
  flashProductsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  flashCard: {
    width: 155,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    padding: 10,
    position: 'relative',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  flashDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  flashDiscountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  flashWishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashThumbBox: {
    width: '100%',
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 8,
  },
  flashThumb: {
    width: '90%',
    height: '90%',
  },
  flashMedName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 34,
    lineHeight: 17,
    marginBottom: 4,
  },
  flashPriceRow: {
    marginBottom: 6,
  },
  flashOriginalPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  flashSalePrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 1,
  },
  flashStockBar: {
    height: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  flashStockProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FCA5A5',
    borderRadius: 8,
  },
  flashStockTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  flashStockText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  flashAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  flashAddToCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Sản Phẩm Bán Chạy (Top Best Sellers - Thẻ To Đùng, Flat, Không Border) ─────
  bestSellerSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bestSellerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bestSellerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestSellerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bestSellerSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  bestSellerSectionSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  bestSellerViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  bestSellerViewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
    marginRight: 2,
  },
  bestSellerCardsList: {
    gap: 12,
  },
  bestSellerBigCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
  },
  bestSellerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bestSellerRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestSellerRankBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bestSellerTopRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestSellerRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bestSellerWishlistBtn: {
    padding: 2,
  },
  bestSellerBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bestSellerBigImageBox: {
    width: 105,
    height: 105,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bestSellerBigImage: {
    width: '90%',
    height: '90%',
  },
  bestSellerDiscountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestSellerDiscountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bestSellerDetailsCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  bestSellerMedName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 3,
  },
  bestSellerActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bestSellerActiveText: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: '600',
    flex: 1,
  },
  bestSellerCategoryUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bestSellerCategoryTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestSellerCategoryTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0369A1',
  },
  bestSellerUnitText: {
    fontSize: 11,
    color: '#64748B',
  },
  bestSellerPriceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bestSellerPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#DC2626',
  },
  bestSellerOriginalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  bestSellerFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    marginTop: 2,
  },
  bestSellerProgressCol: {
    flex: 1,
    marginRight: 12,
  },
  bestSellerProgressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 3,
  },
  bestSellerProgressBarFill: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 999,
  },
  bestSellerSoldText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  bestSellerAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  bestSellerAddToCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Góc Sức Khỏe & Cẩm Nang Bệnh (Blog Y Khoa & Thuốc Gợi Ý - Flat, Không Border) ─────
  healthBlogSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  healthBlogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthBlogTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthBlogIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthBlogSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  healthBlogMoreText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  healthBlogTabsScroll: {
    paddingBottom: 4,
    marginBottom: 12,
  },
  healthBlogTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  healthBlogTabPillActive: {
    backgroundColor: '#0284C7',
  },
  healthBlogTabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  healthBlogTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blogArticleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
  },
  blogArticleImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#E2E8F0',
  },
  blogArticleContent: {
    padding: 14,
  },
  blogCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  blogCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  blogArticleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 6,
  },
  blogAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blogAuthorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  blogDotSeparator: {
    marginHorizontal: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
  blogReadTimeText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  blogArticleSummary: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  blogAdviceBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  blogAdviceLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  blogAdviceText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  blogSymptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  blogSymptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blogSymptomText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  recommendedMedsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 14,
    marginTop: 8,
  },
  recommendedMedsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  recommendedMedsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  recommendedMedsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedMedsScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  recommendedMedCard: {
    width: 130,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  recommendedMedThumbBox: {
    width: '100%',
    height: 85,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  recommendedMedThumb: {
    width: '90%',
    height: '90%',
  },
  recommendedMedName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
    height: 32,
  },
  recommendedMedPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 6,
  },
  recommendedMedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    width: '100%',
  },
  recommendedMedAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Category Header & Product Badges ─────────────────────
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  categoryHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  productListHeader: {
    marginBottom: 8,
  },
  otcBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  otcBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284C7',
  },

  // ─── Trust Footer Box (FPT Long Châu) ──────────────────────
  trustFooterBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 16,
    marginBottom: 20,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
    justifyContent: 'space-between',
  },
  trustItem: {
    width: '48%',
    alignItems: 'center',
  },
  trustIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trustTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  trustSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },

  // ─── Raised Center Bottom Navigation Button ───────────────
  raisedCenterBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  raisedCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  raisedCenterInner: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bottomNavBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ─── Branch Modal ─────────────────────────────────────────
  branchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  branchCardItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  branchIconCol: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  branchDistanceBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  branchDistanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  branchAddressText: {
    fontSize: 11,
    color: '#64748B',
    marginVertical: 3,
  },
  branchFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  branchHotlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  selectBranchBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectBranchBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Bottom Navigation ────────────────────────────────────
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  bottomNavLabelActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  // Category Icon Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryGridItem: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryGridItemActive: {
    backgroundColor: '#0284C7',
  },
  categoryGridIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  categoryGridIconBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  categoryGridLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Filter buttons
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#0284C7',
  },
  filterActiveBadge: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterActiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Filter Modal content
  filterModalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  filterModalOptions: {
    gap: 8,
  },
  filterModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterModalOptionActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  filterModalOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  filterModalOptionTextActive: {
    color: '#075985',
    fontWeight: '700',
  },
  // Add to cart icon button
  addToCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 6,
    alignSelf: 'center',
  },
  // Wishlist heart button on product cards
  wishlistCardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
  },
  wishlistCardBtnActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  modalWishlistBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  modalWishlistBtnActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  scanBarcodeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  searchPhoneBtn: {
    backgroundColor: '#0284C7',
    padding: 8,
    borderRadius: 10,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeCatPill: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeCatPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  recentSearchBox: {
    marginBottom: 12,
  },
  recentSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  recentSearchTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  clearRecentText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  recentSearchScroll: {
    flexDirection: 'row',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  productCardWrapper: {
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cartThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  detailMedImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  rxBadge: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginLeft: 6,
  },
  rxBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  productActive: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  productCat: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 4,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 10,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptyCartSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  qtyValText: {
    marginHorizontal: 10,
    fontWeight: '700',
    fontSize: 14,
  },
  voucherBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  applyVoucherBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  applyVoucherText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  priceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
  },
  aiHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#075985',
  },
  aiHeaderSub: {
    fontSize: 12,
    color: '#0369A1',
    marginTop: 2,
  },
  voiceRecordingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  voiceRecordingText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  chatContainer: {
    minHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  chatBubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  aiBubble: {
    backgroundColor: '#F0F9FF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 2,
  },
  userBubble: {
    backgroundColor: '#0284C7',
    alignSelf: 'flex-end',
    borderTopRightRadius: 2,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 19,
  },
  aiChatText: {
    color: '#075985',
  },
  userChatText: {
    color: '#FFFFFF',
  },
  medsSuggestBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#BAE6FD',
  },
  medsSuggestTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 6,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  suggestMedThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  suggestMedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  suggestMedPrice: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  addSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  addSuggestText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  micBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 13,
  },
  sendChatBtn: {
    backgroundColor: '#0284C7',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  voucherBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  voucherBannerSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  voucherLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  voucherDiscountTag: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
  voucherDiscountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 2,
  },
  voucherCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  voucherCodePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  voucherCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  voucherDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  voucherCondition: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  voucherRight: {
    paddingLeft: 8,
  },
  useVoucherBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  useVoucherBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrHeaderBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPaid: {
    backgroundColor: '#F0F9FF',
  },
  statusPaidText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '800',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  serviceFeedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  serviceFeedbackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  orderItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  orderItemRow: {
    fontSize: 12,
    color: '#475569',
    marginVertical: 2,
  },
  orderItemCard: {
    paddingVertical: 8,
  },
  orderItemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderItemThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderItemInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  orderItemQty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderItemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  orderItemReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  orderItemReminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  orderItemReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  orderItemReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  orderItemDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  orderItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  setReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  setReminderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  instructionBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
  },
  instructionBadgeText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  autoCreateAllRemindersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  autoCreateAllRemindersBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  payMethodText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  qrOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  qrOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 4,
    marginBottom: 10,
  },
  modalSection: {
    marginTop: 8,
  },
  secTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  secText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  qrModalCard: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  qrModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  qrHolder: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  closeQrBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeQrBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFEFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5F3FC',
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0E7490',
  },
  reminderBannerSub: {
    fontSize: 11,
    color: '#0891B2',
    marginTop: 2,
  },
  feedbackRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  feedbackRewardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  feedbackRewardSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  ratingBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ratingHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 4,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tagPillSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  tagPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  tagPillTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  feedbackInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
    marginTop: 6,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  subFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeSubFilterPill: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
  },
  subFilterText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  activeSubFilterText: {
    color: '#0284C7',
    fontWeight: '700',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeSortBtn: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activeSortBtnText: {
    color: '#0284C7',
  },
  orderStatusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  activeOrderStatusPill: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  orderStatusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeOrderStatusPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
  },
  universalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  universalModalTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  universalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // ─── Tối Giản Giỏ Hàng & Sản Phẩm Đã Xem (Playbook & UX v2.0) ───
  cartHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  clearCartText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  cartCardMinimal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cartThumbMinimal: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cartItemNameMinimal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  cartItemPriceMinimal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  cartItemUnitText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cartRightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 58,
  },
  qtyCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyCapsuleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCapsuleVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  cartDeleteBtn: {
    padding: 4,
  },
  voucherBoxMinimal: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  voucherInputMinimal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  applyVoucherBtnMinimal: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsShortcutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  rewardsShortcutText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    marginLeft: 8,
  },
  priceSummaryCardMinimal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  summaryRowMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  summaryLabelMinimal: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValMinimal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalLabelMinimal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValMinimal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0284C7',
  },
  emptyCartExploreBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0284C7',
    borderRadius: 12,
  },
  emptyCartExploreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // ─── Recently Viewed Section ───
  recentViewedSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  recentViewedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  recentViewedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentViewedCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  recentViewedScroll: {
    paddingBottom: 8,
  },
  recentProductCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  recentProductThumb: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  recentProductName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 16,
    height: 32,
  },
  recentProductPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 4,
    marginBottom: 8,
  },
  recentQuickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingVertical: 5,
  },
  recentQuickAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    marginLeft: 4,
  },
  // ─── Loyalty Rewards Tab Styles (Tối Giản Chuẩn Long Châu) ───
  // ─── Loyalty Rewards Tab Styles (Tối Giản, Không Card Bao Bọc, Zero-Border) ───
  simpleRewardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  simpleRewardsSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  simpleRewardsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  simpleRewardsLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  simpleTierBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  simpleTierText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  simplePointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  simplePointsValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  simplePointsSuffix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  simpleCashNote: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  simpleBenefitsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  simpleBenefitItem: {
    flex: 1,
    alignItems: 'center',
  },
  simpleBenefitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  simpleBenefitTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  simpleBenefitSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  simpleVouchersSection: {
    marginTop: 2,
  },
  simpleVoucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  simpleSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  simpleVoucherCount: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0284C7',
  },
  simpleVoucherListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  simpleVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  simpleVoucherRowLast: {
    borderBottomWidth: 0,
  },
  simpleVoucherDiscountBox: {
    width: 58,
    height: 48,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  simpleVoucherDiscountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  simpleVoucherDiscountSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  simpleVoucherInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  simpleVoucherCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  simpleVoucherDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  simpleVoucherCondition: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  simpleVoucherApplyBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  simpleVoucherApplyText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  // ─── Account Tab Styles (Chuẩn FPT Long Châu & Zero Border) ───
  accountLongChauHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  accountLongChauHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountLongChauUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountLongChauAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountLongChauNameCol: {
    marginLeft: 14,
    flex: 1,
  },
  accountLongChauName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  accountLongChauPhone: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 3,
    fontWeight: '500',
  },
  accountLongChauCoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  accountLongChauCoinIcon: {
    fontSize: 15,
    marginRight: 4,
  },
  accountLongChauCoinText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  accountLongChauBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  accountLongChauSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  accountLongChauSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  accountLongChauViewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  accountLongChauCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 4,
  },
  accountOrdersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  accountOrderGridItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  accountOrderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  accountOrderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  accountOrderBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  accountOrderGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  accountHealthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 4,
  },
  accountHealthTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountHealthIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHealthMetaCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  accountHealthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountHealthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountHealthTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  accountHealthTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  accountHealthSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  accountHealthDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  accountHealthPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountHealthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  accountHealthPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  accountMenuListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 4,
  },
  accountMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  accountMenuItemLast: {
    borderBottomWidth: 0,
  },
  accountMenuItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountMenuItemTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  accountLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
  },
  accountLogoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  ordersBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'flex-start',
  },
  ordersBackBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0284C7',
    marginLeft: 4,
  },
  // ─── Giao diện Điểm Thưởng & Đổi Quà Chuẩn FPT Long Châu ───
  longChauRewardsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  longChauRewardsTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  longChauActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  longChauActionPillActive: {
    backgroundColor: '#FFFFFF',
  },
  longChauActionPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  longChauActionPillTextActive: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  longChauRewardsHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  longChauRewardsHeroCol: {
    flex: 1,
  },
  longChauRewardsHeroSub: {
    color: '#E0F2FE',
    fontSize: 13.5,
    fontWeight: '500',
    marginBottom: 4,
  },
  longChauRewardsCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  longChauRewardsCoinIcon: {
    fontSize: 28,
    marginRight: 6,
  },
  longChauRewardsCoinVal: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  longChauRewardsRulesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  longChauRewardsRulesText: {
    color: '#BAE6FD',
    fontSize: 13,
    fontWeight: '600',
  },
  longChauRewardsJarContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  longChauJarGraphic: {
    width: 68,
    height: 80,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  longChauJarCap: {
    position: 'absolute',
    top: -6,
    width: 44,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  longChauJarBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  longChauJarTag: {
    position: 'absolute',
    top: 4,
    right: -8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  // Chiến dịch Hope Foundation
  longChauHopeBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: -12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  longChauHopeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  longChauHopeBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.4,
  },
  longChauHopeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  longChauHopeSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 12,
  },
  longChauHopeJoinBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    marginBottom: 12,
  },
  longChauHopeJoinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  longChauHopeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  longChauHopeFooterText: {
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '600',
  },
  // Quà tặng section
  longChauGiftsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  longChauGiftsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  longChauGiftsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  longChauGiftsViewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  longChauGiftsSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 12,
  },
  longChauGiftsFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  longChauGiftTierPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  longChauGiftTierPillActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  longChauGiftTierText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  longChauGiftTierTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  longChauGiftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  longChauGiftCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  longChauGiftImg: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  longChauGiftName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
    height: 34,
    lineHeight: 17,
    marginBottom: 4,
  },
  longChauGiftPrice: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
    marginBottom: 4,
  },
  longChauGiftPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  longChauGiftPointsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  longChauGiftRedeemBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  longChauGiftRedeemText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  // Modal Đổi Quà (Chuẩn ảnh 2 Long Châu)
  redeemModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  redeemModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  redeemModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  redeemModalItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  redeemModalItemThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  redeemModalItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  redeemModalQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  redeemModalQtyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  redeemModalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  redeemModalStepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  redeemModalQtyVal: {
    width: 36,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  redeemModalPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  redeemModalPointsLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  redeemModalPointsUsed: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EA580C',
  },
  redeemModalPointsCurrent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  redeemModalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
  },
  redeemModalWarningText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  redeemModalConfirmBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  redeemModalConfirmBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  redeemModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  redeemModalConfirmTextDisabled: {
    color: '#94A3B8',
  },
  loadMoreMedicinesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
    marginHorizontal: 4,
    gap: 8,
  },
  loadMoreMedicinesText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
});
