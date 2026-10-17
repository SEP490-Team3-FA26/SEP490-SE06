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
  AlertCircle,
  Mail,
  Repeat,
  Check
} from "lucide-react";

import { getLeaveDetails } from "../pharmacist/PharmacistSchedule";

// Interface quản lý trạng thái modal thêm nhân viên vào ca làm cố định
interface FixedShiftModalState {
  isOpen: boolean;
  selectedEmployeeId: string;
  selectedShiftId: string;
  selectedDays: number[]; // 0: Thứ 2 -> 6: Chủ Nhật
  applyNextWeeks: boolean;
  note: string;
}

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
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // State cho Modal thêm nhân viên vào ca làm việc cố định
  const [fixedShiftModal, setFixedShiftModal] = useState<FixedShiftModalState>({
    isOpen: false,
    selectedEmployeeId: "",
    selectedShiftId: "",
    selectedDays: [0, 1, 2, 3, 4], // Mặc định từ Thứ 2 đến Thứ 6
    applyNextWeeks: false,
    note: "Ca làm việc cố định",
  });
  const [fixedShiftSearch, setFixedShiftSearch] = useState("");
  const [submittingFixedShift, setSubmittingFixedShift] = useState(false);

  // Hệ thống Toast thông báo giao diện nội bộ (thay thế alert trình duyệt)
  interface ToastItem {
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Hộp thoại xác nhận tùy chỉnh (thay thế window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
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
    if (!schedule) return;
    const targetDateStr = formatDate(date);
    const cellAssignments = (schedule.assignments || []).filter(
      a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id
    );
    const hasLeave = cellAssignments.some(a => Boolean(getLeaveDetails(a.note)));
    if (schedule.status === 'published' && !hasLeave) return;

    const emp = employees.find(e => String(e._id) === String(empId) || String(e.id) === String(empId));
    if (!emp) return;

    // Kiểm tra tránh gán trùng chính nhân viên này vào cùng 1 ca
    const alreadyInShift = (schedule.assignments || []).some(
      a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shift._id && String(a.employeeId) === String(emp._id)
    );
    if (alreadyInShift) {
      showToast("Nhân viên này đã có tên trong ca trực này rồi.", "warning");
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
      showToast(`Đã gán ca cho ${emp.fullName} thành công!`, "success");
    } catch (err: any) {
      console.error("Lỗi khi gán lịch:", err);
      showToast(err.response?.data?.message || err.message || "Lỗi khi gán lịch nhân viên", "error");
      fetchData();
    }
  };

  // Mở modal thêm nhân viên vào ca làm việc cố định
  const openFixedShiftModal = (preselectedShiftId?: string) => {
    setFixedShiftSearch("");
    const firstEmp = employees.length > 0 ? (employees[0]._id || employees[0].id || "") : "";
    const chosenShift = preselectedShiftId || (shifts.length > 0 ? shifts[0]._id : "");
    setFixedShiftModal({
      isOpen: true,
      selectedEmployeeId: String(firstEmp),
      selectedShiftId: chosenShift,
      selectedDays: [0, 1, 2, 3, 4], // Mặc định từ Thứ 2 đến Thứ 6
      applyNextWeeks: false,
      note: "Ca làm việc cố định",
    });
  };

  // Xử lý lưu phân công ca làm cố định cho nhân viên
  const handleSaveFixedShift = async () => {
    if (!schedule) return;
    if (!fixedShiftModal.selectedEmployeeId) {
      showToast("Vui lòng chọn nhân viên cần gán ca cố định.", "warning");
      return;
    }
    if (!fixedShiftModal.selectedShiftId) {
      showToast("Vui lòng chọn ca làm việc.", "warning");
      return;
    }
    if (fixedShiftModal.selectedDays.length === 0) {
      showToast("Vui lòng chọn ít nhất một ngày làm việc trong tuần.", "warning");
      return;
    }

    const selectedEmp = employees.find(
      e => String(e._id) === String(fixedShiftModal.selectedEmployeeId) || String(e.id) === String(fixedShiftModal.selectedEmployeeId)
    );
    const selectedShift = shifts.find(s => s._id === fixedShiftModal.selectedShiftId);
    if (!selectedEmp || !selectedShift) {
      showToast("Không tìm thấy thông tin nhân viên hoặc ca làm việc.", "error");
      return;
    }

    try {
      setSubmittingFixedShift(true);

      // 1. Tạo các bản ghi phân công cho tuần hiện tại
      const newAssignmentsForCurrentWeek: WorkScheduleAssignment[] = fixedShiftModal.selectedDays.map(dayIdx => {
        const d = weekDays[dayIdx];
        const targetDateStr = formatDate(d);
        return {
          date: `${targetDateStr}T00:00:00.000Z`,
          shiftId: selectedShift._id,
          shiftName: selectedShift.name,
          shiftStart: selectedShift.startTime,
          shiftEnd: selectedShift.endTime,
          employeeId: selectedEmp._id || selectedEmp.id,
          employeeName: selectedEmp.fullName,
          note: fixedShiftModal.note || "Ca làm việc cố định",
        };
      });

      // Lọc bỏ trùng lặp nếu nhân viên đã có ca này trong các ngày đó
      let mergedAssignments = [...(schedule.assignments || [])];
      for (const newA of newAssignmentsForCurrentWeek) {
        const existsIndex = mergedAssignments.findIndex(
          a => getIsoDateStr(a.date) === getIsoDateStr(newA.date) &&
               a.shiftId === newA.shiftId &&
               String(a.employeeId) === String(newA.employeeId)
        );
        if (existsIndex >= 0) {
          mergedAssignments[existsIndex] = newA;
        } else {
          mergedAssignments.push(newA);
        }
      }

      // Cập nhật Optimistic UI
      setSchedule({ ...schedule, assignments: mergedAssignments });
      await hrService.upsertSchedule({ weekStart: currentWeekStart, assignments: mergedAssignments });

      // 2. Nếu tùy chọn áp dụng cả các tuần tiếp theo trong tháng được chọn
      if (fixedShiftModal.applyNextWeeks) {
        const [y, m, d] = currentWeekStart.split('-').map(Number);
        for (let w = 1; w <= 3; w++) {
          const nextWeekDate = new Date(y, m - 1, d + w * 7);
          const nextWeekStartStr = formatDate(nextWeekDate);
          const nextWeekDays = getWeekDays(nextWeekStartStr);

          try {
            const nextSchedRes: any = await hrService.getWeekSchedule(nextWeekStartStr);
            let nextSched: any = nextSchedRes;
            if (typeof nextSched === "string") {
              try { nextSched = JSON.parse(nextSched); } catch {}
            }
            const existingNextAssigns: WorkScheduleAssignment[] = Array.isArray(nextSched?.assignments) ? nextSched.assignments : [];

            const nextAssignments: WorkScheduleAssignment[] = fixedShiftModal.selectedDays.map(dayIdx => {
              const nextDay = nextWeekDays[dayIdx];
              const targetDateStr = formatDate(nextDay);
              return {
                date: `${targetDateStr}T00:00:00.000Z`,
                shiftId: selectedShift._id,
                shiftName: selectedShift.name,
                shiftStart: selectedShift.startTime,
                shiftEnd: selectedShift.endTime,
                employeeId: selectedEmp._id || selectedEmp.id,
                employeeName: selectedEmp.fullName,
                note: fixedShiftModal.note || "Ca làm việc cố định",
              };
            });

            const mergedNext = [...existingNextAssigns];
            for (const newA of nextAssignments) {
              const exists = mergedNext.findIndex(
                a => getIsoDateStr(a.date) === getIsoDateStr(newA.date) &&
                     a.shiftId === newA.shiftId &&
                     String(a.employeeId) === String(newA.employeeId)
              );
              if (exists >= 0) {
                mergedNext[exists] = newA;
              } else {
                mergedNext.push(newA);
              }
            }
            await hrService.upsertSchedule({ weekStart: nextWeekStartStr, assignments: mergedNext });
          } catch (err) {
            console.error(`Lỗi gán tuần ${nextWeekStartStr}:`, err);
          }
        }
      }

      setFixedShiftModal(prev => ({ ...prev, isOpen: false }));
      showToast(`Đã thêm nhân viên ${selectedEmp.fullName} vào ${selectedShift.name} cố định thành công!`, "success");
      fetchData();
    } catch (err: any) {
      console.error("Lỗi khi thêm ca cố định:", err);
      showToast(err.response?.data?.message || err.message || "Lỗi khi gán ca cố định", "error");
    } finally {
      setSubmittingFixedShift(false);
    }
  };

  const handleRemoveAssignment = async (date: Date, shiftId: string, employeeId: string) => {
    if (!schedule) return;
    const targetDateStr = formatDate(date);
    const targetAssign = (schedule.assignments || []).find(
      a => getIsoDateStr(a.date) === targetDateStr && a.shiftId === shiftId && String(a.employeeId) === String(employeeId)
    );
    const isLeave = targetAssign ? Boolean(getLeaveDetails(targetAssign.note)) : false;
    if (schedule.status === 'published' && !isLeave) return;

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
      showToast("Đã xóa nhân viên khỏi ca trực thành công!", "info");
    } catch (err: any) {
      console.error("Lỗi khi xóa phân công:", err);
      showToast(err.response?.data?.message || err.message || "Lỗi khi xóa phân công", "error");
      fetchData();
    }
  };

  const handlePublish = () => {
    setIsPublishModalOpen(true);
  };

  const confirmPublish = async () => {
    try {
      setIsPublishing(true);
      await hrService.publishSchedule(currentWeekStart, sendEmailNotification);
      setIsPublishModalOpen(false);
      fetchData();
      showToast("Đăng lịch tuần thành công!" + (sendEmailNotification ? " Hệ thống đã gửi email thông báo ca trực đến từng nhân viên." : ""), "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || "Lỗi khi đăng lịch", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const isPublished = schedule?.status === 'published';
  const totalAssignmentsCount = schedule?.assignments?.length || 0;
  const uniqueEmployeesWorking = new Set((schedule?.assignments || []).map(a => a.employeeId)).size;

  // Lọc nhân viên trong modal tìm kiếm gán ca đơn lẻ
  const filteredEmployees = employees.filter(e => {
    const q = searchEmployeeQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.role && e.role.toLowerCase().includes(q))
    );
  });

  // Lọc nhân viên trong modal phân ca làm việc cố định
  const filteredFixedEmployees = employees.filter(e => {
    const q = fixedShiftSearch.toLowerCase().trim();
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

          {/* NÚT THÊM NHÂN VIÊN VÀO CA LÀM CỐ ĐỊNH */}
          <button
            onClick={() => openFixedShiftModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>Thêm Vào Ca Cố Định</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={!schedule || isPublished || totalAssignmentsCount === 0}
            className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
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
            <table className="w-full border-collapse min-w-[1180px] table-fixed">
              {/* Column Width Distribution: Cột ca 112px, mỗi ngày tối thiểu 145px */}
              <colgroup>
                <col className="w-28" />
                {weekDays.map(d => (
                  <col key={d.toISOString()} className="w-[calc((100%-7rem)/7)] min-w-[145px]" />
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
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: shift.color || '#0057cd' }}
                          ></div>
                          <span className="font-semibold text-slate-800 text-xs tracking-tight truncate">
                            {shift.name}
                          </span>
                        </div>
                        {/* Nút thêm nhanh nhân viên vào ca cố định này */}
                        <button
                          onClick={() => openFixedShiftModal(shift._id)}
                          title={`Gán nhân viên vào ca ${shift.name} cố định`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
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
                          className={`p-1.5 border-r border-slate-100 last:border-r-0 align-top transition-colors ${
                            isToday ? 'bg-blue-50/15' : ''
                          }`}
                        >
                          <div className="flex flex-col justify-between h-full min-h-[96px] gap-1.5">
                            {/* Danh sách thẻ nhân viên trong ca */}
                            <div className="flex-1 space-y-1.5">
                              {cellAssignments.length === 0 ? (
                                <div className="h-10 flex items-center justify-center">
                                  <span className="text-[11px] font-medium text-slate-300 select-none">Chưa xếp</span>
                                </div>
                              ) : (
                                cellAssignments.map(assignment => {
                                  const roleInfo = getEmployeeRoleInfo(assignment.employeeId);
                                  const leaveInfo = getLeaveDetails(assignment.note);
                                  const isLeave = Boolean(leaveInfo);

                                  return (
                                    <div 
                                      key={assignment.employeeId + '_' + assignment.shiftId}
                                      className={`p-2 rounded-xl border shadow-2xs transition-all relative overflow-hidden group ${
                                        isLeave
                                          ? 'bg-amber-50/80 border-amber-300 border-dashed ring-1 ring-amber-400/30'
                                          : isPublished 
                                            ? 'bg-slate-50 border-slate-200' 
                                            : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                                      }`}
                                    >
                                      {/* Left Colored Accent Bar */}
                                      <div 
                                        className="absolute left-0 top-0 bottom-0 w-1" 
                                        style={{ backgroundColor: isLeave ? '#f59e0b' : (shift.color || '#0057cd') }}
                                      ></div>

                                      {/* Tên nhân viên: 1 dòng duy nhất, không ngắt dòng */}
                                      <div className="pl-1 pr-4 min-w-0">
                                        <div 
                                          className={`text-xs font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${
                                            isLeave ? 'text-slate-500 line-through' : 'text-slate-700'
                                          }`} 
                                          title={assignment.employeeName}
                                        >
                                          {formatEmployeeName(assignment.employeeName)}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                                          {isLeave ? (
                                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                              ĐÃ NGHỈ: {leaveInfo?.shortLabel.toUpperCase()}
                                            </span>
                                          ) : (
                                            <span className={`inline-block text-[9px] font-medium px-1.5 py-0.2 rounded ${
                                              roleInfo.isManager 
                                                ? 'bg-purple-50 text-purple-700 border border-purple-200/80' 
                                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                            }`}>
                                              {roleInfo.label}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Remove Action Button (Hiện khi chưa published HOẶC khi nhân viên này đã nghỉ phép để quản lý gỡ ca) */}
                                      {(!isPublished || isLeave) && (
                                        <button 
                                          onClick={() => handleRemoveAssignment(d, shift._id, assignment.employeeId)} 
                                          title={`Xóa ${assignment.employeeName} khỏi ca này`}
                                          className="absolute top-1.5 right-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Nút thêm nhân sự vào ca: Cố định ở đáy mt-auto, cho phép bù khi có người nghỉ */}
                            {(!isPublished || cellAssignments.some(a => Boolean(getLeaveDetails(a.note)))) && (
                              <button
                                onClick={() => {
                                  setSearchEmployeeQuery("");
                                  setAssignModal({ isOpen: true, date: d, shift });
                                }}
                                className={`mt-auto w-full py-1 px-2 rounded-xl border border-dashed flex items-center justify-center gap-1 transition-all group/btn cursor-pointer ${
                                  cellAssignments.some(a => Boolean(getLeaveDetails(a.note)))
                                    ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 text-amber-800'
                                    : 'border-slate-200 hover:border-[#0057cd] hover:bg-blue-50/60 text-slate-400 hover:text-[#0057cd]'
                                }`}
                              >
                                <Plus size={12} className={cellAssignments.some(a => Boolean(getLeaveDetails(a.note))) ? "text-amber-700" : "text-slate-400 group-hover/btn:text-[#0057cd]"} />
                                <span className="text-[11px] font-medium tracking-tight">
                                  {cellAssignments.length === 0 ? 'Gán ca' : cellAssignments.some(a => Boolean(getLeaveDetails(a.note))) ? 'Bù nhân sự' : 'Thêm'}
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

      {/* 5. Modal Xác Nhận Đăng Lịch Tuần & Tùy Chọn Gửi Email */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Xác Nhận Đăng Lịch Tuần</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tuần bắt đầu từ ngày {currentWeekStart}</p>
                </div>
              </div>
              <button
                onClick={() => !isPublishing && setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tổng số ca phân công:</span>
                  <span className="font-bold text-slate-800">{totalAssignmentsCount} ca</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số nhân viên có ca trực:</span>
                  <span className="font-bold text-[#0057cd]">{uniqueEmployeesWorking} nhân sự</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed">
                Lịch sau khi đăng sẽ chính thức công bố đến toàn bộ nhân sự chi nhánh. Nhân viên có thể theo dõi và thực hiện điểm danh ca làm việc.
              </div>

              {/* Tùy chọn gửi email */}
              <label className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={e => setSendEmailNotification(e.target.checked)}
                  disabled={isPublishing}
                  className="mt-0.5 w-4 h-4 text-[#0057cd] rounded border-slate-300 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail size={14} className="text-[#0057cd]" />
                    Gửi email thông báo cho từng nhân viên
                  </div>
                  <div className="text-slate-500 mt-1 leading-normal">
                    Tự động gửi Gmail tổng hợp toàn bộ các ca trực trong tuần đến từng nhân sự có lịch làm việc.
                  </div>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={confirmPublish}
                className="px-5 py-2 text-xs font-bold bg-[#0057cd] hover:bg-[#00419e] text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPublishing ? "Đang xử lý..." : "Xác Nhận Đăng Lịch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Phân Ca Làm Việc Cố Định Cho Nhân Viên */}
      {fixedShiftModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/70 via-slate-50/50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Repeat size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thêm Nhân Viên Vào Ca Làm Cố Định</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tự động phân ca định kỳ cho nhân viên theo các ngày trong tuần</p>
                </div>
              </div>
              <button 
                onClick={() => setFixedShiftModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Bước 1: Chọn Nhân Viên */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <span>1. Chọn Nhân Viên:</span>
                  <span className="text-slate-400 font-normal lowercase">({filteredFixedEmployees.length} nhân sự)</span>
                </label>

                {/* Input tìm kiếm nhanh */}
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Tìm theo tên, email, chức danh..."
                    value={fixedShiftSearch}
                    onChange={(e) => setFixedShiftSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto">
                  {filteredFixedEmployees.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Không tìm thấy nhân viên phù hợp
                    </div>
                  ) : (
                    filteredFixedEmployees.map(emp => {
                      const empIdStr = String(emp._id || emp.id);
                      const isSelected = empIdStr === String(fixedShiftModal.selectedEmployeeId);
                      const roleInfo = getEmployeeRoleInfo(empIdStr);
                      const count = getEmployeeWeeklyShiftCount(empIdStr);

                      return (
                        <div
                          key={empIdStr}
                          onClick={() => setFixedShiftModal(prev => ({ ...prev, selectedEmployeeId: empIdStr }))}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                            isSelected ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {getInitials(emp.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                                {formatEmployeeName(emp.fullName)}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span className={roleInfo.isManager ? 'text-purple-700 font-semibold' : 'text-slate-600'}>
                                  {roleInfo.label}
                                </span>
                                <span>•</span>
                                <span>{emp.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {count} ca/tuần
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Check size={12} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bước 2: Chọn Ca Làm Việc */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  2. Chọn Ca Làm Việc Cố Định:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {shifts.map(sh => {
                    const isSelected = sh._id === fixedShiftModal.selectedShiftId;
                    return (
                      <div
                        key={sh._id}
                        onClick={() => setFixedShiftModal(prev => ({ ...prev, selectedShiftId: sh._id }))}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: sh.color || '#0057cd' }}
                          ></div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{sh.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{sh.startTime} - {sh.endTime}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bước 3: Chọn Các Ngày Áp Dụng Trong Tuần */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    3. Chọn Các Ngày Trực Cố Định:
                  </label>
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFixedShiftModal(prev => ({ ...prev, selectedDays: [0, 1, 2, 3, 4] }))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
                    >
                      T2 - T6
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedShiftModal(prev => ({ ...prev, selectedDays: [0, 1, 2, 3, 4, 5, 6] }))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
                    >
                      Cả tuần
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedShiftModal(prev => ({ ...prev, selectedDays: [5, 6] }))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
                    >
                      Cuối tuần
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((d, dayIdx) => {
                    const isSelected = fixedShiftModal.selectedDays.includes(dayIdx);
                    const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
                    const isWeekend = dayIdx === 5 || dayIdx === 6;

                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setFixedShiftModal(prev => {
                            const exists = prev.selectedDays.includes(dayIdx);
                            const nextDays = exists 
                              ? prev.selectedDays.filter(i => i !== dayIdx)
                              : [...prev.selectedDays, dayIdx].sort((a, b) => a - b);
                            return { ...prev, selectedDays: nextDays };
                          });
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                            : isWeekend
                              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <span className={`text-[11px] font-extrabold uppercase ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                          {dayName}
                        </span>
                        <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {d.getDate()}/{d.getMonth() + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tùy chọn nâng cao: Áp dụng các tuần tiếp theo */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixedShiftModal.applyNextWeeks}
                    onChange={(e) => setFixedShiftModal(prev => ({ ...prev, applyNextWeeks: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Áp dụng ca làm việc cố định này cho cả 3 tuần tiếp theo trong tháng
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Hệ thống sẽ tự động gán ca trực này vào các tuần tiếp theo của chi nhánh mà bạn không cần phải xếp lại thủ công.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Đã chọn: <strong className="text-slate-900">{fixedShiftModal.selectedDays.length} ngày</strong> trong tuần
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFixedShiftModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingFixedShift || fixedShiftModal.selectedDays.length === 0}
                  onClick={handleSaveFixedShift}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingFixedShift ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>Xác Nhận & Gán Ca Cố Định</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Hộp thoại xác nhận tùy chỉnh (thay thế window.confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">{confirmModal.title}</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pl-1">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  action();
                }}
                className="px-5 py-2 text-xs font-bold bg-[#0057cd] hover:bg-[#00419e] text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Thông báo Toast nội bộ (thay thế hoàn toàn alert trình duyệt) */}
      <div className="fixed top-5 right-5 z-[60] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-start gap-3 transition-all animate-in slide-in-from-top-3 duration-200 ${
              toast.type === 'success'
                ? 'bg-white text-slate-800 border-emerald-200 ring-1 ring-emerald-500/15'
                : toast.type === 'error'
                  ? 'bg-white text-slate-800 border-rose-200 ring-1 ring-rose-500/15'
                  : toast.type === 'warning'
                    ? 'bg-white text-slate-800 border-amber-200 ring-1 ring-amber-500/15'
                    : 'bg-white text-slate-800 border-blue-200 ring-1 ring-blue-500/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : toast.type === 'error'
                  ? 'bg-rose-100 text-rose-700'
                  : toast.type === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <AlertCircle size={18} />}
              {toast.type === 'warning' && <AlertCircle size={18} />}
              {toast.type === 'info' && <CheckCircle2 size={18} />}
            </div>

            <div className="flex-1 pt-0.5 min-w-0">
              <div className="text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
