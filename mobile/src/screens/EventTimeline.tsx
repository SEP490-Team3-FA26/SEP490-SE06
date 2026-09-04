import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';

const { width } = Dimensions.get('window');

// Dữ liệu mẫu cho Agenda sự kiện
const MOCK_AGENDA = [
  { id: '1', time: '18:00', title: 'Mở cửa đón khách', desc: 'Kiểm tra vé và quầy đổi voucher quà tặng.', icon: 'door-front' },
  { id: '2', time: '19:00', title: 'Khai mạc sự kiện', desc: 'Giới thiệu về nội dung và các nhà tài trợ chính.', icon: 'campaign' },
  { id: '3', time: '19:30', title: 'Phần 1: Trình diễn Nghệ thuật', desc: 'Các tiết mục mở màn từ ban nhạc Neon.', icon: 'music-note' },
  { id: '4', time: '20:30', title: 'Tiệc giải lao & Networking', desc: 'Thưởng thức finger food tại quầy VIP.', icon: 'restaurant' },
  { id: '5', time: '21:00', title: 'Phần 2: Workshop & Mini Game', desc: 'Giao lưu cùng khách mời và nhận quà.', icon: 'videogame-asset' },
  { id: '6', time: '22:00', title: 'Bế mạc & Quà tặng', desc: 'Cảm ơn và hẹn gặp lại.', icon: 'auto-awesome' },
];

export default function EventTimeline({ navigation, route }: any) {
  const { eventName } = route.params || { eventName: 'Sự kiện âm nhạc Neon' };
  const { colors } = useTheme();

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lịch trình</Text>
      </View>

      <View style={styles.eventInfo}>
        <Text style={[styles.eventName, { color: colors.accent }]}>{eventName}</Text>
        <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>Chương trình chi tiết dành cho bạn</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {MOCK_AGENDA.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            {/* Left side: Time & Dot */}
            <View style={styles.leftColumn}>
              <Text style={[styles.timeText, { color: colors.text }]}>{item.time}</Text>
              <View style={styles.dotContainer}>
                 <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                 {index !== MOCK_AGENDA.length - 1 && (
                   <View style={[styles.line, { backgroundColor: colors.border }]} />
                 )}
              </View>
            </View>

            {/* Right side: Content Card */}
            <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
               <View style={styles.cardHeader}>
                 <MaterialIcons name={item.icon as any} size={20} color={colors.accentSecondary} />
                 <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
               </View>
               <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
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
  eventInfo: {
    padding: 20,
    alignItems: 'center',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  leftColumn: {
    width: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dotContainer: {
    flex: 1,
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  contentCard: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 30,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
