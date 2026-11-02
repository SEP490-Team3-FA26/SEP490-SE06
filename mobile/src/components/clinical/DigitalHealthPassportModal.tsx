// DigitalHealthPassportModal.tsx - Sổ Sức Khỏe Số & Hộ Chiếu Y Tế Đa Nhà Thuốc
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ApiService } from '../../services/api.service';
import { showToast } from '../ui/toastHelper';
import {
  ColorTokens,
  TypographyTokens,
  RadiusTokens,
  SpacingTokens,
} from '../../theme/tokens';
import { ClinicalBadge } from './ClinicalBadge';
import { ClinicalButton } from './ClinicalButton';
import { USER_ROLE_LABELS } from '../../types/pharmacy.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Danh sách nhóm dị ứng thuốc phổ biến
const POPULAR_ALLERGIES = [
  'Penicillin / Beta-lactam',
  'Cephalosporin',
  'Aspirin & NSAIDs (Ibuprofen)',
  'Sulfonamide (Bactrim)',
  'Paracetamol',
  'Hải sản / Thực phẩm',
];

// Danh sách bệnh nền mãn tính thường gặp
const POPULAR_CONDITIONS = [
  'Viêm loét dạ dày',
  'Tăng huyết áp',
  'Đái tháo đường',
  'Hen suyễn (Hen phế quản)',
  'Bệnh tim mạch',
  'Suy gan / Men gan cao',
  'Suy thận mãn tính',
  'Thai kỳ / Cho con bú',
];

const BLOOD_TYPES = ['Chưa rõ', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export interface DigitalHealthPassportModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  isOnboardingMode?: boolean; // Bật khi bắt buộc khai báo lúc đăng nhập lần đầu
}

export const DigitalHealthPassportModal: React.FC<DigitalHealthPassportModalProps> = ({
  visible,
  onClose,
  onSaved,
  isOnboardingMode = false,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(isOnboardingMode);

  // Dữ liệu y khoa
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergicMedicines, setAllergicMedicines] = useState<string[]>([]);
  const [allergicIngredients, setAllergicIngredients] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState('Chưa rõ');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isHealthy, setIsHealthy] = useState(false);

  // Input tạm thời
  const [customMed, setCustomMed] = useState('');

  // Tải dữ liệu bệnh án từ backend API Gateway qua Kafka
  const loadClinicalData = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getMyClinicalSafety();
      if (data) {
        setAllergies(data.allergies || []);
        setAllergicMedicines(data.allergicMedicines || []);
        setAllergicIngredients(data.allergicIngredients || []);
        setChronicConditions(data.chronicConditions || []);
        setBloodType(data.bloodType || 'Chưa rõ');
        setMedicalNotes(data.medicalNotes || '');

        // Nếu cả dị ứng và bệnh nền đều rỗng thì có thể user đã tick khỏe mạnh
        if ((!data.allergies || data.allergies.length === 0) &&
            (!data.chronicConditions || data.chronicConditions.length === 0) &&
            data.hasCompletedHealthOnboarding) {
          setIsHealthy(true);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi tải sổ sức khỏe số:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsEditing(isOnboardingMode);
      loadClinicalData();
    }
  }, [visible, isOnboardingMode]);

  // Xử lý bật/tắt nhóm dị ứng
  const toggleAllergy = (item: string) => {
    if (isHealthy) setIsHealthy(false);
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  // Xử lý bật/tắt bệnh nền
  const toggleCondition = (item: string) => {
    if (isHealthy) setIsHealthy(false);
    setChronicConditions((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  // Thêm thuốc dị ứng biệt dược
  const handleAddMed = () => {
    const trimmed = customMed.trim();
    if (trimmed && !allergicMedicines.includes(trimmed)) {
      if (isHealthy) setIsHealthy(false);
      setAllergicMedicines((prev) => [...prev, trimmed]);
      setCustomMed('');
    }
  };

  // Lưu hồ sơ bệnh án
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        allergies: isHealthy ? [] : allergies,
        allergicMedicines: isHealthy ? [] : allergicMedicines,
        allergicIngredients: isHealthy ? [] : allergicIngredients,
        chronicConditions: isHealthy ? [] : chronicConditions,
        bloodType: bloodType === 'Chưa rõ' ? undefined : bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
        hasCompletedHealthOnboarding: true,
      };

      const res = await ApiService.updateMyClinicalSafety(payload);
      if (res && !res.error) {
        showToast.success(
          'Thành Công',
          'Sổ Sức Khỏe Số của bạn đã được cập nhật và liên thông toàn chuỗi nhà thuốc!'
        );
        setIsEditing(false);
        if (onSaved) onSaved();
        if (isOnboardingMode) onClose();
      } else {
        showToast.error('Lỗi', res?.message || 'Không thể lưu hồ sơ lúc này.');
      }
    } catch (err) {
      showToast.error('Lỗi', 'Đã xảy ra lỗi khi lưu hồ sơ y tế.');
    } finally {
      setSaving(false);
    }
  };

  // Xác định nhân sự: Dược sĩ, Quản lý kho, Quản lý chi nhánh, Giám đốc, hoặc tài khoản nhân viên nội bộ
  const isStaffUser = Boolean(
    (user?.role && user.role.toLowerCase() !== 'customer') ||
    user?.name?.toLowerCase().includes('dược sĩ') ||
    user?.name?.toLowerCase().includes('quản lý') ||
    user?.name?.toLowerCase().includes('giám đốc') ||
    user?.name?.toLowerCase().includes('anh phước')
  );

  // Payload mã QR: Nhân viên mã hóa thẻ định danh nhân sự, Khách hàng mã hóa sổ sức khỏe
  const qrPayload = JSON.stringify(
    isStaffUser
      ? {
          type: 'STAFF_ID',
          id: user?.id || (user as any)?._id,
          phone: user?.phone,
          name: user?.name,
          role: user?.role,
          branchId: user?.branchId || 'BR-001',
          branchName: user?.branchName || 'Cơ Sở Chi Nhánh ABC (CN1)',
          cchn: 'CCHN-VERIFIED',
        }
      : {
          type: 'HEALTH_PASSPORT',
          id: user?.id || (user as any)?._id,
          phone: user?.phone,
          name: user?.name,
          blood: bloodType,
        }
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.officialBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                  <Text style={styles.officialBadgeText}>
                    {isStaffUser ? 'NHÂN SỰ • CHUẨN GPP' : 'GPP • ĐA NHÀ THUỐC'}
                  </Text>
                </View>
                {isOnboardingMode && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>BẮT BUỘC</Text>
                  </View>
                )}
              </View>
              <Text style={styles.titleText}>
                {isStaffUser
                  ? 'Thẻ Định Danh Nhân Sự GPP'
                  : isOnboardingMode
                  ? 'Khai Báo Sổ Sức Khỏe Ban Đầu'
                  : 'Sổ Sức Khỏe Số'}
              </Text>
              <Text style={styles.subtitleText}>
                {isStaffUser
                  ? 'Thẻ nhân viên liên thông mạng lưới nhà thuốc ABC Pharmacy'
                  : 'Hộ chiếu y tế liên thông chuỗi nhà thuốc ABC Pharmacy'}
              </Text>
            </View>

            {!isOnboardingMode && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Đang tải dữ liệu y khoa liên thông...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* CHẾ ĐỘ XEM THẺ & MÃ QR */}
              {!isEditing && (
                <View style={styles.viewModeContainer}>
                  {/* Khung thẻ y tế số */}
                  <View style={styles.passportCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>
                          {user?.name || (isStaffUser ? 'Nhân sự chi nhánh' : 'Khách hàng')}
                        </Text>
                        <Text style={styles.patientId}>
                          {isStaffUser
                            ? `Mã Nhân Viên: #EMP-${String(user?.id || user?.phone || 'STAFF').slice(-6).toUpperCase()}`
                            : `Mã Bệnh Án: #MED-${String(user?.id || 'PATIENT').slice(-6).toUpperCase()}`}
                        </Text>
                        <Text style={styles.patientPhone}>SĐT: {user?.phone || 'Chưa cập nhật'}</Text>
                        {isStaffUser ? (
                          <View style={styles.staffRoleMiniBadge}>
                            <Text style={styles.staffRoleMiniText}>
                              {USER_ROLE_LABELS[user?.role || ''] || user?.role || 'Nhân Sự Chi Nhánh'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {!isStaffUser ? (
                        <View style={styles.bloodTypeBadge}>
                          <Ionicons name="water" size={12} color="#DC2626" />
                          <Text style={styles.bloodTypeText}>{bloodType}</Text>
                        </View>
                      ) : (
                        <View style={styles.staffStatusPill}>
                          <Ionicons name="shield-checkmark" size={12} color="#0284C7" />
                          <Text style={styles.staffStatusPillText}>Đang Hoạt Động</Text>
                        </View>
                      )}
                    </View>

                    {/* Mã QR Sức Khỏe Số / Thẻ Nhân Sự */}
                    <View style={styles.qrWrapper}>
                      <QRCode
                        value={qrPayload}
                        size={170}
                        color="#0F172A"
                        backgroundColor="#FFFFFF"
                      />
                      <Text style={styles.qrHint}>
                        {isStaffUser
                          ? 'Đưa mã QR này cho Ban Giám Đốc hoặc Quản Lý Chi Nhánh quét để kiểm tra thẻ nhân sự, bằng cấp CCHN & phân bổ ca trực.'
                          : 'Đưa mã này cho Dược sĩ quét tại quầy để nạp bệnh án & kiểm tra tương tác thuốc tự động'}
                      </Text>
                    </View>
                  </View>

                  {isStaffUser ? (
                    /* THÔNG TIN CHUYÊN MÔN DÀNH CHO NHÂN VIÊN */
                    <View style={styles.clinicalSummaryCard}>
                      <Text style={styles.summaryTitle}>Hồ Sơ & Chứng Chỉ Hành Nghề (CCHN)</Text>
                      <View style={styles.staffInfoRow}>
                        <Text style={styles.staffInfoLabel}>Cơ sở công tác:</Text>
                        <Text style={styles.staffInfoVal}>{user?.branchName || 'Cơ Sở Chi Nhánh ABC (CN1)'}</Text>
                      </View>
                      <View style={styles.staffInfoRow}>
                        <Text style={styles.staffInfoLabel}>Chứng chỉ hành nghề Dược:</Text>
                        <Text style={[styles.staffInfoVal, { color: '#0284C7', fontWeight: '800' }]}>CCHN Đạt Chuẩn GPP BYT</Text>
                      </View>
                      <View style={styles.staffInfoRow}>
                        <Text style={styles.staffInfoLabel}>Tình trạng làm việc:</Text>
                        <Text style={styles.staffInfoVal}>Đang trong ca trực • Chấm công GPS hợp lệ</Text>
                      </View>
                    </View>
                  ) : (
                    /* Tóm tắt lâm sàng 4 chiều cho Khách hàng */
                    <View style={styles.clinicalSummaryCard}>
                      <Text style={styles.summaryTitle}>Tiền Sử Dị Ứng & Bệnh Nền</Text>

                      {allergies.length > 0 ? (
                        <View style={styles.tagSection}>
                          <Text style={styles.tagSectionTitle}>Dị ứng nhóm thuốc / Dị nguyên:</Text>
                          <View style={styles.tagWrap}>
                            {allergies.map((a, idx) => (
                              <View key={`al-${idx}`} style={styles.allergyTag}>
                                <Ionicons name="alert-circle" size={12} color="#BE123C" />
                                <Text style={styles.allergyTagText}>{a}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {allergicMedicines.length > 0 ? (
                        <View style={styles.tagSection}>
                          <Text style={styles.tagSectionTitle}>Thuốc biệt dược từng dị ứng:</Text>
                          <View style={styles.tagWrap}>
                            {allergicMedicines.map((m, idx) => (
                              <View key={`med-${idx}`} style={styles.medTag}>
                                <Ionicons name="medical" size={12} color="#D97706" />
                                <Text style={styles.medTagText}>{m}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {chronicConditions.length > 0 ? (
                        <View style={styles.tagSection}>
                          <Text style={styles.tagSectionTitle}>Bệnh nền mãn tính:</Text>
                          <View style={styles.tagWrap}>
                            {chronicConditions.map((c, idx) => (
                              <View key={`con-${idx}`} style={styles.conditionTag}>
                                <Ionicons name="heart" size={12} color="#0369A1" />
                                <Text style={styles.conditionTagText}>{c}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {allergies.length === 0 &&
                       allergicMedicines.length === 0 &&
                       chronicConditions.length === 0 && (
                        <View style={styles.emptySafeBox}>
                          <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                          <Text style={styles.emptySafeText}>
                            Hồ sơ ghi nhận bạn không có tiền sử dị ứng và bệnh lý nền.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <ClinicalButton
                      title={isStaffUser ? "Xem & Cập Nhật Bằng Cấp (CCHN)" : "Chỉnh Sửa Hồ Sơ Y Tế"}
                      variant="primary"
                      size="md"
                      onPress={() => {
                        if (isStaffUser) {
                          onClose();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {/* CHẾ ĐỘ CHỈNH SỬA / ONBOARDING BAN ĐẦU */}
              {isEditing && (
                <View style={styles.editModeContainer}>
                  {/* Tùy chọn Tôi hoàn toàn khỏe mạnh */}
                  <TouchableOpacity
                    style={[
                      styles.healthyToggleBox,
                      isHealthy && styles.healthyToggleBoxActive,
                    ]}
                    onPress={() => {
                      const next = !isHealthy;
                      setIsHealthy(next);
                      if (next) {
                        setAllergies([]);
                        setAllergicMedicines([]);
                        setChronicConditions([]);
                      }
                    }}
                  >
                    <Ionicons
                      name={isHealthy ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isHealthy ? '#0284C7' : '#64748B'}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.healthyTitle}>
                        Tôi hoàn toàn khỏe mạnh
                      </Text>
                      <Text style={styles.healthySubtitle}>
                        Không có tiền sử dị ứng thuốc và không có bệnh lý nền
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* 1. Nhóm dị ứng thuốc */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionHeaderLabel}>
                      1. Tiền sử dị ứng nhóm thuốc phổ biến:
                    </Text>
                    <View style={styles.chipsWrap}>
                      {POPULAR_ALLERGIES.map((item, idx) => {
                        const selected = allergies.includes(item);
                        return (
                          <TouchableOpacity
                            key={`pop-al-${idx}`}
                            style={[styles.chip, selected && styles.chipSelectedAllergy]}
                            onPress={() => toggleAllergy(item)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]}
                            >
                              {item}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 2. Biệt dược cụ thể bị dị ứng */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionHeaderLabel}>
                      2. Thuốc biệt dược cụ thể từng dị ứng (nếu có):
                    </Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="VD: Augmentin, Aspirin..."
                        value={customMed}
                        onChangeText={setCustomMed}
                      />
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={handleAddMed}
                      >
                        <Text style={styles.addBtnText}>Thêm</Text>
                      </TouchableOpacity>
                    </View>
                    {allergicMedicines.length > 0 && (
                      <View style={styles.chipsWrap}>
                        {allergicMedicines.map((m, idx) => (
                          <View key={`m-${idx}`} style={styles.medTag}>
                            <Text style={styles.medTagText}>{m}</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setAllergicMedicines((prev) =>
                                  prev.filter((it) => it !== m)
                                )
                              }
                            >
                              <Ionicons name="close-circle" size={14} color="#D97706" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* 3. Bệnh nền mãn tính */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionHeaderLabel}>
                      3. Bệnh nền / Bệnh lý mãn tính:
                    </Text>
                    <View style={styles.chipsWrap}>
                      {POPULAR_CONDITIONS.map((cond, idx) => {
                        const selected = chronicConditions.includes(cond);
                        return (
                          <TouchableOpacity
                            key={`pop-cond-${idx}`}
                            style={[
                              styles.chip,
                              selected && styles.chipSelectedCondition,
                            ]}
                            onPress={() => toggleCondition(cond)}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                selected && styles.chipTextSelected,
                              ]}
                            >
                              {cond}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 4. Nhóm máu */}
                  <View style={styles.formSection}>
                    <Text style={styles.sectionHeaderLabel}>4. Nhóm máu:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.bloodRow}>
                        {BLOOD_TYPES.map((bt) => {
                          const isSel = bloodType === bt;
                          return (
                            <TouchableOpacity
                              key={bt}
                              style={[styles.bloodChip, isSel && styles.bloodChipSelected]}
                              onPress={() => setBloodType(bt)}
                            >
                              <Text
                                style={[
                                  styles.bloodChipText,
                                  isSel && styles.bloodChipTextSelected,
                                ]}
                              >
                                {bt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Nút lưu hoặc hủy */}
                  <View style={styles.editBtnRow}>
                    {!isOnboardingMode && (
                      <ClinicalButton
                        title="Hủy"
                        variant="outline"
                        size="md"
                        onPress={() => setIsEditing(false)}
                        style={{ flex: 1, marginRight: 8 }}
                      />
                    )}
                    <ClinicalButton
                      title={saving ? 'Đang lưu...' : 'LƯU SỔ SỨC KHỎE SỐ'}
                      variant="primary"
                      size="md"
                      onPress={handleSave}
                      disabled={saving}
                      style={{ flex: 2 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  officialBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  requiredBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  requiredBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 30,
  },
  viewModeContainer: {
    gap: 16,
  },
  passportCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    padding: 16,
    alignItems: 'center',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  patientId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  patientPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  staffRoleMiniBadge: {
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  staffRoleMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  staffStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staffStatusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  staffInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  staffInfoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  staffInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  bloodTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bloodTypeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    width: '100%',
  },
  qrHint: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
  },
  clinicalSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  tagSection: {
    gap: 4,
  },
  tagSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allergyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE123C',
  },
  medTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  conditionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  emptySafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
  },
  emptySafeText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    marginTop: 6,
  },
  editModeContainer: {
    gap: 16,
  },
  healthyToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  healthyToggleBoxActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  healthyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  healthySubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  formSection: {
    gap: 8,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipSelectedAllergy: {
    backgroundColor: '#BE123C',
    borderColor: '#BE123C',
  },
  chipSelectedCondition: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bloodRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  bloodChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bloodChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  bloodChipTextSelected: {
    color: '#FFFFFF',
  },
  editBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
});
