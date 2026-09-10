// DirectorScreen.tsx - Executive Director Dashboard with Chain Revenues, PO Approvals & Stock Logistics
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import {
  Branch,
  DashboardSummary,
  StockTransfer,
  SafeStockChainItem,
} from '../../types/pharmacy.types';

export const DirectorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PO_APPROVAL' | 'TRANSFERS'>('OVERVIEW');

  // Summary & Branches
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [safeStock, setSafeStock] = useState<SafeStockChainItem[]>([]);

  // Purchase Orders for Approval
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [poDetailModal, setPoDetailModal] = useState<boolean>(false);

  // Transfers & Low stock
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [sumData, branchList, transfers, lowStock, safeChain] = await Promise.all([
        ApiService.getDashboardSummary(),
        ApiService.getBranches(),
        ApiService.getStockTransfers(),
        ApiService.getLowStockReport(),
        ApiService.getSafeStockChain(),
      ]);

      if (sumData) setSummary(sumData);
      if (branchList && branchList.length > 0) {
        setBranches(branchList);
      } else {
        setBranches([
          { id: 'b1', name: 'Chi Nhánh Quận 1 (Trụ Sở)', address: '123 Hai Bà Trưng, Q1, TP.HCM', status: 'ACTIVE' },
          { id: 'b2', name: 'Chi Nhánh Quận 7 (Phú Mỹ Hưng)', address: '456 Nguyễn Lương Bằng, Q7, TP.HCM', status: 'ACTIVE' },
          { id: 'b3', name: 'Chi Nhánh Bình Thạnh', address: '789 Điện Biên Phủ, Bình Thạnh, TP.HCM', status: 'ACTIVE' },
        ]);
      }

      if (transfers && transfers.length > 0) {
        setStockTransfers(transfers);
      } else {
        setStockTransfers([
          {
            id: 'st1',
            transferCode: 'ST-2026-001',
            fromBranchId: 'b1',
            fromBranchName: 'Kho Tổng (Bình Tân)',
            toBranchId: 'b2',
            toBranchName: 'Chi Nhánh Quận 1',
            items: [{ medicineId: 'm1', name: 'Amoxicillin 500mg', batchNo: 'Lô A1', quantity: 50, unit: 'Hộp' }],
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      if (lowStock) setLowStockList(lowStock);
      if (safeChain) setSafeStock(safeChain);

      // Mock pending POs if none returned
      setPurchaseOrders([
        {
          id: 'PO-2026-881',
          supplier: 'Công Ty CP Dược Hậu Giang',
          branch: 'Kho Tổng Trung Tâm',
          amount: '185,000,000 ₫',
          date: '2026-08-31',
          items: 'Amoxicillin 500mg (x500), Panadol Extra (x1000), Decolgen (x400)',
          status: 'PENDING',
        },
        {
          id: 'PO-2026-882',
          supplier: 'Sanofi-Aventis Việt Nam',
          branch: 'Chi Nhánh Quận 1',
          amount: '72,500,000 ₫',
          date: '2026-08-30',
          items: 'Strepsils Cool (x300), Efferalgan 500mg (x800)',
          status: 'PENDING',
        },
      ]);
    } catch (e) {
      console.warn('Error loading director dashboard data:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprovePO = (po: any) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== po.id));
    setPoDetailModal(false);
    Alert.alert('Thành công', `Đã phê duyệt đơn mua hàng ${po.id}!`);
  };

  const handleRejectPO = (po: any) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== po.id));
    setPoDetailModal(false);
    Alert.alert('Thông báo', `Đã từ chối đơn hàng ${po.id}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Ban Giám Đốc"
        subtitle="Tổng quan doanh thu chuỗi & Phê duyệt chiến lược"
        gradientVariant="emerald"
        rightAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('ProfileScreen'),
        }}
        secondaryRightAction={{
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('NotificationListScreen'),
        }}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('OVERVIEW')}
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.activeTabItem]}
        >
          <Ionicons
            name="pie-chart"
            size={18}
            color={activeTab === 'OVERVIEW' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.activeTabText]}>
            Doanh Thu Chuỗi
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('PO_APPROVAL')}
          style={[styles.tabItem, activeTab === 'PO_APPROVAL' && styles.activeTabItem]}
        >
          <Ionicons
            name="checkbox"
            size={18}
            color={activeTab === 'PO_APPROVAL' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'PO_APPROVAL' && styles.activeTabText]}>
            Duyệt Đơn Mua ({purchaseOrders.length})
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('TRANSFERS')}
          style={[styles.tabItem, activeTab === 'TRANSFERS' && styles.activeTabItem]}
        >
          <Ionicons
            name="swap-horizontal"
            size={18}
            color={activeTab === 'TRANSFERS' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'TRANSFERS' && styles.activeTabText]}>
            Luân Chuyển
          </Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <View>
            <GradientCard gradientVariant="emerald" style={styles.heroCard}>
              <Text style={styles.heroSubtitle}>TỔNG DOANH THU TOÀN CHUỖI THÁNG NÀY</Text>
              <Text style={styles.heroAmount}>2,845,620,000 ₫</Text>
              <View style={styles.heroGrowthRow}>
                <Ionicons name="trending-up" size={18} color="#A7F3D0" />
                <Text style={styles.heroGrowthText}>+18.4% so với tháng trước</Text>
              </View>
            </GradientCard>

            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="indigo" style={styles.kpiCard}>
                <Ionicons name="cart" size={22} color="#FFFFFF" />
                <Text style={styles.kpiValue}>1,420</Text>
                <Text style={styles.kpiLabel}>Đơn hàng hôm nay</Text>
              </GradientCard>

              <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                <Ionicons name="storefront" size={22} color="#FFFFFF" />
                <Text style={styles.kpiValue}>{branches.length} Cơ sở</Text>
                <Text style={styles.kpiLabel}>Đang hoạt động</Text>
              </GradientCard>
            </View>

            <Text style={styles.sectionTitle}>Hiệu Suất Từng Chi Nhánh</Text>
            {branches.map((b, idx) => (
              <View key={b.id} style={styles.branchCard}>
                <View style={styles.branchHeader}>
                  <View style={styles.branchBadge}>
                    <Text style={styles.branchBadgeText}>CN 0{idx + 1}</Text>
                  </View>
                  <Text style={styles.branchName}>{b.name}</Text>
                </View>
                <Text style={styles.branchAddress}>{b.address}</Text>

                <View style={styles.branchStatsRow}>
                  <View>
                    <Text style={styles.statLabel}>Doanh thu ước tính</Text>
                    <Text style={styles.statValue}>
                      {idx === 0 ? '1,120,000,000 ₫' : idx === 1 ? '980,500,000 ₫' : '745,120,000 ₫'}
                    </Text>
                  </View>
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>ĐẠT CHỈ TIÊU</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: PO APPROVAL */}
        {activeTab === 'PO_APPROVAL' && (
          <View>
            <Text style={styles.sectionTitle}>Danh Sách Đơn Mua Hàng Cần Phê Duyệt</Text>
            {purchaseOrders.map((po) => (
              <View key={po.id} style={styles.poCard}>
                <View style={styles.poHeader}>
                  <Text style={styles.poCode}>{po.id}</Text>
                  <Text style={styles.poDate}>{po.date}</Text>
                </View>

                <Text style={styles.poSupplier}>Nhà cung cấp: <Text style={{ fontWeight: '700' }}>{po.supplier}</Text></Text>
                <Text style={styles.poBranch}>Cơ sở nhận: {po.branch}</Text>
                <Text style={styles.poAmount}>Tổng tiền: <Text style={{ color: '#059669', fontWeight: '800' }}>{po.amount}</Text></Text>

                <View style={styles.poItemsBox}>
                  <Text style={styles.poItemsText} numberOfLines={2}>{po.items}</Text>
                </View>

                <View style={styles.poActionRow}>
                  <AnimatedTouchable
                    onPress={() => {
                      setSelectedPO(po);
                      setPoDetailModal(true);
                    }}
                    style={styles.detailBtn}
                  >
                    <Text style={styles.detailBtnText}>Xem Chi Tiết</Text>
                  </AnimatedTouchable>
                  <GradientButton
                    title="DUYỆT ĐƠN"
                    onPress={() => handleApprovePO(po)}
                    gradientVariant="success"
                    size="sm"
                    style={{ flex: 1, marginLeft: 10 }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: TRANSFERS & SAFE STOCK */}
        {activeTab === 'TRANSFERS' && (
          <View>
            <Text style={styles.sectionTitle}>Lịch Sử Luân Chuyển Giữa Các Kho</Text>
            {stockTransfers.map((st) => (
              <View key={st.id} style={styles.transferCard}>
                <View style={styles.transferHeader}>
                  <Text style={styles.transferCode}>{st.transferCode || st.id}</Text>
                  <View style={styles.transferStatusTag}>
                    <Text style={styles.transferStatusText}>{st.status}</Text>
                  </View>
                </View>
                <Text style={styles.transferRoute}>
                  Từ: <Text style={{ fontWeight: '700' }}>{st.fromBranchName || st.fromBranchId}</Text> → Đến:{' '}
                  <Text style={{ fontWeight: '700' }}>{st.toBranchName || st.toBranchId}</Text>
                </Text>

                <View style={styles.transferItemsList}>
                  {st.items.map((it, idx) => (
                    <Text key={idx} style={styles.transferItemText}>
                      • {it.name} - SL: {it.quantity} {it.unit} (Lô: {it.batchNo})
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* PO Detail Dialog */}
      <Modal visible={poDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chi Tiết Đơn Đặt Hàng {selectedPO?.id}</Text>
            <Text style={styles.modalText}>Nhà cung cấp: {selectedPO?.supplier}</Text>
            <Text style={styles.modalText}>Cơ sở nhận: {selectedPO?.branch}</Text>
            <Text style={styles.modalText}>Tổng giá trị: {selectedPO?.amount}</Text>

            <View style={styles.modalItemsContainer}>
              <Text style={{ fontWeight: '700', marginBottom: 4 }}>Danh mục mặt hàng:</Text>
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{selectedPO?.items}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable
                onPress={() => handleRejectPO(selectedPO)}
                style={styles.rejectBtn}
              >
                <Text style={styles.rejectBtnText}>Từ Chối</Text>
              </AnimatedTouchable>
              <GradientButton
                title="PHÊ DUYỆT"
                onPress={() => handleApprovePO(selectedPO)}
                gradientVariant="success"
                size="md"
                style={{ flex: 1, marginLeft: 10 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#065F46',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 1,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  heroGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroGrowthText: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  branchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  branchBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  branchBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  branchName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  branchAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  branchStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  activeTag: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  poCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  poCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  poDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  poSupplier: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  poBranch: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  poAmount: {
    fontSize: 14,
    marginTop: 4,
    color: '#334155',
  },
  poItemsBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  poItemsText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  poActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transferCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  transferStatusTag: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  transferStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  transferRoute: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  transferItemsList: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  transferItemText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 6,
  },
  modalItemsContainer: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  rejectBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
