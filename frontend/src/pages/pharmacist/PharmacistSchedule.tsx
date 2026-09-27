import React, { useState, useEffect } from "react";
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
  Briefcase
} from "lucide-react";

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

  // Thống kê số ca trực của chính dược sĩ trong tuần
  const myShiftsCount = (schedule?.assignments || []).filter(a => a.employeeId === userId).length;

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
            <span>Bạn có <strong className="font-bold text-slate-900">{myShiftsCount} ca</strong> trực tuần này</span>
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
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu ca trực</h3>
          <p className="text-sm text-slate-500 mt-1">Chi nhánh chưa cấu hình ca làm việc.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1100px] table-fixed">
              <colgroup>
                <col className="w-28" />
                {weekDays.map(d => (
                  <col key={d.toISOString()} className="w-[calc((100%-7rem)/7)] min-w-[130px]" />
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
                {shifts.map(shift => (
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
                      const assignment = (schedule?.assignments || []).find(
                        a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id
                      );
                      const isToday = targetDateStr === todayStr;

                      if (!assignment) {
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

                      const isMine = assignment.employeeId === userId;

                      return (
                        <td 
                          key={d.toISOString()} 
                          className={`p-2 border-r border-slate-100 last:border-r-0 align-top h-24 relative group transition-colors ${
                            isToday ? 'bg-blue-50/15' : ''
                          }`}
                        >
                          <div className={`h-full min-h-[62px] p-2 rounded-xl flex flex-col justify-between border shadow-2xs transition-all relative overflow-hidden ${
                            isMine 
                              ? 'bg-blue-50/80 border-[#0057cd]/50 ring-2 ring-[#0057cd]/20' 
                              : 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                          }`}>
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-1" 
                              style={{ backgroundColor: isMine ? '#0057cd' : (shift.color || '#94a3b8') }}
                            ></div>

                            <div className="pl-1.5 pr-2">
                              <div 
                                className="text-xs font-medium text-slate-700 leading-snug break-words"
                                title={assignment.employeeName}
                              >
                                {formatEmployeeName(assignment.employeeName)}
                              </div>
                              <div className="text-[10px] font-normal text-slate-500 mt-1">
                                {isMine ? (
                                  <span className="text-[#0057cd] font-semibold px-1.5 py-0.5 bg-blue-100/60 rounded">Ca của bạn</span>
                                ) : (
                                  <span className="text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">Nhân sự trực</span>
                                )}
                              </div>
                            </div>

                            {/* Shift Swap Action (If it's my shift and published) */}
                            {isMine && isPublished && (
                              <div className="pt-1.5 pl-1.5">
                                <button 
                                  onClick={() => navigate('/pharmacist/shift-swaps')}
                                  className="w-full py-0.5 px-1.5 text-[10px] uppercase font-bold text-[#0057cd] hover:text-white bg-white hover:bg-[#0057cd] border border-blue-200 rounded-lg flex items-center justify-center gap-1 transition-all shadow-2xs"
                                >
                                  <RefreshCw size={10} /> Đổi ca
                                </button>
                              </div>
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
    </div>
  );
}
