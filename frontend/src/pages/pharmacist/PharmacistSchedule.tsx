import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { hrService, WorkSchedule, WorkShift } from "../../services/hr/hr.service";
import { authService } from "../../services/auth/auth.service";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  ArrowRightLeft,
  Send,
  UserCheck,
  ShieldCheck,
  Info,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import { employeeService, StaffTransferRequest } from "../../services/admin/employee.service";

function getMonday(d: Date) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEmployeeName(fullName: string) {
  if (!fullName) return "";
  const clean = fullName.replace(/\s*\([^)]*\)/g, "").trim();
  return clean || fullName;
}

function getInitials(name: string) {
  if (!name) return "DS";
  const words = name.trim().split(" ");
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getIsoDateStr(d: any): string {
  if (!d) return "";
  if (typeof d === "string") {
    return d.split("T")[0];
  }
  if (d instanceof Date) {
    return formatDate(d);
  }
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

// Helper nhan dien thong tin nghi phep tu ghi chu
export const getLeaveDetails = (note?: string) => {
  if (!note || !note.includes('[NGHỈ PHÉP')) return null;
  if (note.includes('ANNUAL_PAID')) return { label: 'Phép năm (Có lương)', shortLabel: 'Phép năm', type: 'ANNUAL_PAID' };
  if (note.includes('SICK_LEAVE')) return { label: 'Nghỉ ốm (BHXH)', shortLabel: 'Ốm BHXH', type: 'SICK_LEAVE' };
  if (note.includes('UNPAID')) return { label: 'Nghỉ không lương', shortLabel: 'Không lương', type: 'UNPAID' };
  if (note.includes('SPECIAL_PAID')) return { label: 'Nghỉ việc riêng', shortLabel: 'Việc riêng', type: 'SPECIAL_PAID' };
  return { label: 'Đã nghỉ phép', shortLabel: 'Nghỉ phép', type: 'OTHER' };
};

export function PharmacistSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTransfers, setPendingTransfers] = useState<StaffTransferRequest[]>([]);
  const [respondingTransferId, setRespondingTransferId] = useState<string | null>(null);
  const [conflictModalData, setConflictModalData] = useState<{
    requestId: string;
    upcomingShifts: any[];
  } | null>(null);
  const navigate = useNavigate();

  const getUserInfo = () => {
    const userObj = authService.getCurrentUser();
    let id = userObj?.id || userObj?._id || '';
    let name = userObj?.fullName || userObj?.name || '';

    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        if (!id) id = decoded.sub || "";
        if (!name) name = decoded.fullName || decoded.name || "";
      } catch {
        // Ignored
      }
    }
    return { id, name };
  };
  const { id: userId, name: userName } = getUserInfo();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, shRes, transferRes] = await Promise.allSettled([
        hrService.getMyWeekSchedule(currentWeekStart),
        hrService.listShifts(),
        employeeService.getTransferRequests({ status: 'pending' })
      ]);

      if (schedRes.status === 'fulfilled') {
        let schedData: any = schedRes.value;
        if (typeof schedData === "string") {
          try {
            schedData = JSON.parse(schedData);
          } catch {
            schedData = null;
          }
        }
        setSchedule(schedData);
      }

      if (shRes.status === 'fulfilled') {
        const sh = shRes.value;
        setShifts(Array.isArray(sh) ? sh.filter(s => s.isActive) : []);
      }

      if (transferRes.status === 'fulfilled') {
        setPendingTransfers(transferRes.value || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondTransfer = async (
    requestId: string,
    action: 'approve' | 'reject',
    scheduleResolution?: 'cancel_upcoming_shifts' | 'defer'
  ) => {
    try {
      setRespondingTransferId(requestId);
      const res = await employeeService.respondTransferRequest(requestId, { action, scheduleResolution });
      if (res?.hasConflict || res?.code === 'HAS_UPCOMING_SHIFTS' || (res?.upcomingShifts && res.upcomingShifts.length > 0)) {
        setConflictModalData({
          requestId,
          upcomingShifts: res.upcomingShifts || [],
        });
        return;
      }

      setConflictModalData(null);
      if (scheduleResolution === 'defer') {
        alert('Đã tạm hoãn chuyển cơ sở! Bạn sẽ tiếp tục hoàn thành các ca trực tuần này tại cơ sở hiện tại trước khi chuyển giao.');
      } else {
        alert(action === 'approve' ? 'Đã đồng ý tiếp nhận điều chuyển công tác sang cơ sở mới' : 'Đã từ chối yêu cầu điều chuyển');
        setPendingTransfers(prev => prev.filter(req => req._id !== requestId));
        if (action === 'approve') {
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (err: any) {
      const resData = err?.response?.data;
      const errMsg = typeof resData === 'string' ? resData : resData?.message;
      const isConflict = resData?.code === 'HAS_UPCOMING_SHIFTS' || 
                         resData?.hasConflict || 
                         (typeof errMsg === 'string' && (errMsg.includes('ca truc') || errMsg.includes('lich lam viec')));

      if (isConflict) {
        setConflictModalData({
          requestId,
          upcomingShifts: resData?.upcomingShifts || [],
        });
        return;
      }
      alert(errMsg || 'Có lỗi xảy ra khi xử lý yêu cầu');
    } finally {
      setRespondingTransferId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const changeWeek = (offset: number) => {
    const [year, month, day] = currentWeekStart.split('-').map(Number);
    const d = new Date(year, month - 1, day + offset * 7);
    setCurrentWeekStart(formatDate(d));
  };

  const goToToday = () => {
    setCurrentWeekStart(formatDate(getMonday(new Date())));
  };

  const getWeekDays = (start: string) => {
    const days: Date[] = [];
    const [year, month, day] = start.split('-').map(Number);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(year, month - 1, day + i));
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);
  const todayStr = formatDate(new Date());
  const isPublished = schedule?.status === 'published';

  // Co che phong thu: Tu dong trich xuat ca lam viec tu chinh phan cong neu shifts rong
  const effectiveShifts: WorkShift[] = useMemo(() => {
    if (shifts.length > 0) return shifts;
    if (!schedule?.assignments || schedule.assignments.length === 0) return [];

    const shiftMap = new Map<string, WorkShift>();
    schedule.assignments.forEach((a) => {
      const sId = a.shiftId || 'default-shift';
      if (!shiftMap.has(sId)) {
        shiftMap.set(sId, {
          _id: sId,
          branchId: schedule.branchId || '',
          name: a.shiftName || 'Ca làm việc',
          startTime: a.shiftStart || '06:00',
          endTime: a.shiftEnd || '14:00',
          color: '#0057cd',
          isActive: true,
        });
      }
    });
    return Array.from(shiftMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [shifts, schedule]);

  // Thong ke so ca truc cua chinh duoc si trong tuan (khop theo userId hoac userName)
  const myAllAssignments = (schedule?.assignments || []).filter(
    a => (userId && String(a.employeeId) === String(userId)) || (userName && a.employeeName === userName)
  );
  const myActiveShiftsCount = myAllAssignments.filter(a => !getLeaveDetails(a.note)).length;
  const myLeaveShiftsCount = myAllAssignments.filter(a => !!getLeaveDetails(a.note)).length;

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      {/* 1. Header Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lịch Trực Cá Nhân</h1>
            <p className="text-slate-500 text-sm mt-0.5">Theo dõi lịch phân công ca làm việc và gửi yêu cầu đổi ca</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {schedule && (
            <div className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 border ${
              isPublished 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isPublished ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {isPublished ? "Lịch Đã Được Công Bố" : "Bản Nháp (Chưa Công Bố)"}
            </div>
          )}
        </div>
      </div>

      {/* Banner Thong bao Yeu cau Dieu chuyen Cong tac */}
      {pendingTransfers.length > 0 && (
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-[#0057cd] text-white rounded-xl shadow-xs mt-0.5">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-blue-950 text-base">Thông Báo Điều Chuyển Cơ Sở Công Tác</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-[#0057cd] rounded-full">
                  {pendingTransfers.length} yêu cầu
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Bạn nhận được yêu cầu tiếp nhận điều chuyển sang làm việc tại chi nhánh:{" "}
                <span className="font-semibold text-slate-800">
                  {pendingTransfers[0].toBranchName || pendingTransfers[0].toBranchId || pendingTransfers[0].targetBranchName || pendingTransfers[0].targetBranchId}
                </span>
                {pendingTransfers[0].note && (
                  <span className="italic text-slate-500 block text-xs mt-0.5">
                    Ghi chú: "{pendingTransfers[0].note}"
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={() => handleRespondTransfer(pendingTransfers[0]._id, 'reject')}
              disabled={respondingTransferId === pendingTransfers[0]._id}
              className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <X size={15} />
              Từ chối
            </button>
            <button
              onClick={() => handleRespondTransfer(pendingTransfers[0]._id, 'approve')}
              disabled={respondingTransferId === pendingTransfers[0]._id}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0057cd] hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={15} />
              Đồng ý chuyển cơ sở
            </button>
          </div>
        </div>
      )}

      {/* 2. Control Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#0057cd] bg-slate-100 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
          >
            Hôm nay
          </button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => changeWeek(-1)} 
              title="Tuần trước"
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => changeWeek(1)} 
              title="Tuần sau"
              className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 font-bold text-slate-800 text-sm md:text-base">
            <span className="text-slate-500 font-medium">Tuần:</span>
            <span>{formatDate(weekDays[0])}</span>
            <span className="text-slate-400">→</span>
            <span>{formatDate(weekDays[6])}</span>
          </div>
        </div>

        {/* Pharmacist Stats & CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100 text-[#0057cd] font-semibold text-xs">
            <Briefcase size={14} />
            <span>
              Bạn có <strong className="font-bold text-slate-900">{myActiveShiftsCount} ca</strong> trực tuần này
              {myLeaveShiftsCount > 0 && (
                <span className="text-amber-700 ml-1.5 font-medium">
                  ({myLeaveShiftsCount} ca đã duyệt nghỉ)
                </span>
              )}
            </span>
          </div>

          <button
            onClick={() => navigate('/pharmacist/shift-swaps')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <RefreshCw size={13} />
            Đổi ca trực
          </button>
        </div>
      </div>

      {/* Draft Notification Alert if not published */}
      {!isPublished && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong className="font-bold">Lưu ý:</strong> Lịch làm việc tuần này đang ở trạng thái <em>Bản Nháp</em> và chưa được Quản lý chi nhánh công bố chính thức. Các ca trực có thể sẽ có sự thay đổi.
          </div>
        </div>
      )}

      {/* 3. Schedule Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
          <span className="mt-4 text-sm font-semibold text-slate-500">Đang tải lịch trực tuần...</span>
        </div>
      ) : effectiveShifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu ca trực</h3>
          <p className="text-sm text-slate-500 mt-1">Chi nhánh chưa cấu hình ca làm việc.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1180px] table-fixed">
              <colgroup>
                <col className="w-28" />
                {weekDays.map(d => (
                  <col key={d.toISOString()} className="w-[calc((100%-7rem)/7)] min-w-[145px]" />
                ))}
              </colgroup>

              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      Ca / Ngày
                    </div>
                  </th>
                  {weekDays.map(d => {
                    const isToday = formatDate(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th 
                        key={d.toISOString()} 
                        className={`p-2.5 border-r border-slate-200 last:border-r-0 text-center transition-colors ${
                          isToday ? 'bg-blue-50/70 border-b-2 border-b-[#0057cd]' : isWeekend ? 'bg-slate-100/50' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className={`text-xs font-extrabold uppercase tracking-wider ${isToday ? 'text-[#0057cd]' : 'text-slate-700'}`}>
                            {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-sm font-bold ${isToday ? 'text-[#0057cd]' : 'text-slate-900'}`}>
                              {d.getDate()}/{d.getMonth() + 1}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#0057cd] text-white rounded-md">
                                Hôm nay
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {effectiveShifts.map(shift => (
                  <tr key={shift._id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-2 border-r border-slate-200 bg-slate-50/30 align-top">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: shift.color || '#0057cd' }}
                        ></div>
                        <span className="font-semibold text-slate-800 text-xs tracking-tight truncate">
                          {shift.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal pl-3.5 whitespace-nowrap">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </td>

                    {weekDays.map(d => {
                      const targetDateStr = formatDate(d);
                      const cellAssignments = (schedule?.assignments || []).filter(
                        a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id
                      );
                      const isToday = targetDateStr === todayStr;

                      if (cellAssignments.length === 0) {
                        return (
                          <td 
                            key={d.toISOString()} 
                            className={`p-2 border-r border-slate-100 last:border-r-0 align-middle h-24 text-center ${
                              isToday ? 'bg-blue-50/15' : ''
                            }`}
                          >
                            <span className="text-xs text-slate-300 font-medium">Trống</span>
                          </td>
                        );
                      }

                      return (
                        <td 
                          key={d.toISOString()} 
                          className={`p-1.5 border-r border-slate-100 last:border-r-0 align-top min-h-[80px] relative transition-colors ${
                            isToday ? 'bg-blue-50/15' : ''
                          }`}
                        >
                          <div className="flex flex-col gap-1.5 min-h-[72px]">
                            {cellAssignments.map(assignment => {
                              const isMine = (userId && String(assignment.employeeId) === String(userId)) || (userName && assignment.employeeName === userName);
                              const leaveInfo = getLeaveDetails(assignment.note);
                              const isLeave = Boolean(leaveInfo);

                              return (
                                <div 
                                  key={assignment.employeeId + '_' + assignment.shiftId}
                                  className={`p-2 rounded-xl flex flex-col justify-between border shadow-2xs transition-all relative overflow-hidden ${
                                    isLeave
                                      ? isMine
                                        ? 'bg-amber-50/80 border-amber-300 border-dashed ring-2 ring-amber-400/30'
                                        : 'bg-slate-100/70 border-slate-300 border-dashed opacity-75'
                                      : isMine 
                                        ? 'bg-blue-50/80 border-[#0057cd]/50 ring-2 ring-[#0057cd]/20' 
                                        : 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                                  }`}
                                >
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1" 
                                    style={{ backgroundColor: isLeave ? '#f59e0b' : isMine ? '#0057cd' : (shift.color || '#94a3b8') }}
                                  ></div>

                                  <div className="pl-1.5 pr-2 min-w-0">
                                    <div 
                                      className={`text-xs font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                                        isLeave ? 'text-slate-500 line-through' : 'text-slate-700'
                                      }`}
                                      title={assignment.employeeName}
                                    >
                                      {formatEmployeeName(assignment.employeeName)}
                                    </div>
                                    <div className="text-[10px] font-normal mt-0.5 flex flex-wrap gap-1 items-center">
                                      {isLeave ? (
                                        <span className={`px-1.5 py-0.2 rounded font-bold border ${
                                          isMine
                                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                                            : 'bg-slate-200 text-slate-700 border-slate-300'
                                        }`}>
                                          Đã nghỉ: {leaveInfo?.shortLabel}
                                        </span>
                                      ) : isMine ? (
                                        <span className="text-[#0057cd] font-semibold px-1.5 py-0.2 bg-blue-100/60 rounded">Ca của bạn</span>
                                      ) : (
                                        <span className="text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded">Nhân sự trực</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Shift Swap Action (Chi cho phep doi ca khi khong phai ca da nghi phep) */}
                                  {isMine && isPublished && !isLeave && (
                                    <div className="pt-1.5 pl-1.5">
                                      <button 
                                        onClick={() => navigate('/pharmacist/shift-swaps')}
                                        className="w-full py-0.5 px-1.5 text-[10px] uppercase font-bold text-[#0057cd] hover:text-white bg-white hover:bg-[#0057cd] border border-blue-200 rounded-lg flex items-center justify-center gap-1 transition-all shadow-2xs"
                                      >
                                        <RefreshCw size={10} /> Đổi ca
                                      </button>
                                    </div>
                                  )}

                                  {isMine && isLeave && (
                                    <div className="pt-1 pl-1.5">
                                      <span className="text-[9px] text-amber-700 italic">Đã duyệt nghỉ phép</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Shift Swap Guide & Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Cot 1: Chu thich hien thi & Y nghia ca truc */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
                <Info size={18} />
              </div>
              <h3>Chú Thích Lịch Trực</h3>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/70 border border-[#0057cd]/30">
                <div className="w-3 h-3 rounded-full bg-[#0057cd] mt-0.5 shrink-0 ring-4 ring-blue-100"></div>
                <div>
                  <div className="font-bold text-slate-900">Ca của bạn (Được phân công)</div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Khung giờ bạn có nhiệm vụ trực. Bấm nút <strong>"Đổi ca"</strong> trực tiếp trên ô để gửi yêu cầu đổi ca cho đồng nghiệp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-3 h-3 rounded-full bg-slate-400 mt-0.5 shrink-0"></div>
                <div>
                  <div className="font-bold text-slate-900">Nhân sự trực (Đồng nghiệp)</div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Ca làm việc của đồng nghiệp khác trong chi nhánh. Bạn có thể chọn hoán đổi với các ca này.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
                <div className="w-3 h-3 rounded-full border border-slate-300 mt-0.5 shrink-0"></div>
                <div>
                  <div className="font-bold text-slate-700">Ô Trống</div>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Khung giờ chưa xếp nhân sự hoặc ca nghỉ của chi nhánh.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/pharmacist/shift-swaps')}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0057cd] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-200"
            >
              <ArrowRightLeft size={14} />
              Xem danh sách yêu cầu đổi ca
            </button>
          </div>
        </div>

        {/* Cot 2 & 3: Luong quy trinh doi ca 3 buoc & Quy dinh */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ArrowRightLeft size={18} />
              </div>
              <h3>Quy Trình & Luồng Đổi Ca Trực (3 Bước)</h3>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
              {/* Buoc 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0057cd] font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <Send size={15} className="text-[#0057cd]" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-1">Tạo yêu cầu đổi ca</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Chọn ca của bạn muốn đổi đi, chọn dược sĩ đồng nghiệp và ca của họ muốn nhận lại, nhập lý do rồi gửi.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] font-semibold text-amber-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Trạng thái: Chờ đối phương
                </div>
              </div>

              {/* Buoc 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <UserCheck size={15} className="text-amber-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-1">Đồng nghiệp xác nhận</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Hệ thống gửi chuông thông báo đến đồng nghiệp. Họ vào trang Đổi ca để bấm <strong>Đồng ý</strong> hoặc <strong>Từ chối</strong>.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] font-semibold text-blue-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Trạng thái: Chờ Quản lý duyệt
                </div>
              </div>

              {/* Buoc 3 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <ShieldCheck size={15} className="text-emerald-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-1">Quản lý chi nhánh duyệt</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Quản lý chi nhánh xem xét và phê duyệt chính thức. Sau khi duyệt, hệ thống tự động hoán đổi lịch trực trên bảng tuần.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Trạng thái: Đã duyệt hoàn tất
                </div>
              </div>
            </div>

            {/* Quy tac quan trong */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle size={15} className="text-amber-600" />
                Quy định & Ràng buộc đổi ca trực:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-900/90">
                <li>
                  <strong>Chỉ đổi chéo cùng vai trò:</strong> Dược sĩ chỉ được đổi ca với Dược sĩ khác cùng chi nhánh. Hệ thống sẽ chặn đổi chéo với Quản lý.
                </li>
                <li>
                  <strong>Lịch tuần đã công bố:</strong> Chỉ có thể tạo yêu cầu đổi ca đối với các tuần làm việc đã được Quản lý chi nhánh công bố chính thức.
                </li>
                <li>
                  <strong>Thông báo tự động:</strong> Mọi biến động (gửi yêu cầu, đồng nghiệp phản hồi, quản lý duyệt) đều được gửi thông báo trực tiếp qua quả chuông hệ thống.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xu Ly Xung Dot Lich Truc Khi Duoc Si Chap Thuan Dieu Chuyen */}
      {conflictModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-amber-100 bg-amber-50/70 flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-950 text-base">Bạn Đang Có Ca Trực Chưa Hoàn Thành</h3>
                  <p className="text-xs text-amber-800 mt-1 leading-normal">
                    Bạn hiện đang có <strong>{conflictModalData.upcomingShifts.length} ca trực sắp tới</strong> trong lịch làm việc tại chi nhánh hiện tại.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConflictModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Danh sách ca trực sắp tới tại cơ sở hiện tại:
              </div>

              <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                {conflictModalData.upcomingShifts.map((sh, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800">{sh.dateStr} • {sh.shiftName}</div>
                    <span className="text-slate-500">{sh.shiftStart} - {sh.shiftEnd}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-600 leading-normal">
                Vui lòng chọn cách xử lý để hoàn tất việc chuyển giao cơ sở làm việc mới:
              </div>

              {/* 2 Lựa chọn */}
              <div className="space-y-3 pt-1">
                {/* Lựa chọn 1 */}
                <button
                  disabled={respondingTransferId === conflictModalData.requestId}
                  onClick={() => handleRespondTransfer(conflictModalData.requestId, 'approve', 'defer')}
                  className="w-full text-left p-3.5 border-2 border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="font-bold text-blue-900 text-xs flex items-center justify-between">
                    <span>Lựa chọn 1: Tạm thời chưa chuyển (Chờ xong hết lịch)</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">Khuyên dùng</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-normal">
                    Tiếp tục trực và hoàn thành nốt các ca trực tuần này tại cơ sở hiện tại trước khi chính thức chuyển giao.
                  </div>
                </button>

                {/* Lựa chọn 2 */}
                <button
                  disabled={respondingTransferId === conflictModalData.requestId}
                  onClick={() => handleRespondTransfer(conflictModalData.requestId, 'approve', 'cancel_upcoming_shifts')}
                  className="w-full text-left p-3.5 border-2 border-rose-200 hover:border-rose-500 bg-rose-50/30 hover:bg-rose-50 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="font-bold text-rose-900 text-xs flex items-center justify-between">
                    <span>Lựa chọn 2: Hủy tất cả lịch sắp tới & Chuyển ngay</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">Chuyển ngay</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-normal">
                    Tự động hủy {conflictModalData.upcomingShifts.length} ca trực sắp tới tại cơ sở cũ, hủy các đơn đổi ca pending và chuyển tài khoản sang chi nhánh mới ngay lập tức.
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                disabled={respondingTransferId === conflictModalData.requestId}
                onClick={() => setConflictModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
