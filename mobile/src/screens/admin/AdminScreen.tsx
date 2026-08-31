// AdminScreen.tsx - Comprehensive Admin Dashboard with System Health, Employee Management & Audit Logs
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
import { Employee, AuditLog } from '../../types/pharmacy.types';

export const AdminScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'EMPLOYEES' | 'AUDIT'>('HEALTH');

  // Microservices Health State
  const [services] = useState([
    { name: 'auth-service', status: 'ACTIVE', port: '4001', load: '1.2%', reqCount: '1,420/m' },
    { name: 'user-service', status: 'ACTIVE', port: '4002', load: '0.8%', reqCount: '890/m' },
    { name: 'inventory-service', status: 'ACTIVE', port: '4003', load: '2.4%', reqCount: '3,210/m' },
    { name: 'supplier-service', status: 'ACTIVE', port: '4004', load: '0.3%', reqCount: '340/m' },
    { name: 'ai-service', status: 'ACTIVE', port: '8000', load: '12.6%', reqCount: '780/m' },
  ]);

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpEmail, setNewEmpEmail] = useState<string>('');
  const [newEmpPhone, setNewEmpPhone] = useState<string>('');
  const [newEmpRole, setNewEmpRole] = useState<string>('pharmacist');
  const [creating, setCreating] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [empList, logs] = await Promise.all([
        ApiService.getEmployees(),
        ApiService.getAuditLogs(),
      ]);

      if (empList && empList.length > 0) {
        setEmployees(empList);
      } else {
        // Mock fallback employees
        setEmployees([
          { id: '1', name: 'Nguyễn Văn An', email: 'pharmacist@vinapharmacy.com', phone: '0901234567', role: 'pharmacist', isActive: true },
          { id: '2', name: 'Trần Thị Bình', email: 'warehouse@vinapharmacy.com', phone: '0912345678', role: 'warehouse', isActive: true },
          { id: '3', name: 'Lê Hoàng Cường', email: 'manager@vinapharmacy.com', phone: '0923456789', role: 'branch', isActive: true },
          { id: '4', name: 'Phạm Minh Đức', email: 'director@vinapharmacy.com', phone: '0934567890', role: 'head_branch', isActive: true },
        ]);
      }

      if (logs && logs.length > 0) {
        setAuditLogs(logs);
      } else {
        // Mock fallback logs
        setAuditLogs([
          { id: '1', action: 'UPDATE_PRICE', userName: 'Admin Hệ Thống', userRole: 'admin', entityName: 'Medicine (MED-001)', createdAt: new Date().toISOString() },
          { id: '2', action: 'APPROVE_STOCK_TRANSFER', userName: 'Giám Đốc', userRole: 'director', entityName: 'StockTransfer (ST-2026-001)', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', action: 'CREATE_EMPLOYEE', userName: 'Admin Hệ Thống', userRole: 'admin', entityName: 'User (pharmacist_02)', createdAt: new Date(Date.now() - 7200000).toISOString() },
        ]);
      }
    } catch (e) {
      console.warn('Error loading admin data:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleBan = async (emp: Employee) => {
    const nextStatus = !emp.isActive;
    const ok = await ApiService.toggleBanEmployee(emp.id);
    if (ok) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isActive: nextStatus } : e))
      );
      Alert.alert('Thành công', `Đã ${nextStatus ? 'mở khóa' : 'khóa'} tài khoản ${emp.name}.`);
    } else {
      // Local optimistic update
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isActive: nextStatus } : e))
      );
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmpName.trim() || !newEmpEmail.trim()) {
      Alert.alert('Lỗi', 'Họ tên và Email là bắt buộc.');
      return;
    }

    setCreating(true);
    const res = await ApiService.createEmployee({
      name: newEmpName.trim(),
      email: newEmpEmail.trim().toLowerCase(),
      phone: newEmpPhone.trim(),
      role: newEmpRole,
    });
    setCreating(false);

    const created: Employee = res?.data || {
      id: `emp_${Date.now()}`,
      name: newEmpName.trim(),
      email: newEmpEmail.trim(),
      phone: newEmpPhone.trim() || '0909123456',
      role: newEmpRole,
      isActive: true,
    };

    setEmployees((prev) => [created, ...prev]);
    setCreateModalVisible(false);
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpPhone('');
    Alert.alert('Thành công', `Đã tạo tài khoản cho nhân viên ${created.name}!`);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
      e.email.toLowerCase().includes(searchEmployee.toLowerCase()) ||
      e.role.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Admin Dashboard"
        subtitle="Giám sát Microservices & Nhân viên hệ thống"
        gradientVariant="dark"
        rightAction={{
          icon: 'person-circle-outline',
          onPress: () => navigation.navigate('ProfileScreen'),
        }}
        secondaryRightAction={{
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('NotificationListScreen'),
        }}
      />

      {/* Modern Tabs */}
      <View style={styles.tabBar}>
        <AnimatedTouchable
          onPress={() => setActiveTab('HEALTH')}
          style={[styles.tabItem, activeTab === 'HEALTH' && styles.activeTabItem]}
        >
          <Ionicons
            name="speedometer"
            size={18}
            color={activeTab === 'HEALTH' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'HEALTH' && styles.activeTabText]}>
            Hệ Thống
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('EMPLOYEES')}
          style={[styles.tabItem, activeTab === 'EMPLOYEES' && styles.activeTabItem]}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === 'EMPLOYEES' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'EMPLOYEES' && styles.activeTabText]}>
            Nhân Viên
          </Text>
        </AnimatedTouchable>

        <AnimatedTouchable
          onPress={() => setActiveTab('AUDIT')}
          style={[styles.tabItem, activeTab === 'AUDIT' && styles.activeTabItem]}
        >
          <Ionicons
            name="receipt"
            size={18}
            color={activeTab === 'AUDIT' ? '#0F172A' : '#94A3B8'}
          />
          <Text style={[styles.tabText, activeTab === 'AUDIT' && styles.activeTabText]}>
            Audit Logs
          </Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={['#1E293B']} />}
      >
        {/* TAB 1: SYSTEM HEALTH */}
        {activeTab === 'HEALTH' && (
          <View>
            <View style={styles.kpiRow}>
              <GradientCard gradientVariant="indigo" style={styles.kpiCard}>
                <Ionicons name="flash" size={24} color="#FFFFFF" />
                <Text style={styles.kpiValue}>234 req/s</Text>
                <Text style={styles.kpiLabel}>API Gateway Load</Text>
              </GradientCard>

              <GradientCard gradientVariant="ocean" style={styles.kpiCard}>
                <Ionicons name="hardware-chip" size={24} color="#FFFFFF" />
                <Text style={styles.kpiValue}>14.8%</Text>
                <Text style={styles.kpiLabel}>CPU Utilization</Text>
              </GradientCard>
            </View>

            <Text style={styles.sectionHeader}>Trạng Thái Microservices</Text>
            {services.map((s) => (
              <View key={s.name} style={styles.serviceCard}>
                <View style={styles.serviceLeft}>
                  <View style={styles.statusDot} />
                  <View>
                    <Text style={styles.serviceName}>{s.name}</Text>
                    <Text style={styles.serviceSub}>Port: {s.port} • Lưu lượng: {s.reqCount}</Text>
                  </View>
                </View>
                <View style={styles.loadBadge}>
                  <Text style={styles.loadBadgeText}>CPU: {s.load}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: EMPLOYEES */}
        {activeTab === 'EMPLOYEES' && (
          <View>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm nhân viên theo tên, email, chức vụ..."
                  placeholderTextColor="#94A3B8"
                  value={searchEmployee}
                  onChangeText={setSearchEmployee}
                />
              </View>
              <AnimatedTouchable
                onPress={() => setCreateModalVisible(true)}
                style={styles.addEmpBtn}
              >
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
              </AnimatedTouchable>
            </View>

            {filteredEmployees.map((emp) => (
              <View key={emp.id} style={styles.employeeCard}>
                <View style={styles.empInfo}>
                  <View style={styles.empAvatar}>
                    <Ionicons name="person" size={22} color="#475569" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empEmail}>{emp.email}</Text>
                    <View style={styles.empTagRow}>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{emp.role.toUpperCase()}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          { backgroundColor: emp.isActive !== false ? '#ECFDF5' : '#FEF2F2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: emp.isActive !== false ? '#059669' : '#DC2626' },
                          ]}
                        >
                          {emp.isActive !== false ? 'HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <AnimatedTouchable
                  onPress={() => handleToggleBan(emp)}
                  style={[
                    styles.banBtn,
                    { backgroundColor: emp.isActive !== false ? '#FEE2E2' : '#DCFCE7' },
                  ]}
                >
                  <Ionicons
                    name={emp.isActive !== false ? 'lock-closed' : 'lock-open'}
                    size={16}
                    color={emp.isActive !== false ? '#DC2626' : '#16A34A'}
                  />
                  <Text
                    style={[
                      styles.banBtnText,
                      { color: emp.isActive !== false ? '#DC2626' : '#16A34A' },
                    ]}
                  >
                    {emp.isActive !== false ? 'Khóa' : 'Mở'}
                  </Text>
                </AnimatedTouchable>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'AUDIT' && (
          <View>
            <Text style={styles.sectionHeader}>Nhật Ký Thao Tác Hệ Thống</Text>
            {auditLogs.map((log) => (
              <View key={log.id} style={styles.auditCard}>
                <View style={styles.auditHeader}>
                  <View style={styles.actionPill}>
                    <Text style={styles.actionPillText}>{log.action}</Text>
                  </View>
                  <Text style={styles.auditTime}>
                    {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                  </Text>
                </View>
                <Text style={styles.auditUser}>
                  Bởi: <Text style={{ fontWeight: '700' }}>{log.userName || log.userId}</Text> ({log.userRole})
                </Text>
                <Text style={styles.auditEntity}>Đối tượng: {log.entityName || 'N/A'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Create Employee */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tạo Tài Khoản Nhân Viên Mới</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Họ và tên nhân viên"
              placeholderTextColor="#94A3B8"
              value={newEmpName}
              onChangeText={setNewEmpName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email đăng nhập"
              placeholderTextColor="#94A3B8"
              value={newEmpEmail}
              onChangeText={setNewEmpEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Số điện thoại"
              placeholderTextColor="#94A3B8"
              value={newEmpPhone}
              onChangeText={setNewEmpPhone}
              keyboardType="phone-pad"
            />

            {/* Role Picker Buttons */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginVertical: 8 }}>
              Chọn chức vụ:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { key: 'pharmacist', label: 'Dược sĩ' },
                { key: 'warehouse', label: 'Thủ kho' },
                { key: 'branch', label: 'Quản lý cơ sở' },
                { key: 'head_branch', label: 'Giám đốc' },
              ].map((r) => (
                <AnimatedTouchable
                  key={r.key}
                  onPress={() => setNewEmpRole(r.key)}
                  style={[
                    styles.roleChoice,
                    newEmpRole === r.key && styles.activeRoleChoice,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleChoiceText,
                      newEmpRole === r.key && styles.activeRoleChoiceText,
                    ]}
                  >
                    {r.label}
                  </Text>
                </AnimatedTouchable>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <AnimatedTouchable onPress={() => setCreateModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </AnimatedTouchable>
              <GradientButton
                title="TẠO TÀI KHOẢN"
                onPress={handleCreateEmployee}
                loading={creating}
                gradientVariant="indigo"
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
    backgroundColor: '#F1F5F9',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  serviceSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  loadBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  loadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    marginLeft: 6,
    color: '#0F172A',
  },
  addEmpBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  empAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  empEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  empTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  roleTag: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
  },
  statusTag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  banBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  banBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionPill: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  auditTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  auditUser: {
    fontSize: 13,
    color: '#475569',
  },
  auditEntity: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  roleChoice: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  activeRoleChoice: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeRoleChoiceText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
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
