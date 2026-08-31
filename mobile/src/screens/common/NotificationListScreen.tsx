// NotificationListScreen.tsx - Real-time push & system notifications center
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../../context/NotificationContext';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { AnimatedTouchable } from '../../components/ui/AnimatedTouchable';
import { AppNotification } from '../../types/pharmacy.types';

export const NotificationListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    notifications,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_PR':
      case 'NEW_PO':
        return { icon: 'document-text', color: '#3B82F6', bg: '#EFF6FF' };
      case 'PR_APPROVED':
      case 'GRN_COMPLETED':
        return { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5' };
      case 'PR_REJECTED':
        return { icon: 'close-circle', color: '#EF4444', bg: '#FEF2F2' };
      case 'LOW_STOCK':
        return { icon: 'warning', color: '#F59E0B', bg: '#FFFBEB' };
      default:
        return { icon: 'notifications', color: '#6366F1', bg: '#EEF2FF' };
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconConfig = getNotificationIcon(item.type);
    const dateFormatted = new Date(item.createdAt).toLocaleString('vi-VN');

    return (
      <AnimatedTouchable
        onPress={() => markAsRead(item.id)}
        style={[
          styles.notifCard,
          !item.isRead && styles.unreadCard,
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.icon as any} size={22} color={iconConfig.color} />
        </View>

        <View style={styles.textBox}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead ? <View style={styles.unreadDot} /> : null}
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {item.message}
          </Text>

          <Text style={styles.date}>{dateFormatted}</Text>
        </View>
      </AnimatedTouchable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Trung Tâm Thông Báo"
        subtitle="Cảnh báo ca làm, đơn hàng & tồn kho"
        onBack={() => navigation.goBack()}
        gradientVariant="emerald"
        rightAction={{
          icon: 'checkmark-done',
          onPress: markAllAsRead,
        }}
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
            colors={['#059669']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
            <Text style={styles.emptySubtitle}>Các thông báo hệ thống mới sẽ xuất hiện tại đây.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  unreadCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '800',
    color: '#065F46',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
});
