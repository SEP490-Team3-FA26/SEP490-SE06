import React, { useState, useEffect } from "react";
import { Plus, Edit2, CheckCircle2, X, AlertTriangle, Clock, Play, Square, Circle } from "lucide-react";
import { hrService, WorkShift } from "../../services/hr/hr.service";

export function BranchShiftManagement() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    color: "#3B82F6"
  });

  const presetColors = ["#3B82F6", "#F97316", "#10B981", "#8B5CF6", "#EF4444", "#64748B"];

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const data = await hrService.listShifts();
      setShifts(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi tải ca làm việc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleOpenModal = (shift?: WorkShift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        color: shift.color
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: "",
        startTime: "",
        endTime: "",
        color: "#3B82F6"
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShift) {
        await hrService.updateShift(editingShift._id, formData);
      } else {
        await hrService.createShift(formData);
      }
      handleCloseModal();
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Lưu thất bại");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await hrService.toggleShift(id);
      fetchShifts();
    } catch (err: any) {
      alert("Lỗi khi thay đổi trạng thái");
    }
  };

  const handleInitDefault = async () => {
    try {
      setLoading(true);
      await hrService.createShift({ name: "Ca Sáng", startTime: "06:00", endTime: "14:00", color: "#3B82F6", isActive: true } as any);
      await hrService.createShift({ name: "Ca Chiều", startTime: "14:00", endTime: "22:00", color: "#F97316", isActive: true } as any);
      fetchShifts();
    } catch (err: any) {
      alert("Lỗi khởi tạo");
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Ca Làm Việc</h1>
          <p className="text-slate-500 mt-1">Cấu hình các ca làm việc tại chi nhánh</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          Tạo Ca Mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center">
          <AlertTriangle size={36} className="mx-auto text-rose-500 mb-2" />
          <p className="text-rose-600 text-sm font-semibold">{error}</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
          <Clock size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có ca làm việc nào</h3>
          <p className="text-slate-500 mb-6">Hãy tạo ca làm việc mới hoặc sử dụng các ca mặc định.</p>
          <button 
            onClick={handleInitDefault}
            className="px-6 py-2.5 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition-colors"
          >
            Khởi tạo ca mặc định
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map(shift => (
            <div key={shift._id} className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${shift.isActive ? 'border-slate-200 hover:border-[#0057cd]/30' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: shift.color }}></div>
                  <h3 className="font-bold text-lg text-slate-900">{shift.name}</h3>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${shift.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {shift.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Clock size={16} className="text-slate-400" />
                <span>{shift.startTime} - {shift.endTime}</span>
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                <button 
                  onClick={() => handleOpenModal(shift)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <Edit2 size={16} /> Sửa
                </button>
                <button 
                  onClick={() => handleToggle(shift._id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-xl transition-colors ${shift.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                >
                  {shift.isActive ? <><Square size={16} /> Ngừng</> : <><Play size={16} /> Bật</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
            <h2 className="text-xl font-bold mb-6">{editingShift ? "Sửa Ca Làm Việc" : "Tạo Ca Mới"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên Ca *</label>
                <input required type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0057cd]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ca Sáng" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giờ Bắt Đầu *</label>
                  <input required type="time" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0057cd]" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giờ Kết Thúc *</label>
                  <input required type="time" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0057cd]" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Màu Sắc *</label>
                <div className="flex items-center gap-3 mb-2">
                  {presetColors.map(c => (
                    <button key={c} type="button" onClick={() => setFormData({...formData, color: c})} className={`w-8 h-8 rounded-full border-2 ${formData.color === c ? 'border-slate-900' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
                <input type="color" className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#0057cd] hover:bg-[#00419e] rounded-xl">{editingShift ? "Cập nhật" : "Tạo ca"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
