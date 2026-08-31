import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { PaymentAPI } from '../services/paymentApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContextType';

export default function MyTickets({ navigation }: any) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (authLoading) return;
      if (!isAuthenticated || !user?.id) {
        setLoading(false);
        setOrders([]);
        return;
      }

      const CACHE_KEY = `@my_tickets_${user.id}`;
      let hasCachedData = false;

      try {
        setLoading(true);
        setError(null);
        
        // 1. Tải từ Cache lên trước (Offline Mode)
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData && isMounted) {
          setOrders(JSON.parse(cachedData));
          hasCachedData = true;
        }

        // 2. Gọi API lấy dữ liệu mới nhất
        const data = await PaymentAPI.getUserOrders(user.id);
        if (!isMounted) return;
        
        const validOrders = Array.isArray(data) ? data : [];
        setOrders(validOrders);
        
        // 3. Lưu vào Cache
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(validOrders));
      } catch (e: any) {
        if (!isMounted) return;
        
        if (hasCachedData) {
           Toast.show({
             type: 'info',
             text1: 'Đang dùng chế độ Ngoại tuyến',
             text2: 'Không thể tải dữ liệu mới. Đang hiển thị vé đã lưu.',
           });
        } else {
           setError(e?.message || 'Không tải được danh sách vé');
           setOrders([]);
        }
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [authLoading, isAuthenticated, user?.id]);

  const upcomingOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'paid') return false;
      const tickets = Array.isArray(o.tickets) ? o.tickets : [];
      if (tickets.length === 0) return true;
      return !tickets.some((t: any) => t.status === 'checked-in' || t.status === 'used');
    });
  }, [orders]);

  const pastOrders = useMemo(() => {
    return orders.filter(o => {
      const tickets = Array.isArray(o.tickets) ? o.tickets : [];
      const hasUsedTicket = tickets.some((t: any) => t.status === 'checked-in' || t.status === 'used');
      const isInactive = o.status === 'refunded' || o.status === 'cancelled';
      return hasUsedTicket || isInactive;
    });
  }, [orders]);

  const visibleOrders = tab === 'upcoming' ? upcomingOrders : pastOrders;

  const renderBadge = (o: any) => {
    const tickets = Array.isArray(o.tickets) ? o.tickets : [];
    const hasCheckedIn = tickets.some((t: any) => t.status === 'checked-in' || t.status === 'used');
    if (hasCheckedIn) return { text: 'Đã check-in', color: '#10b981' };
    if (o.status === 'refunded') return { text: 'Đã hoàn tiền', color: '#60a5fa' };
    if (o.status === 'cancelled') return { text: 'Đã hủy', color: '#f87171' };
    if (o.status === 'paid') return { text: 'Có hiệu lực', color: '#a855f7' };
    return { text: o.status || 'Unknown', color: '#9ca3af' };
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="px-4 pt-12 pb-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-black" style={{ color: colors.text }}>Vé của tôi</Text>
          <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}>
            <MaterialIcons name="history" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View className="flex-row mt-6 p-1 rounded-xl border" style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}>
          <TouchableOpacity
            onPress={() => setTab('upcoming')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'upcoming' ? '' : ''}`}
            style={tab === 'upcoming' ? { backgroundColor: colors.accent } : {}}
          >
            <Text className="font-bold" style={{ color: tab === 'upcoming' ? '#fff' : colors.textSecondary }}>Sắp tới</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('past')}
            className={`flex-1 py-2 rounded-lg items-center ${tab === 'past' ? '' : ''}`}
            style={tab === 'past' ? { backgroundColor: colors.accent } : {}}
          >
            <Text className="font-bold" style={{ color: tab === 'past' ? '#fff' : colors.textSecondary }}>Đã đi</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {authLoading || loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator color={colors.accent} />
            <Text className="mt-3 font-bold" style={{ color: colors.textSecondary }}>Đang tải vé...</Text>
          </View>
        ) : !isAuthenticated ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-[#b388ff] font-bold mb-4 text-center">Bạn cần đăng nhập để xem vé</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              className="bg-[#d500f9] px-6 py-3 rounded-2xl"
            >
              <Text className="text-white font-bold">Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-red-400 font-bold text-center">{error}</Text>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <MaterialIcons
              name={tab === 'upcoming' ? 'confirmation-number' : 'history'}
              size={56}
              color={colors.textSecondary}
            />
            <Text className="mt-4 font-bold text-base" style={{ color: colors.textSecondary }}>
              {tab === 'upcoming' ? 'Chưa có vé sắp tới' : 'Chưa có sự kiện đã đi'}
            </Text>
            {tab === 'upcoming' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                className="mt-4 px-6 py-3 rounded-2xl"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-white font-bold">Khám phá sự kiện</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          visibleOrders.map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            const first = items[0];
            const qty = items.reduce((s: number, it: any) => s + Number(it.quantity || 1), 0);
            const badge = renderBadge(o);
            const isPast = tab === 'past';
            return (
              <TouchableOpacity
                key={String(o._id || o.orderCode)}
                onPress={() => navigation.navigate('TicketDetail', { orderCode: o.orderCode })}
                className="w-full rounded-3xl overflow-hidden mb-6 border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: isPast ? 0.8 : 1,
                }}
              >
                <ImageBackground
                  source={{ uri: o.eventImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' }}
                  className="w-full h-32 justify-end p-4"
                >
                  {isPast && (
                    <View
                      className="absolute inset-0"
                      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                    />
                  )}
                  <View
                    className="px-3 py-1 rounded-lg self-start"
                    style={{ backgroundColor: badge.color + '33', borderWidth: 1, borderColor: badge.color + '66' }}
                  >
                    <Text className="font-black text-[10px] uppercase" style={{ color: badge.color }}>{badge.text}</Text>
                  </View>
                </ImageBackground>

                <View className="p-4 relative">
                  <View
                    className="absolute -top-6 right-4 w-12 h-12 rounded-full items-center justify-center border-4 shadow-xl"
                    style={{ backgroundColor: isPast ? colors.textSecondary : colors.accent, borderColor: colors.surface }}
                  >
                    <MaterialIcons name={isPast ? 'check-circle' : 'qr-code-2'} size={24} color="white" />
                  </View>

                  <Text className="text-xl font-black mb-2 pr-12" style={{ color: colors.text }}>{o.eventName || 'Event'}</Text>

                  <View className="border-t border-dashed pt-4 flex-row justify-between" style={{ borderTopColor: colors.border }}>
                    <View>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>Khu vực</Text>
                      <Text className="text-sm font-black" style={{ color: colors.text }}>{first?.zoneName || '--'}</Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>Mã đơn</Text>
                      <Text className="text-sm font-black" style={{ color: colors.text }}>#{o.orderCode || '--'}</Text>
                    </View>
                    <View>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>Số lượng</Text>
                      <Text className="text-sm font-black" style={{ color: colors.accentSecondary }}>{qty} Vé</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
