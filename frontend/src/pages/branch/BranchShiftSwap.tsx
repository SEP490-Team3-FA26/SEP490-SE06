import React, { useState, useEffect } from "react";
import { hrService, ShiftSwapRequest } from "../../services/hr/hr.service";
import { Clock, CheckCircle2, XCircle, ArrowRightLeft, AlertTriangle } from "lucide-react";

export function BranchShiftSwap() {
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await hrService.listSwaps(filter || undefined);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleApprove = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu đổi ca này? Lịch sẽ được hoán đổi ngay lập tức.")) {
      try {
        await hrService.managerRespond(id, { response: "approved" });
        fetchRequests();
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi khi duyệt");
      }
    }
  };

  const handleRejectClick = (req: ShiftSwapRequest) => {
    setSelectedRequest(req);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await hrService.managerRespond(selectedRequest._id, { response: "rejected", rejectReason });
      setRejectModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi từ chối");
    }
  };

  const statusMap = {
    pending_target: { label: "Chờ NV Xác Nhận", color: "bg-yellow-100 text-yellow-800" },
    pending_manager: { label: "Chờ QL Duyệt", color: "bg-orange-100 text-orange-800" },
    approved: { label: "Đã Duyệt", color: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Từ Chối", color: "bg-rose-100 text-rose-800" }
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Duyệt Yêu Cầu Đổi Ca</h1>
        <p className="text-slate-500 mt-1">Quản lý các yêu cầu đổi ca làm việc của nhân viên</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-2 mb-6">
        {[
          { value: "", label: "Tất cả" },
          { value: "pending_manager", label: "Chờ QL Duyệt" },
          { value: "approved", label: "Đã Duyệt" },
          { value: "rejected", label: "Từ Chối" },
          { value: "pending_target", label: "Chờ NV Xác Nhận" }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === f.value ? 'bg-[#0057cd] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Nhân viên A (Yêu cầu)</th>
                <th className="px-4 py-4 text-center">Đổi với</th>
                <th className="px-6 py-4">Nhân viên B (Được yêu cầu)</th>
                <th className="px-6 py-4">Lý do</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
              ) : (
                requests.map(req => {
                  const statusInfo = statusMap[req.status] || { label: req.status, color: "bg-slate-100 text-slate-800" };
                  return (
                    <tr key={req._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{req.requesterName}</div>
                        <div className="text-xs text-slate-500">{new Date(req.requesterShiftDate).toLocaleDateString('vi-VN')} • {req.requesterShiftName}</div>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400">
                        <ArrowRightLeft size={20} className="mx-auto" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{req.targetName}</div>
                        <div className="text-xs text-slate-500">{new Date(req.targetShiftDate).toLocaleDateString('vi-VN')} • {req.targetShiftName}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-slate-600" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'pending_manager' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleApprove(req._id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Duyệt">
                              <CheckCircle2 size={18} />
                            </button>
                            <button onClick={() => handleRejectClick(req)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Từ chối">
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setRejectModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Từ chối đổi ca</h2>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lý do từ chối *</label>
                <textarea 
                  required 
                  rows={3} 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500" 
                  value={rejectReason} 
                  onChange={e => setRejectReason(e.target.value)} 
                  placeholder="Nhập lý do..." 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setRejectModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl">Từ chối</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
