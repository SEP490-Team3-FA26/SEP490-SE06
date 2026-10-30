import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../ui/toastHelper';

interface StaffScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSwap?: (prefillShift?: any) => void;
  onRequestSwap?: (prefillShift?: any) => void;
  onOpenLeave?: (prefillShift?: any) => void;
  onRequestLeave?: (prefillShift?: any) => void;
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEKDAY_NAMES = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export const StaffScheduleModal: React.FC<StaffScheduleModalProps> = ({
  visible,
  onClose,
  onOpenSwap,
  onRequestSwap,
  onOpenLeave,
  onRequestLeave,
}) => {
  const insets = useSafeAreaInsets();
  const swapCallback = onOpenSwap || onRequestSwap;
  const leaveCallback = onOpenLeave || onRequestLeave;
  const { user } = useAuth();
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [schedule, setSchedule] = useState<any | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const weekStartStr = useMemo(() => formatDate(currentWeekMonday), [currentWeekMonday]);

  const loadScheduleData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [schedRes, shiftsRes] = await Promise.all([
        ApiService.getMyWeekSchedule(weekStartStr),
        ApiService.listWorkShifts(),
      ]);

      setSchedule(schedRes);
      setShifts(shiftsRes || []);
    } catch (e) {
      console.warn('Lỗi tải lịch làm việc:', e);
      showToast.error('Lỗi', 'Không thể tải lịch làm việc từ máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStartStr]);

  useEffect(() => {
    if (visible) {
      loadScheduleData();
    }
  }, [visible, loadScheduleData]);

  const changeWeek = (offset: number) => {
    const nextMon = new Date(currentWeekMonday);
    nextMon.setDate(nextMon.getDate() + offset * 7);
    setCurrentWeekMonday(nextMon);
  };

  const resetToThisWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  // Tính 7 ngày trong tuần
  const daysInWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setDate(d.getDate() + i);
      days.push({
        dateObj: d,
        dateStr: formatDate(d),
        weekdayName: WEEKDAY_NAMES[i],
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
      });
    }
    return days;
  }, [currentWeekMonday]);

  // Phân tích ca của bản thân và đồng nghiệp theo ngày
  const myUserId = user?.id || (user as any)?._id || (user as any)?.sub;
  const todayStr = formatDate(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDate(tomorrowDate);

  const assignmentsByDate = useMemo(() => {
    const map: { [dateStr: string]: { myShifts: any[]; peerShifts: any[] } } = {};
    daysInWeek.forEach((day) => {
      map[day.dateStr] = { myShifts: [], peerShifts: [] };
    });

    if (schedule?.assignments && Array.isArray(schedule.assignments)) {
      schedule.assignments.forEach((a: any) => {
        const aDate = a.date ? a.date.slice(0, 10) : '';
        if (map[aDate]) {
          const isMe = String(a.employeeId) === String(myUserId);
          if (isMe) {
            map[aDate].myShifts.push(a);
          } else {
            map[aDate].peerShifts.push(a);
          }
        }
      });
    }
    return map;
  }, [daysInWeek, schedule, myUserId]);

  const todayMyShifts = assignmentsByDate[todayStr]?.myShifts || [];
  const tomorrowMyShifts = assignmentsByDate[tomorrowStr]?.myShifts || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar" size={22} color="#059669" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Lịch Làm Việc Cá Nhân</Text>
                <Text style={styles.sheetSubtitle}>Ca trực cơ sở & đồng nghiệp cùng ca</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick summary: Hôm nay & Ngày mai */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="time" size={16} color="#059669" />
                <Text style={styles.summaryCardTitle}>HÔM NAY ({todayStr.slice(8, 10)}/{todayStr.slice(5, 7)})</Text>
              </View>
              {todayMyShifts.length > 0 ? (
                todayMyShifts.map((s, idx) => (
                  <View key={`today_${idx}`} style={styles.shiftPillActive}>
                    <Text style={styles.shiftPillTextActive}>{s.shiftName || 'Ca trực'}</Text>
                    <Text style={styles.shiftPillTime}>{s.shiftStart} - {s.shiftEnd}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.shiftPillOff}>Nghỉ off hôm nay</Text>
              )}
            </View>

            <View style={[styles.summaryCard, { borderLeftWidth: 1, borderLeftColor: '#E2E8F0' }]}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="sunny" size={16} color="#D97706" />
                <Text style={[styles.summaryCardTitle, { color: '#D97706' }]}>
                  NGÀY MAI ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
                </Text>
              </View>
              {tomorrowMyShifts.length > 0 ? (
                tomorrowMyShifts.map((s, idx) => (
                  <View key={`tom_${idx}`} style={[styles.shiftPillActive, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Text style={[styles.shiftPillTextActive, { color: '#B45309' }]}>{s.shiftName || 'Ca trực'}</Text>
                    <Text style={[styles.shiftPillTime, { color: '#B45309' }]}>{s.shiftStart} - {s.shiftEnd}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.shiftPillOff}>Nghỉ off ngày mai</Text>
              )}
            </View>
          </View>

          {/* Week Navigator */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navArrowBtn}>
              <Ionicons name="chevron-back" size={20} color="#059669" />
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToThisWeek} style={styles.weekDisplayBtn}>
              <Text style={styles.weekDisplayText}>
                Tuần: {daysInWeek[0]?.dateStr} → {daysInWeek[6]?.dateStr}
              </Text>
              <Text style={styles.todayHintText}>(Nhấn để về tuần này)</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navArrowBtn}>
              <Ionicons name="chevron-forward" size={20} color="#059669" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={styles.loadingText}>Đang tải lịch trực...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadScheduleData(true)} colors={['#059669']} />}
            >
              {daysInWeek.map((day) => {
                const isToday = day.dateStr === todayStr;
                const { myShifts, peerShifts } = assignmentsByDate[day.dateStr] || { myShifts: [], peerShifts: [] };
                const hasMyShift = myShifts.length > 0;

                return (
                  <View
                    key={day.dateStr}
                    style={[
                      styles.dayCard,
                      isToday && styles.dayCardToday,
                      hasMyShift && styles.dayCardHasShift,
                    ]}
                  >
                    {/* Day Header */}
                    <View style={styles.dayHeaderRow}>
                      <View style={styles.dayTitleBox}>
                        <Text style={[styles.dayWeekday, isToday && styles.todayText]}>
                          {day.weekdayName}
                        </Text>
                        <Text style={styles.dayDate}>
                          {day.dayNum} tháng {day.monthNum}
                        </Text>
                      </View>

                      {isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>HÔM NAY</Text>
                        </View>
                      )}

                      {!hasMyShift && (
                        <View style={styles.offBadge}>
                          <Text style={styles.offBadgeText}>NGHỈ OFF</Text>
                        </View>
                      )}
                    </View>

                    {/* My Shifts */}
                    {hasMyShift && (
                      <View style={styles.myShiftsContainer}>
                        {myShifts.map((shift, idx) => (
                          <View key={`my_${idx}`} style={styles.myShiftRow}>
                            <View style={styles.myShiftBadge}>
                              <Ionicons name="briefcase" size={16} color="#059669" />
                              <Text style={styles.myShiftName}>{shift.shiftName}</Text>
                              <Text style={styles.myShiftHours}>
                                ({shift.shiftStart} - {shift.shiftEnd})
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {leaveCallback && (
                                <TouchableOpacity
                                  onPress={() => {
                                    onClose();
                                    leaveCallback({
                                      date: day.dateStr,
                                      shiftId: shift.shiftId,
                                      shiftName: shift.shiftName,
                                      shiftStart: shift.shiftStart,
                                      shiftEnd: shift.shiftEnd,
                                    });
                                  }}
                                  style={styles.leaveActionBtn}
                                >
                                  <Ionicons name="calendar-outline" size={13} color="#D97706" />
                                  <Text style={styles.leaveActionText}>Xin nghỉ</Text>
                                </TouchableOpacity>
                              )}

                              {swapCallback && (
                                <TouchableOpacity
                                  onPress={() => {
                                    onClose();
                                    swapCallback(shift);
                                  }}
                                  style={styles.swapActionBtn}
                                >
                                  <Ionicons name="swap-horizontal" size={13} color="#0284C7" />
                                  <Text style={styles.swapActionText}>Đổi ca</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Peer Shifts (Đồng nghiệp trực cùng) */}
                    {peerShifts.length > 0 ? (
                      <View style={styles.peersContainer}>
                        <Text style={styles.peersLabel}>
                          <Ionicons name="people-outline" size={12} color="#64748B" /> Đồng nghiệp trực:
                        </Text>
                        <View style={styles.peerChipsRow}>
                          {peerShifts.map((peer, idx) => (
                            <View key={`peer_${idx}`} style={styles.peerChip}>
                              <Text style={styles.peerChipName}>
                                {peer.employeeName || 'Dược sĩ'} ({peer.shiftName || 'Ca'})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.noPeersText}>Không có đồng nghiệp khác trong ca ngày này.</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Bottom Action */}
          {swapCallback && (
            <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  swapCallback();
                }}
                style={styles.openSwapFullBtn}
              >
                <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                <Text style={styles.openSwapFullBtnText}>TẠO YÊU CẦU ĐỔI CA CHÉO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryCard: {
    flex: 1,
    paddingHorizontal: 8,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  summaryCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  shiftPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  shiftPillTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  shiftPillTime: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  shiftPillOff: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDisplayBtn: {
    alignItems: 'center',
  },
  weekDisplayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  todayHintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dayCardToday: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  dayCardHasShift: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitleBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dayWeekday: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  todayText: {
    color: '#059669',
  },
  dayDate: {
    fontSize: 12,
    color: '#64748B',
  },
  todayBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  offBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  myShiftsContainer: {
    marginTop: 10,
    gap: 6,
  },
  myShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  myShiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  myShiftName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  myShiftHours: {
    fontSize: 12,
    color: '#059669',
  },
  swapActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  swapActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  leaveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leaveActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  peersContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  peersLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  peerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  peerChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  peerChipName: {
    fontSize: 11,
    color: '#334155',
  },
  noPeersText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  openSwapFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  openSwapFullBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
