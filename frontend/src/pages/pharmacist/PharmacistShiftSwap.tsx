import React, { useState, useEffect, useMemo } from "react";
import { hrService, ShiftSwapRequest, WorkSchedule, WorkShift } from "../../services/hr/hr.service";
import { authService } from "../../services/auth/auth.service";
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  Plus, 
  Check, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Send,
  RefreshCw
} from "lucide-react";

interface PeerEmployee {
  _id: string;
  fullName: string;
  role?: string;
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShiftDate(dateStr: any) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = weekdays[d.getDay()] || '';
  const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return `${dayName}, ${dateFormatted}`;
}

function formatEmployeeName(fullName: string) {
  if (!fullName) return "";
  return fullName.replace(/\s*\([^)]*\)/g, "").trim() || fullName;
}

export function PharmacistShiftSwap() {
  const [activeTab, setActiveTab] = useState<"outgoing" | "incoming">("outgoing");
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal tao yeu cau doi ca
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [employees, setEmployees] = useState<PeerEmployee[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [allPublishedAssignments, setAllPublishedAssignments] = useState<any[]>([]);

  // Modal tu choi yeu cau
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Form data doi ca
  const [formData, setFormData] = useState({
    myShiftInfo: "",
    targetId: "",
    targetShiftInfo: "",
    reason: ""
  });

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
      } catch {}
    }
    return { id, name };
  };
  const { id: userId, name: userName } = getUserInfo();

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const data = await hrService.listMySwaps();
      setSwaps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách đổi ca:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwaps();
  }, []);

  const outgoing = swaps.filter(s => String(s.requesterId) === String(userId));
  const incoming = swaps.filter(s => String(s.targetId) === String(userId) && s.status === 'pending_target');

  // Mo modal tao yeu cau doi ca
  const openCreateModal = async () => {
    setIsModalOpen(true);
    setModalLoading(true);
    setFormData({ myShiftInfo: "", targetId: "", targetShiftInfo: "", reason: "" });

    try {
      // 1. Tinh toan ngay bat dau tuan hien tai va tuan sau
      const now = new Date();
      const thisMonday = getMonday(now);
      const nextMonday = new Date(thisMonday);
      nextMonday.setDate(nextMonday.getDate() + 7);

      const mon1 = formatDate(thisMonday);
      const mon2 = formatDate(nextMonday);

      // 2. Tai lich 2 tuan va danh sach dong nghiep
      const [sched1Res, sched2Res, colleaguesRes] = await Promise.allSettled([
        hrService.getMyWeekSchedule(mon1),
        hrService.getMyWeekSchedule(mon2),
        hrService.getColleagues(),
      ]);

      const allAssignments: any[] = [];
      if (sched1Res.status === 'fulfilled' && sched1Res.value) {
        let s1 = sched1Res.value;
        if (typeof s1 === 'string') {
          try { s1 = JSON.parse(s1); } catch {}
        }
        if (Array.isArray(s1?.assignments)) {
          allAssignments.push(...s1.assignments);
        }
      }
      if (sched2Res.status === 'fulfilled' && sched2Res.value) {
        let s2 = sched2Res.value;
        if (typeof s2 === 'string') {
          try { s2 = JSON.parse(s2); } catch {}
        }
        if (Array.isArray(s2?.assignments)) {
          allAssignments.push(...s2.assignments);
        }
      }

      setAllPublishedAssignments(allAssignments);

      // 3. Loc danh sach ca cua chinh toi
      const mine = allAssignments.filter(
        a => (userId && String(a.employeeId) === String(userId)) || (userName && a.employeeName === userName)
      );
      // Sap xep ca cua toi theo thoi gian
      mine.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMyAssignments(mine);

      // 4. Lay danh sach dong nghiep: Uu tien API colleagues, fallback sang assignments
      const peersMap = new Map<string, PeerEmployee>();

      if (colleaguesRes.status === 'fulfilled' && Array.isArray(colleaguesRes.value)) {
        colleaguesRes.value.forEach((emp: any) => {
          const empId = String(emp._id || emp.id);
          // Chi lay duoc si cung chi nhanh va khac chinh minh
          if (empId !== String(userId) && (emp.role === 'pharmacist' || !emp.role)) {
            peersMap.set(empId, {
              _id: empId,
              fullName: emp.fullName || emp.name || 'Dược sĩ',
              role: emp.role || 'pharmacist'
            });
          }
        });
      }

      // Fallback: Neu API dong nghiep rong, trich xuat tu chinh cac ca truc cua tuan
      if (peersMap.size === 0) {
        allAssignments.forEach((a) => {
          const empId = String(a.employeeId);
          if (empId && empId !== String(userId)) {
            peersMap.set(empId, {
              _id: empId,
              fullName: a.employeeName || 'Dược sĩ',
              role: 'pharmacist'
            });
          }
        });
      }

      setEmployees(Array.from(peersMap.values()));
    } catch (err) {
      console.error("Lỗi chuẩn bị dữ liệu đổi ca:", err);
    } finally {
      setModalLoading(false);
    }
  };

  // Ca cua doi phuong dua tren dong nghiep duoc chon
  const availableTargetShifts = useMemo(() => {
    if (!formData.targetId) return [];
    const shifts = allPublishedAssignments.filter(
      a => String(a.employeeId) === String(formData.targetId)
    );
    shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return shifts;
  }, [formData.targetId, allPublishedAssignments]);

  // Gui form yeu cau doi ca
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.myShiftInfo || !formData.targetId || !formData.targetShiftInfo) {
      alert("Vui lòng chọn đầy đủ ca của bạn, đồng nghiệp và ca muốn đổi.");
      return;
    }

    try {
      setSubmittingAction(true);
      const myShift = JSON.parse(formData.myShiftInfo);
      const targetShift = JSON.parse(formData.targetShiftInfo);
      const targetEmp = employees.find(e => String(e._id) === String(formData.targetId));

      await hrService.createSwap({
        requesterShiftDate: myShift.date,
        requesterShiftId: myShift.shiftId,
        requesterShiftName: myShift.shiftName,
        targetId: formData.targetId,
        targetName: targetEmp?.fullName || targetShift.employeeName || "Đồng nghiệp",
        targetShiftDate: targetShift.date,
        targetShiftId: targetShift.shiftId,
        targetShiftName: targetShift.shiftName,
        reason: formData.reason || "Đổi ca làm việc"
      });

      setIsModalOpen(false);
      fetchSwaps();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi tạo yêu cầu đổi ca.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Dong y yeu cau doi ca
  const handleAccept = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn đồng ý đổi ca này không? Sau khi đồng ý, yêu cầu sẽ được chuyển đến Quản lý chi nhánh duyệt.")) {
      return;
    }
    try {
      setSubmittingAction(true);
      await hrService.targetRespond(id, { response: "accepted" });
      fetchSwaps();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi phản hồi yêu cầu.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Mo modal tu choi
  const handleRejectClick = (req: ShiftSwapRequest) => {
    setSelectedRequest(req);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  // Gui ly do tu choi
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setSubmittingAction(true);
      await hrService.targetRespond(selectedRequest._id, { 
        response: "rejected", 
        rejectReason: rejectReason || "Không tiện đổi ca" 
      });
      setRejectModalOpen(false);
      fetchSwaps();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi từ chối yêu cầu.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const statusMap: Record<string, { label: string; badgeClass: string; desc: string }> = {
    pending_target: { 
      label: "Chờ đồng nghiệp đồng ý", 
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      desc: "Đang chờ đối phương xác nhận đổi ca"
    },
    pending_manager: { 
      label: "Chờ Quản lý duyệt", 
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      desc: "Đối phương đã đồng ý, đang chờ Quản lý phê duyệt"
    },
    approved: { 
      label: "Đã duyệt hoàn tất", 
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      desc: "Lịch trực đã chính thức được hoán đổi"
    },
    rejected: { 
      label: "Bị từ chối", 
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      desc: "Yêu cầu đổi ca không được chấp thuận"
    }
  };

  const quickReasons = [
    "Bận việc gia đình đột xuất",
    "Trùng lịch học / thi chuyên môn",
    "Đổi ngày nghỉ cuối tuần",
    "Hỗ trợ ca trực cho đồng nghiệp"
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] p-6 lg:p-8 space-y-6">
      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Yêu Cầu Đổi Ca Trực</h1>
            <p className="text-slate-500 text-sm mt-0.5">Quản lý các yêu cầu hoán đổi ca làm việc giữa các dược sĩ trong chi nhánh</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          Tạo Yêu Cầu Đổi Ca
        </button>
      </div>

      {/* 2. Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tabs Navigator */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`flex-1 py-4 px-6 text-sm font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "outgoing"
                ? "border-[#0057cd] text-[#0057cd] bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <span>Yêu cầu tôi đã gửi</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
              {outgoing.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex-1 py-4 px-6 text-sm font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === "incoming"
                ? "border-[#0057cd] text-[#0057cd] bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <span>Yêu cầu gửi đến tôi</span>
            {incoming.length > 0 ? (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white animate-pulse">
                {incoming.length} cần xử lý
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                0
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
              <span className="mt-3 text-xs font-semibold text-slate-500">Đang tải danh sách đổi ca...</span>
            </div>
          ) : activeTab === "outgoing" ? (
            /* TAB 1: YEU CAU DA GUI */
            <div className="space-y-4">
              {outgoing.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0057cd] flex items-center justify-center mx-auto mb-3">
                    <Send size={24} className="opacity-60" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Bạn chưa gửi yêu cầu đổi ca nào</h3>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    Khi bạn cần đổi ngày trực hoặc ca làm việc, hãy bấm nút "Tạo Yêu Cầu Đổi Ca" ở trên để gửi đề xuất cho đồng nghiệp.
                  </p>
                </div>
              ) : (
                outgoing.map((req) => {
                  const st = statusMap[req.status] || {
                    label: req.status,
                    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
                    desc: ""
                  };

                  return (
                    <div
                      key={req._id}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/20 transition-all shadow-2xs space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${st.badgeClass}`}>
                            {st.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 italic">
                          {st.desc}
                        </div>
                      </div>

                      {/* Swap Comparison Body */}
                      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                        {/* Ca cua ban */}
                        <div className="md:col-span-5 p-4 rounded-xl bg-blue-50/60 border border-blue-100/80">
                          <div className="text-[10px] font-bold text-[#0057cd] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <User size={12} /> Ca của bạn (Đổi đi)
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            {formatShiftDate(req.requesterShiftDate)}
                          </div>
                          <div className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                            <Clock size={13} className="text-[#0057cd]" />
                            <span>{req.requesterShiftName}</span>
                          </div>
                        </div>

                        {/* Mui ten doi */}
                        <div className="md:col-span-1 flex justify-center py-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                            <ArrowRightLeft size={16} />
                          </div>
                        </div>

                        {/* Ca cua doi phuong */}
                        <div className="md:col-span-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <User size={12} /> Đổi với: <strong className="text-slate-800">{formatEmployeeName(req.targetName)}</strong>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            {formatShiftDate(req.targetShiftDate)}
                          </div>
                          <div className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-500" />
                            <span>{req.targetShiftName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ly do & phan hoi */}
                      <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <strong className="font-semibold text-slate-800">Lý do đổi:</strong> {req.reason || "Không ghi chú"}
                        </div>
                        {req.targetRejectReason && (
                          <div className="text-rose-600 font-medium">
                            <strong>Lý do từ chối:</strong> {req.targetRejectReason}
                          </div>
                        )}
                        {req.managerRejectReason && (
                          <div className="text-rose-600 font-medium">
                            <strong>Quản lý từ chối:</strong> {req.managerRejectReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* TAB 2: YEU CAU DEN TOI */
            <div className="space-y-4">
              {incoming.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} className="opacity-60" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Không có yêu cầu đổi ca nào đang chờ bạn</h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Khi đồng nghiệp muốn đổi ca làm việc với bạn, các yêu cầu sẽ xuất hiện tại đây để bạn xem xét và chấp thuận.
                  </p>
                </div>
              ) : (
                incoming.map((req) => (
                  <div
                    key={req._id}
                    className="p-5 rounded-2xl border-2 border-blue-200/80 bg-blue-50/10 hover:bg-blue-50/20 transition-all shadow-xs space-y-4"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                          Chờ bạn xác nhận
                        </span>
                        <span className="text-xs text-slate-400">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Đồng nghiệp <strong className="text-slate-800">{formatEmployeeName(req.requesterName)}</strong> muốn đổi ca với bạn
                      </div>
                    </div>

                    {/* Swap comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                      <div className="md:col-span-5 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80">
                        <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                          Ca hiện tại của bạn (Bạn sẽ nhường)
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {formatShiftDate(req.targetShiftDate)}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <Clock size={13} className="text-amber-600" />
                          <span>{req.targetShiftName}</span>
                        </div>
                      </div>

                      <div className="md:col-span-1 flex justify-center py-1">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                          <ArrowRightLeft size={16} />
                        </div>
                      </div>

                      <div className="md:col-span-5 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                          Ca bạn sẽ nhận lại từ {formatEmployeeName(req.requesterName)}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                          {formatShiftDate(req.requesterShiftDate)}
                        </div>
                        <div className="text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <Clock size={13} className="text-emerald-600" />
                          <span>{req.requesterShiftName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-100">
                      <strong className="font-semibold text-slate-900">Lý do từ đồng nghiệp:</strong> {req.reason || "Không ghi chú"}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleRejectClick(req)}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 flex items-center gap-1.5"
                      >
                        <XCircle size={15} />
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={submittingAction}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={15} />
                        Đồng ý đổi ca
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL: TAO YEU CAU DOI CA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => !submittingAction && setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0057cd] flex items-center justify-center font-bold">
                  <ArrowRightLeft size={16} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Tạo Yêu Cầu Đổi Ca</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {modalLoading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
                <span className="mt-3 text-xs font-semibold text-slate-500">Đang nạp lịch trực và danh sách đồng nghiệp...</span>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {/* 1. Chon ca cua ban */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    1. Ca trực của bạn muốn đổi <span className="text-rose-500">*</span>
                  </label>
                  {myAssignments.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-amber-600" />
                      <span>Bạn chưa có ca trực nào được phân công trong 2 tuần tới.</span>
                    </div>
                  ) : (
                    <select
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] outline-none transition-all"
                      value={formData.myShiftInfo}
                      onChange={(e) => setFormData({ ...formData, myShiftInfo: e.target.value })}
                    >
                      <option value="" disabled>-- Chọn ca trực của bạn --</option>
                      {myAssignments.map((a, i) => (
                        <option key={i} value={JSON.stringify(a)}>
                          {formatShiftDate(a.date)} • {a.shiftName} ({a.shiftStart} - {a.shiftEnd})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Chon dong nghiep */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Chọn đồng nghiệp muốn đổi ca <span className="text-rose-500">*</span>
                  </label>
                  {employees.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      Chưa tìm thấy đồng nghiệp nào có lịch trực cùng chi nhánh.
                    </div>
                  ) : (
                    <select
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] outline-none transition-all"
                      value={formData.targetId}
                      onChange={(e) => setFormData({ ...formData, targetId: e.target.value, targetShiftInfo: "" })}
                    >
                      <option value="" disabled>-- Chọn dược sĩ đồng nghiệp --</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {formatEmployeeName(emp.fullName)} (Dược sĩ)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 3. Chon ca cua doi phuong */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Ca trực của đồng nghiệp muốn nhận lại <span className="text-rose-500">*</span>
                  </label>
                  {!formData.targetId ? (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                      Vui lòng chọn đồng nghiệp ở bước 2 trước
                    </div>
                  ) : availableTargetShifts.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-amber-600" />
                      <span>Đồng nghiệp này chưa có ca trực nào trong 2 tuần tới để đổi.</span>
                    </div>
                  ) : (
                    <select
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] outline-none transition-all"
                      value={formData.targetShiftInfo}
                      onChange={(e) => setFormData({ ...formData, targetShiftInfo: e.target.value })}
                    >
                      <option value="" disabled>-- Chọn ca bạn muốn trực thay --</option>
                      {availableTargetShifts.map((a, i) => (
                        <option key={i} value={JSON.stringify(a)}>
                          {formatShiftDate(a.date)} • {a.shiftName} ({a.shiftStart} - {a.shiftEnd})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. Ly do doi ca */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    4. Lý do đổi ca <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {quickReasons.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, reason: r })}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-[#0057cd] text-slate-600 rounded-lg transition-colors border border-slate-200/80"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    required
                    rows={2}
                    placeholder="Nhập lý do đổi ca của bạn..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] outline-none"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                {/* Info Alert */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-[#0057cd] leading-relaxed flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>Quy trình phê duyệt:</strong> Yêu cầu sẽ được gửi tới đồng nghiệp để xác nhận trước. Sau khi đồng nghiệp đồng ý, Quản lý chi nhánh sẽ phê duyệt chính thức để cập nhật bảng phân công ca.
                  </span>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submittingAction}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction || myAssignments.length === 0 || !formData.targetId || availableTargetShifts.length === 0}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#0057cd] hover:bg-[#00419e] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {submittingAction ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        Gửi Yêu Cầu
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL: TU CHOI DOI CA */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => !submittingAction && setRejectModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Từ chối yêu cầu đổi ca</h3>
            <p className="text-xs text-slate-500 mb-4">
              Vui lòng cho đồng nghiệp biết lý do bạn không thể đổi ca này.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Bận việc cá nhân không thể trực thay..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  {submittingAction ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
