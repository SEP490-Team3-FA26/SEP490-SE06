// ProductReviewScreen.tsx - Màn hình đánh giá & review sản phẩm thuốc (UC-77)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { StarRatingInput } from '../../components/ui/StarRatingInput';
import { ReviewCard } from '../../components/ui/ReviewCard';
import { showToast } from '../../components/ui/toastHelper';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import {
  ProductReviewAPI,
  ProductReviewItem,
  ProductReviewSummary,
} from '../../services/productReviewApiService';

const POSITIVE_TAGS = ['Hiệu quả tốt', 'Đóng gói cẩn thận', 'Giao hàng nhanh', 'Hàng chính hãng', 'Giá hợp lý'];
const NEUTRAL_TAGS = ['Dùng được', 'Bình thường', 'Hương vị tạm ổn'];
const NEGATIVE_TAGS = ['Kém hiệu quả', 'Bao bì xấu', 'Giao trễ', 'Khác hàng mô tả'];

export const ProductReviewScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { order, medicine, medicineId: paramMedId, orderId: paramOrderId, orderCode: paramOrderCode } = route?.params || {};

  const demoItem = {
    medicineId: 'med_demo_01',
    id: 'med_demo_01',
    name: 'Viên sủi Berocca Performance bồi bổ năng lượng (Hộp 10 viên)',
    price: 92000,
    unit: 'Hộp',
    quantity: 1,
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/00004944_berocca_performance_mango_10v_3364_60e3_large_79a3205777.jpg'
  };

  // Danh sách các loại thuốc trong đơn hàng có thể đánh giá
  const orderItems: any[] = order?.items || (medicine ? [medicine] : [demoItem]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const currentItem = orderItems[selectedItemIndex] || orderItems[0] || {};

  const currentMedicineId = currentItem.medicineId || currentItem.id || currentItem._id || paramMedId || '';
  const currentMedicineName = currentItem.name || currentItem.medicineName || 'Sản phẩm thuốc';
  const orderId = order?.id || order?._id || paramOrderId || 'ORD-UNKNOWN';
  const orderCode = String(order?.orderCode || paramOrderCode || orderId);

  
  // Tải thông tin chi tiết và hình ảnh thuốc chuẩn từ Database
  const [medDetail, setMedDetail] = useState<any>(currentItem);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (currentMedicineId) {
      setImageError(false);
      ApiService.getMedicineById(currentMedicineId).then((data) => {
        if (data) {
          setMedDetail((prev: any) => ({ ...prev, ...data }));
        }
      });
    }
  }, [currentMedicineId]);

  const displayImage =
    currentItem.image ||
    currentItem.imageUrl ||
    currentItem.image_url ||
    medDetail?.image ||
    medDetail?.image_url ||
    (Array.isArray(medDetail?.images) && medDetail.images[0]) ||
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80';

  // Tab chuyển đổi: 'FORM' (Viết đánh giá) hoặc 'LIST' (Xem đánh giá)
  const [viewMode, setViewMode] = useState<'FORM' | 'LIST'>('FORM');

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Hiệu quả tốt', 'Hàng chính hãng']);
  const [comment, setComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>(
    user?.name || (user as any)?.fullName || order?.patientName || 'Khách hàng',
  );
  const [reviewerPhone, setReviewerPhone] = useState<string>(
    user?.phone || order?.patientPhone || '',
  );
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Community Reviews List State
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [filterRating, setFilterRating] = useState<number | undefined>(undefined);

  // Tải danh sách đánh giá của sản phẩm
  const loadCommunityReviews = useCallback(async () => {
    if (!currentMedicineId) return;
    try {
      setLoadingReviews(true);
      const [revData, sumData] = await Promise.all([
        ProductReviewAPI.getMedicineReviews(currentMedicineId, {
          page: 1,
          limit: 20,
          rating: filterRating,
        }),
        ProductReviewAPI.getMedicineReviewSummary(currentMedicineId),
      ]);
      setReviews(revData?.data || []);
      setSummary(sumData);
    } catch (e: any) {
      console.warn('Lỗi tải đánh giá sản phẩm:', e);
    } finally {
      setLoadingReviews(false);
    }
  }, [currentMedicineId, filterRating]);

  useEffect(() => {
    loadCommunityReviews();
  }, [loadCommunityReviews]);

  // Cập nhật tag gợi ý dựa trên số sao được chọn
  const availableTags = rating >= 4 ? POSITIVE_TAGS : rating === 3 ? NEUTRAL_TAGS : NEGATIVE_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Trạng thái đang tải ảnh lên Cloudinary
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Chọn ảnh từ Camera hoặc Thư viện và tải trực tiếp lên Cloudinary (UC-77)
  const handlePickAndUploadImage = () => {
    if (attachedImages.length >= 3) {
      Alert.alert('Giới hạn', 'Bạn chỉ có thể đính kèm tối đa 3 ảnh đánh giá.');
      return;
    }

    Alert.alert(
      'Tải Ảnh Đánh Giá',
      'Chọn nguồn ảnh sản phẩm thực tế:',
      [
        {
          text: 'Chụp ảnh mới (Camera)',
          onPress: () => processImageUpload('camera'),
        },
        {
          text: 'Chọn từ Thư viện ảnh',
          onPress: () => processImageUpload('library'),
        },
        { text: 'Hủy', style: 'cancel' },
      ],
    );
  };

  const processImageUpload = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền mở Camera để chụp ảnh thuốc thực tế.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền mở Thư viện để chọn ảnh thuốc.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Lỗi', 'Không thể đọc dữ liệu ảnh để tải lên Cloudinary.');
        return;
      }

      setUploadingImage(true);
      showToast.info('Đang tải...', 'Đang đồng bộ ảnh lên Cloudinary...');

      // Gửi dữ liệu base64 qua API Gateway -> Cloudinary Storage
      const cloudinaryUrl = await ProductReviewAPI.uploadReviewImage(
        asset.base64,
        asset.fileName || `review_${Date.now()}.jpg`,
      );

      setAttachedImages((prev) => [...prev, cloudinaryUrl]);
      showToast.success('Thành công', 'Đã tải ảnh lên Cloudinary thành công!');
    } catch (err: any) {
      console.error('Lỗi khi tải ảnh lên Cloudinary:', err);
      Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên máy chủ Cloudinary lúc này.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Gửi đánh giá lên API Gateway
  const handleSubmitReview = async () => {
    if (!currentMedicineId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin sản phẩm để đánh giá.');
      return;
    }
    if (!reviewerName.trim()) {
      Alert.alert('Vui lòng nhập họ tên của bạn.');
      return;
    }
    if (!reviewerPhone.trim()) {
      Alert.alert('Vui lòng nhập số điện thoại để đối chiếu mua hàng.');
      return;
    }

    try {
      setSubmitting(true);
      await ProductReviewAPI.submitReview(currentMedicineId, {
        medicineId: currentMedicineId,
        medicineName: currentMedicineName,
        orderId,
        orderCode,
        userId: user?.id || user?._id || undefined,
        reviewerName: reviewerName.trim(),
        reviewerPhone: reviewerPhone.trim(),
        rating,
        comment: comment.trim(),
        images: attachedImages,
        tags: selectedTags,
        isVerifiedPurchase: true,
      });

      showToast.success('Đánh Giá Thành Công!', 'Cảm ơn bạn đã đóng góp phản hồi về sản phẩm thuốc!');
      Alert.alert(
        'Đã Gửi Đánh Giá',
        `Cảm ơn bạn đã đánh giá ${rating} sao cho sản phẩm "${currentMedicineName}". Phản hồi của bạn sẽ giúp đỡ các bệnh nhân và khách hàng khác!`,
        [
          {
            text: 'Xem Đánh Giá Cộng Đồng',
            onPress: () => {
              setViewMode('LIST');
              loadCommunityReviews();
            },
          },
          {
            text: 'Hoàn Tất',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Lỗi Gửi Đánh Giá', e.message || 'Không thể gửi đánh giá lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header bar */}
      <HeaderBar
        title="Đánh Giá & Review Thuốc"
        subtitle={orderCode ? `Đơn hàng #${orderCode}` : undefined}
        onBack={() => navigation.goBack()}
        gradientVariant="sky"
      />

      {/* Chuyển đổi tab Viết đánh giá / Đánh giá cộng đồng */}
      <View style={styles.tabSwitchContainer}>
        <Pressable
          style={[styles.tabButton, viewMode === 'FORM' && styles.tabButtonActive]}
          onPress={() => setViewMode('FORM')}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={viewMode === 'FORM' ? '#0284C7' : '#64748B'}
          />
          <Text style={[styles.tabButtonText, viewMode === 'FORM' && styles.tabButtonTextActive]}>
            Viết Đánh Giá
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, viewMode === 'LIST' && styles.tabButtonActive]}
          onPress={() => setViewMode('LIST')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={16}
            color={viewMode === 'LIST' ? '#0284C7' : '#64748B'}
          />
          <Text style={[styles.tabButtonText, viewMode === 'LIST' && styles.tabButtonTextActive]}>
            Đánh Giá ({summary?.totalReviews ?? reviews.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Lựa chọn sản phẩm trong đơn nếu đơn có nhiều thuốc */}
        {orderItems.length > 1 && (
          <View style={styles.itemSelectorBox}>
            <Text style={styles.selectorLabel}>Chọn sản phẩm muốn đánh giá:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {orderItems.map((it, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setSelectedItemIndex(idx)}
                  style={[
                    styles.itemPill,
                    selectedItemIndex === idx && styles.itemPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.itemPillText,
                      selectedItemIndex === idx && styles.itemPillTextActive,
                    ]}
                  >
                    {it.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Thông tin sản phẩm được chọn với ảnh chuẩn từ Database */}
        <View style={styles.productBanner}>
          <View style={styles.bannerImageContainer}>
            {!imageError ? (
              <Image
                source={{ uri: displayImage }}
                style={styles.bannerMedicineImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.medicineIconFallback}>
                <Ionicons name="medical" size={24} color="#0284C7" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerMedicineName} numberOfLines={2}>
              {currentMedicineName}
            </Text>
            <Text style={styles.bannerSub}>
              {currentItem.unit || medDetail?.unit ? `Đơn vị: ${currentItem.unit || medDetail?.unit}` : 'Dược phẩm chuẩn GPP'}
              {summary?.averageRating ? ` • ⭐ ${summary.averageRating}/5` : ''}
            </Text>
          </View>
        </View>

        {viewMode === 'FORM' ? (
          /* =========================================================================
             FORM VIẾT ĐÁNH GIÁ (UC-77)
             ========================================================================= */
          <View>
            {/* Chọn số sao */}
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>Bạn cảm thấy sản phẩm này thế nào?</Text>
              <StarRatingInput value={rating} onChange={setRating} size={40} showLabel={true} />

              {/* Tags cảm nhận nhanh */}
              <Text style={styles.subLabel}>Nhận xét nhanh:</Text>
              <View style={styles.tagsContainer}>
                {availableTags.map((tag, idx) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => toggleTag(tag)}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={12}
                        color={isSelected ? '#FFFFFF' : '#0284C7'}
                      />
                      <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Nội dung chi tiết */}
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>Chia sẻ thêm về trải nghiệm sử dụng</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Thuốc có tác dụng nhanh không? Bao bì và hạn sử dụng thế nào? Chia sẻ trải nghiệm để giúp đỡ cộng đồng..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                maxLength={1000}
                value={comment}
                onChangeText={setComment}
              />
              <Text style={styles.charCount}>{comment.length}/1000 ký tự</Text>

              {/* Hình ảnh đính kèm */}
              <Text style={[styles.subLabel, { marginTop: 12 }]}>Hình ảnh thực tế (Tối đa 3 ảnh):</Text>
              <View style={styles.imagesRow}>
                {attachedImages.map((uri, idx) => (
                  <View key={idx} style={styles.imagePreviewBox}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <Pressable style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                {attachedImages.length < 3 && (
                  <Pressable
                    style={[styles.addImageBtn, uploadingImage && { opacity: 0.6 }]}
                    onPress={handlePickAndUploadImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#0284C7" />
                    ) : (
                      <Ionicons name="camera-outline" size={24} color="#0284C7" />
                    )}
                    <Text style={styles.addImageText}>
                      {uploadingImage ? 'Đang tải...' : 'Thêm ảnh'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Thông tin người gửi */}
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>Thông tin người đánh giá</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.singleInput}
                  placeholder="Họ và tên của bạn"
                  value={reviewerName}
                  onChangeText={setReviewerName}
                />
              </View>
              <View style={[styles.inputRow, { marginTop: 8 }]}>
                <Ionicons name="call-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.singleInput}
                  placeholder="Số điện thoại đối chiếu"
                  keyboardType="phone-pad"
                  value={reviewerPhone}
                  onChangeText={setReviewerPhone}
                />
              </View>
              <Text style={styles.privacyNote}>
                🔒 Số điện thoại của bạn sẽ được bảo mật và ẩn 4 số giữa khi hiển thị công khai.
              </Text>
            </View>

            {/* Nút gửi đánh giá */}
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <GradientButton
                title={submitting ? 'Đang gửi đánh giá...' : 'Gửi Đánh Giá Sản Phẩm'}
                onPress={handleSubmitReview}
                disabled={submitting}
                loading={submitting}
                gradientVariant="sky"
              />
            </View>
          </View>
        ) : (
          /* =========================================================================
             DANH SÁCH ĐÁNH GIÁ CỦA CỘNG ĐỒNG (UC-77)
             ========================================================================= */
          <View>
            {/* Thống kê Rating Breakdown */}
            {summary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.bigRatingText}>{summary.averageRating.toFixed(1)}</Text>
                  <View style={styles.starsRowInline}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= Math.round(summary.averageRating) ? 'star' : 'star-outline'}
                        size={15}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsText}>{summary.totalReviews} đánh giá</Text>
                </View>

                {/* Thanh phần trăm từng sao */}
                <View style={styles.summaryRight}>
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const pct = summary.percentages[starNum] || 0;
                    return (
                      <View key={starNum} style={styles.progressRow}>
                        <Text style={styles.starNumLabel}>{starNum}⭐</Text>
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.pctLabel}>{pct}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Lọc theo số sao */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <Pressable
                style={[styles.filterChip, filterRating === undefined && styles.filterChipActive]}
                onPress={() => setFilterRating(undefined)}
              >
                <Text style={[styles.filterChipText, filterRating === undefined && styles.filterChipTextActive]}>
                  Tất cả ({summary?.totalReviews ?? reviews.length})
                </Text>
              </Pressable>
              {[5, 4, 3, 2, 1].map((s) => (
                <Pressable
                  key={s}
                  style={[styles.filterChip, filterRating === s && styles.filterChipActive]}
                  onPress={() => setFilterRating(s)}
                >
                  <Text style={[styles.filterChipText, filterRating === s && styles.filterChipTextActive]}>
                    {s} sao ({summary?.ratingBreakdown[s] || 0})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Danh sách thẻ ReviewCard */}
            {loadingReviews ? (
              <ActivityIndicator size="large" color="#0284C7" style={{ marginVertical: 30 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="chatbox-ellipses-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
                <Text style={styles.emptySub}>
                  Hãy là người đầu tiên chia sẻ cảm nhận về thuốc này!
                </Text>
                <Pressable style={styles.beFirstBtn} onPress={() => setViewMode('FORM')}>
                  <Text style={styles.beFirstBtnText}>Viết đánh giá ngay</Text>
                </Pressable>
              </View>
            ) : (
              reviews.map((rev) => (
                <ReviewCard
                  key={rev._id}
                  review={rev}
                  onVoteHelpful={async (id) => {
                    await ProductReviewAPI.voteHelpful(id);
                  }}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  itemSelectorBox: {
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  itemPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  itemPillActive: {
    backgroundColor: '#0284C7',
  },
  itemPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  itemPillTextActive: {
    color: '#FFFFFF',
  },
  productBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerMedicineImage: {
    width: '100%',
    height: '100%',
  },
  medicineIconFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerMedicineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  tagChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  tagChipText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
  },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  imagePreviewBox: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  singleInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  privacyNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    width: 110,
  },
  bigRatingText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
  },
  starsRowInline: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  totalReviewsText: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  starNumLabel: {
    fontSize: 11,
    color: '#64748B',
    width: 26,
  },
  progressBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  pctLabel: {
    fontSize: 10,
    color: '#94A3B8',
    width: 32,
    textAlign: 'right',
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  beFirstBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  beFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
