// CustomerCheckoutScreen.tsx - Checkout form with PayOS online checkout, COD and branch delivery
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { GradientButton } from '../../components/ui/GradientButton';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { CartItem, Voucher } from '../../types/pharmacy.types';

export const CustomerCheckoutScreen: React.FC<{
  route: any;
  navigation: any;
}> = ({ route, navigation }) => {
  const { user } = useAuth();
  const { cart = [], appliedVoucher, finalTotal = 0 } = route.params || {};

  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [address, setAddress] = useState<string>(user?.address || '');
  const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PAYOS' | 'BANK_TRANSFER'>('PAYOS');
  const [orderNote, setOrderNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmitOrder = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng cung cấp tên người nhận và số điện thoại liên hệ.');
      return;
    }

    if (deliveryType === 'DELIVERY' && !address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    setLoading(true);
    const orderPayload = {
      customerName: name.trim(),
      phone: phone.trim(),
      shippingAddress: deliveryType === 'DELIVERY' ? address.trim() : 'Nhận tại Nhà Thuốc Chi Nhánh Q1',
      items: cart.map((i: CartItem) => ({
        medicineId: i.medicine.id,
        name: i.medicine.name,
        quantity: i.quantity,
        price: i.medicine.price,
        unit: i.medicine.unit,
      })),
      totalAmount: finalTotal,
      paymentMethod,
      voucherCode: appliedVoucher?.code,
      note: orderNote,
    };

    try {
      const createdOrder = await ApiService.createOrder(orderPayload);
      const orderId = createdOrder?.id || createdOrder?._id || `ORD-${Date.now()}`;

      if (paymentMethod === 'PAYOS') {
        const payLinkRes = await ApiService.createPayOSLink(orderId, finalTotal);
        setLoading(false);

        if (payLinkRes?.checkoutUrl) {
          navigation.navigate('WebViewScreen', {
            title: 'Thanh Toán PayOS',
            url: payLinkRes.checkoutUrl,
          });
        } else {
          Alert.alert(
            'Đặt Hàng Thành Công',
            `Mã đơn hàng: ${orderId}\nChúng tôi đã ghi nhận đơn hàng thanh toán trực tuyến qua cổng PayOS!`,
            [{ text: 'Đóng', onPress: () => navigation.popToTop() }]
          );
        }
      } else {
        setLoading(false);
        Alert.alert(
          'Đặt Hàng Thành Công',
          `Mã đơn hàng: ${orderId}\nPhương thức: Thanh toán khi nhận hàng (COD). Dược sĩ sẽ liên hệ xác nhận sớm nhất!`,
          [{ text: 'Hoàn Tất', onPress: () => navigation.popToTop() }]
        );
      }
    } catch {
      setLoading(false);
      Alert.alert('Lỗi', 'Không thể tạo đơn hàng lúc này.');
    }
  };

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
          {/* Delivery Method Picker */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Hình Thức Nhận Hàng</Text>
            <View style={styles.deliveryRow}>
              <AnimatedTouchable
                onPress={() => setDeliveryType('DELIVERY')}
                style={[
                  styles.deliveryChoice,
                  deliveryType === 'DELIVERY' && styles.activeDeliveryChoice,
                ]}
              >
                <Ionicons
                  name="bicycle"
                  size={20}
                  color={deliveryType === 'DELIVERY' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.deliveryText,
                    deliveryType === 'DELIVERY' && styles.activeDeliveryText,
                  ]}
                >
                  Giao Tận Nơi
                </Text>
              </AnimatedTouchable>

              <AnimatedTouchable
                onPress={() => setDeliveryType('PICKUP')}
                style={[
                  styles.deliveryChoice,
                  deliveryType === 'PICKUP' && styles.activeDeliveryChoice,
                ]}
              >
                <Ionicons
                  name="storefront"
                  size={20}
                  color={deliveryType === 'PICKUP' ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.deliveryText,
                    deliveryType === 'PICKUP' && styles.activeDeliveryText,
                  ]}
                >
                  Nhận Tại Nhà Thuốc
                </Text>
              </AnimatedTouchable>
            </View>
          </View>

          {/* Recipient Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Thông Tin Người Nhận</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Họ và tên người nhận</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Số điện thoại liên hệ</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {deliveryType === 'DELIVERY' ? (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Địa chỉ giao hàng (Số nhà, Phường/Xã, Quận/Huyện)</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress} />
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
              <TextInput style={styles.input} value={orderNote} onChangeText={setOrderNote} />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Phương Thức Thanh Toán</Text>

            <AnimatedTouchable
              onPress={() => setPaymentMethod('PAYOS')}
              style={[
                styles.payMethodOption,
                paymentMethod === 'PAYOS' && styles.activePayOption,
              ]}
            >
              <View style={styles.payIconBox}>
                <Ionicons name="qr-code" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionTitle}>Cổng Thanh Toán PayOS (QR VietQR/Thẻ)</Text>
                <Text style={styles.payOptionSub}>Quét mã QR qua tất cả ứng dụng Ngân hàng</Text>
              </View>
              {paymentMethod === 'PAYOS' ? (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              ) : null}
            </AnimatedTouchable>

            <AnimatedTouchable
              onPress={() => setPaymentMethod('CASH')}
              style={[
                styles.payMethodOption,
                paymentMethod === 'CASH' && styles.activePayOption,
              ]}
            >
              <View style={styles.payIconBox}>
                <Ionicons name="cash" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionTitle}>Thanh Toán Khi Nhận Hàng (COD)</Text>
                <Text style={styles.payOptionSub}>Thanh toán tiền mặt cho nhân viên giao hàng</Text>
              </View>
              {paymentMethod === 'CASH' ? (
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              ) : null}
            </AnimatedTouchable>
          </View>

          {/* Order Summary & Final Button */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng số lượng thuốc:</Text>
              <Text style={styles.summaryVal}>
                {cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)} hộp/sản phẩm
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Tổng tiền thanh toán:</Text>
              <Text style={styles.totalVal}>{finalTotal.toLocaleString('vi-VN')} ₫</Text>
            </View>

            <GradientButton
              title="ĐẶT HÀNG NGAY"
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
  },
  deliveryChoice: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  activeDeliveryChoice: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  deliveryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
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
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  pickupNoteText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
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
  },
  payOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  payOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
