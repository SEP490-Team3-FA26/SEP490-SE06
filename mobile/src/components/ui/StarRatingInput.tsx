// StarRatingInput.tsx - Thành phần chọn số sao đánh giá tương tác (1 đến 5 sao) (UC-77)
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
  disabled?: boolean;
  showLabel?: boolean;
}

const RATING_LABELS: Record<number, { text: string; color: string; icon: string }> = {
  1: { text: 'Rất thất vọng', color: '#EF4444', icon: 'sad-outline' },
  2: { text: 'Không hài lòng', color: '#F97316', icon: 'heart-dislike-outline' },
  3: { text: 'Bình thường', color: '#F59E0B', icon: 'happy-outline' },
  4: { text: 'Hài lòng', color: '#0284C7', icon: 'heart-outline' },
  5: { text: 'Tuyệt vời & Rất khuyến nghị', color: '#0284C7', icon: 'star' },
};

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 36,
  disabled = false,
  showLabel = true,
}) => {
  const currentLabel = RATING_LABELS[value] || RATING_LABELS[5];

  return (
    <View style={styles.container}>
      {/* 5 ngôi sao tương tác */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = starIndex <= value;
          return (
            <Pressable
              key={starIndex}
              onPress={() => !disabled && onChange(starIndex)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.starButton,
                pressed && !disabled && { transform: [{ scale: 1.18 }] },
              ]}
              disabled={disabled}
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={size}
                color={isFilled ? '#F59E0B' : '#CBD5E1'}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Nhãn mô tả cảm xúc tương ứng */}
      {showLabel && (
        <View style={[styles.labelBadge, { backgroundColor: `${currentLabel.color}15` }]}>
          <Ionicons name={currentLabel.icon as any} size={15} color={currentLabel.color} />
          <Text style={[styles.labelText, { color: currentLabel.color }]}>
            {value} sao — {currentLabel.text}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  starButton: {
    padding: 4,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

