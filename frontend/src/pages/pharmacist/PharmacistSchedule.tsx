import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hrService, WorkSchedule, WorkShift } from "../../services/hr/hr.service";
import { authService } from "../../services/auth/auth.service";
import { Calendar, ChevronLeft, ChevronRight, User, RefreshCw } from "lucide-react";

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

export function PharmacistSchedule() {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getUserId = () => {
    const userObj = authService.getCurrentUser();
    if (userObj?.id) return userObj.id;
    if (userObj?._id) return userObj._id;

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
        return decoded.sub || "";
      } catch {
        return "";
      }
    }
    return "";
  };
  const userId = getUserId();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sched, sh] = await Promise.all([
        hrService.getMyWeekSchedule(currentWeekStart),
        hrService.listShifts()
      ]);
      let schedData: any = sched;
      if (typeof schedData === "string") {
        try {
          schedData = JSON.parse(schedData);
        } catch {
          schedData = null;
        }
      }
      setSchedule(schedData);
      setShifts(Array.isArray(sh) ? sh.filter(s => s.isActive) : []);
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
  const isPublished = schedule?.status === 'published';

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lịch Làm Việc Cá Nhân</h1>
          <p className="text-slate-500 mt-1">Xem ca trực và gửi yêu cầu đổi ca</p>
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

      {!isPublished && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-6">
          <span className="text-sm font-medium">Lịch tuần này chưa được quản lý công bố.</span>
        </div>
      )}

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
                    const assignment = (schedule?.assignments || []).find(a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id);
                    if (!assignment) return <td key={d.toISOString()} className="p-2 border-r border-slate-100 last:border-r-0 h-24"></td>;

                    const isMine = assignment.employeeId === userId;
                    return (
                      <td key={d.toISOString()} className={`p-2 border-r border-slate-100 last:border-r-0 align-top h-24 relative group ${isMine ? 'bg-blue-50/50' : 'opacity-60'}`}>
                        <div className={`p-2 rounded-xl flex flex-col justify-between h-full border ${isMine ? 'bg-white border-[#0057cd]/40 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMine ? 'bg-[#0057cd] text-white' : 'bg-slate-200 text-slate-600'}`}>
                              <User size={12} />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 truncate" title={assignment.employeeName}>
                              {formatEmployeeName(assignment.employeeName)}
                            </span>
                          </div>
                          {isMine && isPublished && (
                            <button 
                              onClick={() => navigate('/pharmacist/shift-swaps')}
                              className="mt-2 text-[10px] uppercase font-bold text-blue-600 flex items-center justify-center gap-1 hover:bg-blue-50 py-1 rounded"
                            >
                              <RefreshCw size={10} /> Đổi ca
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
      )}
    </div>
  );
}
