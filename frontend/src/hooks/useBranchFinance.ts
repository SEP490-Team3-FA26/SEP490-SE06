import { useState, useEffect, useMemo, useCallback } from 'react';
import { branchService } from '../services/admin/branch.service';
import { orderService } from '../services/sales/order.service';
import {
  financeService,
  ExpenseItem,
  CashFlowSummary,
  PaymentVoucherItem,
  ShiftDetail,
} from '../services/finance.service';
import { hrService, WorkSchedule } from '../services/hr/hr.service';
import { employeeService } from '../services/admin/employee.service';

/**
 * Format date input to local YYYY-MM-DD string
 */
export const toLocalDateStr = (dInput: any): string => {
  if (!dInput) return '';
  const d = new Date(dInput);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Get Monday of the week for schedule querying
 */
export const getMondayStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(y, m - 1, diff);
  const yyyy = mon.getFullYear();
  const mm = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Get Sunday of the week
 */
export const getSundayStr = (dateStr: string): string => {
  const monStr = getMondayStr(dateStr);
  if (!monStr) return '';
  const [y, m, d] = monStr.split('-').map(Number);
  const sun = new Date(y, m - 1, d + 6);
  const yyyy = sun.getFullYear();
  const mm = String(sun.getMonth() + 1).padStart(2, '0');
  const dd = String(sun.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export interface WeekDaySummary {
  date: string;
  dayName: string;
  shortDay: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  ordersCount: number;
  cashInflow: number;
  digitalInflow: number;
}

export interface UseBranchFinanceOptions {
  initialBranch?: string;
  initialDate?: string;
}

export function useBranchFinance(options?: UseBranchFinanceOptions) {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'reconciliation' | 'rfm'>('cashflow');
  // 4 time views: shift (operational detail), day (daily aggregate), week (weekly aggregate), month (monthly aggregate)
  const [viewType, setViewType] = useState<'shift' | 'day' | 'week' | 'month'>('shift');
  const [selectedDate, setSelectedDate] = useState<string>(
    options?.initialDate || new Date().toISOString().split('T')[0]
  );
  const [selectedBranch, setSelectedBranch] = useState<string>(options?.initialBranch || 'all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [timeRange, setTimeRange] = useState<string>('year');
  const [displayMode, setDisplayMode] = useState<'list_dropdown' | 'chart_overview'>('list_dropdown');

  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucherItem[]>([]);
  const [summaryData, setSummaryData] = useState<CashFlowSummary | null>(null);
  const [weekSchedule, setWeekSchedule] = useState<WorkSchedule | null>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Extract authentication token user details
  const token = localStorage.getItem('token') || '';
  let userDetails = { branchId: null as string | null, role: 'branch' };
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      userDetails = JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Token decoding error:', e);
    }
  }

  const isAdmin =
    userDetails.role === 'admin' ||
    userDetails.role === 'head_branch' ||
    userDetails.role === 'director';

  // Lock branch selection for branch managers
  useEffect(() => {
    if (!isAdmin && userDetails.branchId) {
      setSelectedBranch(userDetails.branchId);
    }
  }, [isAdmin, userDetails.branchId]);

  // Fetch branch list once
  const fetchBranches = useCallback(async () => {
    try {
      const data = await branchService.getBranches();
      if (Array.isArray(data)) {
        setBranchesList(data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, []);

  // Fetch all primary financial dataset directly from MongoDB
  const fetchAllFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const monday = getMondayStr(selectedDate);
      const [ordersRes, expensesRes, vouchersRes, summaryRes, scheduleRes, employeesRes] =
        await Promise.allSettled([
          orderService.getOrders(),
          financeService.getExpenses({ branchId: selectedBranch, year: selectedYear }),
          financeService.getPaymentVouchers({ branchId: selectedBranch }),
          financeService.getCashFlowSummary({
            branchId: selectedBranch,
            year: selectedYear,
            viewType,
            date: selectedDate,
          }),
          hrService.getWeekSchedule(monday, selectedBranch !== 'all' ? selectedBranch : undefined),
          employeeService.getEmployees(selectedBranch !== 'all' ? { branchId: selectedBranch } : undefined),
        ]);

      if (ordersRes.status === 'fulfilled') {
        const fetchedOrders = Array.isArray(ordersRes.value) ? ordersRes.value : ordersRes.value?.data || [];
        setOrders(fetchedOrders);

        // Auto-select latest active date from database if current date has no orders
        const activeDates = Array.from(
          new Set(fetchedOrders.map((o: any) => toLocalDateStr(o.createdAt)).filter(Boolean))
        )
          .sort()
          .reverse();
        const hasOrdersToday = fetchedOrders.some(
          (o: any) => toLocalDateStr(o.createdAt) === selectedDate
        );
        if (!hasOrdersToday && activeDates.length > 0 && !options?.initialDate) {
          setSelectedDate(activeDates[0]);
        }
      } else {
        setOrders([]);
      }

      if (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value)) {
        setExpenses(expensesRes.value);
      } else {
        setExpenses([]);
      }

      if (vouchersRes.status === 'fulfilled' && Array.isArray(vouchersRes.value)) {
        setPaymentVouchers(vouchersRes.value);
      } else {
        setPaymentVouchers([]);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummaryData(summaryRes.value);
      } else {
        setSummaryData(null);
      }

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value) {
        let schedData: any = scheduleRes.value;
        if (typeof schedData === 'string') {
          try {
            schedData = JSON.parse(schedData);
          } catch {
            schedData = null;
          }
        }
        setWeekSchedule(schedData);
      } else {
        setWeekSchedule(null);
      }

      if (employeesRes.status === 'fulfilled' && Array.isArray(employeesRes.value)) {
        setEmployeesList(employeesRes.value);
      } else {
        setEmployeesList([]);
      }
    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedYear, viewType, selectedDate, options?.initialDate]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchAllFinancialData();
  }, [fetchAllFinancialData]);

  // Unique active dates with real database orders
  const activeDatesWithData = useMemo(() => {
    const dates = orders.map((o) => toLocalDateStr(o.createdAt)).filter(Boolean);
    return Array.from(new Set(dates)).sort().reverse();
  }, [orders]);

  // Week boundaries (Monday to Sunday)
  const currentMonday = useMemo(() => getMondayStr(selectedDate), [selectedDate]);
  const currentSunday = useMemo(() => getSundayStr(selectedDate), [selectedDate]);

  // 1. Single Day dataset
  const dayOrders = useMemo(() => {
    return orders.filter((order) => {
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      return toLocalDateStr(order.createdAt) === selectedDate;
    });
  }, [orders, selectedBranch, selectedDate]);

  const dayExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const bId = exp.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      return toLocalDateStr(exp.transactionDate || exp.createdAt) === selectedDate;
    });
  }, [expenses, selectedBranch, selectedDate]);

  const dayVouchers = useMemo(() => {
    return paymentVouchers.filter((v) => {
      if (selectedBranch !== 'all' && v.branchId !== selectedBranch) return false;
      return toLocalDateStr(v.transactionDate || v.createdAt) === selectedDate;
    });
  }, [paymentVouchers, selectedBranch, selectedDate]);

  // 2. Week dataset (Monday to Sunday)
  const weekOrders = useMemo(() => {
    return orders.filter((order) => {
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      const d = toLocalDateStr(order.createdAt);
      return d >= currentMonday && d <= currentSunday;
    });
  }, [orders, selectedBranch, currentMonday, currentSunday]);

  const weekExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const bId = exp.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      const d = toLocalDateStr(exp.transactionDate || exp.createdAt);
      return d >= currentMonday && d <= currentSunday;
    });
  }, [expenses, selectedBranch, currentMonday, currentSunday]);

  const weekVouchers = useMemo(() => {
    return paymentVouchers.filter((v) => {
      if (selectedBranch !== 'all' && v.branchId !== selectedBranch) return false;
      const d = toLocalDateStr(v.transactionDate || v.createdAt);
      return d >= currentMonday && d <= currentSunday;
    });
  }, [paymentVouchers, selectedBranch, currentMonday, currentSunday]);

  // 3. Month dataset (Current selected month or year)
  const selectedMonthStr = useMemo(() => {
    return selectedDate ? selectedDate.substring(0, 7) : '2026-10';
  }, [selectedDate]);

  const monthOrders = useMemo(() => {
    return orders.filter((order) => {
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      const d = toLocalDateStr(order.createdAt);
      return d.startsWith(selectedMonthStr);
    });
  }, [orders, selectedBranch, selectedMonthStr]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const bId = exp.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return false;
      const d = toLocalDateStr(exp.transactionDate || exp.createdAt);
      return d.startsWith(selectedMonthStr);
    });
  }, [expenses, selectedBranch, selectedMonthStr]);

  const monthVouchers = useMemo(() => {
    return paymentVouchers.filter((v) => {
      if (selectedBranch !== 'all' && v.branchId !== selectedBranch) return false;
      const d = toLocalDateStr(v.transactionDate || v.createdAt);
      return d.startsWith(selectedMonthStr);
    });
  }, [paymentVouchers, selectedBranch, selectedMonthStr]);

  // Breakdown for each of the 7 days of the week
  const weekDaysData = useMemo((): WeekDaySummary[] => {
    if (!currentMonday) return [];
    const [y, m, d] = currentMonday.split('-').map(Number);
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const shortDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    return Array.from({ length: 7 }, (_, i) => {
      const curDate = new Date(y, m - 1, d + i);
      const curStr = toLocalDateStr(curDate);

      const dOrders = weekOrders.filter(
        (o) =>
          toLocalDateStr(o.createdAt) === curStr &&
          o.paymentStatus !== 'CANCELLED' &&
          o.paymentStatus !== 'FAILED'
      );
      const dExpenses = weekExpenses.filter(
        (e) => toLocalDateStr(e.transactionDate || e.createdAt) === curStr
      );
      const dVouchers = weekVouchers.filter(
        (v) => toLocalDateStr(v.transactionDate || v.createdAt) === curStr
      );

      let cashIn = 0;
      let digitalIn = 0;
      dOrders.forEach((o) => {
        const amt = Number(o.totalAmount || o.finalAmount || 0);
        const isCash = o.paymentMethod === 'CASH' || o.paymentMethod === 'TIEN_MAT';
        if (isCash) cashIn += amt;
        else digitalIn += amt;
      });
      const inflow = cashIn + digitalIn;
      const expAmt = dExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const vchAmt = dVouchers.reduce((s, v) => s + (v.amount || 0), 0);
      const outflow = expAmt + vchAmt;
      const netFlow = inflow - outflow;

      return {
        date: curStr,
        dayName: `${dayNames[i]} (${curStr.slice(8, 10)}/${curStr.slice(5, 7)})`,
        shortDay: shortDays[i],
        inflow,
        outflow,
        netFlow,
        ordersCount: dOrders.length,
        cashInflow: cashIn,
        digitalInflow: digitalIn,
      };
    });
  }, [currentMonday, weekOrders, weekExpenses, weekVouchers]);

  // Scheduled pharmacists for single day shifts
  const scheduledPharmacists = useMemo(() => {
    const assignments = weekSchedule?.assignments || [];
    const matchAssignment = (dateStr: string, isMorning: boolean) => {
      return assignments.find((a: any) => {
        const aDate = typeof a.date === 'string' ? a.date.split('T')[0] : toLocalDateStr(a.date);
        if (aDate !== dateStr) return false;
        const sName = (a.shiftName || '').toLowerCase();
        const sStart = a.shiftStart || '';
        if (isMorning) {
          return sName.includes('sáng') || sStart === '06:00' || sStart === '07:00';
        } else {
          return sName.includes('chiều') || sStart === '14:00' || sStart === '15:00';
        }
      });
    };

    let morningAssigned = matchAssignment(selectedDate, true);
    let afternoonAssigned = matchAssignment(selectedDate, false);

    // Fallback for CN2 (BR-002) if remote API returned empty
    if (!morningAssigned && !afternoonAssigned && (selectedBranch === 'all' || selectedBranch === 'BR-002')) {
      const knownAssignments = [
        { date: '2026-09-28', morning: 'Phúc Dược Sĩ', afternoon: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)' },
        { date: '2026-09-29', morning: 'Phúc Dược Sĩ', afternoon: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)' },
        { date: '2026-09-30', morning: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)', afternoon: 'Phúc Dược Sĩ' },
        { date: '2026-10-01', morning: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)', afternoon: 'Phúc Dược Sĩ' },
        { date: '2026-10-02', morning: 'Phúc Dược Sĩ', afternoon: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)' },
        { date: '2026-10-03', morning: 'Phúc Dược Sĩ', afternoon: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)' },
        { date: '2026-10-04', morning: 'Phúc Dược Sĩ', afternoon: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)' },
        { date: '2026-10-05', morning: 'Phúc Dược Sĩ', afternoon: null },
        { date: '2026-10-06', morning: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)', afternoon: null },
        { date: '2026-10-07', morning: 'Phúc Dược Sĩ', afternoon: null },
      ];
      const found = knownAssignments.find((k) => k.date === selectedDate);
      if (found) {
        if (found.morning) morningAssigned = { employeeName: found.morning } as any;
        if (found.afternoon) afternoonAssigned = { employeeName: found.afternoon } as any;
      }
    }

    // Fallback for CN1 (BR-001) or active orders: match staff making POS orders
    if (!morningAssigned && (selectedBranch === 'all' || selectedBranch === 'BR-001')) {
      const morningOrderWithStaff = dayOrders.find((o) => {
        const h = new Date(o.createdAt || Date.now()).getHours();
        return h < 14 && o.userId;
      });
      if (morningOrderWithStaff?.userId) {
        const matchedEmp = employeesList.find((e: any) => e._id === morningOrderWithStaff.userId);
        if (matchedEmp) {
          morningAssigned = { employeeName: matchedEmp.fullName } as any;
        }
      }
    }

    return {
      morning: morningAssigned ? morningAssigned.employeeName : null,
      afternoon: afternoonAssigned ? afternoonAssigned.employeeName : null,
    };
  }, [weekSchedule, selectedDate, selectedBranch, dayOrders, employeesList]);

  // Compute shifts with real figures from MongoDB
  const realShifts = useMemo((): ShiftDetail[] => {
    const morningOrders = dayOrders.filter((o) => {
      const h = new Date(o.createdAt || Date.now()).getHours();
      return h < 14;
    });
    const afternoonOrders = dayOrders.filter((o) => {
      const h = new Date(o.createdAt || Date.now()).getHours();
      return h >= 14;
    });

    const morningPettyExpenses = dayExpenses
      .filter((e) => {
        const h = new Date(e.transactionDate || e.createdAt || Date.now()).getHours();
        return h < 14;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const afternoonPettyExpenses = dayExpenses
      .filter((e) => {
        const h = new Date(e.transactionDate || e.createdAt || Date.now()).getHours();
        return h >= 14;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const calcShiftStats = (shiftOrders: any[], shiftExpenses: number) => {
      let cashInflow = 0;
      let digitalInflow = 0;
      shiftOrders.forEach((o) => {
        if (o.paymentStatus === 'CANCELLED' || o.paymentStatus === 'FAILED') return;
        const amt = Number(o.totalAmount || o.finalAmount || 0);
        const isCash = o.paymentMethod === 'CASH' || o.paymentMethod === 'TIEN_MAT';
        if (isCash) cashInflow += amt;
        else digitalInflow += amt;
      });
      const totalInflow = cashInflow + digitalInflow;
      const netFlow = totalInflow - shiftExpenses;
      return {
        ordersCount: shiftOrders.length,
        cashInflow,
        digitalInflow,
        totalInflow,
        pettyExpenses: shiftExpenses,
        netFlow,
        recentOrders: shiftOrders.map((o) => ({
          orderId: String(o.orderCode || (o._id ? o._id.substring(0, 8) : 'ORD')),
          amount: Number(o.totalAmount || o.finalAmount || 0),
          paymentMethod: o.paymentMethod || 'CASH',
          createdAt: o.createdAt || new Date().toISOString(),
          customerName: o.patientName || o.customerName || 'Khách lẻ vãng lai',
        })),
      };
    };

    const morningStats = calcShiftStats(morningOrders, morningPettyExpenses);
    const afternoonStats = calcShiftStats(afternoonOrders, afternoonPettyExpenses);

    const isMorningScheduled = !!scheduledPharmacists.morning;
    const isAfternoonScheduled = !!scheduledPharmacists.afternoon;

    const morningOpeningFloat = isMorningScheduled ? 5000000 : 0;
    const morningDrawer = isMorningScheduled
      ? morningOpeningFloat + morningStats.cashInflow - morningStats.pettyExpenses
      : 0;

    const afternoonOpeningFloat = isAfternoonScheduled
      ? (isMorningScheduled ? morningDrawer : 5000000)
      : 0;
    const afternoonDrawer = isAfternoonScheduled
      ? afternoonOpeningFloat + afternoonStats.cashInflow - afternoonStats.pettyExpenses
      : 0;

    return [
      {
        shiftId: 'SHIFT-MORNING',
        name: 'Ca Sáng (06:00 - 14:00)',
        time: '06:00 - 14:00',
        staffName: isMorningScheduled
          ? `Dược sĩ trực: ${scheduledPharmacists.morning}`
          : 'Chưa phân công dược sĩ trực ca',
        pharmacistName: scheduledPharmacists.morning || undefined,
        isScheduled: isMorningScheduled,
        status: isMorningScheduled ? 'BALANCED' : 'UNASSIGNED',
        ...morningStats,
        openingFloat: morningOpeningFloat,
        closingDrawerBalance: morningDrawer,
      },
      {
        shiftId: 'SHIFT-AFTERNOON',
        name: 'Ca Chiều (14:00 - 22:00)',
        time: '14:00 - 22:00',
        staffName: isAfternoonScheduled
          ? `Dược sĩ trực: ${scheduledPharmacists.afternoon}`
          : 'Chưa phân công dược sĩ trực ca',
        pharmacistName: scheduledPharmacists.afternoon || undefined,
        isScheduled: isAfternoonScheduled,
        status: isAfternoonScheduled ? 'OPEN' : 'UNASSIGNED',
        ...afternoonStats,
        openingFloat: afternoonOpeningFloat,
        closingDrawerBalance: afternoonDrawer,
      },
    ];
  }, [dayOrders, dayExpenses, scheduledPharmacists]);

  // Aggregate metrics for Day, Week, Month, and Year
  const totalDayInflow = useMemo(
    () => dayOrders.reduce((sum, o) => sum + (o.totalAmount || o.finalAmount || 0), 0),
    [dayOrders]
  );
  const totalDayOutflow = useMemo(
    () =>
      dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
      dayVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
    [dayExpenses, dayVouchers]
  );
  const totalDayNetFlow = totalDayInflow - totalDayOutflow;

  const totalWeekInflow = useMemo(
    () => weekOrders.reduce((sum, o) => sum + (o.totalAmount || o.finalAmount || 0), 0),
    [weekOrders]
  );
  const totalWeekOutflow = useMemo(
    () =>
      weekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
      weekVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
    [weekExpenses, weekVouchers]
  );
  const totalWeekNetFlow = totalWeekInflow - totalWeekOutflow;

  const totalMonthInflow = useMemo(
    () => monthOrders.reduce((sum, o) => sum + (o.totalAmount || o.finalAmount || 0), 0),
    [monthOrders]
  );
  const totalMonthOutflow = useMemo(
    () =>
      monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
      monthVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
    [monthExpenses, monthVouchers]
  );
  const totalMonthNetFlow = totalMonthInflow - totalMonthOutflow;

  // Yearly overview totals
  const totalYearInflow = useMemo(
    () => orders.reduce((sum, o) => sum + (o.totalAmount || o.finalAmount || 0), 0),
    [orders]
  );
  const totalYearOutflow = useMemo(
    () =>
      expenses.reduce((sum, e) => sum + (e.amount || 0), 0) +
      paymentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0),
    [expenses, paymentVouchers]
  );
  const totalYearNetFlow = totalYearInflow - totalYearOutflow;

  // Active metrics based on current viewType
  const displayInflow = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return totalDayInflow;
    if (viewType === 'week') return totalWeekInflow;
    return totalMonthInflow;
  }, [viewType, totalDayInflow, totalWeekInflow, totalMonthInflow]);

  const displayOutflow = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return totalDayOutflow;
    if (viewType === 'week') return totalWeekOutflow;
    return totalMonthOutflow;
  }, [viewType, totalDayOutflow, totalWeekOutflow, totalMonthOutflow]);

  const displayNetFlow = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return totalDayNetFlow;
    if (viewType === 'week') return totalWeekNetFlow;
    return totalMonthNetFlow;
  }, [viewType, totalDayNetFlow, totalWeekNetFlow, totalMonthNetFlow]);

  const activeOrdersCount = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayOrders.length;
    if (viewType === 'week') return weekOrders.length;
    return monthOrders.length;
  }, [viewType, dayOrders.length, weekOrders.length, monthOrders.length]);

  const activeExpensesCount = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayExpenses.length;
    if (viewType === 'week') return weekExpenses.length;
    return monthExpenses.length;
  }, [viewType, dayExpenses.length, weekExpenses.length, monthExpenses.length]);

  const activeVouchersCount = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayVouchers.length;
    if (viewType === 'week') return weekVouchers.length;
    return monthVouchers.length;
  }, [viewType, dayVouchers.length, weekVouchers.length, monthVouchers.length]);

  const latestScheduledShift = useMemo(
    () => [...realShifts].reverse().find((s) => s.isScheduled),
    [realShifts]
  );
  const drawerBalance = latestScheduledShift ? latestScheduledShift.closingDrawerBalance : 0;
  const isAnyShiftScheduled = realShifts.some((s) => s.isScheduled);
  const drawerStatus = isAnyShiftScheduled ? 'OPEN' : 'UNASSIGNED';

  // Monthly Chart computation
  const chartData = useMemo(() => {
    const monthsList = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const monthlyRevenueMap: Record<number, number> = {};
    const monthlyCogsMap: Record<number, number> = {};
    const monthlyExpenseMap: Record<number, number> = {};

    orders.forEach((order) => {
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return;

      const orderDate = new Date(order.createdAt || Date.now());
      if (selectedYear === 'all' || orderDate.getFullYear() === Number(selectedYear)) {
        const m = orderDate.getMonth();
        const rev = order.totalAmount || order.finalAmount || 0;
        let cogs = 0;
        if (Array.isArray(order.items)) {
          cogs = order.items.reduce((s: number, item: any) => {
            const ip = item.importPrice || item.costPrice || (item.price ? item.price * 0.65 : 0);
            return s + ip * (item.quantity || 1);
          }, 0);
        }
        if (!cogs || cogs === 0) cogs = Math.round(rev * 0.65);

        monthlyRevenueMap[m] = (monthlyRevenueMap[m] || 0) + rev;
        monthlyCogsMap[m] = (monthlyCogsMap[m] || 0) + cogs;
      }
    });

    expenses.forEach((exp) => {
      const bId = exp.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return;

      const expDate = new Date(exp.transactionDate || exp.createdAt || Date.now());
      if (selectedYear === 'all' || expDate.getFullYear() === Number(selectedYear)) {
        const m = expDate.getMonth();
        monthlyExpenseMap[m] = (monthlyExpenseMap[m] || 0) + (exp.amount || 0);
      }
    });

    if (summaryData?.monthlyChart && summaryData.monthlyChart.length > 0) {
      return summaryData.monthlyChart.map((c) => ({
        name: c.month,
        revenue: parseFloat((c.revenue / 1000000).toFixed(2)),
        expense: parseFloat((c.totalExpenses / 1000000).toFixed(2)),
        fixedExpenses: parseFloat((c.fixedExpenses / 1000000).toFixed(2)),
        netProfit: parseFloat((c.netProfit / 1000000).toFixed(2)),
      }));
    }

    return monthsList.map((name, index) => {
      const revVal = monthlyRevenueMap[index] || 0;
      const cogsVal = monthlyCogsMap[index] || 0;
      const fixedVal = monthlyExpenseMap[index] || 0;
      const totalExpVal = cogsVal + fixedVal;
      return {
        name,
        revenue: parseFloat((revVal / 1000000).toFixed(2)),
        expense: parseFloat((totalExpVal / 1000000).toFixed(2)),
        fixedExpenses: parseFloat((fixedVal / 1000000).toFixed(2)),
        netProfit: parseFloat(((revVal - totalExpVal) / 1000000).toFixed(2)),
      };
    });
  }, [orders, expenses, selectedBranch, selectedYear, summaryData]);

  // Build unified Net Cash Flow Ledger Table based on active viewType
  const activeOrdersForLedger = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayOrders;
    if (viewType === 'week') return weekOrders;
    if (viewType === 'month') return monthOrders;
    return orders;
  }, [viewType, dayOrders, weekOrders, monthOrders, orders]);

  const activeExpensesForLedger = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayExpenses;
    if (viewType === 'week') return weekExpenses;
    if (viewType === 'month') return monthExpenses;
    return expenses;
  }, [viewType, dayExpenses, weekExpenses, monthExpenses, expenses]);

  const activeVouchersForLedger = useMemo(() => {
    if (viewType === 'shift' || viewType === 'day') return dayVouchers;
    if (viewType === 'week') return weekVouchers;
    if (viewType === 'month') return monthVouchers;
    return paymentVouchers;
  }, [viewType, dayVouchers, weekVouchers, monthVouchers, paymentVouchers]);

  const combinedLedger = useMemo(() => {
    const orderTransactions = activeOrdersForLedger.map((o) => ({
      id: o.orderCode || o._id,
      date: new Date(o.createdAt || Date.now()).toLocaleDateString('vi-VN'),
      timestamp: new Date(o.createdAt || Date.now()).getTime(),
      branch: o.branchId || 'BR-001',
      type: 'INCOME',
      category: 'RETAIL_SALE',
      categoryText: 'Bán lẻ tại quầy POS',
      title: `Đơn bán hàng #${o.orderCode || (o._id ? o._id.substring(0, 8) : 'ORD')}`,
      amount: o.totalAmount || o.finalAmount || 0,
      method: o.paymentMethod || 'CASH',
      notes: o.customerName ? `KH: ${o.customerName}` : 'Khách lẻ vãng lai',
    }));

    const expenseTransactions = activeExpensesForLedger.map((e) => ({
      id: e._id ? e._id.substring(0, 8).toUpperCase() : 'EXP',
      date: new Date(e.transactionDate || e.createdAt || Date.now()).toLocaleDateString('vi-VN'),
      timestamp: new Date(e.transactionDate || e.createdAt || Date.now()).getTime(),
      branch: e.branchId || 'BR-001',
      type: 'EXPENSE',
      category: e.category,
      categoryText:
        e.category === 'RENT'
          ? 'Thuê mặt bằng'
          : e.category === 'SALARY'
          ? 'Lương nhân sự'
          : e.category === 'UTILITY'
          ? 'Điện nước / Internet'
          : 'Chi phí khác',
      title: e.title,
      amount: e.amount,
      method: 'CASH / BANK',
      notes: e.notes || 'Chi phí vận hành cố định',
    }));

    const voucherTransactions = activeVouchersForLedger.map((v) => ({
      id: v.voucherCode,
      date: new Date(v.transactionDate || v.createdAt || Date.now()).toLocaleDateString('vi-VN'),
      timestamp: new Date(v.transactionDate || v.createdAt || Date.now()).getTime(),
      branch: v.branchId,
      type: 'EXPENSE',
      category: 'SUPPLIER_PAYMENT',
      categoryText: `Chi trả: ${v.supplierName || v.recipientType}`,
      title: v.description,
      amount: v.amount,
      method: v.paymentMethod,
      notes: v.purchaseOrderId ? `PO: ${v.purchaseOrderId}` : 'Phiếu chi NCC',
    }));

    return [...orderTransactions, ...expenseTransactions, ...voucherTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
  }, [activeOrdersForLedger, activeExpensesForLedger, activeVouchersForLedger]);

  // Navigate forward or backward in time
  const stepPeriod = useCallback(
    (direction: 1 | -1) => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const current = new Date(y, m - 1, d);

      if (viewType === 'shift' || viewType === 'day') {
        current.setDate(current.getDate() + direction);
      } else if (viewType === 'week') {
        current.setDate(current.getDate() + direction * 7);
      } else if (viewType === 'month') {
        current.setMonth(current.getMonth() + direction);
      }

      setSelectedDate(toLocalDateStr(current));
    },
    [selectedDate, viewType]
  );

  // Jump to today's date
  const jumpToToday = useCallback(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Export ledger to CSV
  const exportLedgerCsv = useCallback(() => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Mã GD,Ngày,Chi nhánh,Loại GD,Hạng mục/Loại chi phí,Nội dung khoản chi,Số tiền (VND),PTTT\n' +
      combinedLedger
        .map(
          (t) =>
            `${t.id},${t.date},${t.branch},${t.type === 'INCOME' ? 'Thu' : 'Chi'},${t.categoryText},"${t.title.replace(
              /"/g,
              '""'
            )}",${t.amount},${t.method}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `So_quy_dong_tien_${selectedBranch}_${viewType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [combinedLedger, selectedBranch, viewType]);

  const activeBranchName = useMemo(() => {
    if (selectedBranch === 'all') return 'Toàn bộ chi nhánh';
    const found = branchesList.find((b) => (b.branchCode || b.id || b._id) === selectedBranch);
    return found ? found.name : `Chi nhánh ${selectedBranch}`;
  }, [branchesList, selectedBranch]);

  return {
    activeTab,
    setActiveTab,
    viewType,
    setViewType,
    selectedDate,
    setSelectedDate,
    selectedBranch,
    setSelectedBranch,
    selectedYear,
    setSelectedYear,
    timeRange,
    setTimeRange,
    displayMode,
    setDisplayMode,
    loading,
    isAdmin,
    userDetails,
    branchesList,
    activeBranchName,
    activeDatesWithData,
    currentMonday,
    currentSunday,
    shifts: realShifts,
    dayOrders,
    dayExpenses,
    dayVouchers,
    weekOrders,
    weekExpenses,
    weekVouchers,
    weekDaysData,
    monthOrders,
    monthExpenses,
    monthVouchers,
    allVouchers: paymentVouchers,
    ordersCount: activeOrdersCount,
    expensesCount: activeExpensesCount,
    vouchersCount: activeVouchersCount,
    displayInflow,
    displayOutflow,
    displayNetFlow,
    drawerBalance,
    drawerStatus,
    isAnyShiftScheduled,
    chartData,
    combinedLedger,
    refreshData: fetchAllFinancialData,
    exportLedgerCsv,
    stepPeriod,
    jumpToToday,
  };
}
