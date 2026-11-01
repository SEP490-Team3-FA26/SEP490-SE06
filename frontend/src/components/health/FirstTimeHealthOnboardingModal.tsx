import React, { useState } from 'react';
import {
  ShieldAlert,
  HeartPulse,
  Pill,
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  AlertCircle,
  Loader2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { customerService } from '../../services/sales/customer.service';

interface FirstTimeHealthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userFullName?: string;
  // Cờ xác định form khai báo có bắt buộc 100% (Hard Gate) hay không
  isRequired?: boolean;
}

// Danh sách các nhóm dị ứng thuốc phổ biến
const POPULAR_ALLERGIES = [
  'Penicillin / Beta-lactam',
  'Cephalosporin',
  'Aspirin & NSAIDs (Ibuprofen, Diclofenac)',
  'Sulfonamide (Sulfa / Bactrim)',
  'Paracetamol',
  'Kháng sinh Macrolid',
  'Phấn hoa / Bụi mịn',
  'Hải sản / Thực phẩm',
];

// Danh sách bệnh nền / bệnh lý mãn tính thường gặp
const POPULAR_CONDITIONS = [
  'Viêm loét dạ dày - tá tràng',
  'Tăng huyết áp',
  'Đái tháo đường (Tiểu đường)',
  'Hen suyễn (Hen phế quản)',
  'Suy gan / Men gan cao',
  'Suy thận / Bệnh thận mạn',
  'Bệnh mạch vành / Tim mạch',
  'Phụ nữ đang mang thai',
  'Phụ nữ đang cho con bú',
  'Gút (Gout)',
];

export const FirstTimeHealthOnboardingModal: React.FC<FirstTimeHealthOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userFullName = 'Quý khách',
  isRequired = true, // Mặc định là bắt buộc hoàn thành khai báo khi đăng nhập lần đầu
}) => {
  // Trạng thái tick chọn "Hoàn toàn khỏe mạnh"
  const [isHealthyNoAllergy, setIsHealthyNoAllergy] = useState(false);

  // Danh sách dị ứng nhóm
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // Danh sách biệt dược bị dị ứng
  const [allergicMedicines, setAllergicMedicines] = useState<string[]>([]);
  const [newMedInput, setNewMedInput] = useState('');

  // Danh sách hoạt chất bị dị ứng
  const [allergicIngredients, setAllergicIngredients] = useState<string[]>([]);
  const [newIngredientInput, setNewIngredientInput] = useState('');

  // Danh sách bệnh nền
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  // Nhóm máu & Ghi chú
  const [bloodType, setBloodType] = useState('Chưa rõ');
  const [medicalNotes, setMedicalNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Khi tick "Tôi hoàn toàn khỏe mạnh", reset các lựa chọn dị ứng/bệnh nền
  const handleToggleHealthy = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsHealthyNoAllergy(checked);
    if (checked) {
      setSelectedAllergies([]);
      setAllergicMedicines([]);
      setAllergicIngredients([]);
      setSelectedConditions([]);
    }
  };

  const toggleAllergy = (allergy: string) => {
    if (isHealthyNoAllergy) setIsHealthyNoAllergy(false);
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy],
    );
  };

  const toggleCondition = (cond: string) => {
    if (isHealthyNoAllergy) setIsHealthyNoAllergy(false);
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond],
    );
  };

  const addAllergicMed = () => {
    const trimmed = newMedInput.trim();
    if (trimmed && !allergicMedicines.includes(trimmed)) {
      if (isHealthyNoAllergy) setIsHealthyNoAllergy(false);
      setAllergicMedicines((prev) => [...prev, trimmed]);
      setNewMedInput('');
    }
  };

  const removeAllergicMed = (med: string) => {
    setAllergicMedicines((prev) => prev.filter((m) => m !== med));
  };

  const addAllergicIngredient = () => {
    const trimmed = newIngredientInput.trim();
    if (trimmed && !allergicIngredients.includes(trimmed)) {
      if (isHealthyNoAllergy) setIsHealthyNoAllergy(false);
      setAllergicIngredients((prev) => [...prev, trimmed]);
      setNewIngredientInput('');
    }
  };

  const removeAllergicIngredient = (ing: string) => {
    setAllergicIngredients((prev) => prev.filter((i) => i !== ing));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        allergies: isHealthyNoAllergy ? [] : selectedAllergies,
        allergicMedicines: isHealthyNoAllergy ? [] : allergicMedicines,
        allergicIngredients: isHealthyNoAllergy ? [] : allergicIngredients,
        chronicConditions: isHealthyNoAllergy ? [] : selectedConditions,
        bloodType: bloodType === 'Chưa rõ' ? undefined : bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
        hasCompletedHealthOnboarding: true,
      };

      await customerService.updateMyClinicalProfile(payload);

      // Lưu cờ sessionStorage để không hiện lại trong phiên duyệt này
      sessionStorage.setItem('health_onboarding_dismissed', 'true');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu hồ sơ y khoa:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể lưu hồ sơ y tế. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Nếu là form bắt buộc (Hard Gate), không cho phép bỏ qua
    if (isRequired) {
      setErrorMsg('⚠️ Để đảm bảo an toàn tính mạng và tránh sốc phản vệ khi mua thuốc, bạn bắt buộc phải hoàn thành khai báo y tế (hoặc tick chọn "Tôi hoàn toàn khỏe mạnh")!');
      return;
    }
    // Tạm thời bỏ qua trong phiên hiện tại
    sessionStorage.setItem('health_onboarding_dismissed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header cao cấp */}
        <div className="p-6 bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-700 text-white relative">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-teal-50">
              <Sparkles size={13} className="text-amber-300" />
              <span>Bảo vệ an toàn dùng thuốc</span>
            </div>
            <div className="flex items-center gap-2">
              {isRequired ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wide">
                  Bắt buộc
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  title="Để sau"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-black mt-3 tracking-tight">
            Khai báo Hồ sơ Y tế & Tiền sử Dị ứng
          </h2>
          <p className="text-xs text-teal-100 mt-1 max-w-lg leading-relaxed">
            Xin chào <strong>{userFullName}</strong>! Để tránh nguy cơ sốc phản vệ và tương tác thuốc nguy hiểm, hệ thống AI & Dược sĩ ABC Pharmacy sẽ tự động đối soát mỗi khi bạn mua thuốc.
          </p>
        </div>

        {/* Nội dung form */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ô lựa chọn nhanh: Hoàn toàn khỏe mạnh */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 hover:border-emerald-500 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={isHealthyNoAllergy}
              onChange={handleToggleHealthy}
              className="w-5 h-5 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <div className="font-extrabold text-emerald-900 text-sm flex items-center gap-1.5">
                <UserCheck size={16} className="text-emerald-700" />
                <span>Tôi hoàn toàn khỏe mạnh, không có tiền sử dị ứng và không có bệnh lý nền</span>
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Chọn mục này nếu bạn chưa từng bị dị ứng bất kỳ loại thuốc/thực phẩm nào và không mắc các bệnh mạn tính.
              </p>
            </div>
          </label>

          {/* Phần 1: Tiền sử dị ứng */}
          <div className={`space-y-3 transition-opacity ${isHealthyNoAllergy ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <ShieldAlert size={18} className="text-rose-600" />
                <span>1. Tiền sử dị ứng thuốc & hoạt chất</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Chọn các nhóm bạn từng bị dị ứng</span>
            </div>

            {/* Danh sách nhóm dị ứng phổ biến */}
            <div className="flex flex-wrap gap-2">
              {POPULAR_ALLERGIES.map((allergy) => {
                const isSelected = selectedAllergies.includes(allergy);
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/50'
                    }`}
                  >
                    {allergy}
                  </button>
                );
              })}
            </div>

            {/* Ô thêm thuốc dị ứng cụ thể */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Tên thuốc / biệt dược cụ thể bạn từng bị dị ứng (nếu nhớ):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Augmentin, Klamentin, Panadol Extra, Aspirin..."
                  value={newMedInput}
                  onChange={(e) => setNewMedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergicMed())}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={addAllergicMed}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Thêm thuốc
                </button>
              </div>

              {allergicMedicines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allergicMedicines.map((med) => (
                    <span
                      key={med}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold border border-rose-200"
                    >
                      <Pill size={12} />
                      {med}
                      <button
                        type="button"
                        onClick={() => removeAllergicMed(med)}
                        className="text-rose-600 hover:text-rose-900 ml-0.5 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ô thêm thành phần hoạt chất dị ứng */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Thành phần hoạt chất dị ứng (nếu có xét nghiệm dị nguyên):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: Amoxicillin, Ibuprofen, Sulfamethoxazole..."
                  value={newIngredientInput}
                  onChange={(e) => setNewIngredientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergicIngredient())}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={addAllergicIngredient}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Thêm hoạt chất
                </button>
              </div>

              {allergicIngredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allergicIngredients.map((ing) => (
                    <span
                      key={ing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold border border-purple-200"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={() => removeAllergicIngredient(ing)}
                        className="text-purple-600 hover:text-purple-900 ml-0.5 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Phần 2: Bệnh nền / Bệnh mạn tính */}
          <div className={`space-y-3 transition-opacity ${isHealthyNoAllergy ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <HeartPulse size={18} className="text-teal-600" />
                <span>2. Bệnh nền & Thể trạng đặc biệt</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Dùng để kiểm tra chống chỉ định thuốc</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {POPULAR_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-teal-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cond}</span>
                    {isSelected && <CheckCircle2 size={15} className="text-teal-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Phần 3: Nhóm máu & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nhóm máu (tùy chọn)
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Chưa rõ">Chưa rõ / Chưa xét nghiệm</option>
                <option value="A+">Nhóm máu A (Rh+)</option>
                <option value="A-">Nhóm máu A (Rh-)</option>
                <option value="B+">Nhóm máu B (Rh+)</option>
                <option value="B-">Nhóm máu B (Rh-)</option>
                <option value="AB+">Nhóm máu AB (Rh+)</option>
                <option value="AB-">Nhóm máu AB (Rh-)</option>
                <option value="O+">Nhóm máu O (Rh+)</option>
                <option value="O-">Nhóm máu O (Rh-)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ghi chú y tế đặc biệt / Chỉ định của bác sĩ
              </label>
              <input
                type="text"
                placeholder="VD: Tiền sử sốt co giật, phẫu thuật stent tim mạch..."
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer hành động */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {isRequired ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>Bắt buộc hoàn thành (hoặc tick "Hoàn toàn khỏe mạnh")</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Để sau (Nhắc tôi lần sau)
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang lưu hồ sơ...</span>
              </>
            ) : (
              <>
                <span>Lưu hồ sơ & Kích hoạt bảo vệ</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
