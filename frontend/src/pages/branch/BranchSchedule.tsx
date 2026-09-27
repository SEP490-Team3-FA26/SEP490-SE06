import React, { useState, useEffect } from "react";
import { hrService, WorkSchedule, WorkShift, WorkScheduleAssignment } from "../../services/hr/hr.service";
import { employeeService, Employee } from "../../services/admin/employee.service";
import { authService } from "../../services/auth/auth.service";
import { Calendar, ChevronLeft, ChevronRight, User, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";

// Utilities
function getMonday(d: Date) {
  d = new Date(d);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
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

export function BranchSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const getWeekDays = (start: string) => {
    const days: Date[] = [];
    const [year, month, day] = start.split('-').map(Number);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(year, month - 1, day + i));
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);
  
  const getAssignment = (date: Date, shiftId: string) => {
    if (!schedule || !schedule.assignments || !Array.isArray(schedule.assignments)) return null;
    const targetDateStr = formatDate(date);
    return schedule.assignments.find(a => {
      const aDateStr = getIsoDateStr(a.date);
      return aDateStr === targetDateStr && a.shiftId === shiftId;
    });
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

    // Cập nhật state UI ngay lập tức để không bị giật lag
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

    // Cập nhật state UI ngay lập tức
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
    if (window.confirm("Bạn có chắc chắn muốn đăng lịch này? Lịch đã đăng sẽ không thể chỉnh sửa tự do và nhân viên sẽ nhận được thông báo.")) {
      try {
        await hrService.publishSchedule(currentWeekStart);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi đăng lịch");
      }
    }
  };

  const isPublished = schedule?.status === 'published';

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Phân Công Lịch Làm Việc</h1>
          <p className="text-slate-500 mt-1">Lên lịch trực cho dược sĩ tại chi nhánh</p>
        </div>
        <div className="flex gap-3 items-center">
          {schedule && (
            <span className={`px-3 py-1.5 text-sm font-bold rounded-xl flex items-center gap-2 ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isPublished ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              {isPublished ? "Đã Đăng Lịch" : "Bản Nháp"}
            </span>
          )}
          <button
            onClick={handlePublish}
            disabled={!schedule || isPublished || (schedule.assignments || []).length === 0}
            className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] disabled:opacity-50 transition-colors shadow-sm"
          >
            Đăng Lịch Tuần
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex justify-between items-center">
        <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft /></button>
        <div className="flex items-center gap-2 font-bold text-lg text-slate-700">
          <Calendar className="text-[#0057cd]" />
          Tuần {formatDate(weekDays[0])} đến {formatDate(weekDays[6])}
        </div>
        <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight /></button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full border-collapse min-w-[1050px] table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-3.5 border-r border-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-44">
                  Ca / Ngày
                </th>
                {weekDays.map(d => (
                  <th key={d.toISOString()} className="p-3 border-r border-slate-200 last:border-r-0 text-center w-[calc((100%-11rem)/7)] min-w-[125px]">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800">{d.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">{d.getDate()}/{d.getMonth()+1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift._id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3.5 border-r border-slate-200 bg-slate-50/30">
                    <div className="flex items-center gap-2 font-bold text-slate-800 mb-1 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: shift.color }}></div>
                      <span className="truncate">{shift.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const assignment = getAssignment(d, shift._id);
                    return (
                      <td key={d.toISOString()} className="p-2 border-r border-slate-100 last:border-r-0 align-top h-24 relative group">
                        {assignment ? (
                          <div className={`p-2 rounded-xl flex items-center justify-between gap-1 border transition-all ${
                            isPublished ? 'bg-slate-50 border-slate-200' : 'bg-blue-50/70 border-blue-200 hover:border-blue-300 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                <User size={12} />
                              </div>
                              <span className="text-xs font-semibold text-slate-800 truncate" title={assignment.employeeName}>
                                {formatEmployeeName(assignment.employeeName)}
                              </span>
                            </div>
                            {!isPublished && (
                              <button 
                                onClick={() => handleRemoveAssignment(d, shift._id)} 
                                title="Hủy phân công"
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-white/80 transition-colors shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          !isPublished && (
                            <div className="h-full flex flex-col justify-center">
                              <select 
                                className="w-full text-xs font-medium border border-dashed border-slate-300 hover:border-[#0057cd] hover:bg-blue-50/30 bg-slate-50/60 rounded-lg px-2 py-2 text-slate-600 focus:ring-2 focus:ring-[#0057cd] transition-all cursor-pointer text-center truncate"
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    e.target.disabled = true;
                                    await handleAssign(d, shift, val);
                                    e.target.disabled = false;
                                  }
                                  e.target.value = "";
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>+ Gán ca</option>
                                {employees.length === 0 ? (
                                  <option value="" disabled>Không có nhân viên</option>
                                ) : (
                                  employees.map(e => (
                                    <option key={e._id} value={e._id}>
                                      {formatEmployeeName(e.fullName)} {e.role === 'pharmacist' ? '(Dược sĩ)' : '(Quản lý)'}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
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
      )}
    </div>
  );
}
