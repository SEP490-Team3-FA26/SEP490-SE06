import React, { useState, useEffect } from "react";
import { hrService, LeaveRequest, LeaveType } from "../../services/hr/hr.service";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Upload,
  ShieldAlert,
  Trash2,
  CalendarDays,
  FileCheck2,
} from "lucide-react";

const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; desc: string; badgeClass: string }> = {
  ANNUAL_PAID: {
    label: "Phép năm (Có lương)",
    desc: "Hưởng nguyên lương, trừ 1 ngày vào quỹ phép năm",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  SICK_LEAVE: {
    label: "Nghỉ ốm (Chế độ BHXH)",
    desc: "Cần kèm giấy ra viện / chỉ định y tế hưởng trợ cấp BHXH",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  UNPAID: {
    label: "Nghỉ không lương",
    desc: "Nghỉ việc riêng không hưởng lương ca này",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  SPECIAL_PAID: {
    label: "Việc riêng theo Luật (Có lương)",
    desc: "Cưới hỏi, tang chế theo Bộ Luật Lao động (hưởng lương)",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  PENDING: { label: "Chờ Quản Lý Duyệt", badgeClass: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  APPROVED: { label: "Đã Phê Duyệt", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Bị Từ Chối", badgeClass: "bg-rose-100 text-rose-800 border-rose-300", icon: XCircle },
  CANCELLED: { label: "Đã Hủy", badgeClass: "bg-slate-100 text-slate-600 border-slate-300", icon: Trash2 },
};

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
}

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PharmacistLeaveRequest() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<number>(12);
  const [used, setUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<string>("ALL");

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form Fields
  const [shiftDate, setShiftDate] = useState<string>(formatDate(new Date()));
  const [shiftName, setShiftName] = useState<string>("Ca Sáng (06:30 - 14:30)");
  const [shiftId, setShiftId] = useState<string>("shift-1");
  const [startTime, setStartTime] = useState<string>("06:30");
  const [endTime, setEndTime] = useState<string>("14:30");
  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL_PAID");
  const [reason, setReason] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [assignedShiftsToday, setAssignedShiftsToday] = useState<any[]>([]);

  // Lấy ID người dùng hiện tại từ token / localStorage
  const getUserInfo = () => {
    const userStr = localStorage.getItem("user");
    let userObj: any = null;
    try {
      userObj = userStr ? JSON.parse(userStr) : null;
    } catch {}

    let id = userObj?._id || userObj?.id || userObj?.sub || "";
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
      } catch {}
    }
    return { id };
  };
  const { id: currentUserId } = getUserInfo();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await hrService.getMyLeaves();
      setLeaves(res.leaves || []);
      setBalance(res.balance ?? 12);
      setUsed(res.used ?? 0);
    } catch (err) {
      console.error("Loi tai danh sach don xin nghi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Tự động lấy danh sách ca trực của chính bản thân trong ngày được chọn
  useEffect(() => {
    async function loadAssignedShifts() {
      try {
        const mon = getMonday(new Date(shiftDate));
        const weekData = await hrService.getMyWeekSchedule(formatDate(mon));
        if (weekData && weekData.assignments) {
          const myMatches = weekData.assignments.filter(
            (a) =>
              (!currentUserId || a.employeeId?.toString() === currentUserId.toString()) &&
              new Date(a.date).toISOString().slice(0, 10) === shiftDate
          );
          setAssignedShiftsToday(myMatches);

          if (myMatches.length > 0) {
            const first = myMatches[0];
            setShiftId(first.shiftId);
            setShiftName(first.shiftName);
            setStartTime(first.shiftStart || "06:00");
            setEndTime(first.shiftEnd || "14:00");
          } else {
            setShiftId("");
            setShiftName("");
          }
        }
      } catch (e) {
        // Fallback default
      }
    }
    loadAssignedShifts();
  }, [shiftDate, currentUserId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await hrService.uploadLeaveAttachment(file);
      setAttachmentUrl(res.url || res.secure_url || "");
    } catch (err: any) {
      alert("Lỗi tải tệp: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (!reason.trim() || reason.trim().length < 5) {
      setFormError("Vui lòng nêu rõ lý do xin nghỉ (tối thiểu 5 ký tự)");
      return;
    }

    if (leaveType === "ANNUAL_PAID" && balance < 1) {
      setFormError("Số dư phép năm của bạn không đủ (còn 0 ngày). Vui lòng chọn Nghỉ không lương.");
      return;
    }

    try {
      setSubmitting(true);
      await hrService.createLeave({
        shiftDate,
        shiftId,
        shiftName,
        startTime,
        endTime,
        leaveType,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || undefined,
      });

      setIsModalOpen(false);
      setReason("");
      setAttachmentUrl("");
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Lỗi khi gửi đơn xin nghỉ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn xin nghỉ này?")) {
      try {
        await hrService.cancelLeave(id, "Nhân viên tự hủy đơn");
        await fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi hủy đơn");
      }
    }
  };

  const filteredLeaves = leaves.filter((item) => {
    if (filterTab === "ALL") return true;
    return item.status === filterTab;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-emerald-600" />
            Đơn Xin Nghỉ Phép & Nghỉ Ca
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý số dư phép năm, nộp đơn xin nghỉ theo ca và theo dõi trạng thái phê duyệt từ Quản lý chi nhánh
          </p>
        </div>

        <button
          onClick={() => {
            setFormError("");
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-5 h-5" />
          Tạo Đơn Xin Nghỉ Ca
        </button>
      </div>

      {/* Metric Cards */}
      {(() => {
        const approvedLeaves = leaves.filter((l) => l.status === "APPROVED");
        const approvedAnnual = approvedLeaves.filter((l) => l.leaveType === "ANNUAL_PAID").length;
        const approvedOther = approvedLeaves.filter((l) => l.leaveType !== "ANNUAL_PAID").length;
        const pendingCount = leaves.filter((l) => l.status === "PENDING").length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* The 1: Quy phep nam con lai */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Quỹ Phép Năm Khả Dụng
                </span>
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-950">{balance}</span>
                <span className="text-sm font-medium text-emerald-700">ngày công</span>
              </div>
              <p className="text-xs text-emerald-700/80 mt-1">Định mức 12 ngày/năm (hưởng 100% lương)</p>
            </div>

            {/* The 2: Phep nam da tru */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Phép Năm Đã Sử Dụng
                </span>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{used}</span>
                <span className="text-sm font-medium text-slate-500">ngày</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Chỉ trừ khi nghỉ phép năm có lương</p>
            </div>

            {/* The 3: Tong ca da duyet nghi */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tổng Ca Đã Duyệt Nghỉ
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{approvedLeaves.length}</span>
                <span className="text-sm font-medium text-slate-500">ca trực</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {approvedAnnual} phép năm · {approvedOther} không lương / BHXH
              </p>
            </div>

            {/* The 4: Don dang cho duyet */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Đơn Đang Chờ Duyệt
                </span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-600">{pendingCount}</span>
                <span className="text-sm font-medium text-amber-600">đơn</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Quản lý chi nhánh đang thẩm định</p>
            </div>
          </div>
        );
      })()}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: "ALL", label: `Tất cả (${leaves.length})` },
          { key: "PENDING", label: `Chờ duyệt (${leaves.filter((l) => l.status === "PENDING").length})` },
          { key: "APPROVED", label: `Đã duyệt (${leaves.filter((l) => l.status === "APPROVED").length})` },
          { key: "REJECTED", label: `Bị từ chối (${leaves.filter((l) => l.status === "REJECTED").length})` },
          { key: "CANCELLED", label: `Đã hủy (${leaves.filter((l) => l.status === "CANCELLED").length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              filterTab === tab.key
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách đơn xin nghỉ */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Đang tải dữ liệu đơn xin nghỉ...</div>
      ) : filteredLeaves.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Không tìm thấy đơn xin nghỉ nào phù hợp</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLeaves.map((item) => {
            const typeConfig = LEAVE_TYPE_CONFIG[item.leaveType] || LEAVE_TYPE_CONFIG.UNPAID;
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={item._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Loai nghi & Trang thai */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${typeConfig.badgeClass}`}
                    >
                      {typeConfig.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Ca truc & Ngay */}
                  <div className="space-y-1.5 mb-3">
                    <div className="text-base font-bold text-slate-900">{item.shiftName}</div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {item.shiftDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>
                  </div>

                  {/* Ly do */}
                  <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3">
                    <span className="font-semibold text-slate-700">Lý do: </span>
                    {item.reason}
                  </div>

                  {/* Minh chung neu co */}
                  {item.attachmentUrl && (
                    <div className="mb-3">
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Xem tài liệu minh chứng y tế
                      </a>
                    </div>
                  )}

                  {/* Ghi chu phan hoi cua Quan ly */}
                  {item.managerNote && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg mb-3">
                      <span className="font-semibold">Phản hồi của Quản lý ({item.managerName || "Cơ sở"}): </span>
                      {item.managerNote}
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Tạo lúc: {new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                  {item.status === "PENDING" && (
                    <button
                      onClick={() => handleCancel(item._id)}
                      className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hủy đơn này
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tao Don Xin Nghi */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Tạo Đơn Xin Nghỉ Ca Mới
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Ngay xin nghi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ngày Xin Nghỉ *
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Ca lam viec */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ca Làm Việc *
                </label>
                {assignedShiftsToday.length > 0 ? (
                  <select
                    value={shiftId}
                    onChange={(e) => {
                      const selected = assignedShiftsToday.find((s) => s.shiftId === e.target.value);
                      if (selected) {
                        setShiftId(selected.shiftId);
                        setShiftName(selected.shiftName);
                        setStartTime(selected.shiftStart || "06:00");
                        setEndTime(selected.shiftEnd || "14:00");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  >
                    {assignedShiftsToday.map((s, idx) => (
                      <option key={s.shiftId || idx} value={s.shiftId}>
                        {s.shiftName} ({s.shiftStart} - {s.shiftEnd}) [Ca của bạn]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Bạn không có lịch trực được phân công vào ngày này ({shiftDate}).</p>
                      <p className="text-slate-600 mt-0.5">Vui lòng chọn ngày bạn có lịch trực để nộp đơn xin nghỉ.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Loai nghi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Loại Nghỉ Phép *
                </label>
                <div className="space-y-2">
                  {(Object.keys(LEAVE_TYPE_CONFIG) as LeaveType[]).map((type) => {
                    const cfg = LEAVE_TYPE_CONFIG[type];
                    const isSelected = leaveType === type;
                    return (
                      <label
                        key={type}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="leaveType"
                          value={type}
                          checked={isSelected}
                          onChange={() => setLeaveType(type)}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 block">{cfg.label}</span>
                          <span className="text-slate-500">{cfg.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Ly do */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Lý Do Nghỉ Cụ Thể *
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ghi rõ lý do (ví dụ: Đi khám sức khỏe định kỳ, việc gia đình...)"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* File minh chung */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tài Liệu Minh Chứng (Giấy ra viện, Giấy ốm...)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-300">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>{uploading ? "Đang tải lên..." : "Tải ảnh/PDF lên"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {attachmentUrl && (
                    <span className="text-xs text-emerald-600 font-medium truncate max-w-[200px]">
                      Đã đính kèm tệp
                    </span>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading || assignedShiftsToday.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm disabled:opacity-50 transition-all"
                >
                  {submitting ? "Đang gửi đơn..." : "Gửi Đơn Xin Nghỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
