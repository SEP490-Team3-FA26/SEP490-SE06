import React, { useState, useEffect } from "react";
import { hrService, WorkSchedule, WorkShift, WorkScheduleAssignment } from "../../services/hr/hr.service";
import { employeeService, Employee } from "../../services/admin/employee.service";
import { authService } from "../../services/auth/auth.service";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  X, 
  Users, 
  Briefcase,
  AlertCircle
} from "lucide-react";

// Utilities
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
  if (!name) return "NV";
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

interface AssignModalState {
  isOpen: boolean;
  date: Date | null;
  shift: WorkShift | null;
}

export function BranchSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");
  const [assignModal, setAssignModal] = useState<AssignModalState>({
    isOpen: false,
    date: null,
    shift: null,
  });
  
  // Lấy chi nhánh an toàn từ localStorage hoặc authService
  const getBranchId = () => {
    const directBranchId = localStorage.getItem("branchId");
    if (directBranchId) return directBranchId;

    const userObj = authService.getCurrentUser();
    if (userObj?.branchId) return userObj.branchId;

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
        return decoded.branchId || "BR-001";
      } catch {
        return "BR-001";
      }
    }
    return "BR-001";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const branchId = getBranchId();
      const [sched, sh, emps] = await Promise.all([
        hrService.getWeekSchedule(currentWeekStart),
        hrService.listShifts(),
        employeeService.getEmployees({ branchId })
      ]);
      let schedData: any = sched;
      if (typeof schedData === "string") {
        try {
          schedData = JSON.parse(schedData);
        } catch {
          schedData = null;
        }
      }
      setSchedule(schedData || { branchId, weekStart: currentWeekStart, status: 'draft', assignments: [] } as any);
      setShifts(Array.isArray(sh) ? sh.filter(s => s.isActive) : []);
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (err: any) {
      console.error("Lỗi tải dữ liệu lịch tuần:", err);
    } finally {
      setLoading(false);
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

  const getAssignment = (date: Date, shiftId: string) => {
    if (!schedule || !schedule.assignments || !Array.isArray(schedule.assignments)) return null;
    const targetDateStr = formatDate(date);
    return schedule.assignments.find(a => {
      const aDateStr = getIsoDateStr(a.date);
      return aDateStr === targetDateStr && a.shiftId === shiftId;
    });
  };

  // Tính số ca nhân viên đã được xếp trong tuần hiện tại
  const getEmployeeWeeklyShiftCount = (employeeId: string) => {
    if (!schedule || !schedule.assignments) return 0;
    return schedule.assignments.filter(a => a.employeeId === employeeId).length;
  };

  const handleAssign = async (date: Date, shift: WorkShift, empId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const emp = employees.find(e => e._id === empId);
    if (!emp) return;

    const targetDateStr = formatDate(date);
    const newAssignment: WorkScheduleAssignment = {
      date: `${targetDateStr}T00:00:00.000Z`,
      shiftId: shift._id,
      shiftName: shift.name,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      employeeId: emp._id,
      employeeName: emp.fullName,
      note: ""
    };

    const newAssignments = (schedule.assignments || []).filter(
      a => !(getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id)
    );
    newAssignments.push(newAssignment);

    // Optimistic UI update
    setSchedule({ ...schedule, assignments: newAssignments });
    setAssignModal({ isOpen: false, date: null, shift: null });

    try {
      let updated: any = await hrService.upsertSchedule({ weekStart: currentWeekStart, assignments: newAssignments });
      if (typeof updated === "string") {
        try {
          updated = JSON.parse(updated);
        } catch {}
      }
      if (updated && typeof updated === "object" && Array.isArray(updated.assignments)) {
        setSchedule(updated);
      }
    } catch (err: any) {
      console.error("Lỗi khi gán lịch:", err);
      alert(err.response?.data?.message || err.message || "Lỗi khi gán lịch nhân viên");
      fetchData();
    }
  };

  const handleRemoveAssignment = async (date: Date, shiftId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const targetDateStr = formatDate(date);
    const newAssignments = (schedule.assignments || []).filter(
      a => !(getIsoDateStr(a.date) === targetDateStr && a.shiftId === shiftId)
    );

    setSchedule({ ...schedule, assignments: newAssignments });

    try {
      let updated: any = await hrService.upsertSchedule({ weekStart: currentWeekStart, assignments: newAssignments });
      if (typeof updated === "string") {
        try {
          updated = JSON.parse(updated);
        } catch {}
      }
      if (updated && typeof updated === "object" && Array.isArray(updated.assignments)) {
        setSchedule(updated);
      }
    } catch (err: any) {
      console.error("Lỗi khi xóa phân công:", err);
      alert(err.response?.data?.message || err.message || "Lỗi khi xóa phân công");
      fetchData();
    }
  };

  const handlePublish = async () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng lịch này? Lịch đã đăng sẽ không thể chỉnh sửa tự do và toàn bộ nhân viên sẽ nhận được thông báo.")) {
      try {
        await hrService.publishSchedule(currentWeekStart);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi đăng lịch");
      }
    }
  };

  const isPublished = schedule?.status === 'published';
  const totalAssignmentsCount = schedule?.assignments?.length || 0;
  const uniqueEmployeesWorking = new Set((schedule?.assignments || []).map(a => a.employeeId)).size;

  // Lọc nhân viên trong modal tìm kiếm
  const filteredEmployees = employees.filter(e => {
    const q = searchEmployeeQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.role && e.role.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      {/* 1. Header Page Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Phân Công Lịch Làm Việc</h1>
              <p className="text-slate-500 text-sm mt-0.5">Lên kế hoạch và điều phối ca trực cho nhân sự chi nhánh</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {schedule && (
            <div className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 border ${
              isPublished 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isPublished ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              {isPublished ? "Đã Công Bố Lịch" : "Bản Nháp (Chưa Đăng)"}
            </div>
          )}

          <button
            onClick={handlePublish}
            disabled={!schedule || isPublished || totalAssignmentsCount === 0}
            className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Đăng Lịch Tuần
          </button>
        </div>
      </div>

      {/* 2. Control Toolbar: Week Navigation & Quick Statistics */}
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

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-medium">
            <Briefcase size={14} className="text-[#0057cd]" />
            <span>Đã gán: <strong className="text-slate-900 font-bold">{totalAssignmentsCount}</strong> ca</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-medium">
            <Users size={14} className="text-emerald-600" />
            <span>Nhân sự trực: <strong className="text-slate-900 font-bold">{uniqueEmployeesWorking}</strong> người</span>
          </div>
        </div>
      </div>

      {/* 3. Main Schedule Matrix Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
          <span className="mt-4 text-sm font-semibold text-slate-500">Đang tải bảng phân công ca trực...</span>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có ca làm việc nào</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Chi nhánh chưa thiết lập danh sách ca làm việc. Vui lòng vào mục "Quản lý Ca Làm Việc" để cấu hình trước.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1150px] table-fixed">
              {/* Column Width Distribution */}
              <colgroup>
                <col className="w-48" /> {/* Cột Ca Làm Việc */}
                {weekDays.map(d => (
                  <col key={d.toISOString()} className="w-[calc((100%-12rem)/7)] min-w-[138px]" />
                ))}
              </colgroup>

              {/* Table Header */}
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200">
                  <th className="p-4 border-r border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      Ca / Ngày
                    </div>
                  </th>
                  {weekDays.map(d => {
                    const isToday = formatDate(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6; // Thứ 7 hoặc CN
                    return (
                      <th 
                        key={d.toISOString()} 
                        className={`p-3.5 border-r border-slate-200 last:border-r-0 text-center transition-colors ${
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

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {shifts.map(shift => (
                  <tr key={shift._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Shift Header Column */}
                    <td className="p-4 border-r border-slate-200 bg-slate-50/20 align-top">
                      <div className="sticky left-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: shift.color || '#0057cd' }}
                          ></div>
                          <span className="font-bold text-slate-800 text-sm tracking-tight truncate">
                            {shift.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 pl-5">
                          <span>{shift.startTime}</span>
                          <span className="text-slate-300">-</span>
                          <span>{shift.endTime}</span>
                        </div>
                      </div>
                    </td>

                    {/* Day Slot Cells */}
                    {weekDays.map(d => {
                      const assignment = getAssignment(d, shift._id);
                      const isToday = formatDate(d) === todayStr;

                      return (
                        <td 
                          key={d.toISOString()} 
                          className={`p-2.5 border-r border-slate-100 last:border-r-0 align-top h-28 relative group transition-colors ${
                            isToday ? 'bg-blue-50/15' : ''
                          }`}
                        >
                          {assignment ? (
                            /* Assigned Employee Card */
                            <div className={`h-full min-h-[72px] p-2.5 rounded-xl flex flex-col justify-between border shadow-xs transition-all relative overflow-hidden ${
                              isPublished 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-sm'
                            }`}>
                              {/* Left Colored Accent Bar */}
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1" 
                                style={{ backgroundColor: shift.color || '#0057cd' }}
                              ></div>

                              {/* Card Content Top: Avatar + Full Name */}
                              <div className="flex items-start gap-2 pl-1.5 min-w-0 pr-5">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0057cd] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                  {getInitials(assignment.employeeName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div 
                                    className="text-xs font-bold text-slate-800 leading-snug break-words" 
                                    title={assignment.employeeName}
                                  >
                                    {formatEmployeeName(assignment.employeeName)}
                                  </div>
                                  <div className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                                    Dược sĩ
                                  </div>
                                </div>
                              </div>

                              {/* Remove Action Button (Top Right) */}
                              {!isPublished && (
                                <button 
                                  onClick={() => handleRemoveAssignment(d, shift._id)} 
                                  title="Hủy gán ca này"
                                  className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Unassigned Slot Action Button */
                            !isPublished && (
                              <button
                                onClick={() => {
                                  setSearchEmployeeQuery("");
                                  setAssignModal({ isOpen: true, date: d, shift });
                                }}
                                className="w-full h-full min-h-[72px] rounded-xl border border-dashed border-slate-200 hover:border-[#0057cd] hover:bg-blue-50/50 text-slate-400 hover:text-[#0057cd] flex flex-col items-center justify-center gap-1.5 transition-all group/btn cursor-pointer p-2"
                              >
                                <div className="w-6 h-6 rounded-full bg-slate-100 group-hover/btn:bg-blue-100 flex items-center justify-center transition-colors">
                                  <Plus size={14} className="text-slate-500 group-hover/btn:text-[#0057cd]" />
                                </div>
                                <span className="text-[11px] font-semibold tracking-tight text-slate-500 group-hover/btn:text-[#0057cd]">
                                  + Gán ca
                                </span>
                              </button>
                            )
                          )}
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

      {/* 4. Professional Assign Employee Modal Dialog */}
      {assignModal.isOpen && assignModal.date && assignModal.shift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gán Nhân Viên Trực Ca</h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 font-medium">
                  <span className="px-2 py-0.5 rounded-md font-semibold text-white text-[11px]" style={{ backgroundColor: assignModal.shift.color || '#0057cd' }}>
                    {assignModal.shift.name}
                  </span>
                  <span>({assignModal.shift.startTime} - {assignModal.shift.endTime})</span>
                  <span>•</span>
                  <span className="text-slate-800 font-bold">
                    {assignModal.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setAssignModal({ isOpen: false, date: null, shift: null })}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search Input */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Tìm nhân viên theo tên..."
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Employee List */}
            <div className="p-3 overflow-y-auto space-y-1 flex-1">
              {filteredEmployees.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Không tìm thấy nhân viên nào phù hợp.
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const shiftCount = getEmployeeWeeklyShiftCount(emp._id);
                  return (
                    <button
                      key={emp._id}
                      onClick={() => handleAssign(assignModal.date!, assignModal.shift!, emp._id)}
                      className="w-full p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0057cd] flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(emp.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 group-hover:text-[#0057cd] truncate">
                            {formatEmployeeName(emp.fullName)}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                            <span>{emp.role === 'pharmacist' ? 'Dược sĩ' : 'Quản lý'}</span>
                            <span>•</span>
                            <span className="text-slate-400">{emp.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 group-hover:bg-blue-100/70 text-slate-600 group-hover:text-[#0057cd] rounded-lg transition-colors">
                          {shiftCount} ca/tuần
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-right">
              <button
                onClick={() => setAssignModal({ isOpen: false, date: null, shift: null })}
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
