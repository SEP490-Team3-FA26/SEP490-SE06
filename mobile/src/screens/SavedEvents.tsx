import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { EventLayout, LayoutAPI } from '../services/layoutApiService';
import { useTheme } from '../context/ThemeContextType';

const { width } = Dimensions.get('window');

export default function SavedEvents({ navigation }: any) {
  const { colors } = useTheme();
  const [savedEvents, setSavedEvents] = useState<EventLayout[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist from AsyncStorage
  const loadWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const wishlistStr = await AsyncStorage.getItem('@wishlist');
      if (!wishlistStr) {
        setSavedEvents([]);
        return;
      }
      const wishlistIds: string[] = JSON.parse(wishlistStr);
      if (wishlistIds.length === 0) {
        setSavedEvents([]);
        return;
      }

      // We need to fetch the events details. Since LayoutAPI has listLayouts, we can just fetch all and filter.
      const allEvents = await LayoutAPI.listLayouts();
      const favEvents = (Array.isArray(allEvents) ? allEvents : []).filter(ev => 
        wishlistIds.includes(ev.eventId)
      );
      setSavedEvents(favEvents);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWishlist();
    }, [loadWishlist])
  );

  const removeFavorite = async (eventId: string) => {
    try {
      const wishlistStr = await AsyncStorage.getItem('@wishlist');
      if (wishlistStr) {
        let wishlistIds: string[] = JSON.parse(wishlistStr);
        wishlistIds = wishlistIds.filter(id => id !== eventId);
        await AsyncStorage.setItem('@wishlist', JSON.stringify(wishlistIds));
        // Remove locally from state immediately for fast UI
        setSavedEvents(prev => prev.filter(ev => ev.eventId !== eventId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-5 pt-14 pb-4 border-b flex-row items-center justify-between" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
         <Text className="text-2xl font-black" style={{ color: colors.text }}>Đã lưu ❤️</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="py-20 items-center justify-center">
             <ActivityIndicator size="large" color={colors.accent} />
             <Text className="mt-4 font-bold" style={{ color: colors.textSecondary }}>Đang tải...</Text>
          </View>
        ) : savedEvents.length === 0 ? (
          <View className="py-24 items-center justify-center">
            <MaterialIcons name="favorite-border" size={80} style={{ color: colors.border }} />
            <Text className="mt-6 font-bold text-center px-10" style={{ color: colors.textSecondary }}>
               Bạn chưa thả tim sự kiện nào. Hãy ra màn hình Home và lưu vài sự kiện nhé!
            </Text>
            <TouchableOpacity 
              className="mt-8 px-8 py-4 rounded-full"
              style={{ backgroundColor: colors.accent }}
              onPress={() => navigation.navigate('Home')}
            >
               <Text className="text-white font-black uppercase tracking-wider">Khám phá ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          savedEvents.map((ev) => (
            <TouchableOpacity
              key={ev.eventId}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('EventDetail', { eventId: ev.eventId })}
              className="w-full h-40 rounded-3xl mb-5 shadow-[0_6px_16px_rgba(0,0,0,0.3)] bg-[#1a0033]"
            >
              <ImageBackground
                source={{ uri: ev.eventImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' }}
                style={{ width: '100%', height: '100%' }}
                imageStyle={{ borderRadius: 24 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.95)']}
                  style={{ flex: 1, padding: 16, borderRadius: 24, justifyContent: 'space-between' }}
                >
                  <View className="flex-row justify-between items-start">
                     <View className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                        <Text className="text-white font-black">₫{ev.minPrice?.toLocaleString() || '--'}</Text>
                     </View>
                     <TouchableOpacity 
                        className="w-10 h-10 bg-black/60 rounded-full items-center justify-center border border-white/10"
                        onPress={() => removeFavorite(ev.eventId)}
                     >
                        <MaterialIcons name="favorite" size={20} color="#ff1744" />
                     </TouchableOpacity>
                  </View>
                  
                  <View>
                     <Text className="text-white text-xl font-black mb-1" numberOfLines={1}>{ev.eventName}</Text>
                     <View className="flex-row items-center">
                        <MaterialIcons name="location-on" size={14} color={colors.accentSecondary} />
                        <Text className="text-gray-300 text-xs ml-1 font-bold" numberOfLines={1}>{ev.eventLocation}</Text>
                     </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
