import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LayoutAPI, EventLayout } from '../services/layoutApiService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContextType';

export default function MyEvents({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [events, setEvents] = useState<EventLayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await LayoutAPI.listLayouts();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('MyEvents load error:', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return { day: '--', month: '---' };
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { day: '--', month: '---' };
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: date.getDate().toString(),
      month: months[date.getMonth()].toUpperCase(),
    };
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="px-4 pt-12 pb-4 border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.accent, overflow: 'hidden', marginRight: 12 }}
            >
              <ImageBackground 
                source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=68' }} 
                style={{ width: '100%', height: '100%' }}
              />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Chào mừng,</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{user ? `${user.firstName}` : 'Organizer'}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={{ width: 44, height: 44, backgroundColor: colors.surfaceSecondary, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginRight: 8 }}
            >
              <MaterialIcons name="notifications-none" size={24} color={colors.accent} />
              <View style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentSecondary, borderWidth: 1.5, borderColor: colors.surface }} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ScanTicket')}
              style={{ width: 44, height: 44, backgroundColor: colors.surfaceSecondary, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginRight: 8 }}
            >
              <MaterialIcons name="qr-code-scanner" size={24} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateEvent')}
              style={{ width: 44, height: 44, backgroundColor: colors.accent, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialIcons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-sm uppercase tracking-widest font-black mb-4" style={{ color: colors.textSecondary }}>Sự kiện của tôi</Text>
        
        {loading ? (
          <ActivityIndicator color="#d500f9" className="mt-10" />
        ) : events.length === 0 ? (
          <View className="items-center mt-10">
            <Text className="text-[#b388ff]">Không tìm thấy sự kiện nào</Text>
          </View>
        ) : (
          events.map((event) => {
            const { day, month } = formatDate(event.eventDate);
            const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

            return (
              <TouchableOpacity 
                key={event.eventId} 
                className="rounded-2xl p-4 mb-4 flex-row items-center border"
                onPress={() => isOrganizer ? null : navigation.navigate('StaffScreen', { eventId: event.eventId, eventName: event.eventName, venueName: event.eventLocation })}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <View className="w-16 h-16 rounded-xl items-center justify-center border" style={{ backgroundColor: colors.surfaceSecondary, borderColor: colors.border }}>
                  <Text className="font-black text-xl" style={{ color: colors.accent }}>{day}</Text>
                  <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>{month}</Text>
                </View>
                <View className="flex-1 ml-4">
                  <Text className="font-bold text-lg mb-1" style={{ color: colors.text }} numberOfLines={1}>{event.eventName}</Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }} numberOfLines={1}>{event.eventLocation}</Text>
                  <View className="flex-row items-center mt-2">
                    {isOrganizer ? (
                      <>
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('EventAnalytics', { eventId: event.eventId })}
                          style={{ backgroundColor: colors.accent + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '30' }}
                        >
                          <MaterialIcons name="analytics" size={14} color={colors.accent} />
                          <Text style={{ fontSize: 10, color: colors.accent, fontWeight: '900', marginLeft: 4 }}>STATS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => navigation.navigate('StaffScreen', { eventId: event.eventId, eventName: event.eventName, venueName: event.eventLocation })}
                          style={{ backgroundColor: colors.accentSecondary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.accentSecondary + '30' }}
                        >
                          <MaterialIcons name="people" size={14} color={colors.accentSecondary} />
                          <Text style={{ fontSize: 10, color: colors.accentSecondary, fontWeight: '900', marginLeft: 4 }}>STAFF</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ backgroundColor: colors.accent + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                         <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 10 }}>NHẤN ĐỂ YÊU CẦU PHỤ TRÁCH</Text>
                      </View>
                    )}
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
