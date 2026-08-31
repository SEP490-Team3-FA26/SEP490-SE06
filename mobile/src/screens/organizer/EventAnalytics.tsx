import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LayoutAPI, EventLayout, LayoutZone } from '../../services/layoutApiService';
import { useTheme } from '../../context/ThemeContextType';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function EventAnalytics({ navigation, route }: any) {
  const { eventId } = route.params;
  const { colors } = useTheme();
  const [event, setEvent] = useState<EventLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await LayoutAPI.getLayoutByEvent(eventId);
        setEvent(data);
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu phân tích');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId]);

  const stats = useMemo(() => {
    if (!event) return null;
    let totalCapacity = 0;
    let totalSold = 0;
    let totalRevenue = 0;

    event.zones.forEach((z) => {
      const cap = z.capacity || (z.rows && z.seatsPerRow ? z.rows * z.seatsPerRow : 0);
      const sold = z.seatMetadata?.soldSeats || 0;
      totalCapacity += cap;
      totalSold += sold;
      totalRevenue += sold * (z.price || 0);
    });

    return {
      totalCapacity,
      totalSold,
      totalRevenue,
      percentage: totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0,
    };
  }, [event]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Phân tích sự kiện</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {event && stats && (
          <>
            {/* Quick Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="payments" size={24} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.text }]}>₫{stats.totalRevenue.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Doanh thu</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="confirmation-number" size={24} color={colors.accentSecondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalSold}/{stats.totalCapacity}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vé đã bán</Text>
              </View>
            </View>

            {/* Overall Progress */}
            <View style={[styles.overallChart, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Tỷ lệ lấp đầy</Text>
                <Text style={[styles.chartValue, { color: colors.accent }]}>{stats.percentage.toFixed(1)}%</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary }]}>
                <LinearGradient
                  colors={[colors.accent, colors.accentSecondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${stats.percentage}%` }]}
                />
              </View>
            </View>

            {/* Zone Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chi tiết từng khu vực</Text>
            {event.zones.map((zone) => {
              const cap = zone.capacity || (zone.rows && zone.seatsPerRow ? zone.rows * zone.seatsPerRow : 0);
              const sold = zone.seatMetadata?.soldSeats || 0;
              const fill = cap > 0 ? (sold / cap) * 100 : 0;
              
              return (
                <View key={zone.id} style={[styles.zoneCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.zoneInfo}>
                    <View>
                      <Text style={[styles.zoneName, { color: colors.text }]}>{zone.name}</Text>
                      <Text style={[styles.zoneType, { color: colors.textSecondary }]}>{zone.type === 'seats' ? 'Ghế ngồi' : 'Đứng'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.zoneSold, { color: colors.text }]}>{sold} / {cap}</Text>
                      <Text style={[styles.zoneRevenue, { color: colors.accentSecondary }]}>₫{(sold * (zone.price || 0)).toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={[styles.zoneBarBg, { backgroundColor: colors.surfaceSecondary }]}>
                    <View 
                      style={[
                        styles.zoneBarFill, 
                        { 
                          width: `${fill}%`, 
                          backgroundColor: fill > 90 ? '#ff1744' : fill > 70 ? '#ffab00' : colors.accent 
                        }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </>
        )}
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
  },
  overallChart: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 30,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  zoneCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  zoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  zoneType: {
    fontSize: 12,
  },
  zoneSold: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  zoneRevenue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoneBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoneBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
