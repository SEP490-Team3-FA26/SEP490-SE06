// WarehouseScreen.tsx - Warehouse & Logistics Management: Stock, Goods Receipts & AI Inspection
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { Medicine, StockTransfer } from '../../types/pharmacy.types';

export const WarehouseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'RECEIPTS' | 'TRACE' | 'EXPIRATION'>('INVENTORY');

  // Inventory state
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // Goods Receipts state
  const [receipts, setReceipts] = useState<any[]>([
    {
      id: 'GRN-2026-001',
      poCode: 'PO-8821',
      supplier: 'Công ty Cổ phần Dược Hậu Giang',
      status: 'INSPECTING',
      date: '2026-08-31',
      items: [
        { name: 'Amoxicillin 500mg', expected: 200, actual: 200, unit: 'Hộp', status: 'VERIFIED' },
        { name: 'Panadol Extra', expected: 500, actual: 490, unit: 'Hộp', status: 'PENDING' },
      ],
    },
    {
      id: 'GRN-2026-002',
      poCode: 'PO-8834',
      supplier: 'Sanofi-Aventis',
      status: 'PENDING_APPROVAL',
      date: '2026-08-30',
      items: [
        { name: 'Decolgen Forte', expected: 300, actual: 300, unit: 'Vỉ', status: 'VERIFIED' },
      ],
    },
  ]);

  // Lot tracing state
  const [batchNoQuery, setBatchNoQuery] = useState<string>('');
  const [tracing, setTracing] = useState<boolean>(false);
  const [traceResult, setTraceResult] = useState<any | null>(null);

  // Expiration report state
  const [expiredList, setExpiredList] = useState<any[]>([
    { name: 'Cefuroxim 500mg', batchNo: 'Lô D1', expDate: '2026-09-20', stock: 12, unit: 'Hộp', daysLeft: 20 },
    { name: 'Strepsils Cool', batchNo: 'Lô E1', expDate: '2026-10-01', stock: 40, unit: 'Hộp', daysLeft: 31 },
  ]);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [meds, lowStock, grnList, expReport] = await Promise.all([
        ApiService.getMedicines({ search: searchQuery }),
        ApiService.getLowStockReport(),
        ApiService.getGoodsReceipts(),
        ApiService.getExpirationReport(),
      ]);

      if (meds && meds.length > 0) setMedicines(meds);
      if (grnList && grnList.length > 0) setReceipts(grnList);
      if (expReport && expReport.length > 0) setExpiredList(expReport);
    } catch (e) {
      console.warn('Error loading warehouse data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTraceLot = async () => {
    if (!batchNoQuery.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập số Lô thuốc cần tra cứu (ví dụ: Lô A1, Lô B1).');
      return;
    }

    setTracing(true);
    const result = await ApiService.traceLot(batchNoQuery.trim());
    setTracing(false);

    if (result) {
      setTraceResult(result);
    } else {
      // Mock result fallback
      setTraceResult({
        batchNo: batchNoQuery.trim().toUpperCase(),
        medicineName: 'Amoxicillin 500mg',
        supplier: 'Dược Hậu Giang',
        receivedDate: '2026-06-15',
        expDate: '2027-12-31',
        initialStock: 1000,
        currentStock: 450,
        transactions: [
          { type: 'IMPORT', date: '2026-06-15', qty: '+1000 Hộp', note: 'Nhập theo PO-8801' },
          { type: 'TRANSFER_OUT', date: '2026-07-02', qty: '-300 Hộp', note: 'Điều chuyển Chi nhánh Q1' },
          { type: 'SALE', date: '2026-08-10', qty: '-250 Hộp', note: 'Xuất bán lẻ quầy' },
        ],
      });
    }
  };

  const handleApproveReceipt = async (grnId: string) => {
    await ApiService.approveGoodsReceipt(grnId);
    setReceipts((prev) =>
      prev.map((r) => (r.id === grnId ? { ...r, status: 'COMPLETED' } : r))
    );
    Alert.alert('Thành công', `Đã hoàn tất kiểm kê và nhập kho cho phiếu ${grnId}!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Quản Lý Kho"
        subtitle="Kiểm kê tồn kho, Phiếu nhập hàng & AI Kiểm đếm"
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
          onPress={() => setActiveTab('INVENTORY')}
          style={[styles.tabItem, activeTab === 'INVENTORY' && styles.activeTabItem]}
        >
          <Ionicons
            name="cube"
            size={18}
            color={activeTab === 'INVENTORY' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>
            Tồn Kho
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('RECEIPTS')}
          style={[styles.tabItem, activeTab === 'RECEIPTS' && styles.activeTabItem]}
        >
          <Ionicons
            name="enter"
            size={18}
            color={activeTab === 'RECEIPTS' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'RECEIPTS' && styles.activeTabText]}>
            Nhập Kho
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('TRACE')}
          style={[styles.tabItem, activeTab === 'TRACE' && styles.activeTabItem]}
        >
          <Ionicons
            name="barcode"
            size={18}
            color={activeTab === 'TRACE' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'TRACE' && styles.activeTabText]}>
            Truy Vết Lô
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('EXPIRATION')}
          style={[styles.tabItem, activeTab === 'EXPIRATION' && styles.activeTabItem]}
        >
          <Ionicons
            name="alert-circle"
            size={18}
            color={activeTab === 'EXPIRATION' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'EXPIRATION' && styles.activeTabText]}>
            Hạn Dùng
          </Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* TAB 1: INVENTORY */}
        {activeTab === 'INVENTORY' && (
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm thuốc theo tên, hoạt chất, danh mục..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="emerald" style={styles.kpiCard}>
                <Ionicons name="medkit" size={22} color="#FFFFFF" />
                <Text style={styles.kpiValue}>{medicines.length}</Text>
                <Text style={styles.kpiLabel}>Mặt hàng thuốc</Text>
              </GradientCard>

              <GradientCard gradientVariant="sunset" style={styles.kpiCard}>
                <Ionicons name="warning" size={22} color="#FFFFFF" />
                <Text style={styles.kpiValue}>
                  {medicines.filter((m) => m.stock < 20).length}
                </Text>
                <Text style={styles.kpiLabel}>Cảnh báo tồn thấp</Text>
              </GradientCard>
            </View>

            <Text style={styles.sectionTitle}>Danh Mục Tồn Kho</Text>
            {medicines.map((med) => {
              const isExpanded = expandedMedId === med.id;
              const isLowStock = med.stock < 20;

              return (
                <View key={med.id} style={styles.medicineCard}>
                  <AnimatedTouchable
                    onPress={() => setExpandedMedId(isExpanded ? null : med.id)}
                    style={styles.medHeaderRow}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.medName}>{med.name}</Text>
                        {med.isRx ? (
                          <View style={styles.rxBadge}>
                            <Text style={styles.rxBadgeText}>Rx</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.medActive}>Hoạt chất: {med.active}</Text>
                      <Text style={styles.medCategory}>{med.category}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.medStock,
                          { color: isLowStock ? '#DC2626' : '#059669' },
                        ]}
                      >
                        {med.stock} {med.unit}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#94A3B8"
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </AnimatedTouchable>

                  {/* Expanded Batches */}
                  {isExpanded && (
                    <View style={styles.batchesSection}>
                      <Text style={styles.batchesHeader}>Chi Tiết Các Lô Hàng:</Text>
                      {med.batches && med.batches.length > 0 ? (
                        med.batches.map((b, idx) => (
                          <View key={idx} style={styles.batchRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="pricetag-outline" size={14} color="#059669" />
                              <Text style={styles.batchNo}> {b.batchNo}</Text>
                            </View>
                            <Text style={styles.batchExp}>HSD: {b.expDate}</Text>
                            <Text style={styles.batchStock}>SL: {b.stock}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noBatchText}>Chưa có thông tin lô hàng cụ thể.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: RECEIPTS */}
        {activeTab === 'RECEIPTS' && (
          <View>
            <Text style={styles.sectionTitle}>Phiếu Nhập Hàng Đang Xử Lý</Text>
            {receipts.map((gr) => (
              <View key={gr.id} style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                  <View>
                    <Text style={styles.receiptCode}>{gr.id}</Text>
                    <Text style={styles.receiptPo}>Theo đơn: {gr.poCode}</Text>
                  </View>
                  <View
                    style={[
                      styles.receiptStatusTag,
                      { backgroundColor: gr.status === 'COMPLETED' ? '#ECFDF5' : '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.receiptStatusText,
                        { color: gr.status === 'COMPLETED' ? '#059669' : '#D97706' },
                      ]}
                    >
                      {gr.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.supplierText}>NCC: {gr.supplier}</Text>

                <View style={styles.receiptItemsList}>
                  {gr.items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.receiptItemRow}>
                      <Text style={styles.itemName}>• {it.name}</Text>
                      <Text style={styles.itemQty}>
                        Dự kiến: {it.expected} | Đã đếm: {it.actual} {it.unit}
                      </Text>
                    </View>
                  ))}
                </View>

                {gr.status !== 'COMPLETED' ? (
                  <GradientButton
                    title="HOÀN TẤT NHẬP KHO"
                    onPress={() => handleApproveReceipt(gr.id)}
                    gradientVariant="primary"
                    size="sm"
                    style={{ marginTop: 10 }}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: TRACE LOT */}
        {activeTab === 'TRACE' && (
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="barcode-outline" size={20} color="#059669" />
              <TextInput
                style={styles.searchInput}
                placeholder="Nhập số Lô (vd: Lô A1, Lô B1, Lô D1)..."
                placeholderTextColor="#94A3B8"
                value={batchNoQuery}
                onChangeText={setBatchNoQuery}
              />
            </View>

            <GradientButton
              title="TRA CỨU VÒNG ĐỜI LÔ HÀNG"
              onPress={handleTraceLot}
              loading={tracing}
              gradientVariant="indigo"
              size="md"
              style={{ marginBottom: 18 }}
            />

            {traceResult && (
              <View style={styles.traceCard}>
                <View style={styles.traceHeader}>
                  <Ionicons name="shield-checkmark" size={24} color="#059669" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.traceBatchNo}>{traceResult.batchNo}</Text>
                    <Text style={styles.traceMedName}>{traceResult.medicineName}</Text>
                  </View>
                </View>

                <View style={styles.traceMetaGrid}>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Nhà cung cấp:</Text>
                    <Text style={styles.metaVal}>{traceResult.supplier}</Text>
                  </View>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Hạn sử dụng:</Text>
                    <Text style={styles.metaVal}>{traceResult.expDate}</Text>
                  </View>
                  <View style={styles.traceMetaCol}>
                    <Text style={styles.metaLabel}>Số lượng tồn hiện tại:</Text>
                    <Text style={[styles.metaVal, { color: '#059669', fontWeight: '800' }]}>
                      {traceResult.currentStock}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 14 }]}>
                  Lịch Sử Giao Dịch & Luân Chuyển:
                </Text>
                {traceResult.transactions?.map((tx: any, idx: number) => (
                  <View key={idx} style={styles.txRow}>
                    <View style={styles.txDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>{tx.type} ({tx.date})</Text>
                      <Text style={styles.txNote}>{tx.note}</Text>
                    </View>
                    <Text style={styles.txQty}>{tx.qty}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 4: EXPIRATION REPORT */}
        {activeTab === 'EXPIRATION' && (
          <View>
            <Text style={styles.sectionTitle}>Danh Sách Thuốc Cận Date / Cần Xử Lý</Text>
            {expiredList.map((item, idx) => (
              <View key={idx} style={styles.expCard}>
                <View style={styles.expHeader}>
                  <Ionicons name="alarm" size={20} color="#DC2626" />
                  <Text style={styles.expMedName}>{item.name}</Text>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>Còn {item.daysLeft} ngày</Text>
                  </View>
                </View>
                <Text style={styles.expSub}>
                  Số Lô: <Text style={{ fontWeight: '700' }}>{item.batchNo}</Text> • Hạn: {item.expDate}
                </Text>
                <Text style={styles.expStock}>
                  Tồn kho cần thanh lý/đổi trả: <Text style={{ fontWeight: '800', color: '#DC2626' }}>{item.stock} {item.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 12,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 3,
  },
  activeTabText: {
    color: '#065F46',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 18,
    padding: 14,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medName: {
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
  medActive: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  medCategory: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  medStock: {
    fontSize: 15,
    fontWeight: '800',
  },
  batchesSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  batchesHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  batchNo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  batchExp: {
    fontSize: 11,
    color: '#64748B',
  },
  batchStock: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  noBatchText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  receiptCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptPo: {
    fontSize: 12,
    color: '#64748B',
  },
  receiptStatusTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  receiptStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  supplierText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  receiptItemsList: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  receiptItemRow: {
    paddingVertical: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemQty: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 12,
  },
  traceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  traceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  traceBatchNo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  traceMedName: {
    fontSize: 13,
    color: '#64748B',
  },
  traceMetaGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  traceMetaCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginRight: 10,
  },
  txType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  txNote: {
    fontSize: 11,
    color: '#64748B',
  },
  txQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  expCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  expMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginLeft: 6,
  },
  daysBadge: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  expSub: {
    fontSize: 12,
    color: '#475569',
  },
  expStock: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
