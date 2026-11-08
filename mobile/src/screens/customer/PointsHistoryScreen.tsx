/**
 * PointsHistoryScreen.tsx - Màn Hình Lịch Sử Điểm Thưởng & Biến Động Điểm Hội Viên
 * Thiết kế theo phong cách FPT Long Châu chuẩn mực (Zero-Border, Blue Gradient, Tabular Nums)
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PointsHistoryItem,
  filterPointsHistory,
  formatPointsDisplay,
  DEFAULT_POINTS_HISTORY,
} from '../../services/loyaltyRewards.service';

export interface PointsHistoryScreenProps {
  currentPoints?: number;
  tierName?: string;
  onBack?: () => void;
  transactions?: PointsHistoryItem[];
}

export const PointsHistoryScreen: React.FC<PointsHistoryScreenProps> = ({
  currentPoints = 7838,
  tierName = 'Hạng Vàng',
  onBack,
  transactions = DEFAULT_POINTS_HISTORY,
}) => {
  // Tab lọc: Tất cả | Tích điểm | Sử dụng | Hết hạn
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'EARN' | 'USE' | 'EXPIRE'>('ALL');

  // Lọc danh sách giao dịch theo tab hiện tại
  const filteredList = useMemo(() => {
    return filterPointsHistory(transactions, activeFilterTab);
  }, [transactions, activeFilterTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* 1. Header Xanh Auth Liền Mạch */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          testID="btn-back-history"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử điểm thưởng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Thẻ Tổng Quan Điểm Thưởng Khả Dụng (Chuẩn FPT Long Châu) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryLabel}>Tổng điểm tích lũy khả dụng</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{tierName}</Text>
            </View>
          </View>

          <View style={styles.pointsDisplayRow}>
            <Text style={styles.coinIcon}>🪙</Text>
            <Text style={styles.pointsNumber}>{formatPointsDisplay(currentPoints)}</Text>
            <Text style={styles.pointsUnit}>điểm</Text>
          </View>

          <View style={styles.expiryRow}>
            <Ionicons name="information-circle-outline" size={15} color="#93C5FD" />
            <Text style={styles.expiryText}>Điểm sắp hết hạn: 0 điểm vào ngày 31/12/2026</Text>
          </View>
        </View>

        {/* 3. Thanh Tab Phân Loại (Tất cả / Tích điểm / Sử dụng / Hết hạn) */}
        <View style={styles.tabContainer}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'EARN', label: 'Tích điểm' },
            { key: 'USE', label: 'Sử dụng' },
            { key: 'EXPIRE', label: 'Hết hạn' },
          ].map((tab) => {
            const isActive = activeFilterTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                testID={`tab-${tab.key}`}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveFilterTab(tab.key as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. Danh Sách Lịch Sử Biến Động Điểm */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            Chi tiết biến động ({filteredList.length})
          </Text>

          {filteredList.length === 0 ? (
            <View style={styles.emptyContainer} testID="history-empty-state">
              <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Chưa có giao dịch điểm nào</Text>
              <Text style={styles.emptySub}>
                Lịch sử tích lũy và đổi quà của bạn sẽ được hiển thị tại đây.
              </Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const isEarn = item.points > 0 || item.type === 'EARN' || item.type === 'BONUS';
              const isExpire = item.type === 'EXPIRE';

              return (
                <View key={item.id} style={styles.historyItemCard} testID={`history-item-${item.id}`}>
                  {/* Icon loại giao dịch */}
                  <View
                    style={[
                      styles.iconCircle,
                      isEarn
                        ? styles.iconCircleEarn
                        : isExpire
                        ? styles.iconCircleExpire
                        : styles.iconCircleUse,
                    ]}
                  >
                    <Ionicons
                      name={
                        item.type === 'BONUS'
                          ? 'trophy'
                          : isEarn
                          ? 'cart'
                          : isExpire
                          ? 'time'
                          : 'gift'
                      }
                      size={20}
                      color={isEarn ? '#0284C7' : isExpire ? '#64748B' : '#EA580C'}
                    />
                  </View>

                  {/* Nội dung giao dịch */}
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.orderCode ? (
                      <Text style={styles.itemOrderCode}>{item.orderCode}</Text>
                    ) : null}
                    <Text style={styles.itemDate}>{item.date}</Text>
                  </View>

                  {/* Biến động số điểm */}
                  <View style={styles.pointsCol}>
                    <Text
                      style={[
                        styles.itemPoints,
                        isEarn ? styles.itemPointsEarn : styles.itemPointsUse,
                      ]}
                    >
                      {isEarn ? `+${formatPointsDisplay(item.points)}` : `${item.points}`}
                    </Text>
                    <Text style={styles.itemPointsLabel}>điểm</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0284C7',
  },
  header: {
    height: 52,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Thẻ tổng quan
  summaryCard: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#E0F2FE',
    fontSize: 14,
    fontWeight: '500',
  },
  tierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pointsDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  coinIcon: {
    fontSize: 30,
    marginRight: 8,
  },
  pointsNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  pointsUnit: {
    color: '#BAE6FD',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    color: '#E0F2FE',
    fontSize: 12,
  },
  // Tab phân loại
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  tabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Danh sách lịch sử
  historySection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleEarn: {
    backgroundColor: '#E0F2FE',
  },
  iconCircleUse: {
    backgroundColor: '#FFEDD5',
  },
  iconCircleExpire: {
    backgroundColor: '#F1F5F9',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemOrderCode: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  itemPoints: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemPointsEarn: {
    color: '#0284C7',
  },
  itemPointsUse: {
    color: '#EA580C',
  },
  itemPointsLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  // Trạng thái trống
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
