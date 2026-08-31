import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Calendar from 'expo-calendar';
import { EventLayout, LayoutAPI } from '../services/layoutApiService';

function pickSellableMinPrice(layout: EventLayout | null): number | null {
  if (!layout?.zones?.length) return layout?.minPrice ?? null;
  const prices = layout.zones
    .filter((z) => (z.type === 'seats' || z.type === 'standing') && Number.isFinite(Number(z.price)) && Number(z.price) > 0)
    .map((z) => Number(z.price));
  if (prices.length === 0) return layout?.minPrice ?? null;
  return Math.min(...prices);
}

async function getWritableCalendarId(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c) => c.allowsModifications);
  if (writable?.id) return writable.id;

  // Fallback: pick default calendar if possible (iOS)
  try {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.id) return def.id;
  } catch {
    // ignore
  }

  if (calendars[0]?.id) return calendars[0].id;
  throw new Error('Không tìm thấy calendar để thêm lịch');
}

export default function EventDetail({ navigation, route }: any) {
  const eventId = route?.params?.eventId as string | undefined;
  const [layout, setLayout] = useState<EventLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!eventId) {
        setError('Thiếu eventId');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await LayoutAPI.getLayoutByEvent(eventId);
        if (!isMounted) return;
        setLayout(data);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Không tải được chi tiết sự kiện');
        setLayout(null);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const minPrice = useMemo(() => pickSellableMinPrice(layout), [layout]);
  const startDate = useMemo(() => (layout?.eventDate ? new Date(layout.eventDate) : null), [layout?.eventDate]);

  const addToCalendar = useCallback(async () => {
    try {
      if (!layout) return;
      const title = layout.eventName || 'Event';
      const start = startDate || new Date();
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission', 'Bạn cần cấp quyền Calendar để thêm lịch.');
        return;
      }

      const calendarId = await getWritableCalendarId();
      await Calendar.createEventAsync(calendarId, {
        title,
        startDate: start,
        endDate: end,
        location: layout.eventLocation || undefined,
        notes: layout.eventDescription || undefined,
        timeZone: undefined,
      });

      Alert.alert('Thành công', 'Đã thêm sự kiện vào lịch của bạn.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể thêm vào lịch');
    }
  }, [layout, startDate]);

  return (
    <View className="flex-1 bg-[#151022]">
      <ScrollView className="flex-1" bounces={false}>
        <ImageBackground
          source={{ uri: layout?.eventImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' }}
          className="w-full h-80 justify-between pt-12 pb-4 px-4"
        >
          <LinearGradient
            colors={['rgba(21, 16, 34, 0.6)', 'transparent', '#151022']}
            className="absolute inset-0"
          />
          <View className="flex-row justify-between items-center z-10">
            <TouchableOpacity onPress={() => navigation.goBack()} className="h-10 w-10 bg-[#1e1a29]/80 rounded-full items-center justify-center border border-white/10">
              <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
            </TouchableOpacity>
            <TouchableOpacity onPress={addToCalendar} className="h-10 w-10 bg-[#1e1a29]/80 rounded-full items-center justify-center border border-white/10">
              <MaterialIcons name="event-available" size={22} color="#00e5ff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View className="px-6 py-6 bg-[#151022] -mt-6 rounded-t-[40px] border-t border-white/10">
          {loading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator />
              <Text className="text-[#a59cba] mt-3 font-bold">Đang tải chi tiết...</Text>
            </View>
          ) : error ? (
            <View className="py-10 items-center justify-center">
              <Text className="text-red-400 font-bold mb-3 text-center">{error}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!eventId) return;
                  setLoading(true);
                  setError(null);
                  LayoutAPI.getLayoutByEvent(eventId)
                    .then((data) => setLayout(data))
                    .catch((e: any) => setError(e?.message || 'Không tải được chi tiết sự kiện'))
                    .finally(() => setLoading(false));
                }}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={['#8655f6', '#a855f7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="px-5 py-3 items-center justify-center"
                >
                  <Text className="text-white font-bold">Thử lại</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-start mb-4">
                <Text className="flex-1 text-2xl font-bold text-white mr-4">{layout?.eventName || 'Untitled Event'}</Text>
                <View className="bg-[#d500f9]/20 px-3 py-1 rounded-full border border-[#d500f9]/50">
                  <Text className="text-[#d500f9] font-bold text-xs uppercase tracking-wider">Live</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-4 bg-[#1e1a29] p-4 rounded-2xl border border-[#3b3158]">
                <View className="h-12 w-12 bg-white/5 rounded-xl items-center justify-center mr-4 border border-white/10">
                  <MaterialIcons name="calendar-today" size={24} color="#00e5ff" />
                </View>
                <View>
                  <Text className="text-base font-bold text-white">
                    {layout?.eventDate ? new Date(layout.eventDate).toLocaleString() : 'TBD'}
                  </Text>
                  <Text className="text-sm text-[#a59cba]">Tap calendar icon to add</Text>
                </View>
              </View>

              <View className="flex-row items-center mb-6 bg-[#1e1a29] p-4 rounded-2xl border border-[#3b3158]">
                <View className="h-12 w-12 bg-white/5 rounded-xl items-center justify-center mr-4 border border-white/10">
                  <MaterialIcons name="location-on" size={24} color="#d500f9" />
                </View>
                <View>
                  <Text className="text-base font-bold text-white">{layout?.eventLocation || 'TBD'}</Text>
                  <Text className="text-sm text-[#a59cba]">Location</Text>
                </View>
              </View>

              <Text className="text-lg font-bold text-white mb-2">About Event</Text>
              <Text className="text-[#a59cba] leading-6 mb-8">
                {layout?.eventDescription || 'No description available.'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      <View className="p-6 bg-[#1e1a29] border-t border-white/10 flex-row items-center justify-between rounded-t-3xl">
        <View>
          <Text className="text-sm text-[#a59cba] uppercase tracking-wider font-bold">Price</Text>
          <Text className="text-3xl font-black text-[#00e5ff]">
            {minPrice === null ? '--' : `$${minPrice}`}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            if (!eventId) return;
            navigation.navigate('TicketSelection', { eventId });
          }}
          disabled={loading || !!error || !eventId}
          className={`rounded-2xl shadow-[0_0_20px_rgba(134,85,246,0.4)] overflow-hidden ${loading || !!error || !eventId ? 'opacity-50' : ''}`}
        >
          <LinearGradient
            colors={['#8655f6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-8 py-4 items-center justify-center"
          >
            <Text className="text-white font-bold text-lg tracking-wide">Buy Tickets</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}