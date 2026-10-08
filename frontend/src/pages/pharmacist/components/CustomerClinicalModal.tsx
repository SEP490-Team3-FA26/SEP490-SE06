import React from 'react';
import {
  X,
  User,
  ShieldAlert,
  HeartPulse,
  RotateCcw,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { FullCustomerProfile } from '../../../services/sales/customer.service';

interface CustomerClinicalModalProps {
  isOpen: boolean;
  customer: FullCustomerProfile | null;
  onClose: () => void;
}

export const CustomerClinicalModal: React.FC<CustomerClinicalModalProps> = ({
  isOpen,
  customer,
  onClose,
}) => {
  if (!isOpen || !customer) return null;

  const { loyalty, clinical } = customer;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <User size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-800">{loyalty.fullName}</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 uppercase">
                  {loyalty.tier}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {loyalty.phone} {loyalty.email && `• ${loyalty.email}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {/* Points & Spent Overview */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
                <Sparkles size={12} className="text-emerald-600" />
                Điểm tích lũy
              </div>
              <div className="text-base font-bold font-mono text-emerald-700">
                {loyalty.points.toLocaleString()} đ
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
                <CreditCard size={12} className="text-blue-600" />
                Tổng chi tiêu (12T)
              </div>
              <div className="text-base font-bold font-mono text-slate-800">
                {((clinical.totalSpent12M || 0) / 1000).toLocaleString()} k
              </div>
            </div>
          </div>

          {/* Allergies */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1.5">
              <ShieldAlert size={14} className="text-rose-600" />
              <span>Tiền sử dị ứng:</span>
            </div>
            {clinical.allergies && clinical.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {clinical.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[11px] font-semibold"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px] italic">Không ghi nhận dị ứng</span>
            )}
          </div>

          {/* Chronic conditions */}
          <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-teal-900 mb-1.5">
              <HeartPulse size={14} className="text-teal-600" />
              <span>Bệnh lý mãn tính:</span>
            </div>
            {clinical.chronicConditions && clinical.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {clinical.chronicConditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white border border-teal-200 text-teal-800 rounded-md text-[11px] font-semibold"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 text-[11px] italic">Không ghi nhận bệnh nền</span>
            )}

            {/* Refill notice if due */}
            {clinical.refillReminder?.isDue && (
              <div className="mt-2 pt-2 border-t border-teal-200/60 flex items-center gap-1.5 text-teal-950 font-semibold text-[11px]">
                <RotateCcw size={12} className="text-teal-700 shrink-0" />
                <span>Đến hạn mua lại thuốc định kỳ (còn {clinical.refillReminder.daysRemaining} ngày)</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
