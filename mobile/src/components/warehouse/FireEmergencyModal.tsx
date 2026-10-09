// FireEmergencyModal.tsx - Modal cảnh báo khẩn cấp hỏa hoạn dành cho Thủ kho
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

interface EmergencyData {
  deviceId: string;
  temp: string;
  title?: string;
  isTest?: boolean;
}

export const FireEmergencyModal: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [data, setData] = useState<EmergencyData | null>(null);

  useEffect(() => {
    // 1. Lắng nghe khi thông báo đẩy tới lúc app đang mở (Foreground)
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        setData({
          deviceId: String(payload.deviceId || 'ESP32S3_404CCA44C814'),
          temp: String(payload.temp || '65.0'),
          title: notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
          isTest: payload.isTest === 'true',
        });
        setVisible(true);

        // Rung cảnh báo bổ sung trên thiết bị
        if (Platform.OS === 'android') {
          Vibration.vibrate([0, 800, 400, 800, 400, 800], false);
        }
      }
    });

    // 2. Lắng nghe khi thủ kho bấm vào banner thông báo từ background / màn hình khóa
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response.notification.request.content.data;
      if (payload?.type === 'FIRE_EMERGENCY') {
        setData({
          deviceId: String(payload.deviceId || 'ESP32S3_404CCA44C814'),
          temp: String(payload.temp || '65.0'),
          title: response.notification.request.content.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
          isTest: payload.isTest === 'true',
        });
        setVisible(true);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const handleAcknowledge = async () => {
    setVisible(false);
    setData(null);
    Vibration.cancel();

    // Hủy các thông báo đang hiển thị trên khay hệ thống để tắt chuông/còi
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (err) {
      console.warn('Lỗi dismiss notification:', err);
    }
  };

  if (!visible || !data) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleAcknowledge}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon & Tag */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="flame" size={44} color="#EF4444" />
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.emergencyBadge}>
                <Text style={styles.emergencyBadgeText}>CẤP ĐỘ 2: KHẨN CẤP</Text>
              </View>
              {data.isTest && (
                <View style={styles.testBadge}>
                  <Text style={styles.testBadgeText}>TÍN HIỆU THỬ NGHIỆM</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>
              {data.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'}
            </Text>
          </View>

          {/* Chi tiết thông số cảm biến */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>Nhiệt độ đo được:</Text>
              <Text style={styles.tempValue}>{data.temp}°C</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Trạm quan trắc:</Text>
              <Text style={styles.value}>{data.deviceId}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Khu vực:</Text>
              <Text style={styles.value}>Kho Tổng GSP (Trung Tâm)</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.instruction}>
              Vui lòng khẩn trương tiếp cận hiện trường, kiểm tra nguy cơ cháy nổ, ngắt nguồn điện và kích hoạt quy trình ứng phó PCCC nếu cần thiết.
            </Text>
          </View>

          {/* Nút to bản: Đã tiếp nhận sự cố */}
          <TouchableOpacity
            style={styles.ackButton}
            onPress={handleAcknowledge}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done-circle" size={26} color="#FFFFFF" />
            <Text style={styles.ackButtonText}>ĐÃ TIẾP NHẬN SỰ CỐ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  emergencyBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  testBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
    marginTop: 4,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tempValue: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#FECDD3',
    marginVertical: 10,
  },
  instruction: {
    fontSize: 11,
    lineHeight: 16,
    color: '#9F1239',
    fontWeight: '500',
    textAlign: 'center',
  },
  ackButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
