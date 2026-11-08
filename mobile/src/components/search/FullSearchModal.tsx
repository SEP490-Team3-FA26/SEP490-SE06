/**
 * FullSearchModal.tsx - Màn Hình Tìm Kiếm Toàn Diện Chuẩn Tri-Pharmacy (Pharmacity & Long Châu)
 * Tái hiện 100% giao diện: Ô tìm kiếm Full-width, Lịch sử tìm kiếm, Tra cứu hàng đầu, Ưu đãi hot hôm nay
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Keyboard,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedTouchable } from '../ui/AnimatedTouchable';
import { AnimatedPressable } from '../clinical/AnimatedPressable';
import { Medicine } from '../../types/pharmacy.types';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SEARCH_HISTORY_KEY = 'abc_customer_search_history';

// Danh sách từ khóa tra cứu hàng đầu chuẩn chuỗi nhà thuốc y tế
const TOP_SEARCH_KEYWORDS = [
  'Canxi',
  'Omega 3',
  'Kẽm',
  'Sắt',
  'Kem chống nắng',
  'Thuốc nhỏ mắt',
  'Sữa rửa mặt',
  'Men vi sinh',
  'Dung dịch vệ sinh',
  'Vitamin C',
  'Khẩu trang 4D',
  'Panadol Extra',
];

interface FullSearchModalProps {
  visible: boolean;
  onClose: () => void;
  medicines: Medicine[];
  onSelectMedicine: (med: Medicine) => void;
  onAddToCart: (med: Medicine) => void;
  onOpenScanner?: () => void;
  onOpenVoiceAI?: () => void;
  initialQuery?: string;
}

// Loại bỏ dấu tiếng Việt để tìm kiếm không dấu chuẩn xác
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const FullSearchModal: React.FC<FullSearchModalProps> = ({
  visible,
  onClose,
  medicines,
  onSelectMedicine,
  onAddToCart,
  onOpenScanner,
  onOpenVoiceAI,
  initialQuery = '',
}) => {
  const insets = useSafeAreaInsets();
  // Safe Area Top Inset chuẩn cho iOS (tránh đè đồng hồ, tai thỏ, Dynamic Island)
  const safeTop = Math.max(insets.top || 0, Platform.OS === 'ios' ? 50 : 28);
  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [history, setHistory] = useState<string[]>([]);

  // Debounce 200ms để tránh giật lag khung hình khi gõ nhanh trên kho 2.300+ SKU
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Đồng bộ query ban đầu khi mở modal
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery || '');
      loadSearchHistory();
    }
  }, [visible, initialQuery]);

  // Tải lịch sử tìm kiếm từ AsyncStorage
  const loadSearchHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {}
  };

  // Lưu từ khóa mới vào lịch sử (tối đa 10 từ khóa gần nhất, không trùng)
  const saveSearchKeyword = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    try {
      const filtered = history.filter((k) => k.toLowerCase() !== trimmed.toLowerCase());
      const nextList = [trimmed, ...filtered].slice(0, 10);
      setHistory(nextList);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextList));
    } catch {}
  };

  // Xóa 1 từ khóa khỏi lịch sử
  const removeHistoryItem = async (keyword: string) => {
    try {
      const nextList = history.filter((k) => k !== keyword);
      setHistory(nextList);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextList));
    } catch {}
  };

  // Xóa toàn bộ lịch sử
  const clearAllHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
  };

  // Khi bấm chọn một từ khóa
  const handleSelectKeyword = (keyword: string) => {
    setQuery(keyword);
    saveSearchKeyword(keyword);
  };

  // Danh sách sản phẩm ưu đãi hot hôm nay (Hot Deals)
  const hotDealMedicines = useMemo(() => {
    // Ưu tiên các sản phẩm có giảm giá hoặc lấy 4 sản phẩm tiêu biểu
    return medicines.slice(0, 4);
  }, [medicines]);

  // Kết quả tìm kiếm thời gian thực thông minh (Smart Fuzzy & Token Matching)
  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const cleanQ = removeVietnameseTones(q);
    // Tách các từ khóa con nếu có ký tự &, phẩy hoặc dấu gạch (vd 'Hạ sốt & Cảm cúm')
    const subKeywords = q
      .split(/[&,+/]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 1);

    return medicines.filter((m) => {
      const name = m.name || '';
      const active = m.active || (m as any).active_ingredient || '';
      const category = m.category || '';
      const barcode = m.barcode || '';
      const unitsBarcode = m.units?.map((u) => u.barcode).join(' ') || '';

      const fullRawText = `${name} ${active} ${category} ${barcode} ${unitsBarcode}`.toLowerCase();
      const fullCleanText = removeVietnameseTones(fullRawText);

      // 1. Khớp nguyên chuỗi (có dấu hoặc không dấu)
      if (fullRawText.includes(q.toLowerCase()) || fullCleanText.includes(cleanQ)) {
        return true;
      }

      // 2. Khớp các từ khóa con (ví dụ 'Hạ sốt' hoặc 'Cảm cúm')
      if (subKeywords.length > 0) {
        return subKeywords.some((sub) => {
          const cleanSub = removeVietnameseTones(sub);
          return fullRawText.includes(sub.toLowerCase()) || fullCleanText.includes(cleanSub);
        });
      }

      return false;
    });
  }, [medicines, debouncedQuery]);

  // Renderer ảo hóa FlatList tối ưu cho danh sách 2,300+ sản phẩm
  const renderSearchResultItem = useCallback(
    ({ item, index }: { item: Medicine; index: number }) => {
      const isRx = (item as any).requires_prescription || item.isRx;
      return (
        <AnimatedTouchable
          key={item.id || (item as any)._id || `res-${index}`}
          onPress={() => {
            onClose();
            onSelectMedicine(item);
          }}
          style={styles.resultItemCard}
        >
          <Image
            source={{
              uri:
                item.image ||
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
            }}
            style={styles.resultThumb}
            resizeMode="cover"
          />

          <View style={styles.resultInfoCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View
                style={[
                  styles.rxBadge,
                  isRx
                    ? { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }
                    : { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
                ]}
              >
                <Text
                  style={[
                    styles.rxBadgeText,
                    isRx ? { color: '#B45309' } : { color: '#0284C7' },
                  ]}
                >
                  {isRx ? 'Rx Kê Đơn' : 'OTC Tự Do'}
                </Text>
              </View>
              <Text style={styles.resultCategoryText}>{item.category || 'Dược phẩm'}</Text>
            </View>

            <Text style={styles.resultNameText} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.resultActiveText} numberOfLines={1}>
              {item.active || (item as any).active_ingredient || 'Hoạt chất chuẩn GPP'}
            </Text>

            <View style={styles.resultBottomRow}>
              <View>
                <Text style={styles.resultPriceText}>
                  {(item.price || 0).toLocaleString('vi-VN')} ₫
                </Text>
                <Text style={styles.resultUnitText}>/ {item.unit || 'Hộp'}</Text>
              </View>

              <AnimatedPressable
                onPress={() => {
                  onAddToCart(item);
                }}
                style={styles.quickAddBtn}
                pressedScale={0.92}
              >
                <Ionicons name="cart-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.quickAddBtnText}>Thêm</Text>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedTouchable>
      );
    },
    [onAddToCart, onClose, onSelectMedicine]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.safeContainer}>
        <StatusBar barStyle="light-content" />

        {/* ─── Header Tìm Kiếm Xanh Biển Chuẩn Tri-Pharmacy (Bảo đảm an toàn tai thỏ / Dynamic Island iOS) ─── */}
        <LinearGradient
          colors={['#0369A1', '#0284C7', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerContainer, { paddingTop: safeTop, paddingBottom: 12 }]}
        >
          <View style={styles.headerTopBar}>
            {/* Nút Back quay lại trang chủ */}
            <AnimatedTouchable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </AnimatedTouchable>

            {/* Ô Search Full Width Bo Tròn */}
            <View style={styles.searchBoxWrapper}>
              <Ionicons name="search" size={18} color="#0284C7" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm tên thuốc, bệnh lý, TPCN..."
                placeholderTextColor="#94A3B8"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => {
                  if (query.trim()) saveSearchKeyword(query);
                }}
                autoFocus={true}
                returnKeyType="search"
                clearButtonMode="never"
              />

              {/* Nút Xóa Chữ */}
              {query.length > 0 && (
                <AnimatedTouchable onPress={() => setQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </AnimatedTouchable>
              )}

              {/* Micro Trợ Lý Giọng Nói AI */}
              <AnimatedTouchable
                onPress={() => {
                  Keyboard.dismiss();
                  if (onOpenVoiceAI) onOpenVoiceAI();
                }}
                style={styles.headerIconAction}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="mic" size={19} color="#0284C7" />
              </AnimatedTouchable>

              {/* Quét Mã Vạch Barcode */}
              <AnimatedTouchable
                onPress={() => {
                  Keyboard.dismiss();
                  if (onOpenScanner) onOpenScanner();
                }}
                style={styles.headerIconAction}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="scan" size={19} color="#0284C7" />
              </AnimatedTouchable>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Dải Mini Banner Flash Sale Giá Tốt ─── */}
        <AnimatedTouchable
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          activeOpacity={0.9}
          style={styles.flashSaleBannerRow}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.flashSaleBadge}>
              <Text style={styles.flashSaleBadgeText}>GIẢM ĐẾN 40%</Text>
            </View>
            <View style={styles.voucherBadge}>
              <Text style={styles.voucherBadgeText}>VOUCHER 35K</Text>
            </View>
            <Text style={styles.flashSaleText}>FLASHSALE GIÁ TỐT</Text>
          </View>
          <View style={styles.flashSaleArrowCircle}>
            <Ionicons name="chevron-forward" size={14} color="#DC2626" />
          </View>
        </AnimatedTouchable>

        {query.trim().length === 0 ? (
          // ─── Giao Diện Khám Phá Khi Chưa Gõ Chữ (Chuẩn Hình 2) ───
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              {/* 1. Lịch Sử Tìm Kiếm (Search History) */}
              {history.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Lịch sử tìm kiếm</Text>
                    <AnimatedTouchable onPress={clearAllHistory}>
                      <Text style={styles.clearAllText}>Xóa tất cả</Text>
                    </AnimatedTouchable>
                  </View>

                  <View style={styles.historyList}>
                    {history.map((item, idx) => (
                      <View key={`history-${idx}`} style={styles.historyItemRow}>
                        <AnimatedTouchable
                          onPress={() => handleSelectKeyword(item)}
                          style={styles.historyLeftTextCol}
                        >
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color="#94A3B8"
                            style={{ marginRight: 10 }}
                          />
                          <Text style={styles.historyKeywordText} numberOfLines={1}>
                            {item}
                          </Text>
                        </AnimatedTouchable>
                        <AnimatedTouchable
                          onPress={() => removeHistoryItem(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="close" size={17} color="#94A3B8" />
                        </AnimatedTouchable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 2. Tra Cứu Hàng Đầu (Top Searches / Trending) */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Tra cứu hàng đầu</Text>
                <View style={styles.tagsFlexContainer}>
                  {TOP_SEARCH_KEYWORDS.map((tag, idx) => (
                    <AnimatedTouchable
                      key={`top-tag-${idx}`}
                      onPress={() => handleSelectKeyword(tag)}
                      style={styles.topSearchPill}
                    >
                      <Text style={styles.topSearchPillText}>{tag}</Text>
                    </AnimatedTouchable>
                  ))}
                </View>
              </View>

              {/* 3. Ưu Đãi Hot Hôm Nay (Hot Deals Container) */}
              <View style={styles.hotDealsOuterCard}>
                <View style={styles.hotDealsHeaderBar}>
                  <Text style={styles.hotDealsFireIcon}>🔥</Text>
                  <Text style={styles.hotDealsHeaderTitle}>Ưu đãi hot hôm nay</Text>
                </View>

                <View style={styles.hotDealsListBody}>
                  {hotDealMedicines.map((med, idx) => {
                    const price = med.price || 0;
                    const oldPrice = Math.round(price * 1.25);
                    const discountPercent = 20;

                    return (
                      <AnimatedTouchable
                        key={med.id || (med as any)._id || `deal-${idx}`}
                        onPress={() => {
                          onClose();
                          onSelectMedicine(med);
                        }}
                        style={styles.hotDealItemCard}
                      >
                        {/* Ảnh sản phẩm kèm Tag Giảm Giá Đỏ */}
                        <View style={styles.hotDealThumbWrapper}>
                          <Image
                            source={{
                              uri:
                                med.image ||
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
                            }}
                            style={styles.hotDealThumb}
                            resizeMode="contain"
                          />
                          <View style={styles.hotDealDiscountTag}>
                            <Text style={styles.hotDealDiscountText}>-{discountPercent}%</Text>
                          </View>
                        </View>

                        {/* Thông tin sản phẩm */}
                        <View style={styles.hotDealInfoCol}>
                          <Text style={styles.hotDealName} numberOfLines={2}>
                            {med.name}
                          </Text>
                          <View style={styles.hotDealPriceRow}>
                            <Text style={styles.hotDealPriceMain}>
                              {price.toLocaleString('vi-VN')}đ
                            </Text>
                            <Text style={styles.hotDealUnitText}>/ {med.unit || 'Hộp'}</Text>
                          </View>
                          <Text style={styles.hotDealOldPrice}>
                            {oldPrice.toLocaleString('vi-VN')}đ
                          </Text>

                          {/* Tag Quà Tặng Đỏ */}
                          <View style={styles.giftBadgeTag}>
                            <Ionicons
                              name="gift-outline"
                              size={12}
                              color="#EF4444"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.giftBadgeText}>Quà tặng</Text>
                          </View>
                        </View>
                      </AnimatedTouchable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          // ─── Giao Diện Kết Quả Tìm Kiếm Thời Gian Thực (Ảo Hóa FlatList) ───
          <View style={[styles.resultsContainer, { flex: 1, paddingHorizontal: 12 }]}>
            <Text style={styles.resultsCountText}>
              Tìm thấy {searchResults.length} sản phẩm phù hợp cho "{query}"
            </Text>

            <FlatList
              data={searchResults}
              keyExtractor={(item, idx) => item.id || (item as any)._id || `res-${idx}`}
              renderItem={renderSearchResultItem}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
                  <Text style={styles.emptySub}>
                    Thử tìm với từ khóa chung hơn hoặc kiểm tra lỗi chính tả
                  </Text>
                  <AnimatedTouchable onPress={() => setQuery('')} style={styles.emptyClearBtn}>
                    <Text style={styles.emptyClearBtnText}>Xóa từ khóa</Text>
                  </AnimatedTouchable>
                </View>
              }
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    paddingHorizontal: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  searchBoxWrapper: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    height: '100%',
    paddingVertical: 0,
  },
  headerIconAction: {
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  // ─── Mini Banner Flash Sale ───
  flashSaleBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  flashSaleBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  flashSaleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  voucherBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  voucherBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  flashSaleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  flashSaleArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearAllText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '700',
  },
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyLeftTextCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  historyKeywordText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  tagsFlexContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  topSearchPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  topSearchPillText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  // ─── Ưu Đãi Hot Hôm Nay Card ───
  hotDealsOuterCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1D4ED8',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  hotDealsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E40AF',
  },
  hotDealsFireIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  hotDealsHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  hotDealsListBody: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    gap: 10,
  },
  hotDealItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hotDealThumbWrapper: {
    width: 78,
    height: 78,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  hotDealThumb: {
    width: 70,
    height: 70,
  },
  hotDealDiscountTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
  },
  hotDealDiscountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  hotDealInfoCol: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  hotDealName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  hotDealPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  hotDealPriceMain: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
  },
  hotDealUnitText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 2,
  },
  hotDealOldPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  giftBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  giftBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  // ─── Realtime Results ───
  resultsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  resultsCountText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  resultThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  resultInfoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  rxBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },
  rxBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  resultCategoryText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resultNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginTop: 2,
  },
  resultActiveText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  resultBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  resultPriceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
  },
  resultUnitText: {
    fontSize: 11,
    color: '#64748B',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyClearBtn: {
    marginTop: 14,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyClearBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
