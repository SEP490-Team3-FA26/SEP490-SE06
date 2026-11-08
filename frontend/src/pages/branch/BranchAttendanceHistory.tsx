import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar,
  Users,
  Search,
  RotateCcw,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  FileSpreadsheet,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Check,
  X,
  LayoutGrid,
  List,
  Info,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import {
  hrService,
  BranchAttendanceRecord,
  AttendanceHistorySummary,
  WorkShift,
  WorkScheduleAssignment,
} from '../../services/hr/hr.service';

// Lấy chuỗi ngày hiện tại YYYY-MM-DD theo giờ địa phương
function getLocalTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Tìm ngày Thứ 2 đầu tuần của một ngày bất kỳ
function getMondayOfDate(dateInput: Date): Date {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateYMD(dateInput: Date): string {
  const y = dateInput.getFullYear();
  const m = String(dateInput.getMonth() + 1).padStart(2, '0');
  const d = String(dateInput.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDM(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

interface WeeklyShiftCellItem {
  key: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  date: string;
  shiftId: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  isScheduled: boolean;
  attendance?: BranchAttendanceRecord;
  cellState:
    | 'COMPLETED'
    | 'LATE_COMPLETED'
    | 'IN_PROGRESS'
    | 'LATE_IN_PROGRESS'
    | 'MISSING_CHECKOUT'
    | 'ABSENT'
    | 'UPCOMING'
    | 'ON_LEAVE';
}

export const BranchAttendanceHistory: React.FC = () => {
  const todayStr = useMemo(() => getLocalTodayStr(), []);

  const getInitialDates = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return {
      startDate: `${y}-${m}-01`,
      endDate: `${y}-${m}-${d}`,
    };
  };

  // Chế độ xem: 'week' (Bảng chấm công tuần đối soát lịch) | 'list' (Nhật ký điểm danh chi tiết)
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');

  // State cho chế độ Lịch tuần
  const [weekMonday, setWeekMonday] = useState<Date>(() => getMondayOfDate(new Date()));
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<WorkScheduleAssignment[]>([]);
  const [weekAttendances, setWeekAttendances] = useState<BranchAttendanceRecord[]>([]);
  const [loadingWeek, setLoadingWeek] = useState<boolean>(false);

  // State cho chế độ Danh sách nhật ký
  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState<string>(initialDates.startDate);
  const [endDate, setEndDate] = useState<string>(initialDates.endDate);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<BranchAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceHistorySummary>({
    totalRecords: 0,
    onTimeCount: 0,
    lateCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    missingCheckoutCount: 0,
    onLeaveCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const pageSize = 15;

  // State cho Modal xem chi tiết & Chốt đóng ca bổ sung
  const [selectedDetailItem, setSelectedDetailItem] = useState<{
    record?: BranchAttendanceRecord;
    cellItem?: WeeklyShiftCellItem;
  } | null>(null);
  const [closeShiftTime, setCloseShiftTime] = useState<string>('14:00');
  const [closeShiftNote, setCloseShiftNote] = useState<string>('');
  const [isClosingShift, setIsClosingShift] = useState<boolean>(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

  // Danh sách 7 ngày trong tuần đang chọn
  const weekDays = useMemo(() => {
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekMonday);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateYMD(d);
      return {
        dateStr,
        dayLabel: dayLabels[i],
        shortDate: formatDateDM(dateStr),
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
      };
    });
  }, [weekMonday, todayStr]);

  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  // Tải danh sách nhân viên chi nhánh cho dropdown bộ lọc
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const staffList: any = await hrService.getColleagues();
        if (Array.isArray(staffList)) {
          setEmployees(staffList);
        } else if (staffList?.data && Array.isArray(staffList.data)) {
          setEmployees(staffList.data);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách đồng nghiệp:', err);
      }
    };
    loadEmployees();
  }, []);

  // Tải dữ liệu cho chế độ Bảng Chấm Công Tuần
  const fetchWeeklyData = useCallback(async () => {
    setLoadingWeek(true);
    try {
      const [shiftRes, schedRes, attRes] = await Promise.all([
        hrService.listShifts().catch(() => [] as WorkShift[]),
        hrService.getWeekSchedule(weekStartStr).catch(() => null),
        hrService.getBranchAttendanceHistory({
          startDate: weekStartStr,
          endDate: weekEndStr,
          employeeId: selectedEmployeeId || undefined,
          page: 1,
          limit: 100,
        }),
      ]);

      const activeShifts = (Array.isArray(shiftRes) ? shiftRes : []).filter((s) => s.isActive !== false);
      setShifts(activeShifts);
      setScheduleAssignments(Array.isArray(schedRes?.assignments) ? schedRes!.assignments : []);
      setWeekAttendances(attRes?.items || []);
      if (attRes?.summary) {
        setSummary(attRes.summary);
      }
    } catch (err) {
      console.error('Lỗi khi tải bảng chấm công tuần:', err);
      showNotification('error', 'Không thể tải dữ liệu bảng chấm công tuần');
    } finally {
      setLoadingWeek(false);
    }
  }, [weekStartStr, weekEndStr, selectedEmployeeId]);

  // Tải dữ liệu lịch sử điểm danh (chế độ Danh sách)
  const fetchAttendanceHistory = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const res = await hrService.getBranchAttendanceHistory({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          employeeId: selectedEmployeeId || undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          page,
          limit: pageSize,
        });

        setRecords(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotalRecords(res.total || 0);
        setCurrentPage(res.page || 1);
        if (res.summary) {
          setSummary(res.summary);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải lịch sử điểm danh:', err);
        showNotification('error', 'Không thể tải dữ liệu lịch sử điểm danh chi nhánh');
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, selectedEmployeeId, selectedStatus],
  );

  useEffect(() => {
    if (viewMode === 'week') {
      fetchWeeklyData();
    } else {
      fetchAttendanceHistory(1);
    }
  }, [viewMode, fetchWeeklyData, fetchAttendanceHistory]);

  // Danh sách các hàng Ca làm việc trên Lịch tuần (kết hợp work_shifts + các ca có trong lịch/điểm danh)
  const displayShiftRows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; startTime: string; endTime: string; color: string }>();

    for (const s of shifts) {
      map.set(String(s._id), {
        id: String(s._id),
        name: s.name,
        startTime: s.startTime || '06:00',
        endTime: s.endTime || '14:00',
        color: s.color || '#10B981',
      });
    }

    for (const a of scheduleAssignments) {
      if (a.shiftId && !map.has(String(a.shiftId))) {
        map.set(String(a.shiftId), {
          id: String(a.shiftId),
          name: a.shiftName || 'Ca làm việc',
          startTime: a.shiftStart || '06:00',
          endTime: a.shiftEnd || '14:00',
          color: String(a.shiftName || '').toLowerCase().includes('chiều') ? '#F97316' : '#3B82F6',
        });
      }
    }

    const rows = Array.from(map.values()).sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
    );

    if (rows.length === 0) {
      rows.push(
        { id: 'MORNING_DEFAULT', name: 'Ca Sáng', startTime: '06:00', endTime: '14:00', color: '#3B82F6' },
        { id: 'AFTERNOON_DEFAULT', name: 'Ca Chiều', startTime: '14:00', endTime: '22:00', color: '#F97316' },
      );
    }

    return rows;
  }, [shifts, scheduleAssignments]);

  // Xây dựng dữ liệu đối soát cho từng ô (shiftRow, dateStr) trên Lịch Tuần
  const weeklyMatrix = useMemo(() => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Khử trùng bản ghi DEFAULT nếu cùng ngày nhân viên đã có bản ghi gắn shiftId cụ thể
    const deduplicatedAtts: BranchAttendanceRecord[] = [];
    const groupedByEmpDate = new Map<string, BranchAttendanceRecord[]>();

    for (const att of weekAttendances) {
      const k = `${att.employeeId}_${att.date}`;
      if (!groupedByEmpDate.has(k)) groupedByEmpDate.set(k, []);
      groupedByEmpDate.get(k)!.push(att);
    }

    for (const [, list] of groupedByEmpDate.entries()) {
      if (list.length <= 1) {
        deduplicatedAtts.push(...list);
      } else {
        const nonDefault = list.filter((x) => x.shiftId && x.shiftId !== 'DEFAULT');
        if (nonDefault.length > 0) {
          deduplicatedAtts.push(...nonDefault);
        } else {
          deduplicatedAtts.push(list[0]);
        }
      }
    }

    const cellMap = new Map<string, WeeklyShiftCellItem[]>();
    const matchedAttendanceIds = new Set<string>();

    const evaluateState = (
      dateStr: string,
      shiftStart: string,
      shiftEnd: string,
      att?: BranchAttendanceRecord,
    ): WeeklyShiftCellItem['cellState'] => {
      if (att) {
        if (att.status === 'ON_LEAVE_PAID' || att.status === 'ON_LEAVE_UNPAID') {
          return 'ON_LEAVE';
        }
        const isEnded = att.status === 'COMPLETED' || Boolean(att.checkOutTime) || Boolean(att.isHandoverSubmitted);
        if (isEnded) {
          return att.status === 'LATE' ? 'LATE_COMPLETED' : 'COMPLETED';
        }
        // Chưa check-out: Kiểm tra xem có phải ngày cũ hoặc đã quá giờ kết thúc ca > 2 tiếng không
        const endMin = parseTimeToMinutes(shiftEnd);
        const isPastDay = dateStr < todayStr;
        const isOverdueToday = dateStr === todayStr && endMin > 0 && currentMin > endMin + 120;

        if (isPastDay || isOverdueToday || att.isPastUnclosed) {
          return 'MISSING_CHECKOUT';
        }
        return att.status === 'LATE' ? 'LATE_IN_PROGRESS' : 'IN_PROGRESS';
      }

      // Không có bản ghi điểm danh -> Kiểm tra xem đã qua giờ ca chưa
      const startMin = parseTimeToMinutes(shiftStart);
      if (dateStr < todayStr || (dateStr === todayStr && currentMin > startMin + 30)) {
        return 'ABSENT';
      }
      return 'UPCOMING';
    };

    // 1. Duyệt toàn bộ phân công trong lịch tuần (WorkSchedule)
    for (const assign of scheduleAssignments) {
      const aDateStr = assign.date ? new Date(assign.date).toISOString().slice(0, 10) : '';
      if (!aDateStr || aDateStr < weekStartStr || aDateStr > weekEndStr) continue;
      if (selectedEmployeeId && String(assign.employeeId) !== String(selectedEmployeeId)) continue;

      // Tìm hàng ca tương ứng
      let targetShiftRow = displayShiftRows.find((r) => r.id === String(assign.shiftId));
      if (!targetShiftRow) {
        targetShiftRow =
          displayShiftRows.find(
            (r) => r.name.toLowerCase().trim() === String(assign.shiftName || '').toLowerCase().trim(),
          ) || displayShiftRows[0];
      }

      // Tìm bản ghi điểm danh khớp với nhân viên + ngày + ca (hoặc DEFAULT nếu nhân viên chỉ có 1 ca trong ngày)
      const matchedAtt = deduplicatedAtts.find((att) => {
        if (matchedAttendanceIds.has(att._id)) return false;
        if (String(att.employeeId) !== String(assign.employeeId) || att.date !== aDateStr) return false;
        if (String(att.shiftId) === String(assign.shiftId)) return true;
        if (
          att.shiftName &&
          assign.shiftName &&
          att.shiftName.toLowerCase().trim() === assign.shiftName.toLowerCase().trim()
        ) {
          return true;
        }
        if (att.shiftId === 'DEFAULT') return true;
        return false;
      });

      if (matchedAtt) {
        matchedAttendanceIds.add(matchedAtt._id);
      }

      const sStart = assign.shiftStart || targetShiftRow.startTime;
      const sEnd = assign.shiftEnd || targetShiftRow.endTime;
      const cellKey = `${targetShiftRow.id}_${aDateStr}`;
      if (!cellMap.has(cellKey)) cellMap.set(cellKey, []);

      cellMap.get(cellKey)!.push({
        key: `${assign.employeeId}_${aDateStr}_${targetShiftRow.id}`,
        employeeId: String(assign.employeeId),
        employeeName: assign.employeeName || matchedAtt?.employeeName || 'Nhân viên',
        employeeRole: matchedAtt?.employeeRole || 'pharmacist',
        date: aDateStr,
        shiftId: targetShiftRow.id,
        shiftName: targetShiftRow.name,
        shiftStart: sStart,
        shiftEnd: sEnd,
        isScheduled: true,
        attendance: matchedAtt,
        cellState: evaluateState(aDateStr, sStart, sEnd, matchedAtt),
      });
    }

    // 2. Ghép các bản ghi điểm danh phát sinh ngoài lịch tuần (hoặc những ngày chưa tạo lịch tuần)
    for (const att of deduplicatedAtts) {
      if (matchedAttendanceIds.has(att._id)) continue;
      if (selectedEmployeeId && String(att.employeeId) !== String(selectedEmployeeId)) continue;

      let targetShiftRow = displayShiftRows.find((r) => r.id === String(att.shiftId));
      if (!targetShiftRow && att.shiftName) {
        targetShiftRow = displayShiftRows.find((r) =>
          att.shiftName.toLowerCase().includes(r.name.toLowerCase()),
        );
      }
      if (!targetShiftRow) {
        // Nếu là DEFAULT, dựa vào giờ check-in để xếp vào Ca Sáng (< 13:00) hoặc Ca Chiều (>= 13:00)
        const checkInHour = att.checkInTime ? new Date(att.checkInTime).getHours() : 7;
        targetShiftRow =
          checkInHour >= 13 && displayShiftRows.length > 1 ? displayShiftRows[1] : displayShiftRows[0];
      }

      const cellKey = `${targetShiftRow.id}_${att.date}`;
      if (!cellMap.has(cellKey)) cellMap.set(cellKey, []);

      cellMap.get(cellKey)!.push({
        key: `att_${att._id}`,
        employeeId: String(att.employeeId),
        employeeName: att.employeeName,
        employeeRole: att.employeeRole,
        date: att.date,
        shiftId: targetShiftRow.id,
        shiftName: att.shiftName && att.shiftName !== 'Ca mặc định' ? att.shiftName : targetShiftRow.name,
        shiftStart: targetShiftRow.startTime,
        shiftEnd: targetShiftRow.endTime,
        isScheduled: false,
        attendance: att,
        cellState: evaluateState(att.date, targetShiftRow.startTime, targetShiftRow.endTime, att),
      });
    }

    return cellMap;
  }, [scheduleAssignments, weekAttendances, displayShiftRows, weekStartStr, weekEndStr, selectedEmployeeId, todayStr]);

  // Chuyển tuần
  const handleChangeWeek = (offsetWeeks: number) => {
    setWeekMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offsetWeeks * 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    setWeekMonday(getMondayOfDate(new Date()));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAttendanceHistory(1);
  };

  const handleResetFilters = () => {
    const dates = getInitialDates();
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
    setSelectedEmployeeId('');
    setSelectedStatus('ALL');
  };

  const handleQuickSelect = (type: 'today' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    if (type === 'today') {
      const tStr = formatDateYMD(now);
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (type === 'last7') {
      const start = new Date(now);
      start.setDate(d - 6);
      setStartDate(formatDateYMD(start));
      setEndDate(formatDateYMD(now));
    } else if (type === 'thisMonth') {
      const start = new Date(y, m, 1);
      setStartDate(formatDateYMD(start));
      setEndDate(formatDateYMD(now));
    } else if (type === 'lastMonth') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setStartDate(formatDateYMD(start));
      setEndDate(formatDateYMD(end));
    }
  };

  // Mở modal chi tiết & khởi tạo giờ đóng ca gợi ý
  const openDetailModal = (payload: { record?: BranchAttendanceRecord; cellItem?: WeeklyShiftCellItem }) => {
    const rec = payload.record || payload.cellItem?.attendance;
    const defaultEndTime =
      payload.cellItem?.shiftEnd ||
      (String(rec?.shiftName || '').toLowerCase().includes('chiều') ? '22:00' : '14:00');
    setCloseShiftTime(defaultEndTime);
    setCloseShiftNote('Nhân viên quên bấm Check-out, Quản lý đối soát và chốt đóng ca theo giờ kết thúc ca chuẩn.');
    setSelectedDetailItem(payload);
  };

  // Quản lý xác nhận chốt đóng ca bổ sung
  const handleConfirmCloseShift = async () => {
    const rec = selectedDetailItem?.record || selectedDetailItem?.cellItem?.attendance;
    if (!rec?._id) return;

    setIsClosingShift(true);
    try {
      const checkOutIso = `${rec.date}T${closeShiftTime || '14:00'}:00+07:00`;
      await hrService.managerCloseShift(rec._id, {
        checkOutTime: checkOutIso,
        note: closeShiftNote,
      });

      showNotification('success', `Đã chốt đóng ca bổ sung cho ${rec.employeeName} (ngày ${rec.date})`);
      setSelectedDetailItem(null);

      if (viewMode === 'week') {
        fetchWeeklyData();
      } else {
        fetchAttendanceHistory(currentPage);
      }
    } catch (err: any) {
      showNotification(
        'error',
        err?.response?.data?.message || 'Không thể chốt đóng ca bổ sung. Vui lòng thử lại.',
      );
    } finally {
      setIsClosingShift(false);
    }
  };

  // Xuất file Excel / CSV UTF-8
  const handleExportExcel = () => {
    const exportSource = viewMode === 'week' ? weekAttendances : records;
    if (!exportSource || exportSource.length === 0) {
      showNotification('error', 'Không có dữ liệu điểm danh để xuất báo cáo');
      return;
    }

    const headers = [
      'STT',
      'Ngày',
      'Nhân Viên',
      'Vai Trò',
      'Ca Làm Việc',
      'Giờ Check-in',
      'Khoảng Cách Vào (m)',
      'Giờ Check-out',
      'Thời Lượng (Phút)',
      'Trạng Thái Đối Soát',
      'Biên Bản Bàn Giao Ca',
      'Cảnh Báo Mock GPS',
      'Ghi Chú',
    ];

    const getStatusText = (r: BranchAttendanceRecord) => {
      const isEnded = r.status === 'COMPLETED' || Boolean(r.checkOutTime) || Boolean(r.isHandoverSubmitted);
      const isPast = r.date < todayStr || Boolean(r.isPastUnclosed);
      if (isEnded) return r.status === 'LATE' ? 'Hoàn thành (Đi muộn)' : 'Hoàn thành';
      if (isPast) return 'Quên Check-out (Chưa đóng ca)';
      if (r.status === 'LATE') return 'Đi muộn (Đang trực hôm nay)';
      if (r.status === 'CHECKED_IN') return 'Đang trực hôm nay';
      if (r.status === 'ON_LEAVE_PAID') return 'Nghỉ phép có lương';
      if (r.status === 'ON_LEAVE_UNPAID') return 'Nghỉ phép không lương';
      return r.status;
    };

    const rows = exportSource.map((r, idx) => {
      const checkInStr = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('vi-VN') : '-';
      const checkOutStr = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('vi-VN') : '-';
      const durationStr = r.durationMinutes != null ? `${r.durationMinutes}` : '-';
      const handoverStr = r.isHandoverSubmitted ? 'Đã nộp biên bản' : 'Chưa nộp';
      const mockStr = r.isMockLocation ? 'CẢNH BÁO FAKE GPS' : 'Hợp lệ';

      return [
        idx + 1,
        `"${r.date}"`,
        `"${r.employeeName || '-'}"`,
        `"${r.employeeRole || '-'}"`,
        `"${r.shiftName || '-'}"`,
        `"${checkInStr}"`,
        r.checkInDistanceMeters ?? 0,
        `"${checkOutStr}"`,
        durationStr,
        `"${getStatusText(r)}"`,
        `"${handoverStr}"`,
        `"${mockStr}"`,
        `"${(r.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileRange = viewMode === 'week' ? `${weekStartStr}_den_${weekEndStr}` : `${startDate}_den_${endDate}`;
    link.setAttribute('download', `Bao_Cao_Cham_Cong_Chi_Nhanh_${fileRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Đã xuất file báo cáo chấm công chi nhánh thành công');
  };

  const formatDuration = (minutes?: number | null) => {
    if (minutes == null) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} phút`;
    return `${h} giờ ${m > 0 ? `${m} phút` : ''}`;
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <X className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Bảng Chấm Công & Đối Soát Điểm Danh Chi Nhánh
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Đối chiếu lịch phân ca tuần với giờ Check-in / Check-out GPS thực tế, kiểm soát đi muộn, vắng mặt và xử lý ca quên đóng
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chuyển đổi Chế độ Lịch tuần vs Danh sách */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Bảng Chấm Công Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              Nhật Ký GPS Chi Tiết
            </button>
          </div>

          <button
            onClick={() => (viewMode === 'week' ? fetchWeeklyData() : fetchAttendanceHistory(currentPage))}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RotateCcw className={`w-4 h-4 ${loading || loadingWeek ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Xuất Báo Cáo Excel
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng lượt điểm danh */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng lượt chấm công
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{summary.totalRecords}</span>
            <span className="text-xs text-slate-500">bản ghi check-in trong kỳ</span>
          </div>
        </div>

        {/* Card 2: Đang trực hôm nay vs Quên Check-out */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Đang trực hôm nay / Chưa đóng ca
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-extrabold text-emerald-700">{summary.inProgressCount}</span>
              <span className="text-xs text-slate-500 ml-1">đang trực hôm nay</span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-2xl font-extrabold text-orange-600">{summary.missingCheckoutCount || 0}</span>
              <span className="text-xs text-orange-700 font-medium ml-1">quên check-out</span>
            </div>
          </div>
        </div>

        {/* Card 3: Hoàn thành ca trực */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Hoàn thành ca trực
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700">{summary.completedCount}</span>
            <span className="text-xs text-slate-500">ca đã đóng & bàn giao</span>
          </div>
        </div>

        {/* Card 4: Đi muộn & Nghỉ phép */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Đi muộn / Nghỉ phép
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-extrabold text-amber-700">{summary.lateCount}</span>
              <span className="text-xs text-slate-500 ml-1">lượt muộn (&gt;15p)</span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-2xl font-extrabold text-purple-700">{summary.onLeaveCount}</span>
              <span className="text-xs text-slate-500 ml-1">nghỉ phép</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo nếu có ca từ ngày trước quên check-out */}
      {(summary.missingCheckoutCount || 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-orange-900">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">
                Phát hiện {summary.missingCheckoutCount} phiên ca trực của ngày cũ chưa thực hiện Check-out tan ca!
              </span>{' '}
              Các ca đã qua ngày không còn được tính là &quot;Đang trong ca trực&quot;. Quản lý vui lòng bấm vào thẻ ca màu cam bên dưới để đối soát và bấm{' '}
              <span className="font-semibold underline">Chốt đóng ca bổ sung</span>.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CHẾ ĐỘ 1: BẢNG CHẤM CÔNG TUẦN (ĐỐI SOÁT LỊCH PHÂN CA VS THỰC TẾ)
      ===================================================================== */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Thanh điều hướng tuần & chú thích */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleChangeWeek(-1)}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Tuần trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Tuần: {formatDateDM(weekStartStr)}/{weekMonday.getFullYear()} - {formatDateDM(weekEndStr)}/
                  {weekDays[6].dateStr.slice(0, 4)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tuần hiện tại
              </button>

              <button
                type="button"
                onClick={() => handleChangeWeek(1)}
                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Tuần kế tiếp"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Lọc theo nhân viên ngay trên lịch tuần */}
              <div className="relative ml-0 sm:ml-2 min-w-[220px]">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Tất cả nhân sự chi nhánh</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp._id} value={emp.id || emp._id}>
                      {emp.fullName || emp.name} ({emp.role === 'pharmacist' ? 'Dược sĩ' : emp.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chú thích màu sắc trạng thái (Legend) */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                Đã hoàn thành ca
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Đang trực (Hôm nay)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Đi muộn (&gt;15p)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block" />
                Quên Check-out (Ngày cũ)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Chưa điểm danh / Vắng
              </span>
            </div>
          </div>

          {/* Bảng Ma Trận Chấm Công 7 Ngày */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3.5 px-4 w-44 border-r border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ca Trực / Khung Giờ
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.dateStr}
                        className={`py-3 px-3 border-r last:border-r-0 border-slate-200 text-center w-[13%] ${
                          day.isToday ? 'bg-emerald-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`text-xs font-bold uppercase ${
                              day.isToday ? 'text-emerald-800' : 'text-slate-700'
                            }`}
                          >
                            {day.dayLabel}
                          </span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">{day.shortDate}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingWeek ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCcw className="w-6 h-6 animate-spin text-emerald-600" />
                          <span className="text-sm font-medium">Đang tải bảng đối soát chấm công tuần...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayShiftRows.map((shiftRow) => (
                      <tr key={shiftRow.id} className="align-top">
                        {/* Cột thông tin Ca làm việc */}
                        <td className="p-3.5 border-r border-slate-200 bg-slate-50/40">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: shiftRow.color }}
                            />
                            <span className="font-bold text-sm text-slate-900">{shiftRow.name}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-1 pl-4">
                            {shiftRow.startTime} - {shiftRow.endTime}
                          </div>
                        </td>

                        {/* 7 Cột Ngày trong tuần */}
                        {weekDays.map((day) => {
                          const cellKey = `${shiftRow.id}_${day.dateStr}`;
                          const cellItems = weeklyMatrix.get(cellKey) || [];

                          return (
                            <td
                              key={day.dateStr}
                              className={`p-2 border-r last:border-r-0 border-slate-200 transition-colors ${
                                day.isToday ? 'bg-emerald-50/20' : ''
                              }`}
                            >
                              {cellItems.length === 0 ? (
                                <div className="h-20 flex items-center justify-center text-[11px] text-slate-300 italic">
                                  Trống ca
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {cellItems.map((cItem) => {
                                    const att = cItem.attendance;
                                    const inTimeStr = att?.checkInTime
                                      ? new Date(att.checkInTime).toLocaleTimeString('vi-VN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : null;
                                    const outTimeStr = att?.checkOutTime
                                      ? new Date(att.checkOutTime).toLocaleTimeString('vi-VN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : null;

                                    let cardStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                                    let statusLabel = 'Theo lịch';
                                    let statusBadgeStyle = 'bg-slate-200 text-slate-700';

                                    if (cItem.cellState === 'COMPLETED') {
                                      cardStyle = 'bg-blue-50/70 border-blue-200 hover:border-blue-400 text-slate-900';
                                      statusLabel = 'Hoàn thành';
                                      statusBadgeStyle = 'bg-blue-100 text-blue-800';
                                    } else if (cItem.cellState === 'LATE_COMPLETED') {
                                      cardStyle = 'bg-amber-50/70 border-amber-300 hover:border-amber-400 text-slate-900';
                                      statusLabel = 'Muộn (Đã xong)';
                                      statusBadgeStyle = 'bg-amber-100 text-amber-800';
                                    } else if (cItem.cellState === 'IN_PROGRESS') {
                                      cardStyle =
                                        'bg-emerald-50 border-emerald-300 hover:border-emerald-500 text-slate-900 ring-1 ring-emerald-200';
                                      statusLabel = 'Đang trực';
                                      statusBadgeStyle = 'bg-emerald-600 text-white';
                                    } else if (cItem.cellState === 'LATE_IN_PROGRESS') {
                                      cardStyle =
                                        'bg-amber-50 border-amber-300 hover:border-amber-500 text-slate-900 ring-1 ring-amber-200';
                                      statusLabel = 'Đi muộn (Đang trực)';
                                      statusBadgeStyle = 'bg-amber-600 text-white';
                                    } else if (cItem.cellState === 'MISSING_CHECKOUT') {
                                      cardStyle =
                                        'bg-orange-50/90 border-orange-300 hover:border-orange-500 text-slate-900';
                                      statusLabel = 'Quên Check-out';
                                      statusBadgeStyle = 'bg-orange-100 text-orange-800 border border-orange-300';
                                    } else if (cItem.cellState === 'ABSENT') {
                                      cardStyle = 'bg-rose-50/70 border-rose-200 hover:border-rose-400 text-slate-900';
                                      statusLabel = 'Chưa điểm danh';
                                      statusBadgeStyle = 'bg-rose-100 text-rose-800';
                                    } else if (cItem.cellState === 'ON_LEAVE') {
                                      cardStyle = 'bg-purple-50 border-purple-200 text-slate-900';
                                      statusLabel = 'Nghỉ phép';
                                      statusBadgeStyle = 'bg-purple-100 text-purple-800';
                                    }

                                    return (
                                      <div
                                        key={cItem.key}
                                        onClick={() => openDetailModal({ cellItem: cItem, record: att })}
                                        className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer shadow-2xs ${cardStyle}`}
                                      >
                                        <div className="font-bold text-slate-900 leading-snug line-clamp-1">
                                          {cItem.employeeName}
                                        </div>

                                        <div className="mt-1.5 flex items-center justify-between gap-1">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusBadgeStyle}`}
                                          >
                                            {statusLabel}
                                          </span>
                                          {att?.checkInDistanceMeters != null && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                              <MapPin className="w-2.5 h-2.5" />
                                              {att.checkInDistanceMeters}m
                                            </span>
                                          )}
                                        </div>

                                        {/* Giờ Vào - Ra */}
                                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between">
                                          {inTimeStr ? (
                                            <span>
                                              Vào: <strong className="text-slate-800">{inTimeStr}</strong>
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic">Chưa check-in</span>
                                          )}

                                          {outTimeStr ? (
                                            <span>
                                              Ra: <strong className="text-slate-800">{outTimeStr}</strong>
                                            </span>
                                          ) : cItem.cellState === 'MISSING_CHECKOUT' ? (
                                            <span className="text-orange-700 font-bold underline">Chốt ca</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CHẾ ĐỘ 2: NHẬT KÝ ĐIỂM DANH GPS (DANH SÁCH CHI TIẾT)
      ===================================================================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => handleQuickSelect('today')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('last7')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('thisMonth')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-md transition-colors cursor-pointer"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('lastMonth')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
              >
                Tháng trước
              </button>
            </div>

            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Từ ngày</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Đến ngày</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nhân viên</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Tất cả nhân viên</option>
                    {employees.map((emp) => (
                      <option key={emp.id || emp._id} value={emp.id || emp._id}>
                        {emp.fullName || emp.name} ({emp.role === 'pharmacist' ? 'Dược sĩ' : emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="COMPLETED">Đã hoàn thành ca</option>
                  <option value="MISSING_CHECKOUT">Quên Check-out (Chưa đóng ca)</option>
                  <option value="CHECKED_IN">Đúng giờ</option>
                  <option value="LATE">Đi muộn</option>
                  <option value="ON_LEAVE_PAID">Nghỉ phép (Có lương)</option>
                  <option value="ON_LEAVE_UNPAID">Nghỉ phép (Không lương)</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition-colors cursor-pointer"
                  title="Đặt lại bộ lọc"
                >
                  Đặt lại
                </button>
              </div>
            </form>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Ngày & Ca Trực</th>
                    <th className="py-3 px-4">Nhân Viên</th>
                    <th className="py-3 px-4">Check-in Vào Ca</th>
                    <th className="py-3 px-4">Check-out Tan Ca</th>
                    <th className="py-3 px-4">Thời Lượng</th>
                    <th className="py-3 px-4">Bàn Giao Ca</th>
                    <th className="py-3 px-4">Trạng Thái Đối Soát</th>
                    <th className="py-3 px-4">Ghi Chú & Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCcw className="w-6 h-6 animate-spin text-emerald-600" />
                          <span>Đang tải dữ liệu điểm danh chi nhánh...</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                          <span className="text-slate-600 font-medium">Không tìm thấy bản ghi điểm danh nào</span>
                          <span className="text-xs text-slate-400">
                            Vui lòng thay đổi khoảng thời gian hoặc điều kiện lọc
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((item) => {
                      const checkInDate = item.checkInTime ? new Date(item.checkInTime) : null;
                      const checkOutDate = item.checkOutTime ? new Date(item.checkOutTime) : null;
                      const durationStr = formatDuration(item.durationMinutes);

                      const isShiftEnded =
                        item.status === 'COMPLETED' || Boolean(item.checkOutTime) || Boolean(item.isHandoverSubmitted);
                      const isPastUnclosed =
                        !isShiftEnded && (item.date < todayStr || Boolean(item.isPastUnclosed));

                      let badgeBg = 'bg-slate-100 text-slate-700';
                      let badgeText: string = item.status;

                      if (isShiftEnded) {
                        badgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                        badgeText = item.status === 'LATE' ? 'Đi muộn (Đã hoàn thành)' : 'Hoàn thành ca';
                      } else if (isPastUnclosed) {
                        badgeBg = 'bg-orange-50 text-orange-800 border border-orange-300';
                        badgeText =
                          item.status === 'LATE'
                            ? 'Đi muộn | Quên Check-out'
                            : 'Quên Check-out (Chưa đóng ca)';
                      } else if (item.status === 'CHECKED_IN') {
                        badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                        badgeText = 'Đang trong ca trực (Hôm nay)';
                      } else if (item.status === 'LATE') {
                        badgeBg = 'bg-amber-50 text-amber-700 border border-amber-200';
                        badgeText = 'Đi muộn (Đang trực hôm nay)';
                      } else if (item.status === 'ON_LEAVE_PAID') {
                        badgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                        badgeText = 'Nghỉ phép (Có lương)';
                      } else if (item.status === 'ON_LEAVE_UNPAID') {
                        badgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                        badgeText = 'Nghỉ phép (K.lương)';
                      }

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{item.date}</div>
                            <div className="text-xs text-emerald-700 font-medium mt-0.5">
                              {item.shiftName || 'Ca làm việc'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                                {(item.employeeName || 'NV').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{item.employeeName}</div>
                                <div className="text-xs text-slate-400">
                                  {item.employeeRole === 'pharmacist' ? 'Dược sĩ' : item.employeeRole}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {checkInDate ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  {checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  Cách cơ sở: {item.checkInDistanceMeters ?? 0}m
                                </div>
                                {item.isMockLocation && (
                                  <div className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                                    <ShieldAlert className="w-3 h-3" />
                                    Cảnh báo giả lập GPS
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Chưa điểm danh</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {checkOutDate ? (
                              <div className="space-y-0.5">
                                <div className="font-medium text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                                  {checkOutDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {checkOutDate.toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            ) : item.isHandoverSubmitted ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  Đã đóng ca (Bàn giao)
                                </span>
                              </div>
                            ) : isPastUnclosed ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-800 border border-orange-200">
                                  Chưa Check-out (Quá hạn)
                                </span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => openDetailModal({ record: item })}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                                  >
                                    + Chốt đóng ca bổ sung
                                  </button>
                                </div>
                              </div>
                            ) : item.checkInTime ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                                Đang trực hôm nay...
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {durationStr ? (
                              <span className="font-medium text-slate-800">{durationStr}</span>
                            ) : isPastUnclosed ? (
                              <span className="text-xs text-orange-700 font-medium">Chưa chốt giờ ra</span>
                            ) : item.checkInTime ? (
                              <span className="text-xs text-emerald-700 font-medium">Đang làm việc</span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {item.isHandoverSubmitted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đã nộp phiếu
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Chưa nộp</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-600 truncate block" title={item.note || ''}>
                                {item.note || '-'}
                              </span>
                              <button
                                type="button"
                                onClick={() => openDetailModal({ record: item })}
                                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors shrink-0 cursor-pointer"
                              >
                                Chi tiết
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
              <div>
                Hiển thị <span className="font-semibold text-slate-900">{records.length}</span> trên tổng số{' '}
                <span className="font-semibold text-slate-900">{totalRecords}</span> bản ghi
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchAttendanceHistory(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                  className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 text-xs font-medium text-slate-700">
                  Trang {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => fetchAttendanceHistory(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                  className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL XEM CHI TIẾT ĐỐI SOÁT & CHỐT ĐÓNG CA BỔ SUNG
      ===================================================================== */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            {(() => {
              const rec = selectedDetailItem.record || selectedDetailItem.cellItem?.attendance;
              const cell = selectedDetailItem.cellItem;
              const empName = rec?.employeeName || cell?.employeeName || 'Nhân viên';
              const dateVal = rec?.date || cell?.date || '';
              const shiftNameVal = rec?.shiftName || cell?.shiftName || 'Ca làm việc';
              const shiftHoursVal = cell ? `${cell.shiftStart} - ${cell.shiftEnd}` : '';
              const isEnded =
                rec?.status === 'COMPLETED' || Boolean(rec?.checkOutTime) || Boolean(rec?.isHandoverSubmitted);

              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Chi Tiết Phiên Ca & Đối Soát Chấm Công</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ngày {dateVal} — {shiftNameVal} {shiftHoursVal ? `(${shiftHoursVal})` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDetailItem(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nhân sự trực:</span>
                      <span className="font-bold text-slate-900 text-sm">{empName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phân công trên Lịch tuần:</span>
                      <span className="font-semibold text-slate-800">
                        {cell?.isScheduled === false ? 'Ca phát sinh / Mặc định' : 'Có trong lịch phân ca'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Giờ Check-in GPS:</span>
                      <span className="font-bold text-emerald-700">
                        {rec?.checkInTime
                          ? new Date(rec.checkInTime).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'Chưa Check-in'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Giờ Check-out Tan ca:</span>
                      <span className="font-bold text-blue-700">
                        {rec?.checkOutTime
                          ? new Date(rec.checkOutTime).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : 'Chưa Check-out'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Khoảng cách GPS tới cơ sở:</span>
                      <span className="font-semibold text-slate-800">
                        {rec?.checkInDistanceMeters != null ? `${rec.checkInDistanceMeters} mét (Hợp lệ)` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Biên bản bàn giao két POS:</span>
                      <span className="font-semibold text-slate-800">
                        {rec?.isHandoverSubmitted ? 'Đã nộp biên bản' : 'Chưa nộp'}
                      </span>
                    </div>
                  </div>

                  {rec?.note && (
                    <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-700 block mb-1">Ghi chú điểm danh:</span>
                      <p className="text-slate-600">{rec.note}</p>
                    </div>
                  )}

                  {/* Khu vực Quản lý chốt đóng ca bổ sung nếu nhân viên quên check-out */}
                  {rec && !isEnded && (
                    <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-900">
                        <UserCheck className="w-4 h-4 text-orange-700" />
                        <span>Quản Lý Chốt Đóng Ca Bổ Sung (Xử lý quên Check-out)</span>
                      </div>
                      <p className="text-[11px] text-orange-800">
                        Nhân viên đã Check-in vào ca nhưng chưa thực hiện Check-out khi hết giờ. Quản lý có thể xác nhận giờ tan ca thực tế để khóa phiên ca này và tính công chuẩn xác.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Giờ kết thúc ca thực tế:</label>
                          <input
                            type="time"
                            value={closeShiftTime}
                            onChange={(e) => setCloseShiftTime(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Ngày áp dụng:</label>
                          <input
                            type="text"
                            value={rec.date}
                            disabled
                            className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="font-semibold text-slate-700 block mb-1">Ghi chú đối soát của Quản lý:</label>
                        <input
                          type="text"
                          value={closeShiftNote}
                          onChange={(e) => setCloseShiftNote(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                          placeholder="Nhập lý do chốt đóng ca bổ sung..."
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmCloseShift}
                          disabled={isClosingShift}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {isClosingShift ? 'Đang xử lý...' : 'Xác Nhận Chốt Đóng Ca'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!rec && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800">
                      Nhân sự có tên trong lịch phân công ca này nhưng chưa thực hiện Check-in GPS trên ứng dụng.
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailItem(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchAttendanceHistory;
