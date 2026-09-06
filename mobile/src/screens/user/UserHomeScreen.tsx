import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { EventLayout, LayoutAPI } from '../../services/layoutApiService';

import { useTheme } from '../../context/ThemeContextType';

const { width } = Dimensions.get('window');

export default function UserScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [events, setEvents] = useState<EventLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  const [wishlist, setWishlist] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@wishlist').then((val: string | null) => {
        if (val) setWishlist(JSON.parse(val));
      });
    }, [])
  );

  const toggleWishlist = async (eventId: string) => {
    try {
       let newList = [...wishlist];
       if (newList.includes(eventId)) newList = newList.filter(id => id !== eventId);
       else newList.push(eventId);
       setWishlist(newList);
       await AsyncStorage.setItem('@wishlist', JSON.stringify(newList));
    } catch (e) {
       console.error("Lỗi Wishlist:", e);
    }
  };

  const runIntroAnimation = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadEvents = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      setError(null);
      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await LayoutAPI.listLayouts();
      setEvents(Array.isArray(data) ? data : []);
      if (mode === 'initial') runIntroAnimation();
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách sự kiện');
      if (mode === 'initial') setEvents([]);
    } finally {
      if (mode === 'initial') setLoading(false);
      setRefreshing(false);
    }
  }, [runIntroAnimation]);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    void loadEvents('initial');
  }, [loadEvents]);

  const onRefresh = useCallback(() => {
    void refreshUser();
    void loadEvents('refresh');
  }, [loadEvents, refreshUser]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => {
      const name = (ev.eventName || '').toLowerCase();
      const loc = (ev.eventLocation || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [events, query]);

  const { upNext, recommended } = useMemo(() => {
    if (!filteredEvents.length) return { upNext: null as EventLayout | null, recommended: [] as EventLayout[] };

    const now = new Date();
    const withDate = filteredEvents
      .map((e) => {
        if (!e.eventDate) return null;
        const d = new Date(e.eventDate);
        if (Number.isNaN(d.getTime())) return null;
        return { event: e, date: d };
      })
      .filter((x): x is { event: EventLayout; date: Date } => !!x);

    const future = withDate.filter((x) => x.date.getTime() > now.getTime());
    future.sort((a, b) => a.date.getTime() - b.date.getTime());

    const next = future[0]?.event || null;
    const remaining = filteredEvents.filter((e) => !next || e.eventId !== next.eventId);

    return { upNext: next, recommended: remaining.slice(0, 10) };
  }, [filteredEvents]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER SECTION */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={[styles.avatarWrapper, { borderColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <ImageBackground 
              source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=68' }} 
              style={styles.avatarImage}
            />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.helloText, { color: colors.textSecondary }]}>Chào mừng trở lại,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user ? `${user.firstName} ${user.lastName}` : 'Guest'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Notifications')} 
          style={[styles.notificationButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name="notifications-none" size={24} color={colors.text} />
          <View style={[styles.notificationDot, { backgroundColor: '#ef4444' }]} />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR SECTION */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, shadowColor: '#000' }]}>
          <MaterialIcons name="search" size={22} color={colors.accent} style={{ marginLeft: 4 }} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm kiếm sự kiện, nghệ sĩ, địa điểm..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('AIAssistant')}
        style={styles.floatingAIButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8b5cf6', '#d946ef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientAiBtn}
        >
          <MaterialIcons name="auto-awesome" size={26} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {!query && (
            <>
              {/* UP NEXT SECTION */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Sắp diễn ra 🔥</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Tickets')} activeOpacity={0.7}>
                  <Text style={[styles.sectionAction, { color: colors.accent }]}>Xem vé của tôi</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.accent} size="large" />
                </View>
              ) : error ? (
                <View style={[styles.loadingBox, { backgroundColor: colors.surface, borderRadius: 16 }]}>
                  <MaterialIcons name="error-outline" size={32} color="#ef4444" style={{ marginBottom: 8 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : !upNext ? (
                <View style={[styles.loadingBox, { backgroundColor: colors.surface, borderRadius: 16 }]}>
                  <MaterialIcons name="event-busy" size={32} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chưa có sự kiện nào sắp tới</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('EventDetail', { eventId: upNext.eventId })}
                  style={styles.upNextCard}
                >
                  <ImageBackground
                    source={{ uri: upNext.eventImage || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=2070&auto=format&fit=crop' }}
                    style={styles.upNextImage}
                    imageStyle={{ borderRadius: 24 }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.85)']}
                      style={styles.upNextGradient}
                    >
                      <View style={styles.upNextBadge}>
                        <LinearGradient colors={['#8b5cf6', '#d946ef']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.badgeGradient}>
                          <Text style={styles.upNextBadgeText}>GẦN NHẤT</Text>
                        </LinearGradient>
                      </View>
                      
                      <View style={styles.upNextInfoWrapper}>
                        <View style={styles.upNextQrWrapper}>
                          <MaterialIcons name="qr-code-2" size={22} color="#000" />
                        </View>
                        
                        <Text style={styles.upNextTitle} numberOfLines={2}>
                          {upNext.eventName || 'Sự Kiện Đặc Biệt'}
                        </Text>
                        
                        <View style={styles.upNextMetaRow}>
                          <MaterialIcons name="access-time" size={16} color="#d1d5db" />
                          <Text style={styles.upNextMetaText}>
                            {upNext.eventDate ? new Date(upNext.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                            {' - '}
                            {upNext.eventDate ? new Date(upNext.eventDate).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        
                        <View style={styles.upNextMetaRow}>
                          <MaterialIcons name="location-pin" size={16} color="#d1d5db" />
                          <Text style={styles.upNextMetaText} numberOfLines={1}>{upNext.eventLocation || 'Đang cập nhật'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* RECOMMENDED / SEARCH RESULTS SECTION */}
          <View style={[styles.sectionHeaderRow, { marginTop: query ? 0 : 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {query ? 'Kết quả tìm kiếm' : 'Đề xuất cho bạn ✨'}
            </Text>
          </View>
          
          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
          ) : filteredEvents.length === 0 ? (
            <View style={[styles.loadingBox, { backgroundColor: colors.surface, borderRadius: 16 }]}>
               <MaterialIcons name="search-off" size={32} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Không tìm thấy sự kiện nào</Text>
            </View>
          ) : query ? (
            <View style={styles.searchResultsGrid}>
              {filteredEvents.map((ev, index) => (
                <TouchableOpacity
                  key={ev.eventId}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('EventDetail', { eventId: ev.eventId })}
                  style={[styles.searchResultCard, { backgroundColor: colors.surface }]}
                >
                  <ImageBackground
                    source={{ uri: ev.eventImage || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30' }}
                    style={styles.searchResultImage}
                    imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                  >
                    <View style={styles.searchResultBadge}>
                      <Text style={styles.searchResultPrice}>₫{ev.minPrice?.toLocaleString() || '--'}</Text>
                    </View>
                  </ImageBackground>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultTitle, { color: colors.text }]} numberOfLines={2}>{ev.eventName}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                       <MaterialIcons name="place" size={12} color={colors.textSecondary} />
                       <Text style={[styles.searchResultMeta, { color: colors.textSecondary }]} numberOfLines={1}> {ev.eventLocation}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recommendedScroll}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {recommended.map((event, index) => (
                <TouchableOpacity 
                  key={event.eventId}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.eventId })}
                  style={styles.recommendedCard}
                >
                  <ImageBackground
                    source={{ uri: event.eventImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1974&auto=format&fit=crop' }}
                    style={styles.recommendedImage}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.85)']}
                      style={styles.recommendedGradient}
                    >
                      <View style={styles.recommendedTopRow}>
                         <View style={styles.priceTag}>
                           <Text style={styles.priceTagText}>₫{event.minPrice?.toLocaleString() || '...'}</Text>
                         </View>
                         <TouchableOpacity 
                           style={styles.recommendedFavorite}
                           activeOpacity={0.7}
                           onPress={() => toggleWishlist(event.eventId)}
                         >
                            <MaterialIcons 
                              name={wishlist.includes(event.eventId) ? "favorite" : "favorite-outline"} 
                              size={16} 
                              color={wishlist.includes(event.eventId) ? "#ef4444" : "#fff"} 
                            />
                         </TouchableOpacity>
                      </View>
                      
                      <View style={styles.recommendedInfo}>
                        <Text style={styles.recommendedTitle} numberOfLines={2}>{event.eventName || 'Event'}</Text>
                        <View style={styles.recommendedMetaRow}>
                          <MaterialIcons name="calendar-month" size={14} color="#d1d5db" />
                          <Text style={styles.recommendedMetaText}>
                             {event.eventDate ? new Date(event.eventDate).toLocaleDateString('vi-VN') : 'Sắp ra mắt'}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  helloText: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  upNextCard: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  upNextImage: {
    width: '100%',
    height: '100%',
  },
  upNextGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
  },
  upNextBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  upNextBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  upNextInfoWrapper: {
    position: 'relative',
  },
  upNextQrWrapper: {
    position: 'absolute',
    top: -10,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upNextTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    paddingRight: 60,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  upNextMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  upNextMetaText: {
    fontSize: 13,
    color: '#d1d5db',
    marginLeft: 8,
    fontWeight: '500',
  },
  recommendedScroll: {
    marginBottom: 32,
    marginHorizontal: -20,
    paddingLeft: 20,
  },
  recommendedCard: {
    width: width * 0.65,
    height: 280,
    borderRadius: 20,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  recommendedTopRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'flex-start',
  },
  priceTag: {
     backgroundColor: 'rgba(255,255,255,0.2)',
     paddingHorizontal: 10,
     paddingVertical: 6,
     borderRadius: 10,
  },
  priceTagText: {
     color: '#fff',
     fontWeight: '800',
     fontSize: 13,
  },
  recommendedFavorite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedInfo: {
    marginTop: 'auto',
  },
  recommendedTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  recommendedMetaRow: {
     flexDirection: 'row',
     alignItems: 'center',
  },
  recommendedMetaText: {
     color: '#d1d5db',
     fontSize: 12,
     marginLeft: 6,
     fontWeight: '500',
  },
  searchResultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  searchResultCard: {
    width: '48%',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchResultImage: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  searchResultBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchResultPrice: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  searchResultInfo: {
    padding: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  searchResultMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 999,
    shadowColor: '#d946ef',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientAiBtn: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

