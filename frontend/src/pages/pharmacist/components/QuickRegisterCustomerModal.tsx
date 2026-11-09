import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, ShieldAlert, ShieldCheck, AlertCircle, HeartPulse, Pill, Plus, RefreshCw } from 'lucide-react';
import { QuickRegisterCustomerDto, customerService } from '../../../services/sales/customer.service';

interface QuickRegisterCustomerModalProps {
  isOpen: boolean;
  initialPhone?: string;
  onClose: () => void;
  onSubmit: (dto: QuickRegisterCustomerDto) => Promise<{
    success: boolean;
    isClinicalSaveError?: boolean;
    error?: string;
    userId?: string;
    phone?: string;
    fullName?: string;
    allergies?: string[];
    chronicConditions?: string[];
  }>;
  onSuccessLinked?: (phone: string) => void;
}

// Danh mục nhóm thuốc dị ứng thường gặp trong thực hành Dược (GPP)
const COMMON_ALLERGIES = [
  'Penicillin',
  'Aspirin',
  'Cephalosporin',
  'NSAID (Kháng viêm)',
  'Paracetamol',
  'Sulfamid',
  'Kháng sinh Macrolid',
];

// Danh mục bệnh nền mãn tính phổ biến gợi ý nhanh
const COMMON_CHRONIC_CONDITIONS = [
  'Huyết áp',
  'Tiểu đường',
  'Tim mạch',
  'Dạ dày / Trào ngược',
  'Gout',
  'Hen suyễn',
  'Suy gan / Suy thận',
  'Rối loạn mỡ máu',
  'Viêm khớp',
];

/**
 * Modal tạo tài khoản khách hàng nhanh tại quầy POS Dược sĩ
 * Tối ưu hóa UI gọn gàng, trực quan và linh động tối đa cho tiền sử dị ứng & bệnh nền
 */
export const QuickRegisterCustomerModal: React.FC<QuickRegisterCustomerModalProps> = ({
  isOpen,
  initialPhone = '',
  onClose,
  onSubmit,
  onSuccessLinked,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState('');

  // Trạng thái câu hỏi an toàn lâm sàng: Khách hàng có bị dị ứng hay không?
  const [hasAllergy, setHasAllergy] = useState<boolean | null>(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');

  // Trạng thái câu hỏi bệnh nền mãn tính: Linh động chọn nhanh & nhập tự do
  const [hasConditions, setHasConditions] = useState<boolean | null>(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string; email?: string }>({});

  // Lưu trạng thái khi tạo Auth thành công nhưng bước lưu dị ứng MongoDB gặp sự cố
  const [clinicalSaveFailedData, setClinicalSaveFailedData] = useState<{
    userId?: string;
    phone: string;
    fullName: string;
    allergies: string[];
    chronicConditions: string[];
  } | null>(null);
  const [isRetryingClinical, setIsRetryingClinical] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      setFullName('');
      setEmail('');
      setHasAllergy(false);
      setSelectedAllergies([]);
      setCustomAllergy('');
      setHasConditions(false);
      setSelectedConditions([]);
      setCustomCondition('');
      setError(null);
      setFieldErrors({});
      setClinicalSaveFailedData(null);
      setIsRetryingClinical(false);
    }
  }, [isOpen, initialPhone]);

  if (!isOpen) return null;

  // Xử lý bật/tắt nhóm dị ứng
  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  // Xử lý bật/tắt bệnh nền
  const toggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  // Thêm dị ứng tùy chỉnh linh động
  const handleAddCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !selectedAllergies.includes(trimmed)) {
      setSelectedAllergies([...selectedAllergies, trimmed]);
      setCustomAllergy('');
    }
  };

  // Thêm bệnh nền tùy chỉnh linh động do khách hàng cung cấp
  const handleAddCustomCondition = () => {
    const trimmed = customCondition.trim();
    if (trimmed && !selectedConditions.includes(trimmed)) {
      setSelectedConditions([...selectedConditions, trimmed]);
      setCustomCondition('');
    }
  };

  // Xử lý nộp form đăng ký khách hàng
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
      setError('Vui lòng kiểm tra và sửa lại các thông tin báo lỗi bên dưới');
      return;
    }

    // Nếu dược sĩ đánh dấu "Có dị ứng" nhưng chưa chọn hoặc nhập dị ứng nào
    if (hasAllergy === true && selectedAllergies.length === 0) {
      setError('Vui lòng chọn hoặc nhập ít nhất một loại thuốc/dị nguyên mà khách hàng bị dị ứng.');
      return;
    }

    // Nếu dược sĩ đánh dấu "Có bệnh nền" nhưng chưa chọn hoặc nhập bệnh nền nào
    if (hasConditions === true && selectedConditions.length === 0) {
      setError('Vui lòng chọn hoặc nhập ít nhất một bệnh nền của khách hàng.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim().replace(/[\s.-]/g, ''),
      email: email.trim() || undefined,
      allergies: hasAllergy ? selectedAllergies : [],
      chronicConditions: hasConditions ? selectedConditions : [],
    });

    setSubmitting(false);
    if (!res.success) {
      if (res.isClinicalSaveError) {
        // Lưu dữ liệu để hiển thị nút "Thử lưu lại hồ sơ dị ứng"
        setClinicalSaveFailedData({
          userId: res.userId,
          phone: res.phone || phone.trim().replace(/[\s.-]/g, ''),
          fullName: res.fullName || fullName.trim(),
          allergies: res.allergies || (hasAllergy ? selectedAllergies : []),
          chronicConditions: res.chronicConditions || (hasConditions ? selectedConditions : []),
        });
      }
      setError(res.error || 'Đăng ký khách hàng không thành công');
    }
  };

  // Xử lý thử lưu lại hồ sơ an toàn lâm sàng (Dị ứng & bệnh nền)
  const handleRetryClinicalSafety = async () => {
    if (!clinicalSaveFailedData) return;
    setIsRetryingClinical(true);
    setError(null);
    try {
      await customerService.updateClinicalSafety(clinicalSaveFailedData.phone, {
        allergies: clinicalSaveFailedData.allergies,
        chronicConditions: clinicalSaveFailedData.chronicConditions,
      });

      // Tra cứu lại hồ sơ hoàn chỉnh sau khi cập nhật thành công
      const full = await customerService.lookupCustomer(clinicalSaveFailedData.phone);
      if (full) {
        if (clinicalSaveFailedData.userId && !full.loyalty.userId) {
          full.loyalty.userId = clinicalSaveFailedData.userId;
        }
        setClinicalSaveFailedData(null);
        onSuccessLinked?.(full);
        onClose();
      }
    } catch (err: any) {
      setError(`Thử lưu lại hồ sơ dị ứng thất bại: ${err?.message || 'Lỗi mạng'}. Vui lòng bấm thử lại!`);
    } finally {
      setIsRetryingClinical(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        {/* Header Modal - Thanh lịch, tinh gọn chuẩn Y tế Long Châu */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Tạo Tài Khoản Khách Hàng Mới
              </h2>
              <p className="text-[11px] text-sky-800 font-medium">
                Khảo sát an toàn lâm sàng & tiền sử dị ứng, bệnh nền (GPP)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Nội dung Form Cuộn mượt mà */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 text-left">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <ShieldAlert size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Banner Cảnh báo Lâm sàng khi lưu dị ứng thất bại - Giữ trạng thái chưa xác minh và cho lưu lại */}
          {clinicalSaveFailedData && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">⚠️ Tài khoản đã được tạo nhưng chưa ghi nhận hồ sơ dị ứng vào hệ thống!</p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Khách hàng <strong>{clinicalSaveFailedData.fullName}</strong> ({clinicalSaveFailedData.phone}) có tiền sử dị ứng: <strong>{clinicalSaveFailedData.allergies.join(', ') || 'Chưa ghi nhận'}</strong>.
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    Dược sĩ tuyệt đối không được bán thuốc khi chưa hoàn tất ghi nhận dị ứng an toàn!
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isRetryingClinical}
                  onClick={handleRetryClinicalSafety}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <RefreshCw size={13} className={isRetryingClinical ? 'animate-spin' : ''} />
                  <span>{isRetryingClinical ? 'Đang lưu lại hồ sơ dị ứng...' : '🔄 Thử lưu lại hồ sơ dị ứng'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Nhóm Thông tin định danh cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-fullname" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Họ và tên khách hàng <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-fullname"
                type="text"
                required
                autoFocus
                placeholder="VD: Trần Hồng Phước"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                className={`w-full px-3 py-2 bg-slate-50/60 focus:bg-white border rounded-xl text-xs font-bold text-slate-800 focus:outline-none transition-all ${
                  fieldErrors.fullName
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                    : 'border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600/30'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
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
                className={`w-full px-3 py-2 bg-slate-50/60 focus:bg-white border rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none transition-all ${
                  fieldErrors.phone
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                    : 'border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600/30'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Email nhận hóa đơn điện tử */}
          <div>
            <label htmlFor="reg-email" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email nhận hóa đơn điện tử <span className="text-slate-400 font-normal lowercase">(tùy chọn)</span>
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="VD: khachhang@gmail.com..."
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full px-3 py-2 bg-slate-50/60 focus:bg-white border rounded-xl text-xs font-medium text-slate-800 focus:outline-none transition-all ${
                fieldErrors.email
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                  : 'border-slate-200 focus:border-sky-600 focus:ring-1 focus:ring-sky-600/30'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[10px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* ========================================================= */}
          {/* CÂU HỎI AN TOÀN Y TẾ 1: DỊ ỨNG THUỐC */}
          {/* ========================================================= */}
          <div className="p-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl space-y-2.5 transition-all">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Pill size={14} className="text-rose-600" />
                <span>Tiền sử dị ứng thuốc:</span>
                <span className="text-rose-500">*</span>
              </label>

              {/* Segmented Control tinh tế */}
              <div className="inline-flex p-0.5 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setHasAllergy(false);
                    setSelectedAllergies([]);
                    setCustomAllergy('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    hasAllergy === false
                      ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck size={13} className={hasAllergy === false ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Không dị ứng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasAllergy(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    hasAllergy === true
                      ? 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert size={13} className={hasAllergy === true ? 'text-rose-600' : 'text-slate-400'} />
                  <span>Có dị ứng</span>
                </button>
              </div>
            </div>

            {/* Trạng thái xác nhận Không dị ứng: Hiển thị thanh nhỏ gọn, không chiếm diện tích */}
            {hasAllergy === false && (
              <div className="py-1 px-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-lg text-[11px] font-medium text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>Đã ghi nhận: Khách hàng không có tiền sử dị ứng thuốc (Chuẩn NKDA).</span>
              </div>
            )}

            {/* Chi tiết khi CÓ DỊ ỨNG */}
            {hasAllergy === true && (
              <div className="pt-2 border-t border-slate-200/60 space-y-2 animate-fadeIn">
                <span className="block text-[11px] font-bold text-rose-900">
                  Chọn nhanh các nhóm thuốc dị ứng hoặc nhập tên dị nguyên:
                </span>

                {/* Danh mục chọn nhanh */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ALLERGIES.map((item) => {
                    const isSelected = selectedAllergies.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleAllergy(item)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                        }`}
                      >
                        {isSelected && <Check size={10} className="inline mr-1" />}
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Nhập dị ứng tùy chỉnh linh động */}
                <div className="flex gap-1.5 pt-0.5">
                  <input
                    type="text"
                    placeholder="Nhập tên thuốc / dị nguyên khác..."
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAllergy();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAllergy}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Danh sách các dị ứng đã ghi nhận */}
                {selectedAllergies.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-slate-500 font-semibold">Đã chọn:</span>
                    {selectedAllergies.map((allg) => (
                      <span
                        key={allg}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold border border-rose-200/80"
                      >
                        {allg}
                        <button
                          type="button"
                          onClick={() => toggleAllergy(allg)}
                          className="hover:text-rose-950 cursor-pointer p-0.5"
                          title={`Xóa ${allg}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* CÂU HỎI AN TOÀN Y TẾ 2: BỆNH NỀN MÃN TÍNH (LINH ĐỘNG TỐI ĐA) */}
          {/* ========================================================= */}
          <div className="p-3 bg-slate-50/70 border border-slate-200/90 rounded-2xl space-y-2.5 transition-all">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HeartPulse size={14} className="text-teal-600" />
                <span>Tiền sử bệnh nền mãn tính:</span>
              </label>

              {/* Segmented Control tinh tế */}
              <div className="inline-flex p-0.5 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setHasConditions(false);
                    setSelectedConditions([]);
                    setCustomCondition('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    hasConditions === false
                      ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Check size={13} className={hasConditions === false ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>Không có</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasConditions(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    hasConditions === true
                      ? 'bg-white text-teal-700 shadow-xs ring-1 ring-teal-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HeartPulse size={13} className={hasConditions === true ? 'text-teal-600' : 'text-slate-400'} />
                  <span>Có bệnh nền</span>
                </button>
              </div>
            </div>

            {/* Trạng thái xác nhận Không bệnh nền */}
            {hasConditions === false && (
              <div className="py-1 px-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-lg text-[11px] font-medium text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span>Đã ghi nhận: Khách hàng không có tiền sử bệnh nền mãn tính.</span>
              </div>
            )}

            {/* Chi tiết khi CÓ BỆNH NỀN: Linh động chọn nhanh + Tự do nhập bệnh nền khác */}
            {hasConditions === true && (
              <div className="pt-2 border-t border-slate-200/60 space-y-2 animate-fadeIn">
                <span className="block text-[11px] font-bold text-teal-900">
                  Chọn các bệnh nền phổ biến hoặc tự do nhập thêm:
                </span>

                {/* Danh mục chọn nhanh */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_CHRONIC_CONDITIONS.map((cond) => {
                    const isSelected = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        {isSelected && <Check size={10} className="inline mr-1" />}
                        {cond}
                      </button>
                    );
                  })}
                </div>

                {/* Ô nhập bệnh nền tùy chỉnh linh động */}
                <div className="flex gap-1.5 pt-0.5">
                  <input
                    type="text"
                    placeholder="Nhập bệnh nền khác (VD: Viêm gan, Mỡ máu, Viêm xoang...)..."
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCondition();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCondition}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Danh sách các bệnh nền đã ghi nhận */}
                {selectedConditions.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] text-slate-500 font-semibold">Đã chọn:</span>
                    {selectedConditions.map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-lg text-[11px] font-bold border border-teal-200/80"
                      >
                        {cond}
                        <button
                          type="button"
                          onClick={() => toggleCondition(cond)}
                          className="hover:text-teal-950 cursor-pointer p-0.5"
                          title={`Xóa ${cond}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ghi chú chính sách bảo mật & Điểm thành viên */}
          <div className="py-2 px-3 bg-sky-50/60 border border-sky-100 rounded-xl flex items-center justify-between text-[11px] text-slate-600">
            <span>Bảo mật: <strong className="text-slate-800">Kích hoạt tài khoản qua OTP SMS / Email</strong></span>
            <span className="text-slate-700 font-bold flex items-center gap-1">
              Điểm tích lũy khởi tạo: <strong className="font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">0 điểm</strong>
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
            >
              {submitting ? 'Đang đăng ký...' : 'Lưu & Ghi nhận an toàn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickRegisterCustomerModal;
