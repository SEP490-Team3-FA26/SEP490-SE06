// BranchScreen.tsx - Branch Manager Dashboard for Local Revenue, Staff Shifts & Stock Requisitions
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientCard } from '../../components/ui/GradientCard';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { Employee, Medicine } from '../../types/pharmacy.types';

export const BranchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'ALERTS'>('REVENUE');

  // Staff & Revenue
  const [staffs, setStaffs] = useState<Employee[]>([]);
  const [branchRevenue, setBranchRevenue] = useState<string>('48,500,000 ₫');
  const [invoiceCount, setInvoiceCount] = useState<number>(64);
  const [branchName, setBranchName] = useState<string>('CƠ SỞ CHI NHÁNH QUẬN 1');

  // Low stock alerts
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [lowStockFilter, setLowStockFilter] = useState<'ALL' | 'OUT' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Transfer Request Modal
  const [requestModalVisible, setRequestModalVisible] = useState<boolean>(false);
  const [selectedMedForRequest, setSelectedMedForRequest] = useState<any | null>(null);
  const [requestQty, setRequestQty] = useState<string>('50');
  const [requestReason, setRequestReason] = useState<string>('Bổ sung tồn an toàn tại quầy');
  const [submittingReq, setSubmittingReq] = useState<boolean>(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [employees, lowStock, branches, summary] = await Promise.all([
        ApiService.getEmployees(),
        ApiService.getLowStockReport(),
        ApiService.getBranches(),
        ApiService.getDashboardSummary(),
      ]);

      if (employees && employees.length > 0) {
        setStaffs(employees.filter((e) => e.role === 'pharmacist' || e.role === 'branch'));
      } else {
        setStaffs([
          { id: '1', name: 'Dược sĩ Nguyễn Thị Mai', email: 'mai.nguyen@vinapharmacy.com', phone: '0901234567', role: 'pharmacist', isActive: true },
          { id: '2', name: 'Dược sĩ Trần Quốc Bảo', email: 'bao.tran@vinapharmacy.com', phone: '0912345678', role: 'pharmacist', isActive: true },
        ]);
      }

      if (lowStock && lowStock.length > 0) {
        setLowStockItems(lowStock);
      } else {
        setLowStockItems([
          { id: 'm1', name: 'Amoxicillin 500mg', stock: 5, unit: 'Hộp', supplier: 'Dược Hậu Giang' },
          { id: 'm2', name: 'Cefuroxim 500mg', stock: 2, unit: 'Hộp', supplier: 'Dược TW1' },
          { id: 'm3', name: 'Strepsils Cool', stock: 0, unit: 'Hộp', supplier: 'Reckitt Benckiser' },
        ]);
      }

      if (branches && branches.length > 0) {
        setBranchName(branches[0].name.toUpperCase());
      }
    } catch (e) {
      console.warn('Error loading branch data:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!selectedMedForRequest) return;
    const qty = parseInt(requestQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Lỗi', 'Số lượng yêu cầu không hợp lệ.');
      return;
    }

    setSubmittingReq(true);
    const ok = await ApiService.createStockTransfer({
      fromBranchId: 'central_warehouse',
      toBranchId: 'branch_q1',
      items: [
        {
          medicineId: selectedMedForRequest.id,
          name: selectedMedForRequest.name,
          quantity: qty,
          unit: selectedMedForRequest.unit,
        },
      ],
      reason: requestReason,
    });
    setSubmittingReq(false);

    setRequestModalVisible(false);
    Alert.alert(
      'Thành công',
      `Đã tạo phiếu yêu cầu cấp bổ sung ${qty} ${selectedMedForRequest.unit} ${selectedMedForRequest.name} từ Kho Tổng!`
    );
  };

  const filteredAlerts = lowStockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (lowStockFilter === 'OUT') return item.stock === 0;
    if (lowStockFilter === 'LOW') return item.stock > 0 && item.stock <= 10;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Quản Lý Cơ Sở"
        subtitle="Doanh thu chi nhánh, Ca trực & Yêu cầu chuyển kho"
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
          onPress={() => setActiveTab('REVENUE')}
          style={[styles.tabItem, activeTab === 'REVENUE' && styles.activeTabItem]}
        >
          <Ionicons
            name="trending-up"
            size={18}
            color={activeTab === 'REVENUE' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'REVENUE' && styles.activeTabText]}>
            Ca Trực & Doanh Thu
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('ALERTS')}
          style={[styles.tabItem, activeTab === 'ALERTS' && styles.activeTabItem]}
        >
          <Ionicons
            name="warning"
            size={18}
            color={activeTab === 'ALERTS' ? '#065F46' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.activeTabText]}>
            Cảnh Báo Hết Thuốc ({lowStockItems.length})
          </Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#059669']} />}
      >
        {/* TAB 1: REVENUE & STAFF */}
        {activeTab === 'REVENUE' && (
          <View>
            <GradientCard gradientVariant="emerald" style={styles.revenueCard}>
              <View style={styles.branchHeaderRow}>
                <Text style={styles.branchNameText}>{branchName}</Text>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>ONLINE</Text>
                </View>
              </View>

              <Text style={styles.revTitle}>Doanh Thu Quầy Hôm Nay</Text>
              <View style={styles.revAmountRow}>
                <Text style={styles.revAmountText}>{branchRevenue}</Text>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{invoiceCount} hóa đơn</Text>
                </View>
              </View>
            </GradientCard>

            <Text style={styles.sectionTitle}>Nhân Sự Trong Ca Trực Hôm Nay</Text>
            {staffs.map((st) => (
              <View key={st.id} style={styles.staffCard}>
                <View style={styles.staffAvatar}>
                  <Ionicons name="person" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{st.name}</Text>
                  <Text style={styles.staffRole}>{st.email} • {st.phone}</Text>
                  <View style={styles.shiftTag}>
                    <Text style={styles.shiftTagText}>Ca Sáng (07:30 - 15:30)</Text>
                  </View>
                </View>
                <View style={styles.dutyBadge}>
                  <Text style={styles.dutyBadgeText}>ĐANG TRỰC</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: LOW STOCK ALERTS & TRANSFER REQUISITION */}
        {activeTab === 'ALERTS' && (
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm thuốc sắp hết hàng..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Pills */}
            <View style={styles.pillRow}>
              {(['ALL', 'OUT', 'LOW'] as const).map((f) => (
                <AnimatedTouchable
                  key={f}
                  onPress={() => setLowStockFilter(f)}
                  style={[
                    styles.filterPill,
                    lowStockFilter === f && styles.activeFilterPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      lowStockFilter === f && styles.activeFilterPillText,
                    ]}
                  >
                    {f === 'ALL' ? 'Tất cả' : f === 'OUT' ? 'Đã hết hàng (0)' : 'Tồn thấp (<=10)'}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Mặt Hàng Cần Bổ Sung Gấp</Text>
            {filteredAlerts.map((item, idx) => (
              <View key={idx} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertMedName}>{item.name}</Text>
                    <Text style={styles.alertSupplier}>Nhà cung cấp: {item.supplier || 'Dược phẩm'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.alertStock,
                      { color: item.stock === 0 ? '#DC2626' : '#D97706' },
                    ]}
                  >
                    {item.stock === 0 ? 'HẾT HÀNG' : `Còn ${item.stock} ${item.unit}`}
                  </Text>
                </View>

                <GradientButton
                  title="TẠO YÊU CẦU CẤP THUỐC TỪ KHO TỔNG"
                  onPress={() => {
                    setSelectedMedForRequest(item);
                    setRequestModalVisible(true);
                  }}
                  gradientVariant="cyan"
                  size="sm"
                  style={{ marginTop: 10 }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Transfer Requisition Modal */}
      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tạo Phiếu Đề Xuất Nhập Hàng</Text>
            <Text style={styles.modalMedName}>{selectedMedForRequest?.name}</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Số lượng cần nhập ({selectedMedForRequest?.unit}):</Text>
              <TextInput
                style={styles.modalInput}
                value={requestQty}
                onChangeText={setRequestQty}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Lý do / Ghi chú cho Kho Tổng:</Text>
              <TextInput
                style={styles.modalInput}
                value={requestReason}
                onChangeText={setRequestReason}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setRequestModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="GỬI ĐỀ XUẤT"
                onPress={handleCreateRequest}
                loading={submittingReq}
                gradientVariant="primary"
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
    paddingHorizontal: 14,
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
  revenueCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 0.8,
  },
  liveBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  revTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  revAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  revAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  orderBadge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  staffRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  shiftTag: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  shiftTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  dutyBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 8,
    color: '#0F172A',
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  activeFilterPill: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  alertSupplier: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  alertStock: {
    fontSize: 13,
    fontWeight: '800',
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
  },
  modalMedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
    marginBottom: 14,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
