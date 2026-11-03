/**
 * HomeBannerCarousel.tsx - Component Slider Banner Khuyến Mãi Tự Động Trượt Chuẩn FPT Long Châu
 * 
 * Tính năng nổi bật:
 * - 5 Banner y tế / dược phẩm chất lượng cao từ CDN Unsplash mạng thực tế.
 * - Tự động trượt (auto-scroll) mỗi 4 giây mượt mà với setInterval.
 * - Hỗ trợ vuốt tay chuyển slide (onMomentumScrollEnd).
 * - Pagination indicator dots hình viên thuốc chuẩn y tế hiện đại.
 * - Được bọc trong React.memo để bảo đảm hiệu năng tối đa (Zero lag).
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedTouchable } from '../ui/AnimatedTouchable';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface CarouselBannerItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionTab?: string;
  category?: string;
}

// 5 Banner khuyến mãi y tế mạng thực tế chất lượng cao (Unsplash CDN)
export const CAROUSEL_BANNERS: CarouselBannerItem[] = [
  {
    id: 'BANNER_1',
    badge: 'ƯU ĐÃI THÁNG Y TẾ',
    title: 'Sức Khỏe Cả Nhà • Ngàn Deal Cực Xịn',
    subtitle: 'Giảm đến 35% Thuốc & Dược mỹ phẩm chính hãng',
    imageUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&auto=format&fit=crop&q=80',
    actionTab: 'VOUCHERS',
  },
  {
    id: 'BANNER_2',
    badge: 'TĂNG ĐỀ KHÁNG',
    title: 'Vitamin & Thực Phẩm Chức Năng',
    subtitle: 'Tăng miễn dịch mùa giao mùa - Mua 1 tặng 1',
    imageUrl: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=800&auto=format&fit=crop&q=80',
    category: 'VITAMIN',
  },
  {
    id: 'BANNER_3',
    badge: 'DƯỢC MỸ PHẨM',
    title: 'Chăm Sóc Da Liễu Chuyên Sâu',
    subtitle: 'Phục hồi, cấp ẩm và bảo vệ da an toàn',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
    category: 'SKINCARE',
  },
  {
    id: 'BANNER_4',
    badge: 'THIẾT BỊ Y TẾ',
    title: 'Theo Dõi Sức Khỏe Tại Nhà',
    subtitle: 'Máy đo huyết áp, đo đường huyết bảo hành 2 năm',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    category: 'DEVICE',
  },
  {
    id: 'BANNER_5',
    badge: 'TỦ THUỐC GIA ĐÌNH',
    title: 'Thuốc Chuẩn GPP • Giá Tốt Mỗi Ngày',
    subtitle: 'Dược sĩ ABC tư vấn miễn phí 24/7',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
    actionTab: 'AI_CHAT',
  },
];

interface HomeBannerCarouselProps {
  onSelectBanner: (banner: CarouselBannerItem) => void;
}

export const HomeBannerCarousel: React.FC<HomeBannerCarouselProps> = React.memo(
  ({ onSelectBanner }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const scrollRef = useRef<any>(null);
    const bannerWidth = SCREEN_WIDTH - 32;

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = (prev + 1) % CAROUSEL_BANNERS.length;
          scrollRef.current?.scrollTo({ x: nextIndex * bannerWidth, animated: true });
          return nextIndex;
        });
      }, 4000);
      return () => clearInterval(timer);
    }, [bannerWidth]);

    const handleMomentumScrollEnd = (event: any) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / bannerWidth);
      if (index >= 0 && index < CAROUSEL_BANNERS.length && index !== currentIndex) {
        setCurrentIndex(index);
      }
    };

    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          decelerationRate="fast"
          snapToInterval={bannerWidth}
          style={{ width: bannerWidth }}
        >
          {CAROUSEL_BANNERS.map((banner) => (
            <AnimatedTouchable
              key={banner.id}
              activeOpacity={0.92}
              onPress={() => onSelectBanner(banner)}
              style={[styles.carouselSlide, { width: bannerWidth }]}
            >
              <Image
                source={{ uri: banner.imageUrl }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(2, 132, 199, 0.25)', 'rgba(15, 23, 42, 0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.carouselOverlay}
              >
                <View style={styles.carouselBadge}>
                  <Text style={styles.carouselBadgeText}>{banner.badge}</Text>
                </View>
                <Text style={styles.carouselTitle} numberOfLines={1}>
                  {banner.title}
                </Text>
                <Text style={styles.carouselSubtitle} numberOfLines={1}>
                  {banner.subtitle}
                </Text>
              </LinearGradient>
            </AnimatedTouchable>
          ))}
        </ScrollView>

        {/* Dots phân trang chỉ số banner */}
        <View style={styles.carouselDotsRow}>
          {CAROUSEL_BANNERS.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.carouselDot,
                currentIndex === i ? styles.carouselDotActive : styles.carouselDotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  carouselContainer: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselSlide: {
    height: 145,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0284C7',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  carouselOverlay: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  carouselBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  carouselBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  carouselTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#E0F2FE',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  carouselDot: {
    height: 5,
    borderRadius: 2.5,
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: '#0284C7',
  },
  carouselDotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
});

