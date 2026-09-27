import React, { useState, useEffect } from "react";
import { hrService, WorkSchedule, WorkShift, WorkScheduleAssignment } from "../../services/hr/hr.service";
import { employeeService, Employee } from "../../services/admin/employee.service";
import { Calendar, ChevronLeft, ChevronRight, User, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";

// Utilities
function getMonday(d: Date) {
  d = new Date(d);
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export function BranchSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lấy chi nhánh từ JWT Token (để getEmployees)
  const getBranchId = () => {
    try {
      return JSON.parse(window.atob(localStorage.getItem("token")!.split(".")[1])).branchId || "BR-001";
    } catch {
      return "BR-001";
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sched, sh, emps] = await Promise.all([
        hrService.getWeekSchedule(currentWeekStart),
        hrService.listShifts(),
        employeeService.getEmployees({ branchId: getBranchId() })
      ]);
      setSchedule(sched);
      setShifts(sh.filter(s => s.isActive));
      setEmployees(emps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const changeWeek = (offset: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offset * 7);
    setCurrentWeekStart(formatDate(d));
  };

  const getWeekDays = (start: string) => {
    const days = [];
    let curr = new Date(start);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);
  
  const getAssignment = (date: Date, shiftId: string) => {
    if (!schedule || !schedule.assignments) return null;
    const targetDateStr = formatDate(date);
    return schedule.assignments.find(a => {
      try {
        const aDateStr = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString();
        return aDateStr.startsWith(targetDateStr) && a.shiftId === shiftId;
      } catch (e) {
        return false;
      }
    });
  };

  const handleAssign = async (date: Date, shift: WorkShift, empId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const emp = employees.find(e => e._id === empId);
    if (!emp) return;

    const newAssignment: WorkScheduleAssignment = {
      date: date.toISOString(),
      shiftId: shift._id,
      shiftName: shift.name,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      employeeId: emp._id,
      employeeName: emp.fullName,
      note: ""
    };

    const newAssignments = (schedule.assignments || []).filter(a => !(a.date.startsWith(formatDate(date)) && a.shiftId === shift._id));
    newAssignments.push(newAssignment);

    try {
      const updated = await hrService.upsertSchedule({ weekStart: currentWeekStart, assignments: newAssignments });
      setSchedule(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAssignment = async (date: Date, shiftId: string) => {
    if (!schedule || schedule.status === 'published') return;
    const newAssignments = (schedule.assignments || []).filter(a => !(a.date.startsWith(formatDate(date)) && a.shiftId === shiftId));
    try {
      const updated = await hrService.upsertSchedule({ weekStart: currentWeekStart, assignments: newAssignments });
      setSchedule(updated);
    } catch (err) {
      console.error(err);
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
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 border-b border-r border-slate-200 text-left text-sm font-bold text-slate-500 w-48">Ca / Ngày</th>
                {weekDays.map(d => (
                  <th key={d.toISOString()} className="p-4 border-b border-slate-200 text-center">
                    <div className="text-sm font-bold text-slate-800">{d.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                    <div className="text-xs text-slate-500 mt-1">{d.getDate()}/{d.getMonth()+1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift._id} className="border-b border-slate-100 last:border-0">
                  <td className="p-4 border-r border-slate-200">
                    <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }}></div>
                      {shift.name}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const assignment = getAssignment(d, shift._id);
                    return (
                      <td key={d.toISOString()} className="p-2 border-r border-slate-100 last:border-0 align-top h-24 relative group">
                        {assignment ? (
                          <div className={`p-2 rounded-xl flex items-center justify-between border ${isPublished ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                <User size={12} />
                              </div>
                              <span className="text-sm font-semibold text-slate-800 truncate" title={assignment.employeeName}>
                                {assignment.employeeName.split(' ').pop()}
                              </span>
                            </div>
                            {!isPublished && (
                              <button onClick={() => handleRemoveAssignment(d, shift._id)} className="text-rose-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          !isPublished && (
                            <div className="h-full flex flex-col justify-center">
                              <select 
                                className="w-full text-sm border-0 bg-slate-100 rounded-lg p-2 text-slate-600 focus:ring-2 focus:ring-[#0057cd]"
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
                                <option value="" disabled>+ Gán nhân viên</option>
                                {employees.map(e => (
                                  <option key={e._id} value={e._id}>{e.fullName}</option>
                                ))}
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
