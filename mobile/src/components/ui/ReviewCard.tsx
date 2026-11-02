// ReviewCard.tsx - Thẻ hiển thị đánh giá sản phẩm của khách hàng (UC-77)
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductReviewItem } from '../../services/productReviewApiService';

interface ReviewCardProps {
  key?: React.Key;
  review: ProductReviewItem;
  onVoteHelpful?: (reviewId: string) => Promise<void> | void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onVoteHelpful }) => {
  const [helpfulCount, setHelpfulCount] = useState<number>(review.helpfulCount || 0);
  const [voted, setVoted] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleVote = async () => {
    if (voted) return;
    setVoted(true);
    setHelpfulCount((prev) => prev + 1);
    if (onVoteHelpful) {
      try {
        await onVoteHelpful(review._id);
      } catch (e) {
        // Rollback nếu lỗi
        setVoted(false);
        setHelpfulCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Ẩn bớt số điện thoại để bảo vệ quyền riêng tư y tế (VD: 090****567)
  const maskPhone = (phone?: string) => {
    if (!phone || phone.length < 7) return phone || '';
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  };

  // Format ngày tạo
  const formattedDate = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.card}>
      {/* Header người đánh giá */}
      <View style={styles.headerRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(review.reviewerName || 'K')[0].toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.reviewerName}>{review.reviewerName || 'Khách hàng'}</Text>
            {review.isVerifiedPurchase && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#0284C7" />
                <Text style={styles.verifiedText}>Đã mua tại nhà thuốc</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>
            {maskPhone(review.reviewerPhone)} • {formattedDate}
          </Text>
        </View>
      </View>

      {/* Số sao đánh giá */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= review.rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= review.rating ? '#F59E0B' : '#E2E8F0'}
          />
        ))}
        <Text style={styles.ratingNumber}>{review.rating}/5</Text>
      </View>

      {/* Tags gắn nhãn */}
      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {review.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagBadge}>
              <Ionicons name="pricetag-outline" size={10} color="#0284C7" />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Nội dung nhận xét */}
      {review.comment ? (
        <Text style={styles.commentText}>{review.comment}</Text>
      ) : null}

      {/* Hình ảnh đính kèm thực tế */}
      {review.images && review.images.length > 0 && (
        <View style={styles.imagesRow}>
          {review.images.map((imgUrl, idx) => (
            <Pressable key={idx} onPress={() => setSelectedImage(imgUrl)}>
              <Image source={{ uri: imgUrl }} style={styles.thumbImage} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Footer: Bình chọn hữu ích */}
      <View style={styles.footerRow}>
        <Pressable
          style={[styles.helpfulBtn, voted && styles.helpfulBtnActive]}
          onPress={handleVote}
          disabled={voted}
        >
          <Ionicons
            name={voted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={14}
            color={voted ? '#0284C7' : '#64748B'}
          />
          <Text style={[styles.helpfulText, voted && styles.helpfulTextActive]}>
            Hữu ích ({helpfulCount})
          </Text>
        </Pressable>
      </View>

      {/* Modal phóng to ảnh */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedImage(null)}>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 15,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 10,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  thumbImage: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  helpfulBtnActive: {
    backgroundColor: '#E0F2FE',
  },
  helpfulText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  helpfulTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});

