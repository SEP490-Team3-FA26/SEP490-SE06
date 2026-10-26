import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Clipboard,
  Image,
  StatusBar,
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
} from '../../components/clinical';
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

export const CustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, auth } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'STORE' | 'CART' | 'AI_CHAT' | 'VOUCHERS' | 'ORDERS'>('STORE');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

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
  const [selectedMedDetail, setSelectedMedDetail] = useState<Medicine | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Advanced Filters & Sorting for Store Tab
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<'ALL' | 'UNDER_100' | '100_300' | 'OVER_300'>('ALL');
  const [selectedRxFilter, setSelectedRxFilter] = useState<'ALL' | 'RX' | 'OTC'>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC'>('DEFAULT');

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
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [selectedOrderQR, setSelectedOrderQR] = useState<Order | null>(null);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

  const handleOpenFeedback = (ord: Order) => {
    setFeedbackOrder(ord);
    setFeedbackRating(5);
    setFeedbackTags(['Dược sĩ tận tâm', 'Thuốc chuẩn chính hãng']);
    setFeedbackComment('');
  };

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

  // Tự động làm tươi Wishlist mỗi khi màn hình CustomerScreen được focus lại
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

  const TRENDING_KEYWORDS = [
    'Hạ sốt & Cảm cúm',
    'Khẩu trang 4D',
    'Men vi sinh Bio',
    'Đo huyết áp Omron',
    'Vitamin C sủi',
    'Dạ dày Gaviscon',
    'Dầu cá Omega-3',
    'Xịt mũi thảo dược',
  ];

  const SEASONAL_ADVICE = {
    FLU: {
      title: 'Cảm Cúm & Viêm Họng Giao Mùa',
      desc: 'Thời tiết thay đổi đột ngột làm suy giảm niêm mạc hô hấp. Giữ ấm cổ họng, bổ sung Vitamin C và dùng thuốc giảm đau hạ sốt đúng liều.',
      tags: ['Sốt nhẹ', 'Đau họng', 'Nghẹt mũi'],
    },
    STOMACH: {
      title: 'Đau Dạ Dày & Trào Ngược Axit',
      desc: 'Ăn uống thất thường hoặc stress kích thích tăng tiết dịch vị. Khuyến nghị dùng men vi sinh cân bằng hệ tiêu hóa và thuốc kháng acid.',
      tags: ['Đầy hơi', 'Ợ chua', 'Trào ngược'],
    },
    ALLERGY: {
      title: 'Dị Ứng Thời Tiết & Viêm Da',
      desc: 'Bụi mịn và phấn hoa gây ngứa mũi, dị ứng mẩn đỏ. Sử dụng nước muối sinh lý xịt rửa hằng ngày và thuốc kháng histamine thế hệ mới.',
      tags: ['Mẩn ngứa', 'Hắt hơi', 'Khô da'],
    },
    IMMUNITY: {
      title: 'Tăng Đề Kháng & Phòng Ngừa Dịch',
      desc: 'Bổ sung Kẽm, Vitamin C sủi, Đông trùng hạ thảo giúp củng cố hệ miễn dịch tự nhiên cho người lớn tuổi và trẻ nhỏ.',
      tags: ['Đề kháng khỏe', 'Vitamin C', 'Kẽm Gluconat'],
    },
  };

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

  // Sync cart to storage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart)).catch(() => {});
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
        setSelectedMedDetail(res.medicine);
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
          setSelectedMedDetail(local);
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* ─── Modern Medical Sky Blue Header (Pharmacity & Long Châu & An Khang) ── */}
      <LinearGradient
        colors={['#0369A1', '#0284C7', '#38BDF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.customHeader}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Top Branding & Auth Action Row */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandTitleRow}>
            <View style={styles.brandIconCircle}>
              <Ionicons name="medkit" size={14} color="#0284C7" />
            </View>
            <Text style={styles.brandTitleText}>ABC PHARMACY</Text>
          </View>

          <View style={styles.headerActionRow}>
            {/* Guest / User Profile Pill Button */}
            {!user ? (
              <AnimatedTouchable
                onPress={() => navigation.navigate('LoginScreen')}
                style={styles.headerLoginPill}
              >
                <Ionicons name="person-circle" size={16} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.headerLoginPillText}>Đăng nhập</Text>
              </AnimatedTouchable>
            ) : (
              <AnimatedTouchable
                onPress={() => navigation.navigate('ProfileScreen')}
                style={styles.headerUserPill}
              >
                <Ionicons name="person-circle" size={16} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.headerUserPillText} numberOfLines={1}>
                  {user.name || (user as any).fullName || 'Cá nhân'}
                </Text>
              </AnimatedTouchable>
            )}

            {/* Notification Bell */}
            <AnimatedTouchable
              onPress={() => navigation.navigate('NotificationListScreen')}
              style={styles.headerRoundBtn}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </AnimatedTouchable>

            {/* Wishlist Button with Heart Icon & Count Badge */}
            <AnimatedTouchable
              onPress={() =>
                navigation.navigate('CustomerWishlistScreen', {
                  onAddToCart: (item: any) => addToCart(item),
                })
              }
              style={styles.headerRoundBtn}
            >
              <Ionicons
                name={wishlistTotalCount > 0 ? 'heart' : 'heart-outline'}
                size={20}
                color={wishlistTotalCount > 0 ? '#EF4444' : '#FFFFFF'}
              />
              {wishlistTotalCount > 0 && (
                <View style={[styles.headerCartBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.headerCartBadgeText}>
                    {wishlistTotalCount > 99 ? '99+' : wishlistTotalCount}
                  </Text>
                </View>
              )}
            </AnimatedTouchable>

            {/* Cart Button with Count Badge */}
            <AnimatedTouchable
              onPress={() => setActiveTab('CART')}
              style={styles.headerRoundBtn}
            >
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              {cartTotalCount > 0 && (
                <View style={styles.headerCartBadge}>
                  <Text style={styles.headerCartBadgeText}>
                    {cartTotalCount > 99 ? '99+' : cartTotalCount}
                  </Text>
                </View>
              )}
            </AnimatedTouchable>
          </View>
        </View>

        {/* Location Delivery Selector Row (Tách riêng hàng độc lập, không bị đè) */}
        <AnimatedTouchable
          onPress={() => setShowBranchModal(true)}
          style={styles.locationBar}
          activeOpacity={0.85}
        >
          <Ionicons name="location-sharp" size={12} color="#BAE6FD" style={{ marginRight: 4 }} />
          <Text style={styles.locationBarText} numberOfLines={1}>
            {selectedBranch ? `Giao tại: ${selectedBranch.name}` : 'Giao tại: Chọn chi nhánh ABC'}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#BAE6FD" style={{ marginLeft: 4 }} />
        </AnimatedTouchable>

        {/* Floating Pill Search Bar */}
        <View style={styles.floatingSearchContainer}>
          <View style={styles.floatingSearchBox}>
            <Ionicons name="search" size={18} color="#0284C7" style={styles.searchIcon} />
            <TextInput
              style={styles.floatingSearchInput}
              placeholder="Tìm thuốc, bệnh lý, vitamin, dược mỹ phẩm..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSaveSearch(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery ? (
              <AnimatedTouchable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </AnimatedTouchable>
            ) : (
              <View style={styles.searchActionGroup}>
                <AnimatedTouchable
                  onPress={() => setActiveTab('AI_CHAT')}
                  style={styles.searchSubBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="mic-outline" size={18} color="#0284C7" />
                </AnimatedTouchable>
                <AnimatedTouchable
                  onPress={() => setShowScanner(true)}
                  style={styles.searchSubBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="barcode-outline" size={18} color="#0284C7" />
                </AnimatedTouchable>
              </View>
            )}
          </View>
        </View>

        {/* Trending Search Chips (Dải từ khóa tìm kiếm thịnh hành) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingScroll}
        >
          {TRENDING_KEYWORDS.map((kw, idx) => (
            <AnimatedPressable
              key={`trend-${idx}`}
              onPress={() => {
                setSearchQuery(kw);
                handleSaveSearch(kw);
              }}
              style={styles.trendingChip}
              pressedScale={0.94}
            >
              <Ionicons name="trending-up" size={11} color="#BAE6FD" style={{ marginRight: 4 }} />
              <Text style={styles.trendingChipText}>{kw}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#0284C7']} />}
      >
        {/* TAB 1: STORE - Master Tri-Pharmacy Landing Page */}
        <View style={{ display: activeTab === 'STORE' ? 'flex' : 'none' }}>
          <View>
            {/* 5 Từ Khóa Tìm Kiếm Gần Nhất */}
            {!searchQuery && recentSearches.length > 0 && (
              <View style={styles.recentSearchBox}>
                <View style={styles.recentSearchHeader}>
                  <Text style={styles.recentSearchTitle}>Tìm kiếm gần đây (5 từ):</Text>
                  <AnimatedTouchable onPress={handleClearRecentSearches}>
                    <Text style={styles.clearRecentText}>Xóa tất cả</Text>
                  </AnimatedTouchable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentSearchScroll}>
                  {recentSearches.map((kw, i) => (
                    <AnimatedPressable
                      key={`recent-${i}`}
                      onPress={() => setSearchQuery(kw)}
                      style={styles.recentChip}
                      pressedScale={0.94}
                    >
                      <Ionicons name="time-outline" size={13} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.recentChipText}>{kw}</Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>
            )}

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

            {/* 2. Hai Thẻ Tiện Ích Đột Phá (Chuẩn An Khang) */}
            <View style={styles.twoPillarsRow}>
              <AnimatedTouchable
                onPress={() => setShowScanner(true)}
                style={[styles.pillarCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
              >
                <View style={[styles.pillarIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="barcode-outline" size={24} color="#0284C7" />
                </View>
                <Text style={styles.pillarTitle}>Tra cứu toa & Quét mã</Text>
                <Text style={styles.pillarSub}>Quét mã vạch vỏ hộp thuốc</Text>
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => navigation.navigate('MedicineReminderScreen')}
                style={[styles.pillarCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              >
                <View style={[styles.pillarIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="alarm" size={24} color="#16A34A" />
                </View>
                <Text style={[styles.pillarTitle, { color: '#15803D' }]}>Nhắc uống thuốc</Text>
                <Text style={[styles.pillarSub, { color: '#16A34A' }]}>Offline 100% không mất báo</Text>
              </AnimatedTouchable>
            </View>

            {/* 3. Lưới Hành Động Nhanh (Quick Action Grid 2x4 chuẩn 3 ông lớn) */}
            <View style={styles.quickActionGridContainer}>
              {[
                { id: 'STORE', title: 'Tủ thuốc', sub: 'Toàn diện', icon: 'medkit', color: '#0284C7', bg: '#E0F2FE', action: () => { setSelectedCategory('ALL'); setSearchQuery(''); } },
                { id: 'AI_CHAT', title: 'Dược sĩ AI', sub: 'Tư vấn 24/7', icon: 'chatbubble-ellipses', color: '#0EA5E9', bg: '#E0F2FE', action: () => setActiveTab('AI_CHAT') },
                { id: 'REMINDER', title: 'Nhắc thuốc', sub: 'Cữ chuẩn', icon: 'alarm', color: '#F59E0B', bg: '#FEF3C7', action: () => navigation.navigate('MedicineReminderScreen') },
                { id: 'SCAN', title: 'Quét mã', sub: 'Chính hãng', icon: 'barcode', color: '#8B5CF6', bg: '#EDE9FE', action: () => setShowScanner(true) },
                { id: 'BRANCHES', title: 'Nhà thuốc', sub: 'Chi nhánh', icon: 'storefront', color: '#0EA5E9', bg: '#E0F2FE', action: () => setShowBranchModal(true) },
                { id: 'VOUCHERS', title: 'Săn voucher', sub: 'Ưu đãi sốc', icon: 'pricetags', color: '#EC4899', bg: '#FCE7F3', action: () => setActiveTab('VOUCHERS') },
                { id: 'SEASONAL', title: 'Bệnh mùa', sub: 'Phác đồ', icon: 'fitness', color: '#0284C7', bg: '#E0F2FE', action: () => setSeasonalCategory('FLU') },
                { id: 'ORDERS', title: 'Đơn của tôi', sub: 'Lịch sử mua', icon: 'receipt', color: '#6366F1', bg: '#E0E7FF', action: () => setActiveTab('ORDERS') },
              ].map((item) => (
                <AnimatedTouchable
                  key={item.id}
                  onPress={item.action}
                  style={styles.quickGridItem}
                >
                  <View style={[styles.quickGridIconBox, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.quickGridTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.quickGridSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            {/* 4. Banner Khuyến Mãi Sức Khỏe Toàn Diện */}
            <View style={styles.heroPromoBanner}>
              <LinearGradient
                colors={['#0284C7', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroPromoInner}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>ƯU ĐÃI THÁNG Y TẾ</Text>
                  </View>
                  <Text style={styles.promoMainTitle}>
                    Sức Khỏe Cả Nhà • Ngàn Deal Cực Xịn
                  </Text>
                  <Text style={styles.promoSubTitle}>
                    Giảm đến 35% Vitamin & Dược mỹ phẩm • Freeship đơn từ 150K
                  </Text>
                </View>
                <View style={styles.promoArtBox}>
                  <Ionicons name="sparkles" size={32} color="#FDE047" />
                </View>
              </LinearGradient>
            </View>

            {/* 5. Khung Giờ Vàng Flash Sale (Pharmacity & An Khang) */}
            <View style={styles.flashSaleSection}>
              {/* Flash sale slots header */}
              <View style={styles.flashSlotTabsRow}>
                <AnimatedTouchable
                  onPress={() => setFlashSaleSlot('SLOT_1')}
                  style={[styles.flashSlotTab, flashSaleSlot === 'SLOT_1' && styles.flashSlotTabActive]}
                >
                  <Text style={[styles.flashSlotTime, flashSaleSlot === 'SLOT_1' && styles.flashSlotTimeActive]}>
                    08:00 - 12:00
                  </Text>
                  <Text style={[styles.flashSlotStatus, flashSaleSlot === 'SLOT_1' && styles.flashSlotStatusActive]}>
                    Đang diễn ra
                  </Text>
                </AnimatedTouchable>

                <AnimatedTouchable
                  onPress={() => setFlashSaleSlot('SLOT_2')}
                  style={[styles.flashSlotTab, flashSaleSlot === 'SLOT_2' && styles.flashSlotTabActive]}
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
                >
                  <Text style={[styles.flashSlotTime, flashSaleSlot === 'SLOT_3' && styles.flashSlotTimeActive]}>
                    18:00 - 22:00
                  </Text>
                  <Text style={[styles.flashSlotStatus, flashSaleSlot === 'SLOT_3' && styles.flashSlotStatusActive]}>
                    Tối nay
                  </Text>
                </AnimatedTouchable>
              </View>

              {/* Flash sale countdown header bar */}
              <View style={styles.flashCountdownBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.flashSaleTitle}>FLASH SALE GIÁ TỐT</Text>
                </View>

                {/* Countdown Box Numbers */}
                <FlashSaleCountdown />
              </View>

              {/* Flash sale horizontal product cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.flashProductsScroll}
              >
                {(medicines.length > 0 ? medicines.slice(0, 6) : []).map((med, idx) => {
                  const originalPrice = Math.round((med.price || 50000) * 1.35);
                  return (
                    <AnimatedPressable
                      key={`flash-${med.id || idx}`}
                      onPress={() => setSelectedMedDetail(med)}
                      style={styles.flashCard}
                      pressedScale={0.97}
                    >
                      <View style={styles.flashDiscountBadge}>
                        <Text style={styles.flashDiscountText}>-35%</Text>
                      </View>
                      <AnimatedTouchable
                        onPress={() => toggleWishlist(med)}
                        style={styles.flashWishlistBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={isWishlisted(med.id || (med as any)._id) ? 'heart' : 'heart-outline'}
                          size={16}
                          color={isWishlisted(med.id || (med as any)._id) ? '#EF4444' : '#94A3B8'}
                        />
                      </AnimatedTouchable>
                      <Image
                        source={{ uri: med.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                        style={styles.flashThumb}
                        resizeMode="cover"
                      />
                      <Text style={styles.flashMedName} numberOfLines={2}>
                        {med.name}
                      </Text>
                      <Text style={styles.flashOriginalPrice}>
                        {originalPrice.toLocaleString('vi-VN')} ₫
                      </Text>
                      <Text style={[styles.flashSalePrice, TypographyTokens.tabularNums]}>
                        {med.price.toLocaleString('vi-VN')} ₫
                      </Text>

                      {/* Stock Progress Bar */}
                      <View style={styles.flashStockBar}>
                        <View style={[styles.flashStockProgress, { width: `${60 + (idx * 6) % 35}%` }]} />
                        <Text style={styles.flashStockText}>
                          Đã bán {15 + (idx * 3)} suất
                        </Text>
                      </View>

                      <AnimatedTouchable
                        onPress={() => {
                          addToCart(med);
                          showToast.success('Thành công', `Đã thêm ${med.name} vào giỏ hàng!`);
                        }}
                        style={styles.flashAddToCartBtn}
                      >
                        <Text style={styles.flashAddToCartText}>Chọn mua</Text>
                      </AnimatedTouchable>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 6. Chuyên Mục Bệnh Theo Mùa (FPT Long Châu) */}
            <View style={styles.seasonalSection}>
              <View style={styles.seasonalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-half-outline" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                  <Text style={styles.seasonalSectionTitle}>Bệnh Phổ Biến Theo Mùa</Text>
                </View>
              </View>

              {/* Seasonal Category Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonalTabsScroll}>
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
                      styles.seasonalTabPill,
                      seasonalCategory === s.id && styles.seasonalTabPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.seasonalTabPillText,
                        seasonalCategory === s.id && styles.seasonalTabPillTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </AnimatedTouchable>
                ))}
              </ScrollView>

              {/* Seasonal Advice Callout Card */}
              <View style={styles.seasonalAdviceCard}>
                <Text style={styles.seasonalAdviceTitle}>
                  {SEASONAL_ADVICE[seasonalCategory]?.title}
                </Text>
                <Text style={styles.seasonalAdviceDesc}>
                  {SEASONAL_ADVICE[seasonalCategory]?.desc}
                </Text>
                <View style={styles.seasonalTagsRow}>
                  {SEASONAL_ADVICE[seasonalCategory]?.tags.map((t, ti) => (
                    <View key={`stag-${ti}`} style={styles.seasonalTagPill}>
                      <Ionicons name="checkmark-circle" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.seasonalTagText}>{t}</Text>
                    </View>
                  ))}
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

            {/* 7. Category Icon Grid */}
            <View style={styles.categoryHeaderRow}>
              <Text style={styles.sectionTitle}>Danh Mục Dược Phẩm</Text>
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
              filteredMedicines.map((med, idx) => (
                <View
                  key={med.id || (med as any)._id || (med as any).sku || `med-${idx}`}
                  style={styles.productCardWrapper}
                >
                  <View style={styles.productCard}>
                    <AnimatedPressable
                      onPress={() => setSelectedMedDetail(med)}
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
              ))
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

        {/* TAB 2: CART */}
        <View style={{ display: activeTab === 'CART' ? 'flex' : 'none' }}>
          <View>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyCartTitle}>Giỏ hàng của bạn đang trống</Text>
                <Text style={styles.emptyCartSub}>Hãy chọn các loại thuốc cần thiết từ Cửa hàng.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Danh Sách Sản Phẩm Đã Chọn ({cart.length})</Text>
                {cart.map((item, idx) => (
                  <View key={item.medicine.id || (item.medicine as any)._id || `cart-${idx}`} style={styles.cartCard}>
                    <Image
                      source={{ uri: item.medicine.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80' }}
                      style={styles.cartThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cartItemName}>{item.medicine.name}</Text>
                      <Text style={styles.cartItemPrice}>
                        {item.medicine.price.toLocaleString('vi-VN')} ₫ / {item.medicine.unit}
                      </Text>
                    </View>

                    <View style={styles.qtyControlRow}>
                      <AnimatedTouchable
                        onPress={() => updateQuantity(item.medicine.id, -1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </AnimatedTouchable>
                      <Text style={styles.qtyValText}>{item.quantity}</Text>
                      <AnimatedTouchable
                        onPress={() => updateQuantity(item.medicine.id, 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </AnimatedTouchable>
                    </View>
                  </View>
                ))}

                {/* Voucher input */}
                <View style={styles.voucherBox}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Nhập mã voucher (PHARMA10, FREESHIP...)"
                    placeholderTextColor="#94A3B8"
                    value={voucherCodeInput}
                    onChangeText={setVoucherCodeInput}
                    autoCapitalize="characters"
                  />
                  <AnimatedTouchable onPress={() => applyVoucher()} style={styles.applyVoucherBtn}>
                    <Text style={styles.applyVoucherText}>ÁP DỤNG</Text>
                  </AnimatedTouchable>
                </View>

                {/* Summary Card */}
                <View style={styles.priceSummaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tạm tính:</Text>
                    <Text style={styles.summaryVal}>{subtotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  {appliedVoucher ? (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: '#0284C7' }]}>
                        Giảm giá ({appliedVoucher.code}):
                      </Text>
                      <Text style={[styles.summaryVal, { color: '#0284C7' }]}>
                        -{discount.toLocaleString('vi-VN')} ₫
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                    <Text style={styles.totalLabel}>Tổng Thanh Toán:</Text>
                    <Text style={styles.totalVal}>{finalTotal.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                </View>

                <ClinicalButton
                  title="TIẾN HÀNH ĐẶT HÀNG"
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Yêu Cầu Đăng Nhập',
                        'Vui lòng đăng nhập hoặc tạo tài khoản để tiến hành đặt hàng và chọn địa chỉ giao nhận thuốc. Giỏ hàng của bạn vẫn được lưu nguyên vẹn!',
                        [
                          { text: 'Để Sau', style: 'cancel' },
                          {
                            text: 'Đăng Nhập Ngay',
                            onPress: () => navigation.navigate('LoginScreen'),
                          },
                        ]
                      );
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

        {/* TAB 4: KHO VOUCHER */}
        <View style={{ display: activeTab === 'VOUCHERS' ? 'flex' : 'none' }}>
          <View>
            <View style={styles.voucherBanner}>
              <Ionicons name="gift" size={32} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.voucherBannerTitle}>Kho Voucher & Ưu Đãi Dược Phẩm</Text>
                <Text style={styles.voucherBannerSub}>Thu thập mã giảm giá và áp dụng trực tiếp khi thanh toán đơn</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Mã Khuyến Mãi Khả Dụng ({vouchers.length})</Text>
            {vouchers.map((v, idx) => (
              <View key={v.id || (v as any)._id || v.code || `voucher-${idx}`} style={styles.voucherCard}>
                <View style={styles.voucherLeft}>
                  <Text style={styles.voucherDiscountTag}>
                    {v.discountType === 'PERCENT' ? `-${v.discountValue}%` : `-${(v.discountValue / 1000)}k`}
                  </Text>
                  <Text style={styles.voucherDiscountLabel}>GIẢM GIÁ</Text>
                </View>

                <View style={styles.voucherCenter}>
                  <View style={styles.voucherCodePill}>
                    <Text style={styles.voucherCodeText}>{v.code}</Text>
                  </View>
                  <Text style={styles.voucherDesc}>{v.description || 'Ưu đãi dành cho khách hàng ABC Pharmacy'}</Text>
                  <Text style={styles.voucherCondition}>
                    {v.minOrderValue ? `Đơn tối thiểu ${v.minOrderValue.toLocaleString('vi-VN')} ₫` : 'Áp dụng cho mọi đơn hàng'}
                  </Text>
                </View>

                <View style={styles.voucherRight}>
                  <AnimatedTouchable
                    onPress={() => {
                      Clipboard.setString(v.code);
                      applyVoucher(v.code);
                      setActiveTab('CART');
                    }}
                    style={styles.useVoucherBtn}
                  >
                    <Text style={styles.useVoucherBtnText}>Dùng Ngay</Text>
                  </AnimatedTouchable>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* TAB 5: ORDERS */}
        <View style={{ display: activeTab === 'ORDERS' ? 'flex' : 'none' }}>
          <View>
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

            <Text style={styles.sectionTitle}>Lịch Sử Đơn Thuốc ({orders.length})</Text>

            {/* Order status chips scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {[
                { id: 'ALL', label: 'Tất cả', count: orders.length },
                {
                  id: 'PENDING',
                  label: 'Chờ thanh toán',
                  count: orders.filter((o) => {
                    const s = String(o.status || '').toUpperCase();
                    const p = String(o.paymentStatus || '').toUpperCase();
                    return s === 'PENDING' || s === 'SUBMITTED' || p === 'PENDING';
                  }).length,
                },
                {
                  id: 'SHIPPING',
                  label: 'Đang giao',
                  count: orders.filter((o) => {
                    const s = String(o.status || '').toUpperCase();
                    return s === 'DELIVERING' || s === 'SHIPPING' || s === 'PROCESSING' || s === 'CONFIRMED';
                  }).length,
                },
                {
                  id: 'COMPLETED',
                  label: 'Đã hoàn tất',
                  count: orders.filter((o) => {
                    const s = String(o.status || '').toUpperCase();
                    const p = String(o.paymentStatus || '').toUpperCase();
                    return s === 'COMPLETED' || s === 'DELIVERED' || p === 'PAID';
                  }).length,
                },
                {
                  id: 'CANCELLED',
                  label: 'Đã hủy',
                  count: orders.filter((o) => {
                    const s = String(o.status || '').toUpperCase();
                    const p = String(o.paymentStatus || '').toUpperCase();
                    return s === 'CANCELLED' || s === 'FAILED' || p === 'CANCELLED';
                  }).length,
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
                              // Lên lịch notification báo thức cho từng reminder
                              for (const rem of created) {
                                await MedicineReminderService.scheduleReminderSlidingWindow(rem, 7);
                              }
                              showToast.success(
                                'Tạo Lịch Thành Công!',
                                `Đã tự động tạo lịch và chuông báo thức cho ${created.length} loại thuốc trong đơn ${ord.orderCode || ord.id}!`
                              );
                              Alert.alert(
                                'Đã Tạo Lịch Nhắc Thuốc',
                                `Hệ thống đã tự động tính liều dùng và hẹn giờ nhắc uống thuốc (08:00 & 20:00 sau ăn) cho toàn bộ đơn hàng ${ord.orderCode || ord.id}. Bạn có muốn chuyển sang màn hình Nhắc Thuốc để xem chi tiết?`,
                                [
                                  { text: 'Ở lại đây', style: 'cancel' },
                                  {
                                    text: 'Xem Lịch Ngay',
                                    onPress: () => navigation.navigate('MedicineReminderScreen'),
                                  },
                                ]
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
          </View>
        </View>
      </ScrollView>

      {/* Medication Detail Modal with Indications & Dosage */}
      <ClinicalModalSheet
        visible={selectedMedDetail !== null}
        onClose={() => setSelectedMedDetail(null)}
        title={selectedMedDetail?.name || 'Chi Tiết Thuốc'}
        subtitle={`Hoạt chất: ${selectedMedDetail?.active || selectedMedDetail?.active_ingredient || 'Đang cập nhật'}`}
      >
        {selectedMedDetail?.image ? (
          <Image
            source={{ uri: selectedMedDetail.image }}
            style={styles.detailMedImage}
            resizeMode="cover"
          />
        ) : null}
        <Text style={[styles.modalPrice, TypographyTokens.tabularNums]}>
          {selectedMedDetail?.price?.toLocaleString('vi-VN')} ₫ / {selectedMedDetail?.unit || 'Hộp'}
        </Text>

        <ScrollView style={{ maxHeight: 240, marginVertical: 8 }}>
          <View style={styles.modalSection}>
            <Text style={styles.secTitle}>Chỉ định & Công dụng:</Text>
            <Text style={styles.secText}>
              {selectedMedDetail?.cong_dung || selectedMedDetail?.indications || 'Điều trị các triệu chứng theo chỉ định của bác sĩ/dược sĩ.'}
            </Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.secTitle}>Liều lượng & Cách dùng:</Text>
            <Text style={styles.secText}>
              {selectedMedDetail?.cach_dung || selectedMedDetail?.default_dosage || 'Uống theo đơn hoặc hướng dẫn trên bao bì thuốc.'}
            </Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.secTitle}>Chống chỉ định & Thận trọng:</Text>
            <Text style={styles.secText}>
              {selectedMedDetail?.luu_y || selectedMedDetail?.contraindications || 'Mẫn cảm với bất kỳ thành phần nào của thuốc.'}
            </Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.secTitle}>Tác dụng phụ:</Text>
            <Text style={styles.secText}>
              {selectedMedDetail?.tac_dung_phu || selectedMedDetail?.side_effects || 'Buồn nôn, dị ứng nhẹ (ngưng dùng nếu gặp triệu chứng lạ).'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalBtnRow}>
          <ClinicalButton
            title="Đóng"
            variant="outline"
            size="md"
            onPress={() => setSelectedMedDetail(null)}
            style={{ flex: 1, marginRight: 8 }}
          />
          {selectedMedDetail && (
            <AnimatedPressable
              onPress={() => toggleWishlist(selectedMedDetail)}
              style={[
                styles.modalWishlistBtn,
                isWishlisted(selectedMedDetail.id || (selectedMedDetail as any)._id) &&
                  styles.modalWishlistBtnActive,
              ]}
              pressedScale={0.90}
            >
              <Ionicons
                name={
                  isWishlisted(selectedMedDetail.id || (selectedMedDetail as any)._id)
                    ? 'heart'
                    : 'heart-outline'
                }
                size={22}
                color={
                  isWishlisted(selectedMedDetail.id || (selectedMedDetail as any)._id)
                    ? '#EF4444'
                    : '#64748B'
                }
              />
            </AnimatedPressable>
          )}
          <ClinicalButton
            title="THÊM VÀO GIỎ"
            variant="primary"
            size="md"
            onPress={() => {
              if (selectedMedDetail) {
                addToCart(selectedMedDetail);
                showToast.success('Thành công', `Đã thêm ${selectedMedDetail.name} vào giỏ hàng!`);
              }
              setSelectedMedDetail(null);
            }}
            style={{ flex: 2 }}
          />
        </View>
      </ClinicalModalSheet>

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
                            style={[styles.selectBranchBtn, isSelected && { backgroundColor: '#059669' }]}
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

        {/* Tab 2: Danh mục */}
        <AnimatedTouchable
          onPress={() => {
            setActiveTab('STORE');
            setSelectedCategory('ALL');
          }}
          style={styles.bottomNavItem}
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color="#94A3B8"
          />
          <Text style={styles.bottomNavLabel}>
            Danh mục
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

        {/* Tab 5: Tài khoản / Đơn mua */}
        <AnimatedTouchable
          onPress={() => setActiveTab('ORDERS')}
          style={styles.bottomNavItem}
        >
          <Ionicons
            name={activeTab === 'ORDERS' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'ORDERS' ? '#0284C7' : '#94A3B8'}
          />
          <Text style={[styles.bottomNavLabel, activeTab === 'ORDERS' && styles.bottomNavLabelActive]}>
            Đơn mua
          </Text>
        </AnimatedTouchable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  // ─── Custom Medical Sky Blue Header ──────────────────────
  customHeader: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandTitleText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  locationBarText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '600',
    maxWidth: 280,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLoginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLoginPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  headerUserPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 105,
  },
  headerUserPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  headerRoundBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerCartBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingSearchContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  floatingSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  floatingSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchSubBtn: {
    padding: 4,
  },
  trendingScroll: {
    paddingVertical: 2,
    gap: 6,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendingChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
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
    gap: 10,
    marginBottom: 12,
  },
  pillarCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  pillarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pillarTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
  },
  pillarSub: {
    fontSize: 10.5,
    color: '#64748B',
  },

  // ─── Quick Action Grid 2x4 ────────────────────────────────
  quickActionGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 8,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  quickGridItem: {
    width: '22.5%',
    alignItems: 'center',
  },
  quickGridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickGridTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  quickGridSub: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },

  // ─── Hero Promo Banner ────────────────────────────────────
  heroPromoBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  heroPromoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  promoBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  promoBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  promoMainTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  promoSubTitle: {
    fontSize: 11,
    color: '#E0F2FE',
  },
  promoArtBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ─── Flash Sale Section ───────────────────────────────────
  flashSaleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  flashSlotTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  flashSlotTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flashSlotTabActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  flashSlotTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  flashSlotTimeActive: {
    color: '#FFFFFF',
  },
  flashSlotStatus: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  flashSlotStatusActive: {
    color: '#FEE2E2',
    fontWeight: '600',
  },
  flashCountdownBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  flashSaleTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -0.3,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 10.5,
    color: '#64748B',
  },
  timerBox: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerColon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginHorizontal: 2,
  },
  flashProductsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  flashCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    position: 'relative',
  },
  flashDiscountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flashDiscountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  flashThumb: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 6,
  },
  flashMedName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 30,
  },
  flashOriginalPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  flashSalePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  flashStockBar: {
    height: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 6,
    position: 'relative',
  },
  flashStockProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#F87171',
    borderRadius: 7,
  },
  flashStockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'center',
    zIndex: 1,
  },
  flashAddToCartBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  flashAddToCartText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ─── Seasonal Illness Section ─────────────────────────────
  seasonalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 14,
  },
  seasonalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seasonalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  seasonalTabsScroll: {
    marginBottom: 10,
  },
  seasonalTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginRight: 6,
  },
  seasonalTabPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  seasonalTabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  seasonalTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  seasonalAdviceCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  seasonalAdviceTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
  },
  seasonalAdviceDesc: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  seasonalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seasonalTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  seasonalTagText: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '600',
  },

  // ─── Category Header & Product Badges ─────────────────────
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryGridItemActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryGridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryGridIconBoxActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  categoryGridLabel: {
    fontSize: 10,
    fontWeight: '600',
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
  flashWishlistBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
    fontWeight: '800',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPendingText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    marginBottom: 8,
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
  orderItemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  setReminderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
  },
  instructionBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
    borderWidth: 0.5,
    borderColor: '#A5F3FC',
  },
  instructionBadgeText: {
    fontSize: 11,
    color: '#0E7490',
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
});
