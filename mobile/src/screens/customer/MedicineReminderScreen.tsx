// MedicineReminderScreen.tsx - Offline Medicine Reminder & Adherence Log Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { GradientButton } from '../../components/ui/GradientButton';
import { showToast } from '../../components/ui/toastHelper';
import { ReminderStorageService } from '../../services/reminderStorage.service';
import { MedicineReminderService } from '../../services/medicineReminder.service';
import { ApiService } from '../../services/api.service';
import { BarcodeScannerModal } from '../../components/barcode/BarcodeScannerModal';
import {
  MedicineReminder,
  MedicineReminderLog,
  MealTiming,
} from '../../types/reminder.types';

const DAYS_OF_WEEK = [
  { day: 1, label: 'T2' },
  { day: 2, label: 'T3' },
  { day: 3, label: 'T4' },
  { day: 4, label: 'T5' },
  { day: 5, label: 'T6' },
  { day: 6, label: 'T7' },
  { day: 0, label: 'CN' },
];

const SAMPLE_MEDS = [
  { name: 'Panadol Extra Đỏ', dosage: '1 viên 500mg', meal: 'AFTER_MEAL' as MealTiming },
  { name: 'Amoxicillin 500mg', dosage: '1 viên', meal: 'AFTER_MEAL' as MealTiming },
  { name: 'Decolgen Forte', dosage: '1 viên', meal: 'AFTER_MEAL' as MealTiming },
  { name: 'Omeprazol 20mg', dosage: '1 viên', meal: 'BEFORE_MEAL' as MealTiming },
  { name: 'Vitamin C Sủi', dosage: '1 viên pha nước', meal: 'AFTER_MEAL' as MealTiming },
];

export const MedicineReminderScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'REMINDERS' | 'LOGS'>('REMINDERS');
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [logs, setLogs] = useState<MedicineReminderLog[]>([]);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<MedicineReminder | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // Form Fields
  const [medName, setMedName] = useState<string>('');
  const [dosage, setDosage] = useState<string>('1 viên');
  const [mealTiming, setMealTiming] = useState<MealTiming>('AFTER_MEAL');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [times, setTimes] = useState<string[]>(['08:00', '20:00']);
  const [customTime, setCustomTime] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Test notification state
  const [testingCountDown, setTestingCountDown] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [storedReminders, storedLogs, pendingNotifs] = await Promise.all([
        ReminderStorageService.getReminders(),
        ReminderStorageService.getLogs(),
        MedicineReminderService.getScheduledNotifications(),
      ]);
      setReminders(storedReminders);
      setLogs(storedLogs);
      setScheduledCount(pendingNotifs.length);
    } catch (e) {
      console.warn('Failed to load reminder screen data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle countdown for test button
  useEffect(() => {
    if (testingCountDown === null) return;
    if (testingCountDown <= 0) {
      setTestingCountDown(null);
      return;
    }
    const timer = setTimeout(() => {
      setTestingCountDown((prev) => (prev ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [testingCountDown]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingReminder(null);
    setMedName('');
    setDosage('1 viên');
    setMealTiming('AFTER_MEAL');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setTimes(['08:00', '20:00']);
    setCustomTime('');
    setNote('');
    setModalVisible(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (reminder: MedicineReminder) => {
    setEditingReminder(reminder);
    setMedName(reminder.medicineName);
    setDosage(reminder.dosage);
    setMealTiming(reminder.mealTiming);
    setSelectedDays(reminder.daysOfWeek);
    setTimes(reminder.times);
    setCustomTime('');
    setNote(reminder.note || '');
    setModalVisible(true);
  };

  // Toggle Reminder Status
  const handleToggleReminder = async (reminder: MedicineReminder) => {
    const nextState = !reminder.isEnabled;
    const updated = await ReminderStorageService.toggleReminder(reminder.id, nextState);
    setReminders(updated);

    const changedItem = updated.find((r) => r.id === reminder.id);
    if (changedItem) {
      if (nextState) {
        await MedicineReminderService.scheduleReminderSlidingWindow(changedItem, 7);
        showToast.success('Đã bật nhắc nhở', `Đã lên lịch nhắc cho ${reminder.medicineName}`);
      } else {
        await MedicineReminderService.cancelReminderNotifications(reminder.id);
        showToast.info('Đã tắt nhắc nhở', `Đã hủy thông báo của ${reminder.medicineName}`);
      }
      const pending = await MedicineReminderService.getScheduledNotifications();
      setScheduledCount(pending.length);
    }
  };

  // Delete Reminder
  const handleDeleteReminder = (id: string, name: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa lịch nhắc thuốc "${name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await MedicineReminderService.cancelReminderNotifications(id);
            const remaining = await ReminderStorageService.deleteReminder(id);
            setReminders(remaining);
            const pending = await MedicineReminderService.getScheduledNotifications();
            setScheduledCount(pending.length);
            showToast.success('Đã xóa', `Đã xóa lịch nhắc ${name}`);
          },
        },
      ]
    );
  };

  // Add Time
  const handleAddTime = (timeToAdd: string) => {
    const trimmed = timeToAdd.trim();
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
      showToast.error('Giờ không hợp lệ', 'Vui lòng nhập định dạng HH:mm (VD: 08:30 hoặc 19:00)');
      return;
    }
    if (times.includes(trimmed)) {
      showToast.info('Đã có', 'Mốc giờ này đã được thêm trong danh sách');
      return;
    }
    const newTimes = [...times, trimmed].sort();
    setTimes(newTimes);
    setCustomTime('');
  };

  // Remove Time
  const handleRemoveTime = (timeToRemove: string) => {
    if (times.length <= 1) {
      showToast.error('Cần ít nhất 1 mốc giờ', 'Lịch nhắc cần có tối thiểu 1 mốc giờ trong ngày');
      return;
    }
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  // Toggle Day of Week
  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        showToast.error('Chọn ít nhất 1 ngày', 'Bạn cần chọn ít nhất 1 ngày nhắc trong tuần');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  // Save Reminder
  const handleSaveReminder = async () => {
    if (!medName.trim()) {
      showToast.error('Thiếu tên thuốc', 'Vui lòng nhập tên thuốc cần nhắc uống');
      return;
    }
    if (!dosage.trim()) {
      showToast.error('Thiếu liều lượng', 'Vui lòng nhập liều lượng thuốc');
      return;
    }
    if (times.length === 0) {
      showToast.error('Thiếu mốc giờ', 'Vui lòng chọn ít nhất 1 mốc giờ uống thuốc');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newReminder: MedicineReminder = {
      id: editingReminder ? editingReminder.id : `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      medicineName: medName.trim(),
      dosage: dosage.trim(),
      mealTiming,
      daysOfWeek: selectedDays,
      times,
      startDate: editingReminder ? editingReminder.startDate : todayStr,
      note: note.trim() || undefined,
      isEnabled: editingReminder ? editingReminder.isEnabled : true,
      createdAt: editingReminder ? editingReminder.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = await ReminderStorageService.upsertReminder(newReminder);
    setReminders(updatedList);

    // Lên lịch ngay nếu đang bật
    if (newReminder.isEnabled) {
      const scheduled = await MedicineReminderService.scheduleReminderSlidingWindow(newReminder, 7);
      showToast.success(
        'Lưu thành công!',
        `Đã tạo ${scheduled} thông báo nhắc thuốc cho 7 ngày tới (kể cả khi mất mạng)`
      );
    } else {
      showToast.info('Đã lưu', 'Lịch nhắc đã lưu ở trạng thái tắt');
    }

    const pending = await MedicineReminderService.getScheduledNotifications();
    setScheduledCount(pending.length);
    setModalVisible(false);
  };

  // Test Notification Trigger after 5 seconds
  const handleTestNotification = async () => {
    try {
      setTestingCountDown(5);
      await MedicineReminderService.testTriggerNotification(5);
      showToast.info(
        'Đã hẹn 5 giây nữa!',
        'Hãy khóa màn hình hoặc thoát ra màn hình chính để thấy chuông nổ 🔔'
      );
    } catch (e) {
      showToast.error('Lỗi kiểm thử', 'Không thể lên lịch thông báo thử nghiệm');
    }
  };

  // Clear Logs
  const handleClearLogs = () => {
    Alert.alert('Xóa nhật ký', 'Bạn có chắc muốn xóa sạch toàn bộ lịch sử uống thuốc không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa sạch',
        style: 'destructive',
        onPress: async () => {
          await ReminderStorageService.clearLogs();
          setLogs([]);
          showToast.success('Đã xóa', 'Lịch sử uống thuốc đã được làm trống');
        },
      },
    ]);
  };

  // Handle Barcode Scan for Medicine Reminder
  const handleScanBarcode = async (code: string) => {
    setShowScanner(false);
    try {
      const res = await ApiService.getByBarcode(code);
      if (res && res.medicine) {
        const med = res.medicine;
        setMedName(med.name);
        setDosage(`1 ${med.unit || 'viên'}`);
        if (med.cach_dung) {
          setNote(med.cach_dung);
        }
        setModalVisible(true);
        showToast.success('Quét Barcode Thành Công', `Đã nhận diện: ${med.name}`);
      } else {
        setMedName(code);
        setModalVisible(true);
        showToast.info('Thông báo', `Không tìm thấy thuốc khớp barcode: ${code}. Đã điền mã vào tên.`);
      }
    } catch (e) {
      console.warn('Lỗi quét barcode nhắc thuốc:', e);
      showToast.error('Lỗi', 'Không thể kết nối máy chủ tra cứu mã vạch.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <HeaderBar
        title="Nhắc Uống Thuốc"
        subtitle="100% Báo thức Ngoại Tuyến khi Mất Mạng"
        gradientVariant="ocean"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'add-circle-outline',
          onPress: handleOpenCreate,
        }}
        secondaryRightAction={{
          icon: 'barcode-outline',
          onPress: () => setShowScanner(true),
        }}
      />

      {/* Testing & Status Quick Banner */}
      <View style={styles.quickBarContainer}>
        <View style={styles.quickBarStats}>
          <Ionicons name="alarm-outline" size={18} color="#0891B2" />
          <Text style={styles.quickBarStatsText}>
            Hàng đợi OS: <Text style={styles.boldText}>{scheduledCount} thông báo</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <AnimatedTouchable
            style={styles.scanQuickBtn}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="barcode-outline" size={16} color="#0891B2" />
            <Text style={styles.scanQuickBtnText}>Quét Hộp</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[styles.testButton, testingCountDown !== null && styles.testButtonActive]}
            onPress={handleTestNotification}
          >
            <Ionicons
              name={testingCountDown !== null ? 'hourglass-outline' : 'notifications-outline'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.testButtonText}>
              {testingCountDown !== null ? `${testingCountDown}s...` : 'Bắn Thử 🔔'}
            </Text>
          </AnimatedTouchable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'REMINDERS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('REMINDERS')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'REMINDERS' ? '#0891B2' : '#64748B'}
          />
          <Text
            style={[styles.tabText, activeTab === 'REMINDERS' && styles.tabTextActive]}
          >
            Lịch Nhắc ({reminders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'LOGS' && styles.tabButtonActive]}
          onPress={() => setActiveTab('LOGS')}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={18}
            color={activeTab === 'LOGS' ? '#0891B2' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'LOGS' && styles.tabTextActive]}>
            Nhật Ký Uống ({logs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {activeTab === 'REMINDERS' ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {reminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medkit-outline" size={64} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>Chưa có lịch nhắc thuốc</Text>
              <Text style={styles.emptyStateSub}>
                Tạo lịch nhắc để ứng dụng tự động báo chuông đúng giờ mỗi ngày ngay cả khi không có kết nối Internet.
              </Text>
              <View style={{ marginTop: 20, width: 220 }}>
                <GradientButton
                  title="+ Thêm Lịch Nhắc Mới"
                  onPress={handleOpenCreate}
                  gradientVariant="cyan"
                />
              </View>
            </View>
          ) : (
            reminders.map((reminder) => {
              const mealDesc = MedicineReminderService.getMealDescription(reminder.mealTiming);
              return (
                <View key={reminder.id} style={styles.reminderCard}>
                  {/* Card Header: Name + Switch */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleBlock}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="medical" size={20} color="#0891B2" />
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.medNameText} numberOfLines={1}>
                          {reminder.medicineName}
                        </Text>
                        <Text style={styles.dosageText}>
                          Liều: {reminder.dosage}
                          {mealDesc ? ` • ${mealDesc}` : ''}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={reminder.isEnabled}
                      onValueChange={() => handleToggleReminder(reminder)}
                      trackColor={{ false: '#CBD5E1', true: '#06B6D4' }}
                      thumbColor={reminder.isEnabled ? '#0891B2' : '#F1F5F9'}
                    />
                  </View>

                  {/* Times Badges */}
                  <View style={styles.timesRow}>
                    {reminder.times.map((t) => (
                      <View key={t} style={styles.timeBadge}>
                        <Ionicons name="time-outline" size={14} color="#0E7490" />
                        <Text style={styles.timeBadgeText}>{t}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Days of Week */}
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map((d) => {
                      const isActive = reminder.daysOfWeek.includes(d.day);
                      return (
                        <View
                          key={d.day}
                          style={[
                            styles.dayChip,
                            isActive && styles.dayChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              isActive && styles.dayChipTextActive,
                            ]}
                          >
                            {d.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Note */}
                  {reminder.note ? (
                    <View style={styles.noteBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#64748B" />
                      <Text style={styles.noteText}>{reminder.note}</Text>
                    </View>
                  ) : null}

                  {/* Card Actions Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.statusPill}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: reminder.isEnabled ? '#10B981' : '#94A3B8' },
                        ]}
                      />
                      <Text style={styles.statusPillText}>
                        {reminder.isEnabled ? 'Đang hoạt động' : 'Tạm dừng'}
                      </Text>
                    </View>

                    <View style={styles.footerActionButtons}>
                      <AnimatedTouchable
                        style={styles.actionIconButton}
                        onPress={() => handleOpenEdit(reminder)}
                      >
                        <Ionicons name="create-outline" size={18} color="#0891B2" />
                      </AnimatedTouchable>
                      <AnimatedTouchable
                        style={[styles.actionIconButton, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => handleDeleteReminder(reminder.id, reminder.medicineName)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </AnimatedTouchable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* LOGS TAB */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logsHeaderRow}>
            <Text style={styles.logsSectionTitle}>Lịch Sử Tuân Thủ Uống Thuốc</Text>
            {logs.length > 0 ? (
              <TouchableOpacity onPress={handleClearLogs}>
                <Text style={styles.clearLogsText}>Xóa tất cả</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>Chưa có bản ghi nhật ký</Text>
              <Text style={styles.emptyStateSub}>
                Khi thông báo nổ chuông, bạn bấm "✅ Đã uống" hoặc "⏰ Nhắc lại" trên thông báo, lịch sử sẽ tự động ghi lại tại đây.
              </Text>
            </View>
          ) : (
            logs.map((log) => {
              const isTaken = log.status === 'TAKEN';
              const isSnoozed = log.status === 'SNOOZED';
              const dateStr = new Date(log.recordedAt).toLocaleString('vi-VN');

              return (
                <View key={log.id} style={styles.logCard}>
                  <View
                    style={[
                      styles.logStatusCircle,
                      { backgroundColor: isTaken ? '#D1FAE5' : isSnoozed ? '#FEF3C7' : '#F1F5F9' },
                    ]}
                  >
                    <Ionicons
                      name={isTaken ? 'checkmark-circle' : isSnoozed ? 'time' : 'alert-circle'}
                      size={24}
                      color={isTaken ? '#059669' : isSnoozed ? '#D97706' : '#64748B'}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.logMedName}>{log.medicineName}</Text>
                    <Text style={styles.logDosage}>
                      Liều: {log.dosage} • {dateStr}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.logBadge,
                      { backgroundColor: isTaken ? '#ECFDF5' : '#FFFBEB' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.logBadgeText,
                        { color: isTaken ? '#059669' : '#D97706' },
                      ]}
                    >
                      {isTaken ? 'ĐÃ UỐNG' : isSnoozed ? 'HOÃN LẠI 10P' : 'BỎ QUA'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Add Button for Reminders Tab */}
      {activeTab === 'REMINDERS' && reminders.length > 0 ? (
        <AnimatedTouchable style={styles.fabButton} onPress={handleOpenCreate}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </AnimatedTouchable>
      ) : null}

      {/* MODAL CREATE / EDIT REMINDER */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReminder ? 'Chỉnh Sửa Lịch Nhắc' : 'Tạo Lịch Nhắc Uống Thuốc'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Scan Barcode Quick Action */}
              <TouchableOpacity
                style={styles.scanModalRowBtn}
                onPress={() => {
                  setModalVisible(false);
                  setShowScanner(true);
                }}
              >
                <Ionicons name="barcode-outline" size={20} color="#0891B2" />
                <Text style={styles.scanModalRowBtnText}>Quét Vỏ Hộp Thuốc Để Điền Tự Động</Text>
              </TouchableOpacity>

              {/* Quick Sample Medicines */}
              {!editingReminder ? (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Gợi ý thuốc nhanh:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {SAMPLE_MEDS.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.sampleChip}
                        onPress={() => {
                          setMedName(s.name);
                          setDosage(s.dosage);
                          setMealTiming(s.meal);
                        }}
                      >
                        <Text style={styles.sampleChipText}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* Medicine Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Tên thuốc <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Panadol Extra, Amoxicillin 500mg..."
                  value={medName}
                  onChangeText={setMedName}
                />
              </View>

              {/* Dosage */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Liều dùng <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: 1 viên, 500mg, 1 gói..."
                  value={dosage}
                  onChangeText={setDosage}
                />
              </View>

              {/* Meal Timing */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Thời điểm uống đối với bữa ăn</Text>
                <View style={styles.mealPillsRow}>
                  {(
                    [
                      { id: 'AFTER_MEAL', label: 'Sau ăn no' },
                      { id: 'BEFORE_MEAL', label: 'Trước ăn 30p' },
                      { id: 'WITH_MEAL', label: 'Trong bữa ăn' },
                      { id: 'NONE', label: 'Tùy ý' },
                    ] as const
                  ).map((m) => {
                    const isSelected = mealTiming === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.mealPill, isSelected && styles.mealPillActive]}
                        onPress={() => setMealTiming(m.id)}
                      >
                        <Text
                          style={[
                            styles.mealPillText,
                            isSelected && styles.mealPillTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Reminder Times */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Các mốc giờ nhắc trong ngày <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>

                {/* Quick Add Presets */}
                <View style={styles.quickTimesRow}>
                  {['07:00', '11:30', '18:00', '20:30'].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={styles.presetTimeBtn}
                      onPress={() => handleAddTime(preset)}
                    >
                      <Text style={styles.presetTimeBtnText}>+ {preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Current Selected Times */}
                <View style={styles.selectedTimesRow}>
                  {times.map((t) => (
                    <View key={t} style={styles.timeTag}>
                      <Ionicons name="time" size={14} color="#0891B2" />
                      <Text style={styles.timeTagText}>{t}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveTime(t)}
                        style={{ marginLeft: 6 }}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Custom Time Input */}
                <View style={styles.customTimeRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Nhập giờ khác (HH:mm, VD: 09:15)"
                    value={customTime}
                    onChangeText={setCustomTime}
                    maxLength={5}
                  />
                  <TouchableOpacity
                    style={styles.addTimeBtn}
                    onPress={() => handleAddTime(customTime)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Days of Week */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Các ngày nhắc trong tuần</Text>
                <View style={styles.daysSelectorRow}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d.day);
                    return (
                      <TouchableOpacity
                        key={d.day}
                        style={[
                          styles.daySelectBtn,
                          isSelected && styles.daySelectBtnActive,
                        ]}
                        onPress={() => handleToggleDay(d.day)}
                      >
                        <Text
                          style={[
                            styles.daySelectBtnText,
                            isSelected && styles.daySelectBtnTextActive,
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Note */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ghi chú thêm (tùy chọn)</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  placeholder="VD: Uống nhiều nước, bảo quản mát..."
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <GradientButton
                  title={editingReminder ? 'Cập Nhật' : 'Lưu Lịch Nhắc'}
                  onPress={handleSaveReminder}
                  gradientVariant="cyan"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanBarcode}
        title="Quét Mã Vạch Vỏ Hộp Thuốc"
        subtitle="Hướng camera vào mã vạch trên vỏ hộp thuốc để tự động trích xuất tên & liều dùng"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  quickBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickBarStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickBarStatsText: {
    fontSize: 13,
    color: '#0369A1',
    marginLeft: 6,
  },
  boldText: {
    fontWeight: '700',
    color: '#0891B2',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0891B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
  },
  testButtonActive: {
    backgroundColor: '#EA580C',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#0891B2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#0891B2',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dosageText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CFFAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0E7490',
    marginLeft: 4,
  },
  daysRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: '#0891B2',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  footerActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0891B2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  /* Logs Styling */
  logsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearLogsText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logStatusCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  logDosage: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  sampleChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  sampleChipText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  mealPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  mealPillActive: {
    backgroundColor: '#0891B2',
  },
  mealPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  mealPillTextActive: {
    color: '#FFFFFF',
  },
  quickTimesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  presetTimeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presetTimeBtnText: {
    fontSize: 11,
    color: '#0891B2',
    fontWeight: '600',
  },
  selectedTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CFFAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891B2',
    marginLeft: 4,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTimeBtn: {
    backgroundColor: '#0891B2',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  daySelectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectBtnActive: {
    backgroundColor: '#0891B2',
  },
  daySelectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  daySelectBtnTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  scanQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
    elevation: 1,
  },
  scanQuickBtnText: {
    color: '#0891B2',
    fontSize: 12,
    fontWeight: '700',
  },
  scanModalRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  scanModalRowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891B2',
  },
});
