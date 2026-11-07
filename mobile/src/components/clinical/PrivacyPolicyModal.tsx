// mobile/src/components/clinical/PrivacyPolicyModal.tsx
/**
 * =========================================================================
 * MODAL QUY ĐỊNH BẢO MẬT THÔNG TIN NGƯỜI DÙNG & DỮ LIỆU Y TẾ (MOBILE)
 * - Tuân thủ Nghị định 13/2023/NĐ-CP và Chuẩn Thực hành tốt Nhà thuốc (GPP)
 * - Tối ưu hóa UI/UX React Native theo phong cách Zero-Border (abc-reactnative-improvement-ui-ux)
 * - Chống crash 100%: Toàn bộ văn bản nằm trong thẻ <Text>, không dùng falsy-&&
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTouchable } from '../ui/AnimatedTouchable';
import { FlatButton } from '../flat/FlatButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  onClose,
  onAccept,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header Modal */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="shield-checkmark" size={22} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Quy Định Bảo Mật Thông Tin</Text>
                    <Text style={styles.subtitle}>Nghị định 13/2023/NĐ-CP & Chuẩn GPP</Text>
                  </View>
                </View>

                <AnimatedTouchable
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </AnimatedTouchable>
              </View>

              {/* Nội dung quy định cuộn */}
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Lời mở đầu */}
                <View style={styles.introBox}>
                  <Ionicons name="lock-closed" size={16} color="#0369A1" style={{ marginTop: 2 }} />
                  <Text style={styles.introText}>
                    ABC Pharmacy cam kết tôn trọng và bảo vệ tuyệt đối dữ liệu cá nhân, lịch sử đơn thuốc và bệnh án điện tử của Quý khách theo quy định Bộ Y tế.
                  </Text>
                </View>

                {/* Điều 1 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.badgeNum}>
                      <Text style={styles.badgeNumText}>1</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Mục Đích Thu Thập & Sử Dụng</Text>
                  </View>
                  <Text style={styles.sectionBody}>
                    Hệ thống chỉ thu thập thông tin để quản lý đơn thuốc, kiểm tra tiền sử dị ứng thuốc và đưa ra cảnh báo tương tác thuốc an toàn tự động.
                  </Text>
                </View>

                {/* Điều 2 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.badgeNum, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.badgeNumText, { color: '#15803D' }]}>2</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Tuyệt Đối Không Chia Sẻ Dữ Liệu</Text>
                  </View>
                  <Text style={styles.sectionBody}>
                    Cam kết không bán, không thương mại hóa hồ sơ y tế cho bất kỳ bên thứ ba nào. Thông tin chỉ phục vụ tư vấn Dược sĩ chuyên môn.
                  </Text>
                </View>

                {/* Điều 3 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.badgeNum, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.badgeNumText, { color: '#B45309' }]}>3</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Mã Hóa & Lưu Trữ An Toàn</Text>
                  </View>
                  <Text style={styles.sectionBody}>
                    Mật khẩu được mã hóa Bcrypt một chiều an toàn, toàn bộ kết nối truyền tải dữ liệu qua giao thức bảo mật SSL/TLS 256-bit chuẩn quốc tế.
                  </Text>
                </View>

                {/* Điều 4 */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.badgeNum, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.badgeNumText, { color: '#0369A1' }]}>4</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Quyền Lợi Của Khách Hàng</Text>
                  </View>
                  <Text style={styles.sectionBody}>
                    Khách hàng có toàn quyền tra cứu, cập nhật bệnh án, tải mã QR Hộ chiếu sức khỏe hoặc yêu cầu xóa dữ liệu cá nhân theo luật định.
                  </Text>
                </View>

                {/* Điều 5 */}
                <View style={styles.sectionLast}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.badgeNum, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.badgeNumText, { color: '#7E22CE' }]}>5</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Hỗ Trợ & Khiếu Nại Miễn Phí</Text>
                  </View>
                  <Text style={styles.sectionBody}>
                    Mọi ý kiến thắc mắc, vui lòng liên hệ Tổng đài Dược sĩ miễn cước: 1800 6868 (07:00 – 22:00 hàng ngày).
                  </Text>
                </View>
              </ScrollView>

              {/* Footer Thao Tác */}
              <View style={styles.footer}>
                <AnimatedTouchable onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </AnimatedTouchable>

                <FlatButton
                  title="TÔI ĐÃ HIỂU & ĐỒNG Ý"
                  variant="primary"
                  size="md"
                  icon="checkmark-circle-outline"
                  onPress={() => {
                    if (onAccept) onAccept();
                    onClose();
                  }}
                  style={{ flex: 1, marginLeft: 10 }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  bodyScroll: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  bodyContent: {
    padding: 18,
  },
  introBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  introText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#0369A1',
    fontWeight: '500',
  },
  section: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionLast: {
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badgeNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    paddingLeft: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default PrivacyPolicyModal;
