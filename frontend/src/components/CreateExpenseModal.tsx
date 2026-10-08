import React, { useState } from "react";
import { X, Plus, DollarSign, Building2, Calendar, FileText, AlertCircle, ChevronDown } from "lucide-react";
import { financeService, ExpensePayload } from "../services/finance.service";

interface CreateExpenseModalProps {
  isOpen: boolean;
  branches: { id: string; name: string; code?: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateExpenseModal({ isOpen, branches, onClose, onSuccess }: CreateExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    category: "",
    title: "",
    amount: "",
    branchId: branches[0]?.id || "BR-001",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.category) {
      setErrorMsg("Vui lòng chọn Loại chi phí (Mặt bằng, Lương, Điện nước...)");
      return;
    }

    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Số tiền chi phí phải là số dương lớn hơn 0 đ");
      return;
    }

    const selectedBranch = branches.find((b) => b.id === formData.branchId || b.code === formData.branchId);
    const branchName = selectedBranch ? selectedBranch.name : `Chi nhánh ${formData.branchId}`;

    const defaultTitles: Record<string, string> = {
      RENT: "Chi phí tiền thuê mặt bằng",
      SALARY: "Chi phí trả lương nhân viên",
      UTILITY: "Chi phí điện nước & internet",
      OTHER: "Chi phí vận hành khác",
    };

    const payload: ExpensePayload = {
      category: formData.category as any,
      title: formData.title.trim() || defaultTitles[formData.category] || "Chi phí vận hành",
      amount: numAmount,
      branchId: formData.branchId,
      branchName,
      transactionDate: formData.transactionDate,
      notes: formData.notes,
      createdBy: "Admin",
    };

    try {
      setLoading(true);
      await financeService.createExpense(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Lỗi khi ghi nhận chi phí");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header - shadcn Dialog style */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Ghi nhận Chi phí Vận hành</h2>
              <p className="text-xs text-slate-500 mt-0.5">Chi phí cố định chi nhánh (mặt bằng, lương, điện nước...)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Loại chi phí <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              >
                <option value="">-- Chọn Loại chi phí --</option>
                <option value="RENT">Mặt bằng (Rent)</option>
                <option value="SALARY">Lương nhân viên (Salary)</option>
                <option value="UTILITY">Điện nước & Dịch vụ (Utilities)</option>
                <option value="OTHER">Chi phí khác (Other)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Số tiền chi (VND) <span className="text-rose-500">*</span>
              </label>
              {Number(formData.amount) > 0 && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
                  {Number(formData.amount).toLocaleString('vi-VN')} đ
                </span>
              )}
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <span className="text-slate-400 text-xs font-semibold">₫</span>
              </div>
              <input
                type="number"
                min="1"
                placeholder="VD: 25000000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Chi nhánh áp dụng
              </label>
              <div className="relative">
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full h-10 appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                >
                  {branches.map((b) => (
                    <option key={b.id || b.code} value={b.id || b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ngày ghi nhận
              </label>
              <input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nội dung khoản chi
            </label>
            <input
              type="text"
              placeholder="VD: Tiền thuê mặt bằng tháng 7/2026 Chi nhánh #1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-normal text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Ghi chú / Chứng từ đính kèm
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú thêm về mã hóa đơn, chứng từ chi..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-normal text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm shadow-rose-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{loading ? "Đang lưu..." : "Lưu Khoản Chi"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
