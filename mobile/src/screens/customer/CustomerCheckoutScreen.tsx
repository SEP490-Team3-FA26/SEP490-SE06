// CustomerCheckoutScreen.tsx
// Logic migrated from Flutter checkout_screen.dart
// - patientName/patientPhone fields (aligned with MongoDB schema)
// - validateVoucher via API (not local match only)
// - Discount calculation: PERCENT with maxDiscountValue cap
// - PayOS: expo-web-browser → verify after close → OrderConfirmation with real status
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { showToast } from '../../components/ui/toastHelper';
import { CartItem } from '../../types/pharmacy.types';

// ─── Voucher shape returned by backend validateVoucher ────────────────────────
interface ValidatedVoucher {
  success: boolean;
  code: string;
  discountType: 'PERCENT' | 'PERCENTAGE' | 'FIXED_AMOUNT' | string;
  discountValue: number;
  maxDiscountValue?: number;
  maxDiscount?: number;
  discount?: number; // shortcut field backend sometimes returns
  message?: string;
}

export const CustomerCheckoutScreen: React.FC<{
  route: any;
  navigation: any;
}> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { cart = [], subtotal: rawSubtotal = 0, appliedVoucher: initVoucher = null } = route.params || {};

  // Tính subtotal từ cart nếu không được truyền trực tiếp
  const subtotal = useMemo(() => {
    if (rawSubtotal && rawSubtotal > 0) return rawSubtotal;
    return (cart as CartItem[]).reduce((sum, item) => sum + (item.medicine?.price || 0) * (item.quantity || 1), 0);
  }, [rawSubtotal, cart]);

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState<string>(user?.name || '');
  const [patientPhone, setPatientPhone] = useState<string>(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState<string>(user?.address || '');
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR_PAY'>('QR_PAY');
  const [orderNote, setOrderNote] = useState<string>('');

  // ─── Voucher state (mirrors Flutter _CheckoutScreenState) ───────────────────
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>(initVoucher?.code || '');
  const [appliedVoucher, setAppliedVoucher] = useState<ValidatedVoucher | null>(initVoucher || null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState<boolean>(false);
  const [voucherErrorMsg, setVoucherErrorMsg] = useState<string | null>(null);

  // ─── Submit state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(false);

  // ─── Discount calculation (port từ Flutter _discountAmount) ─────────────────
  const discountAmount = useMemo<number>(() => {
    if (!appliedVoucher) return 0;

    // Backend trả về field 'discount' rút gọn (đã tính sẵn)
    if (appliedVoucher.discount != null) {
      return Number(appliedVoucher.discount);
    }

    const val = Number(appliedVoucher.discountValue ?? 0);
    const type = appliedVoucher.discountType ?? 'FIXED_AMOUNT';

    if (type === 'PERCENT' || type === 'PERCENTAGE') {
      let disc = subtotal * (val / 100);
      const maxDisc = Number(appliedVoucher.maxDiscountValue ?? appliedVoucher.maxDiscount ?? 0);
      if (maxDisc > 0 && disc > maxDisc) disc = maxDisc;
      return disc;
    }

    return val;
  }, [appliedVoucher, subtotal]);

  const finalTotal = useMemo<number>(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  // ─── Validate Voucher via API (port từ Flutter _applyVoucherCode) ────────────
  const handleApplyVoucher = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsValidatingVoucher(true);
    setVoucherErrorMsg(null);

    try {
      const res: ValidatedVoucher = await ApiService.validateVoucher(code, subtotal);

      if (res?.success === true) {
        setAppliedVoucher({ ...res, code: res.code || code });
        setVoucherErrorMsg(null);
        showToast.success(
          'Áp dụng thành công!',
          `Đã áp dụng mã voucher ${res.code || code}!`
        );
      } else {
        setAppliedVoucher(null);
        const errMsg = res?.message ?? 'Mã voucher không hợp lệ hoặc đã hết hạn.';
        setVoucherErrorMsg(errMsg);
        showToast.error('Voucher không hợp lệ', errMsg);
      }
    } catch (e: any) {
      setAppliedVoucher(null);
      const errMsg = e?.message ?? 'Không thể kiểm tra voucher. Vui lòng thử lại.';
      setVoucherErrorMsg(errMsg);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherErrorMsg(null);
  };

  // ─── Submit Order (port từ Flutter _handleConfirmCheckout) ───────────────────
  const handleSubmitOrder = async () => {
    // Validation
    if (!patientName.trim() || !patientPhone.trim()) {
      showToast.error('Lỗi', 'Vui lòng cung cấp tên người nhận và số điện thoại.');
      return;
    }
    if (deliveryType === 'DELIVERY' && !shippingAddress.trim()) {
      showToast.error('Lỗi', 'Vui lòng nhập địa chỉ giao hàng.');
      return;
    }
    if (!cart || cart.length === 0) {
      showToast.error('Lỗi', 'Giỏ hàng đang trống!');
      return;
    }

    setLoading(true);

    // ── Payload aligned với MongoDB schema (patientName/patientPhone) ──
    const orderPayload = {
      // Đúng field backend/MongoDB nhận
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      shippingAddress:
        deliveryType === 'DELIVERY'
          ? shippingAddress.trim()
          : 'Nhận tại Nhà Thuốc Chi Nhánh Q1 - 123 Hai Bà Trưng, Q.1',
      paymentMethod,        // 'QR_PAY' hoặc 'CASH'
      type: 'ONLINE',       // Flutter dùng field này
      totalAmount: Math.round(finalTotal),
      items: (cart as CartItem[]).map((i) => ({
        medicineId: i.medicine.id,
        name: i.medicine.name,
        quantity: i.quantity,
        price: i.medicine.price,
        unit: i.medicine.unit,
      })),
      ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
      ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
    };

    try {
      // 1) Tạo đơn hàng
      const createdOrder = await ApiService.createOrder(orderPayload);
      const orderId: string =
        createdOrder?.id || createdOrder?._id || createdOrder?.orderCode?.toString() || `ORD-${Date.now()}`;
      const orderCode = createdOrder?.orderCode || orderId;

      if (paymentMethod === 'QR_PAY') {
        // 2a) Lấy link thanh toán PayOS:
        // Backend OrdersServiceService khi nhận paymentMethod === 'QR_PAY' trả về checkoutUrl trực tiếp trong createdOrder
        let checkoutUrl = createdOrder?.checkoutUrl;
        if (!checkoutUrl) {
          const payLinkRes = await ApiService.createPayOSLink(orderId, Math.round(finalTotal));
          checkoutUrl = payLinkRes?.checkoutUrl;
        }

        if (checkoutUrl) {
          setLoading(false);

          // 3) Mở PayOS trong in-app browser (giống Flutter WebViewController)
          await WebBrowser.openBrowserAsync(checkoutUrl, {
            dismissButtonStyle: 'close',
            toolbarColor: '#059669',
          });

          // 4) Sau khi user đóng browser → verify trạng thái thật với backend qua orderCode
          let paymentStatus = 'pending';
          try {
            const verifyRes = await ApiService.checkOrderPayment(orderCode);
            if (verifyRes?.status) {
              paymentStatus = String(verifyRes.status).toLowerCase();
            } else if (verifyRes?.order?.paymentStatus) {
              paymentStatus = String(verifyRes.order.paymentStatus).toLowerCase();
            } else if (verifyRes?.paymentStatus) {
              paymentStatus = String(verifyRes.paymentStatus).toLowerCase();
            }
          } catch (verifyErr) {
            console.warn('[Checkout] verifyPayment failed:', verifyErr);
          }

          // 5) Navigate sang màn xác nhận với status thật (không fake)
          navigation.replace('OrderConfirmation', {
            orderId,
            orderCode,
            patientName: patientName.trim(),
            patientPhone: patientPhone.trim(),
            paymentMethod: 'QR_PAY',
            totalAmount: Math.round(finalTotal),
            paymentStatus,
            items: orderPayload.items,
          });
        } else {
          // checkoutUrl rỗng - đơn vẫn tạo được, báo pending
          setLoading(false);
          showToast.info(
            'Đặt hàng thành công',
            `Mã đơn hàng: #${orderCode}. Đơn hàng đang chờ xác nhận thanh toán.`
          );
          navigation.replace('OrderConfirmation', {
            orderId,
            orderCode,
            patientName: patientName.trim(),
            patientPhone: patientPhone.trim(),
            paymentMethod: 'QR_PAY',
            totalAmount: Math.round(finalTotal),
            paymentStatus: 'pending',
            items: orderPayload.items,
          });
        }
      } else {
        // 2b) COD/CASH → đơn xác nhận ngay
        setLoading(false);
        navigation.replace('OrderConfirmation', {
          orderId,
          orderCode,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          paymentMethod: 'CASH',
          totalAmount: Math.round(finalTotal),
          paymentStatus: 'pending', // COD chờ dược sĩ xác nhận
          items: orderPayload.items,
        });
      }
    } catch (e: any) {
      setLoading(false);
      showToast.error('Đặt hàng thất bại', e?.message || 'Không thể tạo đơn hàng lúc này.');
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Xác Nhận Đặt Hàng"
        subtitle="Thông tin giao hàng & Phương thức thanh toán"
        onBack={() => navigation.goBack()}
        gradientVariant="emerald"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* ── Hình thức nhận hàng ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hình Thức Nhận Hàng</Text>
            <View style={styles.deliveryRow}>
              <AnimatedTouchable
                onPress={() => setDeliveryType('DELIVERY')}
                style={[styles.deliveryChoice, deliveryType === 'DELIVERY' && styles.activeDeliveryChoice]}
              >
                <Ionicons name="bicycle" size={20} color={deliveryType === 'DELIVERY' ? '#059669' : '#64748B'} />
                <Text style={[styles.deliveryText, deliveryType === 'DELIVERY' && styles.activeDeliveryText]}>
                  Giao Tận Nơi
                </Text>
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setDeliveryType('PICKUP')}
                style={[styles.deliveryChoice, deliveryType === 'PICKUP' && styles.activeDeliveryChoice]}
              >
                <Ionicons name="storefront" size={20} color={deliveryType === 'PICKUP' ? '#059669' : '#64748B'} />
                <Text style={[styles.deliveryText, deliveryType === 'PICKUP' && styles.activeDeliveryText]}>
                  Nhận Tại Nhà Thuốc
                </Text>
              </AnimatedTouchable>
            </View>
          </View>

          {/* ── Thông tin người nhận ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Thông Tin Người Nhận</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Họ và tên người nhận *</Text>
              <TextInput
                style={styles.input}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Số điện thoại liên hệ *</Text>
              <TextInput
                style={styles.input}
                value={patientPhone}
                onChangeText={setPatientPhone}
                keyboardType="phone-pad"
                placeholder="09xxxxxxxx"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {deliveryType === 'DELIVERY' ? (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Địa chỉ giao hàng *</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress}
                  onChangeText={setShippingAddress}
                  placeholder="Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            ) : (
              <View style={styles.pickupNoteBox}>
                <Ionicons name="location" size={18} color="#059669" />
                <Text style={styles.pickupNoteText}>
                  Địa chỉ nhận: Nhà thuốc Chi nhánh Q1 - 123 Hai Bà Trưng, P. Bến Nghé, Q.1, TP.HCM
                </Text>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Ghi chú cho dược sĩ (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                value={orderNote}
                onChangeText={setOrderNote}
                placeholder="Vd: Giao trước 17h, gọi trước khi đến..."
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* ── Phương thức thanh toán ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Phương Thức Thanh Toán</Text>

            <AnimatedTouchable
              onPress={() => setPaymentMethod('QR_PAY')}
              style={[styles.payMethodOption, paymentMethod === 'QR_PAY' && styles.activePayOption]}
            >
              <View style={styles.payIconBox}>
                <Ionicons name="qr-code" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionTitle}>Cổng Thanh Toán PayOS (QR VietQR/Thẻ)</Text>
                <Text style={styles.payOptionSub}>Quét mã QR qua tất cả ứng dụng Ngân hàng</Text>
              </View>
              {paymentMethod === 'QR_PAY' && (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              )}
            </AnimatedTouchable>

            <AnimatedTouchable
              onPress={() => setPaymentMethod('CASH')}
              style={[styles.payMethodOption, paymentMethod === 'CASH' && styles.activePayOption]}
            >
              <View style={styles.payIconBox}>
                <Ionicons name="cash" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionTitle}>Thanh Toán Khi Nhận Hàng (COD)</Text>
                <Text style={styles.payOptionSub}>Thanh toán tiền mặt cho nhân viên giao hàng</Text>
              </View>
              {paymentMethod === 'CASH' && (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              )}
            </AnimatedTouchable>
          </View>

          {/* ── Voucher ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Mã Giảm Giá</Text>

            {appliedVoucher ? (
              <View style={styles.appliedVoucherRow}>
                <View style={styles.voucherBadge}>
                  <Ionicons name="pricetag" size={16} color="#059669" />
                  <Text style={styles.voucherBadgeText}>
                    {appliedVoucher.code} — Giảm{' '}
                    {discountAmount > 0 ? `${discountAmount.toLocaleString('vi-VN')} ₫` : 'theo voucher'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemoveVoucher} style={styles.removeVoucherBtn}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.voucherInputRow}>
                  <TextInput
                    style={styles.voucherInput}
                    placeholder="Nhập mã voucher..."
                    placeholderTextColor="#94A3B8"
                    value={voucherCodeInput}
                    onChangeText={(t) => {
                      setVoucherCodeInput(t);
                      setVoucherErrorMsg(null);
                    }}
                    autoCapitalize="characters"
                    editable={!isValidatingVoucher}
                  />
                  <AnimatedTouchable
                    onPress={handleApplyVoucher}
                    style={[styles.applyVoucherBtn, isValidatingVoucher && { opacity: 0.6 }]}
                  >
                    {isValidatingVoucher ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyVoucherText}>ÁP DỤNG</Text>
                    )}
                  </AnimatedTouchable>
                </View>
                {voucherErrorMsg ? (
                  <Text style={styles.voucherError}>{voucherErrorMsg}</Text>
                ) : null}
              </>
            )}
          </View>

          {/* ── Tổng kết & Đặt hàng ── */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính:</Text>
              <Text style={styles.summaryVal}>{subtotal.toLocaleString('vi-VN')} ₫</Text>
            </View>

            {discountAmount > 0 && appliedVoucher && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#059669' }]}>
                  Giảm giá ({appliedVoucher.code}):
                </Text>
                <Text style={[styles.summaryVal, { color: '#059669' }]}>
                  -{discountAmount.toLocaleString('vi-VN')} ₫
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng Thanh Toán:</Text>
              <Text style={styles.totalVal}>{finalTotal.toLocaleString('vi-VN')} ₫</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tổng sản phẩm: {(cart as CartItem[]).reduce((a, b) => a + b.quantity, 0)} hộp/sản phẩm
              </Text>
            </View>

            <GradientButton
              title={loading ? 'Đang xử lý...' : 'ĐẶT HÀNG NGAY'}
              onPress={handleSubmitOrder}
              loading={loading}
              gradientVariant="primary"
              size="lg"
              style={{ marginTop: 14 }}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  deliveryChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  activeDeliveryChoice: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeDeliveryText: {
    color: '#059669',
    fontWeight: '800',
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
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickupNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  pickupNoteText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 17,
  },
  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  activePayOption: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  payIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  payOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applyVoucherBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    minHeight: 42,
  },
  applyVoucherText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  voucherError: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  appliedVoucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  voucherBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  removeVoucherBtn: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 30,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
});
