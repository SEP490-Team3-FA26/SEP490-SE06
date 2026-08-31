import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SeatAPI, SeatData } from '../../services/seatApiService';
import { State, GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withDecay } from 'react-native-reanimated';

export default function SeatMapDesigner({ navigation, route }: any) {
  const eventId = route?.params?.eventId as string | undefined;
  const zoneId = route?.params?.zoneId as string | undefined;
  const zoneName = route?.params?.zoneName as string | undefined;

  const [seats, setSeats] = useState<SeatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!eventId || !zoneId) {
        setError('Thiếu eventId hoặc zoneId');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await SeatAPI.getSeatsByZone(eventId, zoneId, { limit: 500 });
        if (!isMounted) return;
        setSeats(res.seats || []);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Không tải được danh sách ghế');
        setSeats([]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [eventId, zoneId]);

  const seatsByRow = useMemo(() => {
    const rows = new Map<number, SeatData[]>();
    seats.forEach((seat) => {
      const list = rows.get(seat.row) || [];
      list.push(seat);
      rows.set(seat.row, list);
    });
    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([row, list]) => ({
        row,
        seats: list.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [seats]);

  const mapDimensions = useMemo(() => {
    if (seatsByRow.length === 0) return { width: Dimensions.get('window').width, height: 400 };
    const maxRow = seatsByRow.length;
    const maxCol = Math.max(...seatsByRow.map(r => r.seats.length));

    // Each seat is w-8 (32px) + mx-1 (8px) = 40px width
    // Height is h-8 (32px) + mb-3 (12px) = 44px
    const mapWidth = Math.max(Dimensions.get('window').width, maxCol * 40 + 600);
    const mapHeight = Math.max(Dimensions.get('window').height - 300, maxRow * 44 + 600);
    return { width: mapWidth, height: mapHeight };
  }, [seatsByRow]);

  const toggleSeat = (seat: SeatData) => {
    if (seat.status !== 'available') return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat._id) ? prev.filter((id) => id !== seat._id) : [...prev, seat._id],
    );
  };

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const limitX = mapDimensions.width / 2;
      const limitY = mapDimensions.height / 2;
      let nextX = savedTranslateX.value + event.translationX;
      let nextY = savedTranslateY.value + event.translationY;

      if (nextX > limitX) nextX = limitX;
      else if (nextX < -limitX) nextX = -limitX;
      
      if (nextY > limitY) nextY = limitY;
      else if (nextY < -limitY) nextY = -limitY;

      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd((event) => {
        const limitX = mapDimensions.width / 2;
        const limitY = mapDimensions.height / 2;
        translateX.value = withDecay({
            velocity: event.velocityX,
            clamp: [-limitX, limitX],
        });
        translateY.value = withDecay({
            velocity: event.velocityY,
            clamp: [-limitY, limitY],
        });
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-[#151022]">
        <View className="flex-row items-center p-4 pt-12 bg-[#1e1a29] border-b border-white/10 z-50">
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else if (eventId) {
                navigation.navigate('TicketSelection', { eventId });
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            className="w-10 h-10 bg-white/5 rounded-full items-center justify-center border border-white/10"
          >
            <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold text-white pr-10">
            Select Your Seats{zoneName ? ` • ${zoneName}` : ''}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center overflow-hidden bg-[#151022]">
          {loading ? (
            <View className="items-center justify-center absolute z-10">
              <ActivityIndicator />
              <Text className="text-[#a59cba] mt-3 font-bold">Đang tải sơ đồ ghế...</Text>
            </View>
          ) : error ? (
            <View className="items-center justify-center absolute z-10">
              <Text className="text-red-400 font-bold text-center">{error}</Text>
            </View>
          ) : seats.length === 0 ? (
            <View className="items-center justify-center absolute z-10">
              <Text className="text-[#a59cba] font-bold text-center">Zone này chưa có ghế nào.</Text>
            </View>
          ) : (
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }, animatedStyle]}>
                <View 
                  className="items-center justify-center py-8"
                  style={{ width: mapDimensions.width, height: mapDimensions.height }}
                >
                  <View className="w-[80%] max-w-[400px] h-16 bg-white/5 border-t-4 border-[#00e5ff] rounded-t-[100px] items-center justify-center mb-16 shadow-[0_-10px_30px_rgba(0,229,255,0.2)]">
                    <Text className="text-[#00e5ff] font-black tracking-widest uppercase text-lg">Stage</Text>
                  </View>
                  
                  {seatsByRow.map(({ row, seats: rowSeats }) => (
                    <View key={row} className="flex-row justify-center mb-3">
                      {rowSeats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat._id);
                        const isTaken =
                          seat.status === 'sold' ||
                          seat.status === 'blocked' ||
                          seat.status === 'reserved' ||
                          seat.status === 'occupied';

                        const baseClass = 'w-8 h-8 mx-1 rounded-md items-center justify-center border text-[10px] font-bold';
                        let colorClass = '';
                        let textClass = ' text-white';

                        // Default highlight color logic mirroring web defaults
                        const zoneColor = '#00e5ff';

                        if (isSelected) {
                          colorClass = ` bg-[${zoneColor}] border-[${zoneColor}] shadow-[0_0_12px_rgba(0,229,255,0.5)]`;
                        } else if (isTaken) {
                          colorClass = ' bg-[#4b5563] border-[#4b5563] opacity-60';
                          textClass = ' text-[#9ca3af]';
                        } else {
                          // Available
                          colorClass = ` bg-[${zoneColor}30] border-[${zoneColor}50]`;
                          textClass = ` text-[${zoneColor}]`;
                        }

                        // Override colorClass explicitly due to tailwind compilation limitations on dynamic hex vars
                        const customStyles: any = {};
                        if (isSelected) {
                          customStyles.backgroundColor = zoneColor;
                          customStyles.borderColor = zoneColor;
                        } else if (isTaken) {
                          customStyles.backgroundColor = '#4b5563';
                          customStyles.borderColor = '#4b5563';
                        } else {
                          customStyles.backgroundColor = `${zoneColor}30`;
                          customStyles.borderColor = `${zoneColor}50`;
                        }

                        return (
                          <TouchableOpacity
                            key={seat._id}
                            onPress={() => toggleSeat(seat)}
                            disabled={isTaken}
                            className={baseClass}
                            style={customStyles}
                          >
                            <Text className={'font-bold text-[10px]' + textClass} style={{ color: isSelected ? 'black' : isTaken ? '#9ca3af' : zoneColor }}>
                              {seat.seatNumber}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </Animated.View>
            </GestureDetector>
          )}
        </View>

        <View className="p-6 bg-[#1e1a29]/95 border-t border-white/10 rounded-t-3xl z-50">
          <View className="flex-row justify-between mb-6">
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-[#00e5ff30] border border-[#00e5ff50] rounded mr-2" />
              <Text className="text-[#a59cba] text-sm">Available</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-[#00e5ff] rounded mr-2 shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
              <Text className="text-white text-sm">Selected</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-[#4b5563] border border-[#4b5563] rounded mr-2 opacity-60" />
              <Text className="text-[#a59cba] text-sm">Taken</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!eventId || !zoneId) {
                navigation.goBack();
                return;
              }
              const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s._id));
              navigation.navigate('TicketSelection', {
                eventId,
                zoneId,
                zoneName,
                selectedSeats: selectedSeats.map((s) => ({
                  seatId: s._id,
                  seatLabel: s.seatLabel,
                  price: s.price,
                  row: s.row,
                  seatNumber: s.seatNumber,
                  zoneId: s.zoneId,
                })),
              });
            }}
            className="rounded-2xl shadow-[0_0_20px_rgba(134,85,246,0.4)] overflow-hidden"
          >
            <LinearGradient
              colors={['#8655f6', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-14 items-center justify-center"
            >
              <Text className="text-white font-bold text-lg tracking-wide">Tiếp tục thanh toán</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
