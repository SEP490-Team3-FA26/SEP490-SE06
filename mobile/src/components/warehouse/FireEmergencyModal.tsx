// FireEmergencyModal.tsx - Giao diện Cuộc Gọi Báo Động Hỏa Hoạn Toàn Màn Hình (Phong cách Messenger / Zalo Call)
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FireEmergencyNotifeeService,
  EmergencyCallState,
} from '../../services/fireEmergencyNotifee.service';

interface EmergencyData {
  deviceId: string;
  temp: string;
  title?: string;
  isTest?: boolean;
}

export const FireEmergencyModal: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [data, setData] = useState<EmergencyData | null>(null);
  const [callState, setCallState] = useState<EmergencyCallState>('RINGING');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Hiệu ứng sóng lan tỏa (Ripple Pulse) chuẩn cuộc gọi đến Messenger / Zalo
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = FireEmergencyNotifeeService.subscribe((alertPayload) => {
      if (alertPayload) {
        setData({
          deviceId: String(alertPayload.deviceId || 'ESP32S3_404CCA44C814'),
          temp: String(alertPayload.temp || '65.0'),
          title: alertPayload.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
          isTest: alertPayload.isTest ?? false,
        });
        setCallState(FireEmergencyNotifeeService.getCallState());
        setVisible(true);
      } else {
        setVisible(false);
        setData(null);
        setCallState('RINGING');
        setElapsedSeconds(0);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Khởi chạy vòng sóng tỏa tròn khi đang đổ chuông (RINGING)
  useEffect(() => {
    if (!visible || callState !== 'RINGING') {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse1.setValue(0);
      pulse2.setValue(0);
      return;
    }

    const createRipple = (anim: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const loop1 = createRipple(pulse1, 0);
    const loop2 = createRipple(pulse2, 900);
    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [visible, callState, pulse1, pulse2]);

  // Bộ đếm thời gian sau khi bấm nút Xanh (Tiếp nhận)
  useEffect(() => {
    if (!visible || callState !== 'ANSWERED') {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, callState]);

  const formatTimer = (sec: number): string => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Nút Đỏ (DECLINE / Tắt còi): Dập tắt cuộc gọi và đóng màn hình ngay lập tức
  const handleDeclineOrEnd = async () => {
    setVisible(false);
    setData(null);
    await FireEmergencyNotifeeService.stopAlarm();
  };

  // Nút Xanh (ANSWER / Tiếp nhận): Tắt chuông réo & rung, mở chi tiết hướng dẫn PCCC
  const handleAnswer = async () => {
    setCallState('ANSWERED');
    await FireEmergencyNotifeeService.answerAlarm();
  };

  if (!visible || !data) return null;

  const scale1 = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.85],
  });
  const opacity1 = pulse1.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.45, 0.15, 0],
  });

  const scale2 = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.85],
  });
  const opacity2 = pulse2.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.45, 0.15, 0],
  });

  return (
    <Modal
      transparent={false}
      animationType="slide"
      visible={visible}
      statusBarTranslucent
      onRequestClose={handleDeclineOrEnd}
    >
      <StatusBar barStyle="light-content" backgroundColor="#090D16" translucent />
      <View style={styles.container}>
        {/* Hào quang đỏ cảnh báo phía đỉnh màn hình */}
        <View style={styles.topGlow} />

        {/* Thanh trạng thái cuộc gọi trên cùng */}
        <View style={styles.topBar}>
          <View style={styles.encryptionBadge}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: callState === 'RINGING' ? '#EF4444' : '#22C55E' },
              ]}
            />
            <Text style={styles.encryptionText}>
              {callState === 'RINGING'
                ? 'CUỘC GỌI KHẨN CẤP • HỆ THỐNG IOT GSP'
                : `ĐANG TIẾP NHẬN SỰ CỐ • ${formatTimer(elapsedSeconds)}`}
            </Text>
          </View>

          {data.isTest && (
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>TÍN HIỆU THỬ NGHIỆM</Text>
            </View>
          )}
        </View>

        {callState === 'RINGING' ? (
          /* =====================================================================
           * CHẾ ĐỘ 1: MÀN HÌNH ĐỔ CHUÔNG CUỘC GỌI ĐẾN (GIỐNG MESSENGER / ZALO)
           * ===================================================================== */
          <>
            {/* Khối Avatar + Sóng âm + Tên người gọi */}
            <View style={styles.callerSection}>
              <View style={styles.avatarWrapper}>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: scale1 }],
                      opacity: opacity1,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.pulseRing,
                    {
                      transform: [{ scale: scale2 }],
                      opacity: opacity2,
                    },
                  ]}
                />
                <View style={styles.avatarCircle}>
                  <Ionicons name="flame" size={56} color="#FFFFFF" />
                  <View style={styles.avatarAppBadge}>
                    <Ionicons name="call" size={14} color="#FFFFFF" />
                  </View>
                </View>
              </View>

              <Text style={styles.callerName}>Kho Tổng GSP</Text>
              <Text style={styles.callerSubtitle}>
                ABC Pharmacy • Báo động cháy khẩn cấp
              </Text>
              <Text style={styles.ringingStatusText}>Đang đổ chuông báo động...</Text>

              {/* Thẻ tóm tắt nhiệt độ nhanh trên màn hình cuộc gọi */}
              <View style={styles.quickMetricsPill}>
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>NHIỆT ĐỘ PHÁT HIỆN</Text>
                  <Text style={styles.metricTempValue}>{data.temp}°C</Text>
                </View>
                <View style={styles.metricVerticalDivider} />
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>TRẠM QUAN TRẮC</Text>
                  <Text style={styles.metricStationValue}>{data.deviceId}</Text>
                </View>
              </View>
            </View>

            {/* Cụm 2 nút cuộc gọi chuẩn Messenger / Zalo ở đáy màn hình */}
            <View style={styles.callActionsFooter}>
              <Text style={styles.swipeHintText}>
                Bấm Tiếp nhận để tắt còi và xem chi tiết hướng dẫn ứng phó
              </Text>

              <View style={styles.callButtonsRow}>
                {/* Nút Đỏ: DECLINE / TẮT CÒI */}
                <View style={styles.callButtonColumn}>
                  <TouchableOpacity
                    style={[styles.circleCallButton, styles.declineCircleButton]}
                    onPress={handleDeclineOrEnd}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="call"
                      size={32}
                      color="#FFFFFF"
                      style={{ transform: [{ rotate: '135deg' }] }}
                    />
                  </TouchableOpacity>
                  <Text style={styles.callButtonLabel}>Tắt còi</Text>
                </View>

                {/* Nút Xanh lá: ANSWER / TIẾP NHẬN */}
                <View style={styles.callButtonColumn}>
                  <TouchableOpacity
                    style={[styles.circleCallButton, styles.answerCircleButton]}
                    onPress={handleAnswer}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.callButtonLabel}>Tiếp nhận</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* =====================================================================
           * CHẾ ĐỘ 2: ĐÃ NGHE MÁY / TIẾP NHẬN (ĐÃ TẮT CÒI, HIỆN CHI TIẾT SỰ CỐ)
           * ===================================================================== */
          <View style={styles.answeredContainer}>
            <View style={styles.answeredHeaderCard}>
              <View style={styles.answeredAvatarSmall}>
                <Ionicons name="flame" size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.answeredTitle}>
                  {data.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG'}
                </Text>
                <Text style={styles.answeredSub}>
                  Đã ngắt còi báo động • Đang hiển thị hồ sơ sự cố
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nhiệt độ đo được</Text>
                <Text style={styles.detailTempHighlight}>{data.temp}°C</Text>
              </View>
              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ngưỡng kích hoạt cháy</Text>
                <Text style={styles.detailValue}>&gt;= 60.0°C (Cấp độ Khẩn cấp)</Text>
              </View>
              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trạm cảm biến IoT</Text>
                <Text style={styles.detailValue}>{data.deviceId}</Text>
              </View>
              <View style={styles.detailDivider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vị trí lắp đặt</Text>
                <Text style={styles.detailValue}>Kho Tổng GSP (Trung Tâm)</Text>
              </View>

              <View style={styles.protocolBox}>
                <View style={styles.protocolHeader}>
                  <Ionicons name="shield-checkmark" size={18} color="#F87171" />
                  <Text style={styles.protocolTitle}>QUY TRÌNH ỨNG PHÓ KHẨN CẤP PCCC</Text>
                </View>
                <Text style={styles.protocolStep}>
                  1. Khẩn trương tiếp cận khu vực trạm {data.deviceId} kiểm tra khói/lửa thực tế.
                </Text>
                <Text style={styles.protocolStep}>
                  2. Ngắt cầu dao điện khu vực kho bảo quản và di dời lô thuốc nhạy cảm nhiệt.
                </Text>
                <Text style={styles.protocolStep}>
                  3. Kích hoạt chuông PCCC tòa nhà nếu phát hiện đám cháy thực sự.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleDeclineOrEnd}
              activeOpacity={0.85}
            >
              <Ionicons
                name="call"
                size={22}
                color="#FFFFFF"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
              <Text style={styles.endCallButtonText}>
                ĐÃ TIẾP NHẬN SỰ CỐ (KẾT THÚC)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    paddingHorizontal: 24,
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 340,
    borderRadius: 200,
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
  },
  topBar: {
    alignItems: 'center',
    gap: 8,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  encryptionText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  testBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  testBadgeText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#EF4444',
  },
  avatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  avatarAppBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#01BAA8',
    borderWidth: 2.5,
    borderColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  callerSubtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  ringingStatusText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  quickMetricsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.78)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    width: '100%',
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricVerticalDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginHorizontal: 12,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricTempValue: {
    color: '#F87171',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metricStationValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  callActionsFooter: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 12,
  },
  swipeHintText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 28,
  },
  callButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  callButtonColumn: {
    alignItems: 'center',
    gap: 12,
  },
  circleCallButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  declineCircleButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  answerCircleButton: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  callButtonLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  answeredContainer: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 18,
  },
  answeredHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    gap: 14,
  },
  answeredAvatarSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answeredTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  answeredSub: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  detailCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailTempHighlight: {
    color: '#EF4444',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  protocolBox: {
    marginTop: 16,
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    gap: 6,
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  protocolTitle: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  protocolStep: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  endCallButton: {
    width: '100%',
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  endCallButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
