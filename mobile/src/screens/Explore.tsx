import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EventLayout, LayoutAPI } from '../services/layoutApiService';

export default function Explore({ navigation }: any) {
  const [events, setEvents] = useState<EventLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const layouts = await LayoutAPI.listLayouts();
        if (!isMounted) return;
        setEvents(Array.isArray(layouts) ? layouts : []);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Không tải được danh sách sự kiện');
        setEvents([]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      const name = (ev.eventName || '').toLowerCase();
      const loc = (ev.eventLocation || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [events, query]);

  return (
    <View className="flex-1 bg-[#0a0014]">
      <View className="px-4 pt-12 pb-4 bg-[#1a0033] border-b border-[#4d0099]">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-sm text-[#b388ff]">Current Location</Text>
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-white mr-1">New York, USA</Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color="#d500f9" />
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="w-10 h-10 bg-[#2a004d] rounded-full items-center justify-center border border-[#4d0099]">
            <MaterialIcons name="notifications-none" size={24} color="#d500f9" />
            <View className="absolute top-2 right-2 w-2 h-2 bg-[#00e5ff] rounded-full shadow-[0_0_8px_#00e5ff]" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center bg-[#2a004d] border border-[#4d0099] h-12 rounded-xl px-4">
          <MaterialIcons name="search" size={24} color="#b388ff" />
          <TextInput 
            className="flex-1 ml-2 text-base text-white"
            placeholder="Search events, artists, venues..."
            placeholderTextColor="#b388ff"
            value={query}
            onChangeText={setQuery}
          />
          <TouchableOpacity className="bg-[#d500f9] p-1 rounded-lg">
            <MaterialIcons name="tune" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-white">Categories</Text>
          <Text className="text-sm font-bold text-[#d500f9]">See All</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <TouchableOpacity className="bg-[#d500f9] px-6 py-3 rounded-full mr-3 shadow-[0_0_10px_#d500f9]">
            <Text className="text-white font-bold">All</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1a0033] border border-[#4d0099] px-6 py-3 rounded-full mr-3">
            <Text className="text-[#b388ff] font-bold">Music</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1a0033] border border-[#4d0099] px-6 py-3 rounded-full mr-3">
            <Text className="text-[#b388ff] font-bold">Tech</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#1a0033] border border-[#4d0099] px-6 py-3 rounded-full mr-3">
            <Text className="text-[#b388ff] font-bold">Sports</Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-white">Events</Text>
          <Text className="text-sm font-bold text-[#d500f9]">{filteredEvents.length}</Text>
        </View>

        {loading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator />
            <Text className="text-[#b388ff] mt-3 font-bold">Đang tải sự kiện...</Text>
          </View>
        ) : error ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-red-400 font-bold mb-3 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setLoading(true);
                setError(null);
                LayoutAPI.listLayouts()
                  .then((layouts) => setEvents(Array.isArray(layouts) ? layouts : []))
                  .catch((e: any) => setError(e?.message || 'Không tải được danh sách sự kiện'))
                  .finally(() => setLoading(false));
              }}
              className="bg-[#d500f9] px-5 py-3 rounded-2xl"
            >
              <Text className="text-white font-bold">Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View className="py-10 items-center justify-center">
            <Text className="text-[#b388ff] font-bold">Không có sự kiện nào</Text>
          </View>
        ) : (
          filteredEvents.map((ev) => (
            <TouchableOpacity
              key={String(ev._id || ev.eventId)}
              onPress={() => navigation.navigate('EventDetail', { eventId: ev.eventId })}
              className="w-full bg-[#1a0033] border border-[#4d0099] rounded-3xl overflow-hidden mb-6"
            >
              <ImageBackground
                source={{ uri: ev.eventImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' }}
                className="w-full h-48 justify-between p-4"
              >
                <View className="flex-row justify-between">
                  <View className="bg-[#0a0014]/80 px-3 py-2 rounded-xl items-center justify-center border border-[#d500f9]/50">
                    <Text className="text-white text-xs font-bold uppercase">From</Text>
                    <Text className="text-[#00e5ff] font-black text-lg leading-5">
                      {Number.isFinite(Number(ev.minPrice)) ? `$${Number(ev.minPrice)}` : '--'}
                    </Text>
                  </View>
                  <View className="bg-[#0a0014]/80 w-10 h-10 rounded-full items-center justify-center border border-[#d500f9]/50">
                    <MaterialIcons name="favorite-border" size={20} color="#d500f9" />
                  </View>
                </View>
              </ImageBackground>
              <View className="p-4">
                <Text className="text-xl font-bold text-white mb-2">{ev.eventName || 'Untitled Event'}</Text>
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="location-on" size={16} color="#b388ff" />
                  <Text className="text-sm text-[#b388ff] ml-1">{ev.eventLocation || 'TBD'}</Text>
                </View>
                <View className="flex-row items-center">
                  <MaterialIcons name="calendar-today" size={14} color="#00e5ff" />
                  <Text className="text-sm text-[#00e5ff] ml-2 font-bold">
                    {ev.eventDate ? new Date(ev.eventDate).toLocaleString() : 'TBD'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}