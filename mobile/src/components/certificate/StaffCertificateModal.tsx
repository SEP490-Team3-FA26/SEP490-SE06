import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../ui/toastHelper';

interface StaffCertificateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Component hiển thị ảnh văn bằng có xử lý lỗi mạng / link hỏng
const CertificateImageCard: React.FC<{
  uri?: string;
  label: string;
  isThumbnail?: boolean;
}> = ({ uri, label, isThumbnail = false }) => {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!uri) return null;

  return (
    <View style={styles.certImageWrapper}>
      <View style={styles.certImageLabelRow}>
        <Ionicons name="document-text-outline" size={13} color="#7C3AED" />
        <Text style={styles.certImageLabelText}>{label}</Text>
      </View>
      {hasError ? (
        <View style={styles.imageErrorBox}>
          <Ionicons name="alert-circle-outline" size={26} color="#EF4444" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.imageErrorTitle}>Lỗi tải ảnh {label.toLowerCase()}</Text>
            <Text style={styles.imageErrorSub}>
              Không thể tải hình ảnh từ máy chủ. Có thể đường dẫn ảnh đã hết hạn hoặc tệp bị hỏng.
            </Text>
          </View>
        </View>
      ) : (
        <View style={isThumbnail ? styles.certThumbnailBox : styles.certBigImageBox}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#7C3AED" />
            </View>
          )}
          <Image
            source={{ uri }}
            style={isThumbnail ? styles.certImagePreview : styles.certImageBig}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
        </View>
      )}
    </View>
  );
};

const CERT_TYPES = [
  { id: 'PHARMACIST_UNIVERSITY', label: 'Dược sĩ Đại học', defaultAllowance: 1500000 },
  { id: 'PHARMACIST_COLLEGE', label: 'Dược sĩ Cao đẳng', defaultAllowance: 800000 },
  { id: 'PHARMACIST_INTERMEDIATE', label: 'Dược sĩ Trung cấp', defaultAllowance: 500000 },
  { id: 'PRACTICE_CERTIFICATE', label: 'Chứng chỉ hành nghề Dược (CCHN)', defaultAllowance: 3500000 },
  { id: 'CONTINUING_EDUCATION', label: 'Chứng chỉ đào tạo liên tục (CPE)', defaultAllowance: 300000 },
];

export const StaffCertificateModal: React.FC<StaffCertificateModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isManager = user?.role === 'branch' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'MY_CERTS' | 'SUBMIT' | 'APPROVAL'>(
    isManager ? 'APPROVAL' : 'MY_CERTS'
  );

  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [branchCertificates, setBranchCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Form submit state
  const [selectedCertType, setSelectedCertType] = useState(CERT_TYPES[0]);
  const [showTypePicker, setShowTypePicker] = useState<boolean>(false);
  const [certNumber, setCertNumber] = useState<string>('');
  const [issuedBy, setIssuedBy] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState<string>('');

  // 2 ảnh: Mặt trước & Mặt sau
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Manager Approval State
  const [selectedForReview, setSelectedForReview] = useState<any | null>(null);
  const [allowanceInput, setAllowanceInput] = useState<string>('2000000');
  const [isPIC, setIsPIC] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [mine, branch] = await Promise.all([
        ApiService.getMyCertificates(),
        isManager ? ApiService.getBranchCertificates() : Promise.resolve([]),
      ]);

      setMyCertificates(mine || []);
      setBranchCertificates(branch || []);
    } catch (e) {
      console.warn('Lỗi tải danh sách bằng cấp:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Pick Image from Camera or Gallery for front or back side
  const handlePickImage = async (side: 'front' | 'back', fromCamera = false) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showToast.error('Quyền truy cập', 'Vui lòng cấp quyền máy ảnh để chụp ảnh bằng cấp.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast.error('Quyền truy cập', 'Vui lòng cấp quyền thư viện để chọn ảnh bằng cấp.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (side === 'front') {
          setFrontImageUri(asset.uri);
          if (asset.base64) {
            setFrontImageBase64(`data:image/jpeg;base64,${asset.base64}`);
          }
        } else {
          setBackImageUri(asset.uri);
          if (asset.base64) {
            setBackImageBase64(`data:image/jpeg;base64,${asset.base64}`);
          }
        }
      }
    } catch (e: any) {
      showToast.error('Lỗi chọn ảnh', e.message);
    }
  };

  // Submit Certificate
  const handleSubmitCertificate = async () => {
    if (!certNumber.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập số hiệu văn bằng / chứng chỉ.');
      return;
    }
    if (!issuedBy.trim()) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập cơ quan cấp (Sở Y Tế / Đại học...).');
      return;
    }
    if (!frontImageUri) {
      showToast.error('Thiếu ảnh', 'Vui lòng chụp ảnh hoặc tải lên ảnh mặt trước của văn bằng.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedFrontUrl = frontImageUri;
      if (frontImageBase64) {
        const uploadRes = await ApiService.uploadCertificateImage(
          frontImageBase64,
          `cert_front_${Date.now()}.jpg`,
          'front'
        );
        if (uploadRes?.url) {
          uploadedFrontUrl = uploadRes.url;
        }
      }

      let uploadedBackUrl: string | undefined = undefined;
      if (backImageUri) {
        uploadedBackUrl = backImageUri;
        if (backImageBase64) {
          const uploadRes = await ApiService.uploadCertificateImage(
            backImageBase64,
            `cert_back_${Date.now()}.jpg`,
            'back'
          );
          if (uploadRes?.url) {
            uploadedBackUrl = uploadRes.url;
          }
        }
      }

      const payload = {
        certificateType: selectedCertType.id,
        certificateNumber: certNumber.trim(),
        issuedBy: issuedBy.trim(),
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim() || undefined,
        purpose: 'ALLOWANCE_ONLY',
        frontImageUrl: uploadedFrontUrl,
        backImageUrl: uploadedBackUrl,
      };

      const res = await ApiService.submitCertificate(payload);
      if (res.success) {
        showToast.success('Thành công', 'Đã nộp hồ sơ văn bằng! Chờ Quản lý cơ sở thẩm định phụ cấp.');
        setCertNumber('');
        setIssuedBy('');
        setFrontImageUri(null);
        setFrontImageBase64(null);
        setBackImageUri(null);
        setBackImageBase64(null);
        setActiveTab('MY_CERTS');
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Không thể nộp hồ sơ.');
      }
    } catch (err: any) {
      showToast.error('Lỗi kết nối', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Certificate (Manager)
  const handleApprove = async () => {
    if (!selectedForReview) return;
    const allowance = parseInt(allowanceInput.replace(/[^0-9]/g, ''), 10) || 0;

    try {
      setActionLoading(true);
      const res = await ApiService.approveCertificate(selectedForReview._id || selectedForReview.id, {
        monthlyAllowance: allowance,
        isBranchPIC: isPIC,
      });

      if (res.success) {
        showToast.success('Đã duyệt', `Đã duyệt CCHN với mức phụ cấp ${allowance.toLocaleString('vi-VN')} ₫/tháng!`);
        setSelectedForReview(null);
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Lỗi khi duyệt văn bằng.');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Certificate (Manager)
  const handleReject = async () => {
    if (!selectedForReview) return;
    if (!rejectionReason.trim()) {
      showToast.error('Lỗi', 'Vui lòng nhập lý do từ chối.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await ApiService.rejectCertificate(selectedForReview._id || selectedForReview.id, {
        rejectionReason: rejectionReason.trim(),
      });

      if (res.success) {
        showToast.success('Đã từ chối', 'Đã từ chối hồ sơ văn bằng.');
        setSelectedForReview(null);
        setShowRejectInput(false);
        setRejectionReason('');
        loadData();
        if (onSuccess) onSuccess();
      } else {
        showToast.error('Lỗi', res.error || 'Lỗi khi từ chối.');
      }
    } catch (e: any) {
      showToast.error('Lỗi', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'CHO_DUYET':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Chờ duyệt</Text>
          </View>
        );
      case 'DA_DUYET':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statusBadgeText, { color: '#047857' }]}>Đã duyệt</Text>
          </View>
        );
      case 'TU_CHOI':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statusBadgeText, { color: '#B91C1C' }]}>Từ chối</Text>
          </View>
        );
      default:
        return (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{status}</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="ribbon" size={22} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Chứng Chỉ Hành Nghề (CCHN)</Text>
                <Text style={styles.sheetSubtitle}>Văn bằng dược sĩ & Phụ cấp chức danh cơ sở</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('MY_CERTS')}
              style={[styles.tabBtn, activeTab === 'MY_CERTS' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'MY_CERTS' && styles.tabBtnTextActive]}>
                Văn Bằng Của Tôi ({myCertificates.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('SUBMIT')}
              style={[styles.tabBtn, activeTab === 'SUBMIT' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'SUBMIT' && styles.tabBtnTextActive]}>
                Nộp Bằng Mới
              </Text>
            </TouchableOpacity>

            {isManager && (
              <TouchableOpacity
                onPress={() => setActiveTab('APPROVAL')}
                style={[styles.tabBtn, activeTab === 'APPROVAL' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, activeTab === 'APPROVAL' && styles.tabBtnTextActive]}>
                  Thẩm Định Cơ Sở ({branchCertificates.filter((c) => c.status === 'CHO_DUYET').length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Đang tải hồ sơ văn bằng...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#7C3AED']} />}
            >
              {/* TAB 1: MY CERTIFICATES */}
              {activeTab === 'MY_CERTS' && (
                <View style={{ gap: 10 }}>
                  {myCertificates.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="ribbon-outline" size={44} color="#94A3B8" />
                      <Text style={styles.emptyTitle}>Chưa có văn bằng nào được nộp</Text>
                      <Text style={styles.emptySubtitle}>
                        Bạn hãy bấm "Nộp Bằng Mới" để chụp ảnh CCHN và nhận phụ cấp hàng tháng từ chi nhánh.
                      </Text>
                    </View>
                  ) : (
                    myCertificates.map((cert) => {
                      const typeLabel = CERT_TYPES.find((t) => t.id === cert.certificateType)?.label || cert.certificateType;
                      return (
                        <View key={cert._id || cert.id} style={styles.certCard}>
                          <View style={styles.certCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.certTypeTitle}>{typeLabel}</Text>
                              <Text style={styles.certNumText}>Số hiệu: {cert.certificateNumber}</Text>
                            </View>
                            {renderStatus(cert.status)}
                          </View>

                          <View style={styles.certInfoRow}>
                            <Text style={styles.certInfoLabel}>Cơ quan cấp:</Text>
                            <Text style={styles.certInfoVal}>{cert.issuedBy}</Text>
                          </View>

                          <View style={styles.certInfoRow}>
                            <Text style={styles.certInfoLabel}>Ngày cấp:</Text>
                            <Text style={styles.certInfoVal}>{cert.issueDate ? cert.issueDate.slice(0, 10) : ''}</Text>
                          </View>

                          {cert.status === 'DA_DUYET' && (
                            <View style={styles.allowancePill}>
                              <Ionicons name="cash" size={16} color="#047857" />
                              <Text style={styles.allowancePillText}>
                                Phụ cấp CCHN: {(cert.monthlyAllowance || 0).toLocaleString('vi-VN')} ₫/tháng
                              </Text>
                            </View>
                          )}

                          {cert.status === 'TU_CHOI' && cert.rejectionReason && (
                            <View style={[styles.allowancePill, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                              <Text style={[styles.allowancePillText, { color: '#B91C1C' }]}>
                                Lý do từ chối: {cert.rejectionReason}
                              </Text>
                            </View>
                          )}

                          <View style={{ gap: 8, marginTop: 10 }}>
                            {cert.frontImageUrl && (
                              <CertificateImageCard uri={cert.frontImageUrl} label="Mặt trước văn bằng" isThumbnail />
                            )}
                            {cert.backImageUrl && (
                              <CertificateImageCard uri={cert.backImageUrl} label="Mặt sau văn bằng" isThumbnail />
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* TAB 2: SUBMIT CERTIFICATE */}
              {activeTab === 'SUBMIT' && (
                <View style={styles.formCard}>
                  <Text style={styles.formSectionTitle}>1. CHỌN LOẠI VĂN BẰNG / CHỨNG CHỈ</Text>
                  
                  {/* Dropdown Selector thay vì Scroll ngang */}
                  <TouchableOpacity
                    onPress={() => setShowTypePicker(true)}
                    style={styles.typeSelectorBtn}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeSelectorTitle}>{selectedCertType.label}</Text>
                      <Text style={styles.typeSelectorSub}>
                        Phụ cấp dự kiến: {(selectedCertType.defaultAllowance || 0).toLocaleString('vi-VN')} ₫/tháng
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color="#7C3AED" />
                  </TouchableOpacity>

                  <Text style={styles.formSectionTitle}>2. THÔNG TIN PHÁP LÝ</Text>

                  <Text style={styles.inputLabel}>Số hiệu chứng chỉ / Bằng cấp (*)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={certNumber}
                    onChangeText={setCertNumber}
                    placeholder="VD: 012345/BYT-CCHND"
                  />

                  <Text style={styles.inputLabel}>Cơ quan cấp (*)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={issuedBy}
                    onChangeText={setIssuedBy}
                    placeholder="VD: Sở Y Tế TP. Hồ Chí Minh"
                  />

                  <Text style={styles.inputLabel}>Ngày cấp (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={issueDate}
                    onChangeText={setIssueDate}
                    placeholder="2024-05-20"
                  />

                  <Text style={styles.inputLabel}>Ngày hết hạn (Nếu có)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="Không bắt buộc"
                  />

                  <Text style={styles.formSectionTitle}>3. ẢNH CHỤP VĂN BẰNG / CCHN (2 MẶT)</Text>

                  {/* Mặt trước */}
                  <View style={styles.photoUploadCard}>
                    <View style={styles.photoUploadHeader}>
                      <Text style={styles.photoUploadTitle}>Mặt trước (* Bắt buộc)</Text>
                      {frontImageUri && <Text style={styles.photoUploadedTag}>Đã chọn</Text>}
                    </View>
                    {frontImageUri ? (
                      <View style={styles.previewContainer}>
                        <Image source={{ uri: frontImageUri }} style={styles.uploadedImage} resizeMode="contain" />
                        <TouchableOpacity
                          onPress={() => {
                            setFrontImageUri(null);
                            setFrontImageBase64(null);
                          }}
                          style={styles.deleteImageBtn}
                        >
                          <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                          <Text style={styles.deleteImageBtnText}>Xóa ảnh mặt trước</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imagePickerRow}>
                        <TouchableOpacity onPress={() => handlePickImage('front', true)} style={styles.pickBtn}>
                          <Ionicons name="camera" size={22} color="#7C3AED" />
                          <Text style={styles.pickBtnText}>Chụp mặt trước</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePickImage('front', false)} style={styles.pickBtn}>
                          <Ionicons name="images" size={22} color="#0284C7" />
                          <Text style={styles.pickBtnText}>Chọn từ thư viện</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Mặt sau */}
                  <View style={[styles.photoUploadCard, { marginTop: 12 }]}>
                    <View style={styles.photoUploadHeader}>
                      <Text style={styles.photoUploadTitle}>Mặt sau (Tùy chọn - CCHN 2 mặt / phụ lục)</Text>
                      {backImageUri && <Text style={styles.photoUploadedTag}>Đã chọn</Text>}
                    </View>
                    {backImageUri ? (
                      <View style={styles.previewContainer}>
                        <Image source={{ uri: backImageUri }} style={styles.uploadedImage} resizeMode="contain" />
                        <TouchableOpacity
                          onPress={() => {
                            setBackImageUri(null);
                            setBackImageBase64(null);
                          }}
                          style={styles.deleteImageBtn}
                        >
                          <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                          <Text style={styles.deleteImageBtnText}>Xóa ảnh mặt sau</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imagePickerRow}>
                        <TouchableOpacity onPress={() => handlePickImage('back', true)} style={styles.pickBtn}>
                          <Ionicons name="camera" size={22} color="#7C3AED" />
                          <Text style={styles.pickBtnText}>Chụp mặt sau</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePickImage('back', false)} style={styles.pickBtn}>
                          <Ionicons name="images" size={22} color="#0284C7" />
                          <Text style={styles.pickBtnText}>Chọn từ thư viện</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleSubmitCertificate}
                    style={styles.submitBtn}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>GỬI HỒ SƠ THẨM ĐỊNH</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* TAB 3: MANAGER APPROVAL */}
              {activeTab === 'APPROVAL' && isManager && (
                <View style={{ gap: 12 }}>
                  {branchCertificates.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="shield-checkmark-outline" size={44} color="#94A3B8" />
                      <Text style={styles.emptyTitle}>Không có hồ sơ nào chờ thẩm định</Text>
                    </View>
                  ) : (
                    branchCertificates.map((cert) => {
                      const typeLabel = CERT_TYPES.find((t) => t.id === cert.certificateType)?.label || cert.certificateType;
                      const isPending = cert.status === 'CHO_DUYET';

                      return (
                        <View key={cert._id || cert.id} style={styles.reviewCard}>
                          <View style={styles.certCardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.employeeNameText}>{cert.userFullName || cert.userEmail || 'Dược sĩ cơ sở'}</Text>
                              <Text style={styles.certTypeTitle}>{typeLabel}</Text>
                              <Text style={styles.certNumText}>Số hiệu: {cert.certificateNumber}</Text>
                            </View>
                            {renderStatus(cert.status)}
                          </View>

                          <View style={styles.certInfoRow}>
                            <Text style={styles.certInfoLabel}>Cơ quan cấp:</Text>
                            <Text style={styles.certInfoVal}>{cert.issuedBy}</Text>
                          </View>

                          <View style={{ gap: 8, marginVertical: 8 }}>
                            {cert.frontImageUrl && (
                              <CertificateImageCard uri={cert.frontImageUrl} label="Mặt trước văn bằng" />
                            )}
                            {cert.backImageUrl && (
                              <CertificateImageCard uri={cert.backImageUrl} label="Mặt sau văn bằng" />
                            )}
                          </View>

                          {isPending && (
                            <View style={styles.managerActionBox}>
                              <Text style={styles.actionHeader}>Gán mức phụ cấp & Phê duyệt:</Text>

                              <View style={styles.allowanceInputRow}>
                                <Text style={styles.allowancePrefix}>Phụ cấp tháng:</Text>
                                <TextInput
                                  style={styles.allowanceField}
                                  value={allowanceInput}
                                  onChangeText={setAllowanceInput}
                                  keyboardType="numeric"
                                />
                                <Text style={styles.allowanceSuffix}>₫</Text>
                              </View>

                              {showRejectInput ? (
                                <View style={{ marginTop: 8 }}>
                                  <TextInput
                                    style={styles.textInput}
                                    placeholder="Nhập lý do từ chối (bằng mờ, sai số hiệu...)"
                                    value={rejectionReason}
                                    onChangeText={setRejectionReason}
                                  />
                                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    <TouchableOpacity
                                      onPress={() => setShowRejectInput(false)}
                                      style={[styles.smallBtn, { backgroundColor: '#F1F5F9' }]}
                                    >
                                      <Text style={{ color: '#64748B', fontWeight: '700' }}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={handleReject}
                                      style={[styles.smallBtn, { backgroundColor: '#EF4444' }]}
                                      disabled={actionLoading}
                                    >
                                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Xác nhận từ chối</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <View style={styles.reviewBtnRow}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setSelectedForReview(cert);
                                      setShowRejectInput(true);
                                    }}
                                    style={styles.reviewRejectBtn}
                                    disabled={actionLoading}
                                  >
                                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                                    <Text style={styles.reviewRejectBtnText}>Từ chối</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => {
                                      setSelectedForReview(cert);
                                      handleApprove();
                                    }}
                                    style={styles.reviewApproveBtn}
                                    disabled={actionLoading}
                                  >
                                    {actionLoading && selectedForReview?._id === cert._id ? (
                                      <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                      <>
                                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                                        <Text style={styles.reviewApproveBtnText}>Phê Duyệt & Gán Phụ Cấp</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* Modal chọn loại văn bằng (Dropdown Picker) */}
          <Modal visible={showTypePicker} transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Chọn Loại Văn Bằng / Chứng Chỉ</Text>
                  <TouchableOpacity onPress={() => setShowTypePicker(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 350 }}>
                  {CERT_TYPES.map((t) => {
                    const isSelected = selectedCertType.id === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => {
                          setSelectedCertType(t);
                          setShowTypePicker(false);
                        }}
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickerItemLabel, isSelected && styles.pickerItemLabelActive]}>
                            {t.label}
                          </Text>
                          <Text style={styles.pickerItemSub}>
                            Phụ cấp đề xuất: {(t.defaultAllowance || 0).toLocaleString('vi-VN')} ₫/tháng
                          </Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#7C3AED',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  certCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  certTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  certNumText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  certInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  certInfoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  certInfoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  allowancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  allowancePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  certImagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#F1F5F9',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  typePill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  typePillActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  typePillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    gap: 6,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  previewContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  deleteImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteImageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  employeeNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 2,
  },
  certImageBig: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  certImageWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginVertical: 4,
  },
  certImageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  certImageLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  certThumbnailBox: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  certBigImageBox: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
  },
  imageErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  imageErrorSub: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  typeSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  typeSelectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6',
  },
  typeSelectorSub: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 2,
  },
  photoUploadCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  photoUploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoUploadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  photoUploadedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  pickerItemActive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  pickerItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemLabelActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  managerActionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  actionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  allowanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  allowancePrefix: {
    fontSize: 12,
    color: '#64748B',
  },
  allowanceField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    width: 130,
  },
  allowanceSuffix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  reviewBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  reviewRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 8,
  },
  reviewRejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  reviewApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 8,
  },
  reviewApproveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
});
