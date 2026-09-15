// OrderConfirmation.tsx - Clean Medical Pharmacy Confirmation Screen
// Aligned with ABC Pharmacy & PayOS verification
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/api.service';
import { GradientButton } from '../components/ui/GradientButton';
import { AnimatedTouchable } from '../components/ui/AnimatedTouchable';
import { showToast } from '../components/ui/toastHelper';

interface OrderItemSummary {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

export const OrderConfirmation: React.FC<{
  route: any;
  navigation: any;
}> = ({ route, navigation }) => {
  const {
    orderId = `ORD-${Date.now()}`,
    orderCode = orderId,
    patientName = 'Khách hàng',
    patientPhone = '',
    paymentMethod = 'QR_PAY',
    totalAmount = 0,
    paymentStatus: initialStatus = 'pending',
    items = [],
  } = route?.params || {};

  const [status, setStatus] = useState<string>(initialStatus.toLowerCase());
  const [checking, setChecking] = useState<boolean>(false);

  const isPaid = useMemo(
    () => status === 'paid' || status === 'success' || status === 'completed',
    [status]
  );
  const isPending = useMemo(
    () => status === 'pending' || status === 'processing' || status === 'waiting',
    [status]
  );
  const isFailed = useMemo(
    () => status === 'cancelled' || status === 'failed' || status === 'canceled',
    [status]
  );

  // Check real payment status from backend API (no fake timers!)
  const verifyStatus = useCallback(async (silent = false) => {
    if (!orderCode) return;
    setChecking(true);
    try {
      const res = await ApiService.checkOrderPayment(orderCode);
      const rawStatus =
        res?.status ||
        res?.order?.paymentStatus ||
        res?.paymentStatus ||
        '';

      if (rawStatus) {
        const normalized = String(rawStatus).toLowerCase();
        setStatus(normalized);
        if (!silent) {
          if (normalized === 'paid' || normalized === 'success') {
            showToast.success('Thành công! 🎉', 'Đơn hàng đã được xác nhận thanh toán!');
          } else if (normalized === 'cancelled' || normalized === 'failed') {
            showToast.error('Thông báo', 'Đơn hàng chưa hoàn tất thanh toán hoặc đã hủy.');
          } else {
            showToast.info('Đang chờ', 'Đơn hàng đang chờ xử lý thanh toán.');
          }
        }
      } else if (!silent) {
        showToast.info('Trạng thái', 'Đơn hàng đang trong quá trình xử lý.');
      }
    } catch (err: any) {
      if (!silent) {
        showToast.error('Lỗi', err?.message || 'Không thể kiểm tra trạng thái lúc này.');
      }
    } finally {
      setChecking(false);
    }
  }, [orderCode]);

  // Initial check on mount if QR_PAY and not yet marked paid
  useEffect(() => {
    if (paymentMethod === 'QR_PAY' && !isPaid) {
      verifyStatus(true);
    }
  }, [paymentMethod, isPaid, verifyStatus]);

  const handleGoToOrders = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'CustomerScreen',
          params: { initialTab: 'ORDERS' },
        },
      ],
    });
  };

  const handleGoToStore = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'CustomerScreen',
          params: { initialTab: 'STORE' },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Icon Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.iconCircle,
              isPaid
                ? styles.iconCircleSuccess
                : isPending
                ? styles.iconCirclePending
                : styles.iconCircleFailed,
            ]}
          >
            <Ionicons
              name={
                isPaid
                  ? 'checkmark-circle'
                  : isPending
                  ? paymentMethod === 'CASH'
                    ? 'cube-outline'
                    : 'time-outline'
                  : 'close-circle'
              }
              size={56}
              color={
                isPaid
                  ? '#059669'
                  : isPending
                  ? paymentMethod === 'CASH'
                    ? '#059669'
                    : '#D97706'
                  : '#DC2626'
              }
            />
          </View>

          <Text style={styles.statusTitle}>
            {isPaid
              ? 'Đặt Hàng & Thanh Toán Thành Công!'
              : isPending
              ? paymentMethod === 'CASH'
                ? 'Đặt Hàng Thành Công (COD)!'
                : 'Đang Chờ Xác Nhận Thanh Toán'
              : 'Thanh Toán Chưa Hoàn Tất'}
          </Text>

          <Text style={styles.statusSubtitle}>
            {isPaid
              ? 'Đơn hàng đã được thanh toán qua PayOS và chuyển trực tiếp đến Dược sĩ để chuẩn bị thuốc.'
              : isPending
              ? paymentMethod === 'CASH'
                ? 'Đơn hàng nhận tiền khi giao (COD) đã được tiếp nhận. Dược sĩ sẽ sớm liên hệ xác nhận đơn.'
                : 'Hệ thống đang chờ xác nhận từ cổng thanh toán PayOS. Nếu bạn đã chuyển khoản xong, hãy bấm nút kiểm tra bên dưới.'
              : 'Giao dịch chưa hoàn tất hoặc đã bị hủy. Bạn có thể thanh toán lại trong mục Lịch Sử Đơn Hàng.'}
          </Text>
        </View>

        {/* Order Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color="#059669" />
            <Text style={styles.cardTitle}>Chi Tiết Đơn Hàng</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã đơn hàng</Text>
            <Text style={styles.detailValueCode}>#{orderCode}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Người nhận</Text>
            <Text style={styles.detailValue}>{patientName}</Text>
          </View>

          {patientPhone ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Số điện thoại</Text>
              <Text style={styles.detailValue}>{patientPhone}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phương thức</Text>
            <Text style={styles.detailValue}>
              {paymentMethod === 'QR_PAY'
                ? 'QR Code PayOS'
                : 'Tiền mặt khi nhận (COD)'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trạng thái</Text>
            <View
              style={[
                styles.statusBadge,
                isPaid
                  ? styles.badgeSuccess
                  : isPending
                  ? styles.badgePending
                  : styles.badgeFailed,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isPaid
                    ? styles.badgeTextSuccess
                    : isPending
                    ? styles.badgeTextPending
                    : styles.badgeTextFailed,
                ]}
              >
                {isPaid
                  ? 'Đã thanh toán'
                  : isPending
                  ? paymentMethod === 'CASH'
                    ? 'Chờ duyệt COD'
                    : 'Chờ thanh toán'
                  : 'Chưa thanh toán'}
              </Text>
            </View>
          </View>

          {/* Items Summary */}
          {items && items.length > 0 && (
            <View style={styles.itemsBox}>
              <Text style={styles.itemsTitle}>
                Sản phẩm đặt ({items.length} mặt hàng):
              </Text>
              {items.map((it: OrderItemSummary, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    • {it.name}
                  </Text>
                  <Text style={styles.itemQty}>x{it.quantity}</Text>
                  <Text style={styles.itemPrice}>
                    {(it.price * it.quantity).toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalAmount}>
              {Number(totalAmount).toLocaleString('vi-VN')} ₫
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {isPending && paymentMethod === 'QR_PAY' && (
            <AnimatedTouchable
              onPress={() => verifyStatus(false)}
              disabled={checking}
              style={styles.verifyButton}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color="#059669" />
              )}
              <Text style={styles.verifyButtonText}>
                {checking ? 'Đang kiểm tra...' : 'Kiểm Tra Lại Trạng Thái'}
              </Text>
            </AnimatedTouchable>
          )}

          <GradientButton
            title="XEM ĐƠN HÀNG CỦA TÔI"
            onPress={handleGoToOrders}
            gradientVariant="primary"
            size="lg"
            icon="document-text-outline"
            style={{ marginBottom: 12 }}
          />

          <AnimatedTouchable
            onPress={handleGoToStore}
            style={styles.storeButton}
          >
            <Ionicons name="storefront-outline" size={18} color="#64748B" />
            <Text style={styles.storeButtonText}>Về Trang Chủ Mua Thuốc</Text>
          </AnimatedTouchable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderConfirmation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
  },
  iconCircleSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  iconCirclePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  iconCircleFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  detailValueCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
  },
  badgeFailed: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#059669',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  badgeTextFailed: {
    color: '#DC2626',
  },
  itemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  itemQty: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  actionSection: {
    width: '100%',
    paddingBottom: 20,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 14,
  },
  storeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});