import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, ShieldAlert } from 'lucide-react';
import { QuickRegisterCustomerDto, customerService } from '../../../services/sales/customer.service';

interface QuickRegisterCustomerModalProps {
  isOpen: boolean;
  initialPhone?: string;
  onClose: () => void;
  onSubmit: (dto: QuickRegisterCustomerDto) => Promise<{ success: boolean; error?: string }>;
}

const COMMON_ALLERGIES = [
  'Penicillin',
  'Aspirin',
  'Cephalosporin',
  'NSAID',
  'Paracetamol',
];

const COMMON_CHRONIC_CONDITIONS = [
  'Huyết áp',
  'Tiểu đường',
  'Tim mạch',
  'Dạ dày',
  'Gout',
  'Hen suyễn',
];

export const QuickRegisterCustomerModal: React.FC<QuickRegisterCustomerModalProps> = ({
  isOpen,
  initialPhone = '',
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string; email?: string }>({});

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      setFullName('');
      setEmail('');
      setSelectedAllergies([]);
      setSelectedConditions([]);
      setCustomAllergy('');
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen, initialPhone]);

  if (!isOpen) return null;

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const toggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleAddCustomAllergy = () => {
    if (customAllergy.trim() && !selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies([...selectedAllergies, customAllergy.trim()]);
      setCustomAllergy('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { fullName?: string; phone?: string; email?: string } = {};

    const nameVal = customerService.validateCustomer({ fullName });
    if (!nameVal.valid) errors.fullName = nameVal.error;

    const phoneVal = customerService.validateCustomer({ phone });
    if (!phoneVal.valid) errors.phone = phoneVal.error;

    if (email.trim()) {
      const emailVal = customerService.validateCustomer({ email });
      if (!emailVal.valid) errors.email = emailVal.error;
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError('Vui lòng kiểm tra và sửa lại các trường báo lỗi bên dưới');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim().replace(/[\s.-]/g, ''),
      email: email.trim() || undefined,
      allergies: selectedAllergies,
      chronicConditions: selectedConditions,
    });

    setSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Đăng ký không thành công');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Classic Clean Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus size={15} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              Thêm Khách Hàng
            </h2>
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

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Phone Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-fullname" className="block text-xs font-semibold text-slate-600 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                autoFocus
                placeholder="VD: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-semibold focus:outline-none transition-all ${
                  fieldErrors.fullName
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                    : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                placeholder="09xx xxx xxx"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono font-bold focus:outline-none transition-all ${
                  fieldErrors.phone
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                    : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Email input */}
          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-600 mb-1">
              Email <span className="text-slate-400 font-normal">(tùy chọn)</span>
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="Nhận hóa đơn điện tử..."
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-medium focus:outline-none transition-all ${
                fieldErrors.email
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                  : 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Drug Allergies */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Dị ứng thuốc:
            </span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_ALLERGIES.map((item) => {
                const isSelected = selectedAllergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAllergy(item)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check size={10} className="inline mr-1" />}
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Dị ứng khác..."
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAllergy();
                  }
                }}
                className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleAddCustomAllergy}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold cursor-pointer"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="pt-2 border-t border-slate-100">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Bệnh nền:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CHRONIC_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check size={10} className="inline mr-1" />}
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classic Minimal Footer Note (Replaces huge boxes) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Mật khẩu mặc định: <strong className="font-mono text-slate-700">abccamon</strong></span>
            <span className="text-emerald-700 font-semibold">• Tặng 1.000 điểm</span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              {submitting ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
