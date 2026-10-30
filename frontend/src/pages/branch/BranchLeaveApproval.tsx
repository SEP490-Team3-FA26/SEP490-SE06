import React, { useState, useEffect } from "react";
import { hrService, LeaveRequest, LeaveType } from "../../services/hr/hr.service";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  ShieldAlert,
  Search,
  Filter,
} from "lucide-react";

const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; badgeClass: string }> = {
  ANNUAL_PAID: {
    label: "Phép năm (Có lương)",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  SICK_LEAVE: {
    label: "Nghỉ ốm (BHXH)",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  UNPAID: {
    label: "Nghỉ không lương",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
  SPECIAL_PAID: {
    label: "Việc riêng (Có lương)",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: any }> = {
  PENDING: { label: "Chờ Duyệt", badgeClass: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  APPROVED: { label: "Đã Phê Duyệt", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Đã Từ Chối", badgeClass: "bg-rose-100 text-rose-800 border-rose-300", icon: XCircle },
  CANCELLED: { label: "Đã Hủy", badgeClass: "bg-slate-100 text-slate-600 border-slate-300", icon: XCircle },
};

export function BranchLeaveApproval() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal Tu choi
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await hrService.getBranchLeaves(filterStatus === "ALL" ? undefined : filterStatus);
      setRequests(data || []);
    } catch (err) {
      console.error("Loi khi tai danh sach don xin nghi chi nhanh:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleApprove = async (leave: LeaveRequest) => {
    const confirmMsg = leave.isWarningGppUnderstaffed
      ? `CẢNH BÁO ĐỊNH BIÊN GPP: Sau khi duyệt cho ${leave.requesterName}, ca trực ${leave.shiftName} ngày ${leave.shiftDate} sẽ bị thiếu người trực! Bạn có chắc chắn muốn duyệt và sẽ tự điều phối người thay thế?`
      : `Bạn có chắc chắn muốn phê duyệt đơn xin nghỉ ca của ${leave.requesterName}?`;

    if (window.confirm(confirmMsg)) {
      try {
        setActionLoading(true);
        await hrService.respondLeave(leave._id, {
          action: "approve",
          managerNote: "Đã duyệt bởi Quản lý cơ sở",
        });
        await fetchRequests();
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi duyệt đơn");
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleRejectClick = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;

    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối đơn");
      return;
    }

    try {
      setActionLoading(true);
      await hrService.respondLeave(selectedLeave._id, {
        action: "reject",
        managerNote: rejectReason.trim(),
      });
      setRejectModalOpen(false);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi từ chối đơn");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const understaffedCount = requests.filter((r) => r.status === "PENDING" && r.isWarningGppUnderstaffed).length;

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.requesterName.toLowerCase().includes(term) ||
      r.shiftName.toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-emerald-600" />
          Phê Duyệt Đơn Xin Nghỉ Phép (Cơ Sở)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Thẩm định đơn xin nghỉ ca, kiểm soát định biên nhân sự GPP và trực tiếp ra quyết định phê duyệt tại chi nhánh
        </p>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đơn Đang Chờ Duyệt
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{pendingCount}</span>
            <span className="text-sm font-medium text-slate-500">đơn cần xử lý</span>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Cảnh Báo Thiếu Định Biên GPP
            </span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-700">{understaffedCount}</span>
            <span className="text-sm font-medium text-rose-600">ca thiếu người</span>
          </div>
          <p className="text-xs text-rose-600/80 mt-1">Cần cử nhân sự trực thay nếu duyệt</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Thẩm Quyền Phê Duyệt
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">Quản Lý Chi Nhánh</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Tự quyết 100% không qua cấp trên</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { key: "PENDING", label: "Chờ Duyệt" },
            { key: "APPROVED", label: "Đã Duyệt" },
            { key: "REJECTED", label: "Đã Từ Chối" },
            { key: "ALL", label: "Tất Cả" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                filterStatus === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, ca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Danh sach don */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách đơn xin nghỉ...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Không có đơn xin nghỉ nào cần xử lý</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((leave) => {
            const typeConfig = LEAVE_TYPE_CONFIG[leave.leaveType] || LEAVE_TYPE_CONFIG.UNPAID;
            const statusConfig = STATUS_CONFIG[leave.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={leave._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{leave.requesterName}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{leave.requesterRole}</div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.badgeClass}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Loai nghi & Ca truc */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeConfig.badgeClass}`}>
                        {typeConfig.label}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1">
                      <div className="font-bold text-slate-900">{leave.shiftName}</div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <span>Ngày: <strong className="text-slate-800">{leave.shiftDate}</strong></span>
                        <span>Giờ: {leave.startTime} - {leave.endTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Canh bao dinh bien GPP */}
                  {leave.isWarningGppUnderstaffed && leave.status === "PENDING" && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 mb-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-amber-950 font-bold">Cảnh báo định biên GPP:</strong>
                        Nếu duyệt cho nhân sự này, ca trực sẽ không còn ai đứng quầy! Quản lý phải chủ động điều phối người trực thay.
                      </div>
                    </div>
                  )}

                  {/* Ly do */}
                  <div className="text-xs text-slate-600 mb-3">
                    <span className="font-semibold text-slate-700">Lý do xin nghỉ: </span>
                    {leave.reason}
                  </div>

                  {/* Minh chung y te */}
                  {leave.attachmentUrl && (
                    <div className="mb-3">
                      <a
                        href={leave.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Xem giấy tờ minh chứng đính kèm
                      </a>
                    </div>
                  )}

                  {/* Phan hoi cua Quan ly neu da duyet/tu choi */}
                  {leave.managerNote && (
                    <div className="text-xs bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg mb-3">
                      <span className="font-semibold">Ghi chú quản lý: </span>
                      {leave.managerNote}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Gửi: {new Date(leave.createdAt).toLocaleDateString("vi-VN")}
                  </span>

                  {leave.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectClick(leave)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Từ Chối
                      </button>
                      <button
                        onClick={() => handleApprove(leave)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                      >
                        Phê Duyệt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tu Choi */}
      {rejectModalOpen && selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Từ Chối Đơn Xin Nghỉ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nhập lý do từ chối để thông báo lại cho nhân viên <strong>{selectedLeave.requesterName}</strong>:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Ca trực không đủ nhân sự thay thế, thời gian báo quá gấp..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? "Đang xử lý..." : "Xác Nhận Từ Chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
