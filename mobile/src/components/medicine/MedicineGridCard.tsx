/**
 * MedicineGridCard.tsx - Thẻ Dược Phẩm Lưới 2 Cột Chuẩn Y Tế (UI Component Layer)
 * Tách biệt hoàn toàn khỏi Màn hình (Screen Layer):
 * 1. Đảm nhận hiển thị 1 thẻ thuốc trong lưới 2 cột (Width: 48.5%).
 * 2. Khung ảnh tỉ lệ 1:1 hình vuông chuẩn Shopee/Long Châu, tích hợp MedicineSmartImage.
 * 3. Huy hiệu Rx/OTC, Nút Tim Wishlist, Tên thuốc 2 dòng đều nhau, Hoạt chất, Giá niêm yết và Nút Thêm vào giỏ (+).
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Medicine } from '../../types/pharmacy.types';
import { AnimatedPressable } from '../clinical/AnimatedPressable';
import { MedicineSmartImage } from './MedicineSmartImage';
import { TypographyTokens } from '../../theme/tokens';

export interface MedicineGridCardProps {
  medicine: Medicine;
  isWishlisted: boolean;
  onPressDetail: (medicine: Medicine) => void;
  onToggleWishlist: (medicine: Medicine) => void;
  onAddToCart: (medicine: Medicine) => void;
}

export const MedicineGridCard: React.FC<MedicineGridCardProps> = React.memo(({
  medicine,
  isWishlisted,
  onPressDetail,
  onToggleWishlist,
  onAddToCart,
}) => {
  const activeIngredient = medicine.active || medicine.active_ingredient || (medicine.category ? `Nhóm: ${medicine.category}` : 'Dược phẩm chính hãng');
  const unitLabel = medicine.unit || 'Hộp';
  const priceDisplay = (medicine.price || 0).toLocaleString('vi-VN');

  return (
    <View style={styles.cardContainer}>
      {/* 1. Khung Ảnh Vuông 1:1 Tỉ Lệ Chuẩn Y Tế */}
      <AnimatedPressable
        onPress={() => onPressDetail(medicine)}
        style={styles.imageContainer}
        pressedScale={0.96}
      >
        <MedicineSmartImage
          uri={medicine.image}
          category={medicine.category}
          name={medicine.name}
          style={styles.productImage}
        />

        {/* Huy hiệu phân loại Rx (Kê đơn) hoặc OTC (Không kê đơn) */}
        {medicine.isRx ? (
          <View style={styles.rxBadge}>
            <Text style={styles.rxBadgeText}>Rx</Text>
          </View>
        ) : (
          <View style={styles.otcBadge}>
            <Text style={styles.otcBadgeText}>OTC</Text>
          </View>
        )}

        {/* Nút yêu thích Tim (Wishlist) ở góc trên bên phải khung ảnh */}
        <TouchableOpacity
          onPress={() => onToggleWishlist(medicine)}
          style={[styles.wishlistBtn, isWishlisted && styles.wishlistBtnActive]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={16}
            color={isWishlisted ? '#EF4444' : '#64748B'}
          />
        </TouchableOpacity>
      </AnimatedPressable>

      {/* 2. Thân Thông Tin Dược Phẩm */}
      <AnimatedPressable
        onPress={() => onPressDetail(medicine)}
        style={styles.bodyContainer}
        pressedScale={0.98}
      >
        {/* Tên thuốc cố định 2 dòng (36px) để 2 card cạnh nhau không bao giờ bị lệch */}
        <Text style={styles.productName} numberOfLines={2}>
          {medicine.name}
        </Text>

        {/* Hoạt chất chính hoặc nhóm dược lý */}
        <Text style={styles.productActive} numberOfLines={1}>
          {activeIngredient}
        </Text>

        {/* 3. Hàng Chân Thẻ: Giá Niêm Yết & Nút Thêm Nhanh Vào Giỏ */}
        <View style={styles.bottomRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.productPrice, TypographyTokens.tabularNums]} numberOfLines={1}>
              {priceDisplay} ₫
            </Text>
            <Text style={styles.productUnit} numberOfLines={1}>
              /{unitLabel}
            </Text>
          </View>

          <AnimatedPressable
            onPress={() => onAddToCart(medicine)}
            style={styles.addCartBtn}
            pressedScale={0.88}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </AnimatedPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  rxBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 2,
  },
  rxBadgeText: {
    color: '#DC2626',
    fontSize: 9.5,
    fontWeight: '800',
  },
  otcBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 2,
  },
  otcBadgeText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '800',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  wishlistBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  bodyContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    height: 36,
    marginBottom: 2,
  },
  productActive: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceCol: {
    flex: 1,
    marginRight: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
  },
  productUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  addCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
});

