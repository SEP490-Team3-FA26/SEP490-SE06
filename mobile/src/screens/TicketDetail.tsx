import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Share,
  StyleSheet,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { PaymentAPI } from '../services/paymentApiService';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContextType';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Bỏ slash cuối để tránh //t/... */
function normalizeWebBaseUrl(raw: string): string {
  return (raw || '').trim().replace(/\/+$/, '');
}

/** Link công khai xem vé (đồng bộ với web /t/:ticketId) */
function buildPublicTicketUrl(base: string, ticketId: string): string {
  const b = normalizeWebBaseUrl(base);
  const id = encodeURIComponent(ticketId);
  return `${b}/t/${id}`;
}

export default function TicketDetail({ navigation, route }: any) {
  const { orderCode } = route.params || {};
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const { colors } = useTheme();

  useEffect(() => {
    async function loadOrder() {
      if (!orderCode) {
        setLoading(false);
        return;
      }
      
      const CACHE_KEY = `@ticket_detail_${orderCode}`;
      let hasCachedData = false;
      
      try {
        setLoading(true);
        
        // 1. Tải từ Cache lên trước (Offline Mode)
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setOrder(JSON.parse(cachedData));
          hasCachedData = true;
          // Cho phép tắt loading ngang đây để UI hiện lập tức, call API chạy ngầm:
          setLoading(false); 
        }

        // Sync with PayOS since webhooks might not work on localhost
        let finalOrder = null;
        try {
          const verifyData = await PaymentAPI.verifyPayment(Number(orderCode));
          if (verifyData.order) {
            finalOrder = verifyData.order;
          } else {
            finalOrder = await PaymentAPI.getOrder(Number(orderCode));
          }
        } catch (error) {
           console.warn('Verify payment failed, fallback to getOrder:', (error as any)?.message || error);
           finalOrder = await PaymentAPI.getOrder(Number(orderCode));
        }
        
        if (finalOrder) {
           setOrder(finalOrder);
           // 3. Cập nhật Cache
           await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(finalOrder));
        }

      } catch (error) {
           // Nếu mạng đứt hoàn toàn và vào catch tổng:
           if (hasCachedData) {
              Toast.show({
                type: 'info',
                text1: 'Đang dùng chế độ Ngoại tuyến',
                text2: 'Vẫn hiển thị vé bình thường.',
              });
           } else {
              console.error('Error fetching order detail from API and no cache:', error);
           }
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderCode]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid': return { text: 'Đã thanh toán', color: '#00e5ff' };
      case 'refunded': return { text: 'Đã hoàn tiền', color: '#ff9100' };
      case 'cancelled': return { text: 'Đã hủy', color: '#ff1744' };
      case 'expired': return { text: 'Đã hết hạn', color: '#ff1744' };
      case 'pending':
      case 'processing': return { text: 'Đang xử lý', color: '#d500f9' };
      default: return { text: 'Không xác định', color: '#b388ff' };
    }
  };

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  // Hooks phải luôn chạy theo cùng thứ tự ở mọi lần render
  const tickets = (order as any)?.tickets || [];
  const items = Array.isArray(order?.items) ? order.items : [];
  const ticketPages = useMemo(() => {
    if (tickets.length > 0) {
      return tickets.map((ticket: any, index: number) => {
        const matchedItem =
          items.find(
            (it: any) =>
              (ticket.seatId && it.seatId && ticket.seatId === it.seatId) ||
              (ticket.zoneName && it.zoneName && ticket.zoneName === it.zoneName)
          ) || items[index] || items[0] || {};
        return {
          key: String(ticket.ticketId || `ticket-${index}`),
          ticket,
          item: matchedItem,
        };
      });
    }

    return items.map((item: any, index: number) => ({
      key: `item-${index}`,
      ticket: null,
      item,
    }));
  }, [tickets, items]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: 'bold' }}>Đang tải thông tin vé...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-[#0a0014] items-center justify-center p-4">
        <MaterialIcons name="error-outline" size={64} color="#ff1744" />
        <Text className="text-white text-xl font-bold mt-4">Không tìm thấy vé</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-6 bg-[#2a004d] px-6 py-2 rounded-xl border border-[#4d0099]"
        >
          <Text className="text-[#d500f9] font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = getStatusInfo(order.status);

  const webBaseUrl = normalizeWebBaseUrl(
    process.env.EXPO_PUBLIC_WEB_URL || 'https://event-ticketing-platform-six.vercel.app'
  );
  const activeTicket = tickets[activeIndex];

  const handleShareTicket = async () => {
    const activePage = ticketPages[activeIndex];
    const matchingTicket = activePage?.ticket || tickets[activeIndex];

    let ticketId: string | null =
      matchingTicket?.ticketId != null ? String(matchingTicket.ticketId) : null;

    // Khớp backend: TV-{orderCode base36}-{số thứ tự vé}; vé cũ có thể vẫn là TV-{số thập phân}-...
    if (!ticketId) {
      const idx = Number.isFinite(activeIndex) ? activeIndex : 0;
      const slug = Number(order.orderCode).toString(36);
      ticketId = `TV-${slug}-${idx + 1}`;
    }

    const url = buildPublicTicketUrl(webBaseUrl, ticketId);

    try {
      // Chỉ truyền `message`: Android tự ghép message + url → URL bị lặp 2 lần nếu gửi cả hai.
      await Share.share({
        message: `🎫 TicketVibe — xem vé:\n${url}`,
        title: 'TicketVibe',
      });
    } catch (e) {
      // ignore share cancel/errors
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 40, height: 40, backgroundColor: colors.surfaceSecondary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text, paddingRight: 40 }}>Chi tiết vé</Text>
      </View>

      <View className="flex-1">
        <View className="pt-4 flex-1">
          <FlatList
            data={ticketPages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const contentOffset = e.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffset / SCREEN_WIDTH);
              setActiveIndex(index);
            }}
            keyExtractor={(page) => page.key}
            renderItem={({ item: page, index }) => {
              const item = page.item || {};
              const matchingTicket = page.ticket || tickets[index];
              const qrValue =
                matchingTicket?.qrCodePayload ||
                (matchingTicket?.ticketId ? `ticket:${matchingTicket.ticketId}` : '') ||
                '';

              return (
              <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 16 }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 16, shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 }}>
                  <View style={styles.heroWrapper}>
                    <Image
                      source={{ uri: order.eventImage || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2070&auto=format&fit=crop' }}
                      style={styles.heroImage}
                    />
                    <View style={styles.heroOverlay} />
                    <View style={{ position: 'absolute', left: 14, bottom: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
                        {order.eventDate ? new Date(order.eventDate).toLocaleDateString('vi-VN') : 'Sự kiện sắp diễn ra'}
                      </Text>
                    </View>
                  </View>
                  <View className="p-6">
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="flex-1 mr-4">
                        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>{order.eventName}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1.5 }}>
                          Ticket {index + 1} of {ticketPages.length}
                        </Text>
                      </View>
                      <View
                        style={{ backgroundColor: statusInfo.color + '20', borderColor: statusInfo.color + '50', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 }}
                      >
                        <Text
                          style={{ color: statusInfo.color, fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}
                        >
                          {statusInfo.text}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mb-4">
                      <MaterialIcons name="location-on" size={16} color={colors.accentSecondary} />
                      <Text style={{ marginLeft: 8, color: colors.text, fontWeight: 'bold' }}>{order.eventLocation || 'Nhà thi đấu Phú Thọ'}</Text>
                    </View>

                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 16 }} />

                    <View className="mb-6">
                      <Text style={{ color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, opacity: 0.6 }}>Transaction Details</Text>
                      <View className="flex-row justify-between mb-2">
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Zone / Seat</Text>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>{item.zoneName}</Text>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Order Reference</Text>
                        <View className="flex-row items-center">
                          <Text style={{ color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700' }}>#{order.orderCode}</Text>
                        </View>
                      </View>
                      <View className="flex-row justify-between mb-2">
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Date & Time</Text>
                        <Text style={{ color: colors.text, fontSize: 14 }}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
                      </View>
                      <View className="flex-row justify-between mt-3 pt-3 border-t" style={{ borderTopColor: colors.border }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>Ticket Price</Text>
                        <Text style={{ color: colors.accentSecondary, fontWeight: '900', fontSize: 20 }}>
                          {formatVND(order.totalAmount / (ticketPages.length || 1))}
                        </Text>
                      </View>
                    </View>

                    {/* Receipt Dashed Line Effect */}
                    <View className="flex-row items-center justify-center mb-6">
                      <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, marginLeft: -12, borderWidth: 1, borderColor: colors.border }} />
                      <View style={{ width: 24 }} />
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, marginRight: -12, borderWidth: 1, borderColor: colors.border }} />
                      <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
                    </View>

                    <View className="items-center bg-white p-6 rounded-2xl mb-2">
                      <Text className="text-[#0a0014]/40 text-[9px] font-black uppercase mb-4 tracking-[3px]">Official Digital Ticket</Text>
                      {qrValue ? (
                        <View className="w-44 h-44 items-center justify-center">
                          <QRCode value={qrValue} size={176} />
                        </View>
                      ) : (
                        <FontAwesome5 name="qrcode" size={120} color="black" />
                      )}
                      <View className="mt-4 px-6 py-2 bg-[#f0f0f0] rounded-full">
                        <Text className="text-[#0a0014] font-mono text-[9px] font-bold tracking-[2px] uppercase">
                          {item.zoneName} - VE {index + 1}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}}
          />

          {/* Pagination Indicator */}
          {ticketPages.length > 1 && (
            <View className="flex-row justify-center mb-4">
              {ticketPages.map((_: any, i: number) => (
                <View
                  key={i}
                  style={{ width: i === activeIndex ? 16 : 6, height: 6, borderRadius: 3, marginHorizontal: 4, backgroundColor: i === activeIndex ? colors.accent : colors.border }}
                />
              ))}
            </View>
          )}
        </View>

        <View className="px-4 pb-6 space-y-2">
          <TouchableOpacity
            onPress={handleShareTicket}
            activeOpacity={0.9}
            className=""
          >
            <LinearGradient
              colors={['#00e5ff', '#d500f9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl px-5 py-4 flex-row items-center justify-center border border-[#4d0099] shadow-[0_0_20px_rgba(0,229,255,0.5)]"
            >
              <MaterialIcons name="share" size={22} color="#0a0014" />
              <Text className="text-[#0a0014] font-black text-lg ml-2 tracking-wide">
                Chia sẻ vé
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className="rounded-2xl border border-[#d500f9]/40 overflow-hidden"
          >
            <LinearGradient
              colors={['#2a004d', '#4d007a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-5 py-4 flex-row items-center justify-center"
            >
              <MaterialIcons name="file-download" size={20} color="#ff80ff" />
              <Text className="text-[#ff80ff] font-bold text-lg ml-2">
                Tải PDF (Offline)
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrapper: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,0,20,0.28)',
  },
});