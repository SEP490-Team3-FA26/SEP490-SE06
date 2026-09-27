import React, { useState, useEffect } from "react";
import { hrService, ShiftSwapRequest, WorkSchedule, WorkShift } from "../../services/hr/hr.service";
import { employeeService, Employee } from "../../services/admin/employee.service";
import { authService } from "../../services/auth/auth.service";
import { ArrowRightLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export function PharmacistShiftSwap() {
  const [activeTab, setActiveTab] = useState<"outgoing" | "incoming">("outgoing");
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // For creating swap request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]); // simplified
  const [targetAssignments, setTargetAssignments] = useState<any[]>([]);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [formData, setFormData] = useState({
    myShiftInfo: "", // stringified JSON to store all info easily
    targetId: "",
    targetShiftInfo: "",
    reason: ""
  });

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
  const userId = getUserId();

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const data = await hrService.listMySwaps();
      setSwaps(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwaps();
  }, []);

  const outgoing = swaps.filter(s => s.requesterId === userId);
  const incoming = swaps.filter(s => s.targetId === userId && s.status === 'pending_target');

  const openCreateModal = async () => {
    setIsModalOpen(true);
    setFormData({ myShiftInfo: "", targetId: "", targetShiftInfo: "", reason: "" });
    try {
      // Load current week and next week schedules to find assignments
      const curr = new Date();
      const next = new Date(curr);
      next.setDate(next.getDate() + 7);
      
      const mon1 = new Date(curr.setDate(curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1))).toISOString().split('T')[0];
      const mon2 = new Date(next.setDate(next.getDate() - next.getDay() + (next.getDay() === 0 ? -6 : 1))).toISOString().split('T')[0];

      const [sched1, sched2, emps] = await Promise.all([
        hrService.getMyWeekSchedule(mon1),
        hrService.getMyWeekSchedule(mon2),
        employeeService.getEmployees({ branchId: getBranchId() })
      ]);

      const allAssignments = [];
      if (sched1 && sched1.status === 'published') allAssignments.push(...sched1.assignments);
      if (sched2 && sched2.status === 'published') allAssignments.push(...sched2.assignments);

      const mine = allAssignments.filter(a => a.employeeId === userId);
      setMyAssignments(mine);
      setEmployees(emps.filter(e => e._id !== userId));
      setTargetAssignments(allAssignments); // all published assignments
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.myShiftInfo || !formData.targetId || !formData.targetShiftInfo) {
      alert("Vui lòng chọn đầy đủ thông tin");
      return;
    }
    const myShift = JSON.parse(formData.myShiftInfo);
    const targetShift = JSON.parse(formData.targetShiftInfo);
    const targetEmp = employees.find(e => e._id === formData.targetId);

    try {
      await hrService.createSwap({
        requesterShiftDate: myShift.date,
        requesterShiftId: myShift.shiftId,
        requesterShiftName: myShift.shiftName,
        targetId: formData.targetId,
        targetName: targetEmp?.fullName || "",
        targetShiftDate: targetShift.date,
        targetShiftId: targetShift.shiftId,
        targetShiftName: targetShift.shiftName,
        reason: formData.reason
      });
      setIsModalOpen(false);
      fetchSwaps();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tạo yêu cầu");
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await hrService.targetRespond(id, { response: "accepted" });
      fetchSwaps();
    } catch (err: any) {
      alert("Lỗi chấp nhận");
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
      await hrService.targetRespond(selectedRequest._id, { response: "rejected", rejectReason });
      setRejectModalOpen(false);
      fetchSwaps();
    } catch (err: any) {
      alert("Lỗi từ chối");
    }
  };

  const statusMap = {
    pending_target: { label: "Chờ đối phương", color: "bg-yellow-100 text-yellow-800" },
    pending_manager: { label: "Chờ QL Duyệt", color: "bg-orange-100 text-orange-800" },
    approved: { label: "Đã Duyệt", color: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Từ Chối", color: "bg-rose-100 text-rose-800" }
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Yêu Cầu Đổi Ca</h1>
          <p className="text-slate-500 mt-1">Gửi và xác nhận yêu cầu đổi ca làm việc</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'outgoing' ? 'border-[#0057cd] text-[#0057cd]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Yêu cầu của tôi
          </button>
          <button
            onClick={() => setActiveTab("incoming")}
            className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'incoming' ? 'border-[#0057cd] text-[#0057cd]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Yêu cầu đến tôi
            {incoming.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{incoming.length}</span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === "outgoing" && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={openCreateModal} className="px-4 py-2 bg-[#0057cd] text-white font-bold rounded-lg text-sm hover:bg-[#00419e] transition-colors">
                  + Tạo Yêu Cầu Đổi Ca
                </button>
              </div>
              <div className="space-y-4">
                {outgoing.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Bạn chưa gửi yêu cầu nào.</p>
                ) : (
                  outgoing.map(req => {
                    const st = statusMap[req.status] || { label: req.status, color: "bg-slate-100 text-slate-800" };
                    return (
                      <div key={req._id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ca của bạn</div>
                            <div className="font-semibold text-slate-800">{new Date(req.requesterShiftDate).toLocaleDateString('vi-VN')}</div>
                            <div className="text-sm text-slate-600">{req.requesterShiftName}</div>
                          </div>
                          <ArrowRightLeft className="text-slate-300" />
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ca của {req.targetName}</div>
                            <div className="font-semibold text-slate-800">{new Date(req.targetShiftDate).toLocaleDateString('vi-VN')}</div>
                            <div className="text-sm text-slate-600">{req.targetShiftName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold mb-2 ${st.color}`}>
                            {st.label}
                          </div>
                          <div className="text-xs text-slate-500">Lý do: {req.reason}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "incoming" && (
            <div className="space-y-4">
              {incoming.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Không có yêu cầu đổi ca nào gửi đến bạn.</p>
              ) : (
                incoming.map(req => (
                  <div key={req._id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ca của bạn</div>
                        <div className="font-semibold text-slate-800">{new Date(req.targetShiftDate).toLocaleDateString('vi-VN')}</div>
                        <div className="text-sm text-slate-600">{req.targetShiftName}</div>
                      </div>
                      <ArrowRightLeft className="text-slate-300" />
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Ca của {req.requesterName}</div>
                        <div className="font-semibold text-slate-800">{new Date(req.requesterShiftDate).toLocaleDateString('vi-VN')}</div>
                        <div className="text-sm text-slate-600">{req.requesterShiftName}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req._id)} className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-sm hover:bg-emerald-200 transition-colors">
                        Đồng ý
                      </button>
                      <button onClick={() => handleRejectClick(req)} className="px-4 py-2 bg-rose-100 text-rose-700 font-bold rounded-lg text-sm hover:bg-rose-200 transition-colors">
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-4">Tạo Yêu Cầu Đổi Ca</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ca của bạn *</label>
                <select 
                  required 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  value={formData.myShiftInfo}
                  onChange={e => setFormData({...formData, myShiftInfo: e.target.value})}
                >
                  <option value="" disabled>Chọn ca...</option>
                  {myAssignments.map((a, i) => (
                    <option key={i} value={JSON.stringify(a)}>{new Date(a.date).toLocaleDateString('vi-VN')} - {a.shiftName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đổi với nhân viên *</label>
                <select 
                  required 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  value={formData.targetId}
                  onChange={e => setFormData({...formData, targetId: e.target.value, targetShiftInfo: ""})}
                >
                  <option value="" disabled>Chọn người...</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{e.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ca của đối phương *</label>
                <select 
                  required 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  value={formData.targetShiftInfo}
                  onChange={e => setFormData({...formData, targetShiftInfo: e.target.value})}
                  disabled={!formData.targetId}
                >
                  <option value="" disabled>Chọn ca...</option>
                  {targetAssignments.filter(a => a.employeeId === formData.targetId).map((a, i) => (
                    <option key={i} value={JSON.stringify(a)}>{new Date(a.date).toLocaleDateString('vi-VN')} - {a.shiftName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lý do đổi ca *</label>
                <textarea required rows={2} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#0057cd] hover:bg-[#00419e] rounded-xl">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
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
                <textarea required rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do..." />
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
