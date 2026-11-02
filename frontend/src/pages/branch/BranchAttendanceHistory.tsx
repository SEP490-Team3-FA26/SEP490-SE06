import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { hrService, BranchAttendanceRecord, AttendanceHistorySummary } from '../../services/hr/hr.service';

export const BranchAttendanceHistory: React.FC = () => {
  // Lấy ngày đầu tháng và ngày hôm nay làm mặc định
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
    onLeaveCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const pageSize = 15;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => {
      setToastMsg(null);
    }, 4000);
  };

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

  // Tải dữ liệu lịch sử điểm danh
  const fetchAttendanceHistory = useCallback(async (page: number = 1) => {
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
  }, [startDate, endDate, selectedEmployeeId, selectedStatus]);

  useEffect(() => {
    fetchAttendanceHistory(1);
  }, [fetchAttendanceHistory]);

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

  // Các nút chọn nhanh khoảng thời gian
  const handleQuickSelect = (type: 'today' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (type === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'last7') {
      const start = new Date(now);
      start.setDate(d - 6);
      setStartDate(formatDate(start));
      setEndDate(formatDate(now));
    } else if (type === 'thisMonth') {
      const start = new Date(y, m, 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(now));
    } else if (type === 'lastMonth') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
    }
  };

  // Xuất file Excel / CSV UTF-8 phục vụ kế toán và đối soát
  const handleExportExcel = () => {
    if (!records || records.length === 0) {
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
      'Trạng Thái',
      'Biên Bản Bàn Giao Ca',
      'Cảnh Báo Mock GPS',
      'Ghi Chú',
    ];

    const getStatusText = (st: string) => {
      switch (st) {
        case 'CHECKED_IN': return 'Đang trực';
        case 'COMPLETED': return 'Hoàn thành';
        case 'LATE': return 'Đi muộn';
        case 'ON_LEAVE_PAID': return 'Nghỉ phép có lương';
        case 'ON_LEAVE_UNPAID': return 'Nghỉ phép không lương';
        case 'ABSENT': return 'Vắng mặt';
        default: return st;
      }
    };

    const rows = records.map((r, idx) => {
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
        `"${getStatusText(r.status)}"`,
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
    link.setAttribute('download', `Bao_Cao_Diem_Danh_Chi_Nhanh_${startDate}_den_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'Đã xuất file báo cáo điểm danh chi nhánh thành công');
  };

  // Định dạng thời lượng
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
          {toastMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Lịch Sử Điểm Danh & Chấm Công Chi Nhánh
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Tra cứu toàn bộ phiên ca làm việc, thời gian Check-in / Check-out và xác thực tọa độ GPS của nhân sự
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAttendanceHistory(currentPage)}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            title="Tải lại dữ liệu"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Báo Cáo Excel
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng lượt điểm danh */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng lượt ghi nhận
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.totalRecords}</span>
            <span className="text-xs text-slate-500">lượt chấm công</span>
          </div>
        </div>

        {/* Card 2: Đang trong ca trực */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Đang trong ca trực
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{summary.inProgressCount}</span>
            <span className="text-xs text-slate-500">chưa check-out</span>
          </div>
        </div>

        {/* Card 3: Hoàn thành ca trực */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Hoàn thành ca trực
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{summary.completedCount}</span>
            <span className="text-xs text-slate-500">ca đã tan ca</span>
          </div>
        </div>

        {/* Card 4: Đi muộn & Nghỉ phép */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Đi muộn / Nghỉ phép
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-amber-700">{summary.lateCount}</span>
              <span className="text-xs text-slate-500 ml-1">muộn</span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-2xl font-bold text-purple-700">{summary.onLeaveCount}</span>
              <span className="text-xs text-slate-500 ml-1">phép</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        {/* Quick select date buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Chọn nhanh:</span>
          <button
            type="button"
            onClick={() => handleQuickSelect('today')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('last7')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            7 ngày qua
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('thisMonth')}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-md transition-colors"
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('lastMonth')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            Tháng trước
          </button>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Từ ngày */}
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

          {/* Đến ngày */}
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

          {/* Nhân viên */}
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

          {/* Trạng thái */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CHECKED_IN">Đang trực</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="LATE">Đi muộn</option>
              <option value="ON_LEAVE_PAID">Nghỉ phép (Có lương)</option>
              <option value="ON_LEAVE_UNPAID">Nghỉ phép (Không lương)</option>
            </select>
          </div>

          {/* Nút hành động */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              Lọc
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm transition-colors"
              title="Đặt lại bộ lọc"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ghi Chú</th>
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
                      <span className="text-xs text-slate-400">Vui lòng thay đổi khoảng thời gian hoặc điều kiện lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((item) => {
                  const checkInDate = item.checkInTime ? new Date(item.checkInTime) : null;
                  const checkOutDate = item.checkOutTime ? new Date(item.checkOutTime) : null;
                  const durationStr = formatDuration(item.durationMinutes);

                  // Badge trạng thái
                  let badgeBg = 'bg-slate-100 text-slate-700';
                  let badgeText: string = item.status;
                  const isShiftEnded = item.status === 'COMPLETED' || !!item.checkOutTime || !!item.isHandoverSubmitted;

                  if (isShiftEnded) {
                    badgeBg = 'bg-blue-50 text-blue-700 border border-blue-200';
                    badgeText = item.status === 'LATE' ? 'Đi muộn (Đã tan ca)' : 'Hoàn thành';
                  } else if (item.status === 'CHECKED_IN') {
                    badgeBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    badgeText = 'Đang trực';
                  } else if (item.status === 'LATE') {
                    badgeBg = 'bg-amber-50 text-amber-700 border border-amber-200';
                    badgeText = 'Đi muộn (Đang trực)';
                  } else if (item.status === 'ON_LEAVE_PAID') {
                    badgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                    badgeText = 'Nghỉ phép (Có lương)';
                  } else if (item.status === 'ON_LEAVE_UNPAID') {
                    badgeBg = 'bg-purple-50 text-purple-700 border border-purple-200';
                    badgeText = 'Nghỉ phép (K.lương)';
                  }

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/75 transition-colors">
                      {/* Ngày & Ca */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.date}</div>
                        <div className="text-xs text-emerald-700 font-medium mt-0.5">
                          {item.shiftName || 'Ca làm việc'}
                        </div>
                      </td>

                      {/* Nhân Viên */}
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

                      {/* Check-in */}
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

                      {/* Check-out */}
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
                            <div className="text-xs text-slate-400">
                              {new Date(item.updatedAt || item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : item.checkInTime ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                            Đang trong ca trực...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Thời Lượng */}
                      <td className="py-3 px-4">
                        {durationStr ? (
                          <span className="font-medium text-slate-800">{durationStr}</span>
                        ) : item.isHandoverSubmitted ? (
                          <span className="text-xs text-slate-600 font-medium">Đã đóng ca</span>
                        ) : item.checkInTime ? (
                          <span className="text-xs text-slate-500">Đang trực</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Bàn Giao Ca */}
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

                      {/* Trạng Thái */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${badgeBg}`}>
                          {badgeText}
                        </span>
                      </td>

                      {/* Ghi Chú */}
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-xs text-slate-600 truncate block" title={item.note || ''}>
                          {item.note || '-'}
                        </span>
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
              className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className="p-1.5 border border-slate-300 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchAttendanceHistory;
