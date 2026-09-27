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

  const getAssignments = (date: Date, shiftId: string): WorkScheduleAssignment[] => {
    if (!schedule || !schedule.assignments || !Array.isArray(schedule.assignments)) return [];
    const targetDateStr = formatDate(date);
    return schedule.assignments.filter(a => {
      const aDateStr = getIsoDateStr(a.date);
      return aDateStr === targetDateStr && a.shiftId === shiftId;
    });
  };

  // Tính số ca nhân viên đã được xếp trong tuần hiện tại
  const getEmployeeWeeklyShiftCount = (employeeId: string) => {
    if (!schedule || !schedule.assignments) return 0;
    return schedule.assignments.filter(a => String(a.employeeId) === String(employeeId)).length;
  };

  // Tra cứu vai trò chính xác của nhân sự (Quản lý hay Dược sĩ)
  const getEmployeeRoleInfo = (empId: string) => {
    const emp = employees.find(
      e => String(e._id) === String(empId) || String(e.id) === String(empId)
    );
    if (!emp) {
      return { role: 'pharmacist', label: 'Dược sĩ', isManager: false };
    }
    const isManager = emp.role === 'branch' || emp.role === 'admin' || emp.role === 'manager' || emp.role !== 'pharmacist';
    return {
      role: emp.role,
      label: isManager ? 'Quản lý' : 'Dược sĩ',
      isManager
    };
  };

  const handleAssign = async (date: Date, shift: WorkShift, empId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const emp = employees.find(e => String(e._id) === String(empId) || String(e.id) === String(empId));
    if (!emp) return;

    const targetDateStr = formatDate(date);

    // Kiểm tra tránh gán trùng chính nhân viên này vào cùng 1 ca
    const alreadyInShift = (schedule.assignments || []).some(
      a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id && String(a.employeeId) === String(emp._id)
    );
    if (alreadyInShift) {
      alert("Nhân viên này đã có tên trong ca trực này rồi.");
      return;
    }

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

    const newAssignments = [...(schedule.assignments || []), newAssignment];

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

  const handleRemoveAssignment = async (date: Date, shiftId: string, employeeId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const targetDateStr = formatDate(date);
    const newAssignments = (schedule.assignments || []).filter(
      a => !(getIsoDateStr(a.date) === targetDateStr && a.shiftId === shiftId && String(a.employeeId) === String(employeeId))
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
            <table className="w-full border-collapse min-w-[1100px] table-fixed">
              {/* Column Width Distribution: Cột ca chỉ 112px (w-28), dành tối đa diện tích cho các ngày */}
              <colgroup>
                <col className="w-28" />
                {weekDays.map(d => (
                  <col key={d.toISOString()} className="w-[calc((100%-7rem)/7)] min-w-[130px]" />
                ))}
              </colgroup>

              {/* Table Header */}
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200">
                  <th className="p-2.5 border-r border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      Ca / Ngày
                    </div>
                  </th>
                  {weekDays.map(d => (
                    <th 
                      key={d.toISOString()} 
                      className={`p-2.5 border-r border-slate-200 last:border-r-0 text-center transition-colors ${
                        formatDate(d) === todayStr ? 'bg-blue-50/70 border-b-2 border-b-[#0057cd]' : (d.getDay() === 0 || d.getDay() === 6) ? 'bg-slate-100/50' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div className={`text-xs font-extrabold uppercase tracking-wider ${formatDate(d) === todayStr ? 'text-[#0057cd]' : 'text-slate-700'}`}>
                          {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-sm font-bold ${formatDate(d) === todayStr ? 'text-[#0057cd]' : 'text-slate-900'}`}>
                            {d.getDate()}/{d.getMonth() + 1}
                          </span>
                          {formatDate(d) === todayStr && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#0057cd] text-white rounded-md">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {shifts.map(shift => (
                  <tr key={shift._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Shift Header Column - Thu gọn kích thước tối đa */}
                    <td className="p-2 border-r border-slate-200 bg-slate-50/30 align-top">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full shrink-0" 
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

                    {/* Day Slot Cells */}
                    {weekDays.map(d => {
                      const cellAssignments = getAssignments(d, shift._id);
                      const isToday = formatDate(d) === todayStr;

                      return (
                        <td 
                          key={d.toISOString()} 
                          className={`p-1.5 border-r border-slate-100 last:border-r-0 align-top min-h-[80px] relative transition-colors ${
                            isToday ? 'bg-blue-50/15' : ''
                          }`}
                        >
                          <div className="flex flex-col gap-1.5 min-h-[72px]">
                            {/* Danh sách thẻ nhân viên trong ca */}
                            {cellAssignments.map(assignment => {
                              const roleInfo = getEmployeeRoleInfo(assignment.employeeId);
                              return (
                                <div 
                                  key={assignment.employeeId + '_' + assignment.shiftId}
                                  className={`p-2 rounded-xl flex items-center justify-between border shadow-2xs transition-all relative overflow-hidden group ${
                                    isPublished 
                                      ? 'bg-slate-50 border-slate-200' 
                                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                                  }`}
                                >
                                  {/* Left Colored Accent Bar */}
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1" 
                                    style={{ backgroundColor: shift.color || '#0057cd' }}
                                  ></div>

                                  <div className="pl-1.5 pr-2 min-w-0 flex-1">
                                    <div 
                                      className="text-xs font-medium text-slate-700 leading-snug break-words" 
                                      title={assignment.employeeName}
                                    >
                                      {formatEmployeeName(assignment.employeeName)}
                                    </div>
                                    <div className="mt-0.5">
                                      <span className={`inline-block text-[9px] font-medium px-1.5 py-0.2 rounded ${
                                        roleInfo.isManager 
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200/80' 
                                          : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                      }`}>
                                        {roleInfo.label}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Remove Action Button (Chỉ xóa nhân sự này khỏi ca) */}
                                  {!isPublished && (
                                    <button 
                                      onClick={() => handleRemoveAssignment(d, shift._id, assignment.employeeId)} 
                                      title={`Xóa ${assignment.employeeName} khỏi ca này`}
                                      className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            {/* Nút thêm nhân sự vào ca */}
                            {!isPublished && (
                              <button
                                onClick={() => {
                                  setSearchEmployeeQuery("");
                                  setAssignModal({ isOpen: true, date: d, shift });
                                }}
                                className={`rounded-xl border border-dashed border-slate-200 hover:border-[#0057cd] hover:bg-blue-50/50 text-slate-400 hover:text-[#0057cd] flex items-center justify-center gap-1 transition-all group/btn cursor-pointer ${
                                  cellAssignments.length === 0 
                                    ? 'w-full h-full min-h-[62px] flex-col p-1.5' 
                                    : 'w-full py-1 px-2 text-[11px] font-medium'
                                }`}
                              >
                                <Plus size={13} className="text-slate-400 group-hover/btn:text-[#0057cd] transition-transform" />
                                <span className="text-[11px] font-medium tracking-tight text-slate-500 group-hover/btn:text-[#0057cd]">
                                  {cellAssignments.length === 0 ? '+ Gán ca' : '+ Thêm'}
                                </span>
                              </button>
                            )}
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
                  const targetDateStr = assignModal.date ? formatDate(assignModal.date) : "";
                  const isAlreadyInShift = (schedule?.assignments || []).some(
                    a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === assignModal.shift?._id && String(a.employeeId) === String(emp._id)
                  );

                  return (
                    <button
                      key={emp._id}
                      disabled={isAlreadyInShift}
                      onClick={() => handleAssign(assignModal.date!, assignModal.shift!, emp._id)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isAlreadyInShift 
                          ? 'bg-slate-50/70 border-slate-100 opacity-60 cursor-not-allowed' 
                          : 'hover:bg-blue-50/70 border-transparent hover:border-blue-200 cursor-pointer group'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0057cd] flex items-center justify-center shrink-0">
                          <User size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${isAlreadyInShift ? 'text-slate-500' : 'text-slate-800 group-hover:text-[#0057cd]'}`}>
                            {formatEmployeeName(emp.fullName)}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                            <span className={getEmployeeRoleInfo(emp._id).isManager ? 'text-purple-700 font-medium' : 'text-slate-600'}>
                              {getEmployeeRoleInfo(emp._id).label}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">{emp.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        {isAlreadyInShift ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                            Đã trong ca
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 group-hover:bg-blue-100/70 text-slate-600 group-hover:text-[#0057cd] rounded-lg transition-colors">
                            {shiftCount} ca/tuần
                          </span>
                        )}
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
