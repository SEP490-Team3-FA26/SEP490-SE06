import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Edit2,
  Ban,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Award,
  MapPin,
  ArrowRightLeft,
  UserPlus,
  Send,
  RefreshCw,
  Check,
} from "lucide-react";
import { employeeService, Employee, StaffTransferRequest } from "../../services/admin/employee.service";
import { BranchLocationModal } from "../../components/branch/BranchLocationModal";

function getBranchIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64));
    return decoded.branchId || null;
  } catch (e) {
    return null;
  }
}

export function BranchEmployees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentBranchId = getBranchIdFromToken() || "BR-001";

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Transfer states
  const [transferRequests, setTransferRequests] = useState<StaffTransferRequest[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferRequestsModalOpen, setIsTransferRequestsModalOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<Employee[]>([]);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Employee | null>(null);
  const [transferNote, setTransferNote] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "pharmacist",
  });

  // Conflict schedule modal state
  const [conflictModalData, setConflictModalData] = useState<{
    requestId: string;
    employeeName?: string;
    upcomingShifts: any[];
  } | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployees({ branchId: currentBranchId });
      setEmployees(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferRequests = async () => {
    try {
      const data = await employeeService.getTransferRequests();
      setTransferRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Lỗi tải yêu cầu điều chuyển:", err.message);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTransferRequests();
  }, [currentBranchId]);

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTransferCount = transferRequests.filter(r => r.status === 'pending').length;

  const handleOpenModal = (employee?: Employee) => {
    setModalError(null);
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        email: employee.email,
        password: "",
        fullName: employee.fullName,
        role: employee.role,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: "pharmacist",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setModalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      if (editingEmployee) {
        await employeeService.updateEmployee(editingEmployee._id, {
          fullName: formData.fullName,
          role: formData.role,
          branchId: currentBranchId,
        });
        setSuccessMessage("Cập nhật thông tin nhân viên thành công!");
      } else {
        await employeeService.createEmployee({
          email: formData.email,
          password: formData.password || undefined,
          fullName: formData.fullName,
          role: formData.role,
          branchId: currentBranchId,
        });
        setSuccessMessage("Cấp tài khoản nhân viên thành công! Hệ thống đã gửi email thiết lập mật khẩu đến nhân sự.");
      }
      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || "Lưu nhân viên thất bại");
    }
  };

  const handleSearchLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupQuery.trim() || lookupQuery.trim().length < 2) return;
    try {
      setIsSearchingLookup(true);
      const results = await employeeService.lookupEmployees(lookupQuery.trim());
      setLookupResults(Array.isArray(results) ? results : []);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Lỗi khi tìm kiếm nhân sự");
    } finally {
      setIsSearchingLookup(false);
    }
  };

  const handleSendTransferRequest = async () => {
    if (!selectedCandidate) return;
    try {
      setIsSubmittingTransfer(true);
      await employeeService.createTransferRequest({
        employeeId: selectedCandidate._id,
        note: transferNote,
      });
      setSuccessMessage(`Đã gửi yêu cầu tiếp nhận nhân sự ${selectedCandidate.fullName} thành công!`);
      setIsTransferModalOpen(false);
      setSelectedCandidate(null);
      setLookupQuery("");
      setLookupResults([]);
      fetchTransferRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Gửi yêu cầu thất bại");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleRespondTransfer = async (
    id: string,
    action: 'approve' | 'reject',
    scheduleResolution?: 'cancel_upcoming_shifts' | 'defer'
  ) => {
    // Neu la reject va chua confirm
    if (action === 'reject' && !scheduleResolution) {
      if (!window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu điều chuyển này?")) return;
    }

    try {
      setIsResolvingConflict(true);
      const res = await employeeService.respondTransferRequest(id, { action, scheduleResolution });
      
      // Kiem tra neu co xung dot ca truc chua hoan thanh
      if (res?.hasConflict || res?.code === 'HAS_UPCOMING_SHIFTS' || (res?.upcomingShifts && res.upcomingShifts.length > 0)) {
        const reqItem = transferRequests.find(r => r._id === id);
        setConflictModalData({
          requestId: id,
          employeeName: reqItem?.employeeName || "Nhân viên",
          upcomingShifts: res.upcomingShifts || [],
        });
        return;
      }

      setConflictModalData(null);
      if (scheduleResolution === 'defer') {
        setSuccessMessage("Đã tạm hoãn điều chuyển! Nhân viên sẽ tiếp tục hoàn thành các ca trực tuần này tại cơ sở cũ.");
      } else if (scheduleResolution === 'cancel_upcoming_shifts') {
        setSuccessMessage("Đã hủy các ca trực sắp tới và hoàn tất điều chuyển nhân sự sang cơ sở mới!");
      } else {
        setSuccessMessage(action === 'approve' ? "Đã đồng ý điều chuyển nhân sự!" : "Đã từ chối yêu cầu điều chuyển.");
      }
      fetchTransferRequests();
      fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const resData = err.response?.data;
      const errMsg = typeof resData === 'string' ? resData : resData?.message;
      const isConflict = resData?.code === 'HAS_UPCOMING_SHIFTS' || 
                         resData?.hasConflict || 
                         (typeof errMsg === 'string' && (errMsg.includes('ca truc') || errMsg.includes('lich lam viec')));

      if (isConflict) {
        const reqItem = transferRequests.find(r => r._id === id);
        setConflictModalData({
          requestId: id,
          employeeName: reqItem?.employeeName || "Nhân viên",
          upcomingShifts: resData?.upcomingShifts || [],
        });
        return;
      }
      alert(errMsg || err.message || "Thao tác thất bại");
    } finally {
      setIsResolvingConflict(false);
    }
  };

  const handleToggleBan = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn thay đổi trạng thái của nhân viên này?")) {
      try {
        await employeeService.toggleBanEmployee(id);
        fetchData();
      } catch (err: any) {
        setError(err.response?.data?.message || "Thao tác thất bại");
      }
    }
  };



  const roleMap: Record<string, { label: string; color: string }> = {
    pharmacist: { label: "Dược sĩ Chi nhánh", color: "bg-green-100 text-green-800" },
    branch: { label: "Quản lý Chi nhánh", color: "bg-indigo-100 text-indigo-800" },
  };

  return (
    <div className="space-y-6 flex flex-col min-h-full bg-[#faf8ff] p-6 lg:p-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Nhân sự Chi nhánh ({currentBranchId})
          </h1>
          <p className="text-slate-500 mt-1">Danh sách dược sĩ và nhân viên làm việc tại chi nhánh hiện tại</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors flex items-center gap-2 border border-emerald-200 text-sm whitespace-nowrap shadow-xs"
          >
            <MapPin size={17} />
            Cài Đặt GPS
          </button>
          <Link
            to="/branch/certificates"
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors flex items-center gap-2 border border-indigo-200 text-sm whitespace-nowrap shadow-xs"
          >
            <Award size={17} />
            CCHN
          </Link>
          <button
            onClick={() => setIsTransferRequestsModalOpen(true)}
            className="relative px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl transition-colors flex items-center gap-2 border border-amber-200 text-sm whitespace-nowrap shadow-xs"
          >
            <ArrowRightLeft size={17} />
            Yêu Cầu Điều Chuyển
            {pendingTransferCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-xs font-bold leading-tight">
                {pendingTransferCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setIsTransferModalOpen(true);
              setSelectedCandidate(null);
              setLookupQuery("");
              setLookupResults([]);
            }}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl transition-colors flex items-center gap-2 border border-purple-200 text-sm whitespace-nowrap shadow-xs"
          >
            <UserPlus size={17} />
            Tiếp Nhận Nhân Sự
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-xs flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <Plus size={17} />
            Cấp Account Mới
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email nhân viên..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
          <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600" />
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
          <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
          <p className="text-rose-600 text-sm font-semibold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Họ và tên</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Chức vụ</th>
                  <th className="px-6 py-4">Chi nhánh</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      Không tìm thấy nhân viên nào thuộc chi nhánh này.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const roleInfo = roleMap[emp.role] || { label: emp.role, color: "bg-slate-100 text-slate-800" };
                    return (
                      <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{emp.fullName}</td>
                        <td className="px-6 py-4 text-slate-600">{emp.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{emp.branchId || currentBranchId}</td>
                        <td className="px-6 py-4">
                          {emp.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                              Đã khóa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(emp)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleToggleBan(emp._id)}
                              className={`p-2 rounded-lg transition-colors ${
                                emp.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={emp.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            >
                              {emp.isActive ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cấp / Chỉnh sửa tài khoản */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEmployee ? "Cập nhật Nhân viên" : "Cấp Account Nhân viên Chi nhánh"}
              </h2>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle size={18} className="flex-shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    disabled={!!editingEmployee}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] disabled:bg-slate-100"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="VD: duocsi1@vinapharmacy.com"
                  />
                </div>
              </div>

              {!editingEmployee && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Mật khẩu khởi tạo (Tùy chọn)
                    </label>
                    <span className="text-[11px] text-[#0057cd] font-medium">Tự sinh nếu để trống</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Để trống hệ thống sẽ tự sinh ngẫu nhiên an toàn..."
                    />
                  </div>
                  <div className="mt-2 bg-blue-50 border border-blue-200 text-blue-800 p-2.5 rounded-xl text-xs flex items-start gap-2">
                    <Mail size={15} className="text-[#0057cd] shrink-0 mt-0.5" />
                    <span>Hệ thống sẽ tự động gửi email chào mừng kèm mã xác nhận và liên kết thiết lập mật khẩu đến hộp thư Gmail của nhân viên mới.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Họ và tên *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="VD: Nguyễn Văn Dược"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vai trò *</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] bg-white"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="pharmacist">Dược sĩ Chi nhánh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chi nhánh trực thuộc</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    disabled
                    value={currentBranchId}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-600 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0057cd] text-white rounded-xl font-bold hover:bg-[#00419e] text-sm"
                >
                  {editingEmployee ? "Lưu thay đổi" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Tiếp Nhận Nhân Sự Từ Chi Nhánh Khác */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tiếp Nhận Nhân Sự Chi Nhánh Khác</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tuyển nhân sự đã có tài khoản vào cơ sở ({currentBranchId})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {!selectedCandidate ? (
                <>
                  <form onSubmit={handleSearchLookup} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                      <input
                        type="text"
                        placeholder="Nhập email, số điện thoại hoặc họ tên..."
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingLookup || lookupQuery.trim().length < 2}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isSearchingLookup ? "Đang tìm..." : "Tra Cứu"}
                    </button>
                  </form>

                  <div className="space-y-2 mt-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kết quả tìm kiếm</span>
                    {lookupResults.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        {isSearchingLookup
                          ? "Đang tra cứu cơ sở dữ liệu..."
                          : "Nhập ít nhất 2 ký tự và bấm Tra Cứu để tìm nhân sự."}
                      </div>
                    ) : (
                      lookupResults.map((cand) => {
                        const isCurrentBranch = cand.branchId === currentBranchId;
                        return (
                          <div
                            key={cand._id}
                            className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between hover:border-purple-300 bg-white hover:bg-purple-50/30 transition-all"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="font-bold text-slate-800 text-sm">{cand.fullName}</div>
                              <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                                <span>{cand.email}</span>
                                {cand.phone && <span>• {cand.phone}</span>}
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                                  {cand.branchId ? `Cơ sở: ${cand.branchId}` : "Chưa phân cơ sở"}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Dược sĩ
                                </span>
                              </div>
                            </div>

                            {isCurrentBranch ? (
                              <span className="text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-100 rounded-lg shrink-0">
                                Đã ở cơ sở này
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedCandidate(cand)}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                Chọn Tiếp Nhận
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">Nhân sự được chọn</div>
                        <div className="text-base font-bold text-slate-900 mt-1">{selectedCandidate.fullName}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{selectedCandidate.email} {selectedCandidate.phone ? `• ${selectedCandidate.phone}` : ''}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Chi nhánh hiện tại: <strong>{selectedCandidate.branchId || "Chưa phân chi nhánh"}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCandidate(null)}
                        className="text-xs font-bold text-purple-700 hover:underline"
                      >
                        Đổi người khác
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Ghi chú / Lý do điều chuyển (Tùy chọn)
                    </label>
                    <textarea
                      rows={3}
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      placeholder="VD: Điều chuyển tăng cường nhân sự trực ca tại chi nhánh mới..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs leading-relaxed">
                    Yêu cầu điều chuyển sẽ được gửi đến nhân viên và quản lý cơ sở cũ. Khi đối tượng xác nhận Chấp thuận trên hệ thống, tài khoản nhân viên sẽ tự động chuyển về chi nhánh <strong>{currentBranchId}</strong>.
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingTransfer}
                      onClick={() => setSelectedCandidate(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingTransfer}
                      onClick={handleSendTransferRequest}
                      className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Send size={15} />
                      {isSubmittingTransfer ? "Đang gửi..." : "Gửi Yêu Cầu Tiếp Nhận"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Quản Lý Yêu Cầu Điều Chuyển (Pending & Lịch Sử) */}
      {isTransferRequestsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Danh Sách Yêu Cầu Điều Chuyển Nhân Sự</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Theo dõi và phê duyệt tiếp nhận nhân sự chi nhánh ({currentBranchId})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferRequestsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto">
              {transferRequests.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Hiện chưa có yêu cầu điều chuyển nào liên quan đến cơ sở của bạn.
                </div>
              ) : (
                transferRequests.map((req) => {
                  const isIncomingTransfer = req.toBranchId === currentBranchId;
                  const isOutgoingHandover = req.fromBranchId === currentBranchId;
                  const isPending = req.status === 'pending';

                  return (
                    <div
                      key={req._id}
                      className="p-4 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {req.employeeName}
                            <span className="text-xs font-normal text-slate-500">({req.employeeEmail})</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                            <span className="font-semibold text-slate-700">
                              {req.fromBranchId ? `Từ ${req.fromBranchId}` : "Nhân sự tự do"}
                            </span>
                            <span>→</span>
                            <span className="font-semibold text-[#0057cd]">Đến {req.toBranchId}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {req.status === 'pending' && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                              Chờ phê duyệt
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã chấp thuận
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                              Đã từ chối
                            </span>
                          )}
                        </div>
                      </div>

                      {req.note && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                          <span className="font-medium text-slate-500">Ghi chú:</span> {req.note}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Người yêu cầu: {req.requesterName}</span>
                        {/* Nút hành động nếu là bên bàn giao và đang pending */}
                        {isOutgoingHandover && isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRespondTransfer(req._id, 'reject')}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs border border-rose-200 transition-colors"
                            >
                              Từ chối
                            </button>
                            <button
                              onClick={() => handleRespondTransfer(req._id, 'approve')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Check size={14} />
                              Đồng ý bàn giao
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-right">
              <button
                onClick={() => setIsTransferRequestsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xu Ly Xung Dot Lich Truc Khi Dieu Chuyen */}
      {conflictModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-amber-100 bg-amber-50/70 flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-950 text-base">Phát Hiện Nhân Sự Đang Có Lịch Trực</h3>
                  <p className="text-xs text-amber-800 mt-1 leading-normal">
                    Dược sĩ <strong>{conflictModalData.employeeName}</strong> hiện đang có{" "}
                    <strong>{conflictModalData.upcomingShifts.length} ca trực sắp tới</strong> tại cơ sở của bạn.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConflictModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Danh sách ca trực sắp tới tại cơ sở:
              </div>

              <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                {conflictModalData.upcomingShifts.map((sh, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-800">{sh.dateStr} • {sh.shiftName}</div>
                    <span className="text-slate-500">{sh.shiftStart} - {sh.shiftEnd}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-600 leading-normal">
                Vui lòng chọn 1 trong 2 phương án xử lý dưới đây để đảm bảo vận hành nhà thuốc không bị gián đoạn:
              </div>

              {/* 2 Lựa chọn */}
              <div className="space-y-3 pt-1">
                {/* Lựa chọn 1 */}
                <button
                  disabled={isResolvingConflict}
                  onClick={() => handleRespondTransfer(conflictModalData.requestId, 'approve', 'defer')}
                  className="w-full text-left p-3.5 border-2 border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="font-bold text-blue-900 text-xs flex items-center justify-between">
                    <span>Lựa chọn 1: Tạm thời chưa chuyển (Chờ xong hết lịch)</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">Khuyên dùng</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-normal">
                    Giữ nhân sự làm việc cho đến khi hoàn thành nốt các ca trực tuần này. Yêu cầu chuyển sẽ tạm hoãn và không làm khuyết ca trực.
                  </div>
                </button>

                {/* Lựa chọn 2 */}
                <button
                  disabled={isResolvingConflict}
                  onClick={() => handleRespondTransfer(conflictModalData.requestId, 'approve', 'cancel_upcoming_shifts')}
                  className="w-full text-left p-3.5 border-2 border-rose-200 hover:border-rose-500 bg-rose-50/30 hover:bg-rose-50 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="font-bold text-rose-900 text-xs flex items-center justify-between">
                    <span>Lựa chọn 2: Hủy tất cả lịch sắp tới & Chuyển ngay</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">Chuyển ngay</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-normal">
                    Tự động gỡ nhân viên khỏi toàn bộ {conflictModalData.upcomingShifts.length} ca trực sắp tới, hủy các đơn đổi ca/phép pending và chuyển giao ngay sang chi nhánh mới (bạn cần xếp người khác thay thế).
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                disabled={isResolvingConflict}
                onClick={() => setConflictModalData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Location Modal */}
      <BranchLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
