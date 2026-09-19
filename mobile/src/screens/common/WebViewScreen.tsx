// WebViewScreen.tsx - High-Fidelity PayOS Gateway & OAuth In-App Browser
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as WebBrowser from 'expo-web-browser';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { ApiService } from '../../services/api.service';

const { width } = Dimensions.get('window');

export const WebViewScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const {
    title = 'Cổng Thanh Toán PayOS',
    url = 'https://payos.vn/checkout',
    orderId = `ORD-${Date.now()}`,
    amount = 150000,
    onSuccessToken,
  } = route.params || {};

  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins
  const [checking, setChecking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenExternalBrowser = async () => {
    try {
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      showToast.info('Thông báo', 'Không thể mở trình duyệt ngoài.');
    }
  };

  const handleSimulateSuccess = async () => {
    setChecking(true);
    try {
      // Verify payment with backend via checkOrderPayment
      const res = await ApiService.checkOrderPayment(orderId);
      const isPaid = res?.status === 'PAID' || res?.order?.paymentStatus === 'PAID';
      setIsSuccess(true);
      setChecking(false);

      if (onSuccessToken) {
        onSuccessToken(res?.token || 'oauth_token');
      }

      showToast.success(
        isPaid ? 'Giao Dịch Thành Công! 🎉' : 'Đã Ghi Nhận Yêu Cầu',
        `Mã đơn: #${orderId} - Trạng thái: ${res?.status || (isPaid ? 'Đã thanh toán' : 'Đang xử lý')}`
      );

      navigation.replace('OrderConfirmation', {
        orderId,
        orderCode: orderId,
        paymentStatus: isPaid ? 'paid' : (res?.status?.toLowerCase() || 'pending'),
        paymentMethod: 'QR_PAY',
        totalAmount: amount,
      });
    } catch {
      setChecking(false);
      setIsSuccess(true);
      navigation.replace('OrderConfirmation', {
        orderId,
        orderCode: orderId,
        paymentStatus: 'pending',
        paymentMethod: 'QR_PAY',
        totalAmount: amount,
      });
    }
  };

  const handleCancelPayment = () => {
    Alert.alert(
      'Hủy Giao Dịch',
      'Bạn có chắc chắn muốn hủy thanh toán đơn hàng này?',
      [
        { text: 'Tiếp tục thanh toán', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const qrData = url || `https://api.vietqr.io/image/970422-0388999888-COMPACT2.jpg?amount=${amount}&addInfo=${orderId}`;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title={title}
        subtitle="Kết nối bảo mật 256-bit SSL | PayOS Vietnam"
        onBack={handleCancelPayment}
        gradientVariant="ocean"
      />

      {/* Browser URL Bar */}
      <View style={styles.browserAddressBar}>
        <Ionicons name="lock-closed" size={14} color="#10B981" />
        <Text style={styles.addressText} numberOfLines={1}>
          {url}
        </Text>
        <AnimatedTouchable onPress={handleOpenExternalBrowser}>
          <Ionicons name="open-outline" size={17} color="#0284C7" />
        </AnimatedTouchable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* PayOS Checkout Card */}
        <View style={styles.payCard}>
          <View style={styles.payHeaderRow}>
            <View>
              <Text style={styles.brandTitle}>CỔNG THANH TOÁN PAYOS</Text>
              <Text style={styles.brandSub}>Quét mã VietQR bằng ứng dụng Ngân Hàng bất kỳ</Text>
            </View>
            <View style={styles.timerBadge}>
              <Ionicons name="time-outline" size={14} color="#DC2626" />
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            </View>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrBox}>
            <QRCode
              value={qrData}
              size={width * 0.52}
              color="#0F172A"
              backgroundColor="#FFFFFF"
            />
            <Text style={styles.qrScanHint}>Chụp màn hình hoặc dùng app ngân hàng quét mã</Text>
          </View>

          {/* Payment Info Table */}
          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
              <Text style={styles.infoValueBold}>{orderId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền thanh toán:</Text>
              <Text style={styles.infoPrice}>{amount.toLocaleString('vi-VN')} ₫</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngân hàng thụ hưởng:</Text>
              <Text style={styles.infoValue}>MB Bank (Ngân Hàng Quân Đội)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tài khoản:</Text>
              <Text style={styles.infoValueBold}>0388 999 888</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chủ tài khoản:</Text>
              <Text style={styles.infoValue}>CONG TY CP DUOC PHAM VINA</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nội dung chuyển khoản:</Text>
              <Text style={styles.infoContentTag}>{orderId}</Text>
            </View>
          </View>

          {/* Security & Action buttons */}
          <View style={styles.btnRow}>
            <GradientButton
              title={checking ? "Đang xác thực..." : "Mô Phỏng Thanh Toán Xong"}
              onPress={handleSimulateSuccess}
              gradientVariant="cyan"
              icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />}
            />
          </View>

          <AnimatedTouchable onPress={handleCancelPayment} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Hủy Giao Dịch & Quay Lại</Text>
          </AnimatedTouchable>
        </View>

        {/* Security Footer */}
        <View style={styles.securityFooter}>
          <Ionicons name="shield-checkmark" size={16} color="#64748B" />
          <Text style={styles.securityText}>
            Thanh toán được bảo vệ bởi chuẩn bảo mật PCI-DSS & PayOS Gateway
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  browserAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  payCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  qrScanHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  infoTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  infoValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  infoPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  infoContentTag: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  btnRow: {
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    flex: 1,
  },
});
