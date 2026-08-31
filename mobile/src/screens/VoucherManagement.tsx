import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

import { VoucherAPI, Voucher } from '../services/voucherApiService';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function VoucherManagement({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const data = await VoucherAPI.getOrganizerVouchers();
      setVouchers(data);
    } catch (err: any) {
      console.error('loadVouchers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      void loadVouchers();
    }, [])
  );

  const onCreateVoucher = async () => {
    if (!voucherCode.trim()) {
      Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Hãy nhập mã voucher mới' });
      return;
    }
    try {
      setLoading(true);
      await VoucherAPI.createVoucher({
        code: voucherCode.trim().toUpperCase(),
        description: 'Voucher tạo từ di động',
        discountType: 'fixed',
        discountValue: 50000,
        maxUses: 100
      });
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã tạo voucher mới' });
      setVoucherCode('');
      void loadVouchers();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: err.message || 'Không thể tạo voucher' });
    } finally {
      setLoading(false);
    }
  };

  const onScanVoucher = () => {
    navigation.navigate('ScanTicket', { mode: 'voucher' }); 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quản lý Voucher</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Search / Scan Voucher */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <TextInput
             style={[styles.input, { color: colors.text }]}
             placeholder="Nhập mã Voucher..."
             placeholderTextColor={colors.textSecondary}
             value={voucherCode}
             onChangeText={setVoucherCode}
           />
           <TouchableOpacity onPress={onScanVoucher} style={[styles.scanIcon, { backgroundColor: colors.accent }]}>
             <MaterialIcons name="qr-code-scanner" size={24} color="white" />
           </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Danh sách Voucher</Text>
        
        {loading && vouchers.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : vouchers.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: colors.textSecondary }}>Chưa có voucher nào</Text>
          </View>
        ) : (
          vouchers.map((v) => (
            <View key={v._id} style={[styles.voucherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <View style={styles.cardLeft}>
                  <View style={[styles.circle, { backgroundColor: colors.background, top: -10 }]} />
                  <View style={[styles.circle, { backgroundColor: colors.background, bottom: -10 }]} />
                  <MaterialIcons name="local-offer" size={32} color={v.status === 'active' ? colors.accent : colors.textSecondary} />
               </View>
  
               <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                     <Text style={[styles.voucherType, { color: colors.text }]}>
                       {v.discountType === 'percentage' ? `Giảm ${v.discountValue}%` : `Giảm ₫${v.discountValue?.toLocaleString()}`}
                     </Text>
                     <View style={[
                       styles.statusBadge, 
                       { backgroundColor: v.status === 'active' ? colors.accent + '20' : colors.surfaceSecondary }
                     ]}>
                        <Text style={[
                          styles.statusText, 
                          { color: v.status === 'active' ? colors.accent : colors.textSecondary }
                        ]}>{v.status.toUpperCase()}</Text>
                     </View>
                  </View>
                  <Text style={[styles.voucherCode, { color: colors.accent }]}>{v.code}</Text>
                  <Text style={[styles.voucherDesc, { color: colors.textSecondary }]}>
                    Dùng: {v.usedCount} / {v.maxUses}
                  </Text>
               </View>
            </View>
          ))
        )}
        
        <TouchableOpacity style={styles.addBtn} onPress={onCreateVoucher} disabled={loading}>
           <LinearGradient
             colors={[colors.accent, colors.accentSecondary]}
             style={styles.gradient}
             start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
           >
              <Text style={styles.addText}>Thêm Voucher Mới</Text>
           </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 30,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  voucherCard: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardLeft: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 2,
    borderRightColor: '#0a0014', // Same as background for "cut" effect
    borderStyle: 'dashed',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    left: 70,
  },
  cardInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voucherType: {
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  voucherCode: {
    fontSize: 20,
    fontWeight: 'black',
    letterSpacing: 2,
    marginVertical: 4,
  },
  voucherDesc: {
    fontSize: 11,
  },
  addBtn: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
