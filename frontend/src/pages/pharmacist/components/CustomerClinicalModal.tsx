import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldAlert,
  HeartPulse,
  RotateCcw,
  Sparkles,
  CreditCard,
  Edit2,
  Save,
  Plus,
  Pill,
  Droplet,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  FullCustomerProfile,
  CustomerClinicalSafety,
  customerService,
} from '../../../services/sales/customer.service';

interface CustomerClinicalModalProps {
  isOpen: boolean;
  customer?: FullCustomerProfile | null;
  customerPhone?: string;
  customerName?: string;
  loyaltyPoints?: number;
  initialProfile?: CustomerClinicalSafety;
  onClose: () => void;
  onUpdated?: (updatedClinical: CustomerClinicalSafety) => void;
}

export const CustomerClinicalModal: React.FC<CustomerClinicalModalProps> = ({
  isOpen,
  customer,
  customerPhone,
  customerName,
  loyaltyPoints,
  initialProfile,
  onClose,
  onUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form edit states
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergicMedicines, setAllergicMedicines] = useState<string[]>([]);
  const [allergicIngredients, setAllergicIngredients] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState('Chưa rõ');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Input tag states
  const [allergyInput, setAllergyInput] = useState('');
  const [medInput, setMedInput] = useState('');
  const [ingInput, setIngInput] = useState('');
  const [condInput, setCondInput] = useState('');

  useEffect(() => {
    const clin = customer?.clinical || initialProfile;
    if (clin) {
      setAllergies(clin.allergies || []);
      setAllergicMedicines(clin.allergicMedicines || []);
      setAllergicIngredients(clin.allergicIngredients || []);
      setChronicConditions(clin.chronicConditions || []);
      setBloodType(clin.bloodType || 'Chưa rõ');
      setMedicalNotes(clin.medicalNotes || '');
    }
    setIsEditing(false);
    setSuccessMsg('');
    setErrorMsg('');
  }, [customer, initialProfile, isOpen]);

  if (!isOpen) return null;

  const phone = customer?.loyalty?.phone || customerPhone || '';
  const name = customer?.loyalty?.fullName || customerName || 'Khách hàng';
  const loyalty = customer?.loyalty;
  const clinical = customer?.clinical || initialProfile;
  const availablePoints = loyalty?.points ?? loyaltyPoints ?? 0;

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        allergies,
        allergicMedicines,
        allergicIngredients,
        chronicConditions,
        bloodType: bloodType === 'Chưa rõ' ? undefined : bloodType,
        medicalNotes: medicalNotes.trim() || undefined,
      };

      await customerService.updateClinicalSafety(phone, payload);

      const updatedClinical: CustomerClinicalSafety = {
        ...clinical,
        ...payload,
        hasCompletedHealthOnboarding: true,
      };

      setSuccessMsg('Đã cập nhật hồ sơ bệnh án thành công!');
      setIsEditing(false);

      if (onUpdated) {
        onUpdated(updatedClinical);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ bệnh án');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-teal-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-sm">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800">{name}</h2>
                {loyalty?.tier && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                    {loyalty.tier}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                SĐT: {phone} {loyalty?.email && `• ${loyalty.email}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit2 size={13} /> Sửa bệnh án
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  if (customer.clinical) {
                    setAllergies(customer.clinical.allergies || []);
                    setAllergicMedicines(customer.clinical.allergicMedicines || []);
                    setAllergicIngredients(customer.clinical.allergicIngredients || []);
                    setChronicConditions(customer.clinical.chronicConditions || []);
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thông báo cập nhật */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-sky-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nội dung Modal */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Thông tin Điểm & Chi tiêu */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="text-[11px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                <Sparkles size={13} className="text-sky-600" />
                Điểm tích lũy khả dụng
              </div>
              <div className="text-lg font-black font-mono text-sky-700">
                {availablePoints.toLocaleString()} đ
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="text-[11px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                <CreditCard size={13} className="text-blue-600" />
                Tổng chi tiêu (12T)
              </div>
              <div className="text-lg font-black font-mono text-slate-800">
                {(((clinical?.totalSpent12M || 0)) / 1000).toLocaleString()} k
              </div>
            </div>
          </div>

          {!isEditing ? (
            /* ================= CHẾ ĐỘ XEM BỆNH ÁN ================= */
            <div className="space-y-3">
              {/* Tiền sử dị ứng nhóm */}
              <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-rose-900 text-xs">
                  <ShieldAlert size={15} className="text-rose-600" />
                  <span>Tiền sử dị ứng nhóm thuốc / Dị nguyên:</span>
                </div>
                {allergies && allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((allergy, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-rose-600 text-white rounded-md text-[11px] font-bold"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Không ghi nhận dị ứng nhóm thuốc (NKDA)</span>
                )}
              </div>

              {/* Thuốc dị ứng cụ thể */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs">
                  <Pill size={15} className="text-amber-600" />
                  <span>Biệt dược cụ thể từng bị dị ứng:</span>
                </div>
                {allergicMedicines && allergicMedicines.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergicMedicines.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-amber-600 text-white rounded-md text-[11px] font-bold"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Chưa ghi nhận biệt dược cụ thể</span>
                )}
              </div>

              {/* Hoạt chất dị ứng */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-purple-900 text-xs">
                  <Droplet size={15} className="text-purple-600" />
                  <span>Hoạt chất dược lý bị dị ứng:</span>
                </div>
                {allergicIngredients && allergicIngredients.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {allergicIngredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-purple-600 text-white rounded-md text-[11px] font-bold"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Chưa có kết quả xét nghiệm dị nguyên</span>
                )}
              </div>

              {/* Bệnh lý mãn tính */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-teal-900 text-xs">
                  <HeartPulse size={15} className="text-teal-600" />
                  <span>Bệnh lý nền / Mãn tính (Chống chỉ định):</span>
                </div>
                {chronicConditions && chronicConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {chronicConditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-teal-700 text-white rounded-md text-[11px] font-bold"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Không ghi nhận bệnh nền</span>
                )}

                {/* Nhắc nhở mua thuốc định kỳ */}
                {clinical.refillReminder?.isDue && (
                  <div className="mt-2 pt-2 border-t border-teal-200 flex items-center gap-1.5 text-teal-950 font-bold text-[11px]">
                    <RotateCcw size={12} className="text-teal-700 shrink-0" />
                    <span>Đến hạn mua lại thuốc định kỳ (còn {clinical.refillReminder.daysRemaining} ngày)</span>
                  </div>
                )}
              </div>

              {/* Nhóm máu & Ghi chú */}
              {(bloodType !== 'Chưa rõ' || medicalNotes) && (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1 text-slate-700 text-xs">
                  {bloodType !== 'Chưa rõ' && (
                    <p><strong>Nhóm máu:</strong> {bloodType}</p>
                  )}
                  {medicalNotes && (
                    <p><strong>Ghi chú:</strong> {medicalNotes}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================= CHẾ ĐỘ CHỈNH SỬA BỆNH ÁN ================= */
            <div className="space-y-4">
              <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-semibold">
                * Dược sĩ có thể bổ sung tiền sử dị ứng hoặc bệnh nền mới phát hiện được bệnh nhân xác nhận.
              </div>

              {/* Dị ứng nhóm */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Tiền sử dị ứng nhóm:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="VD: Penicillin, Cephalosporin, NSAID..."
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
                          setAllergies([...allergies, allergyInput.trim()]);
                          setAllergyInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
                        setAllergies([...allergies, allergyInput.trim()]);
                        setAllergyInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold"
                  >
                    + Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {allergies.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[11px] font-bold">
                      {a}
                      <button type="button" onClick={() => setAllergies(allergies.filter((x) => x !== a))} className="ml-1 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Thuốc dị ứng */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Biệt dược cụ thể dị ứng:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="VD: Augmentin, Klamentin, Aspirin 81..."
                    value={medInput}
                    onChange={(e) => setMedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (medInput.trim() && !allergicMedicines.includes(medInput.trim())) {
                          setAllergicMedicines([...allergicMedicines, medInput.trim()]);
                          setMedInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (medInput.trim() && !allergicMedicines.includes(medInput.trim())) {
                        setAllergicMedicines([...allergicMedicines, medInput.trim()]);
                        setMedInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold"
                  >
                    + Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {allergicMedicines.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[11px] font-bold">
                      {m}
                      <button type="button" onClick={() => setAllergicMedicines(allergicMedicines.filter((x) => x !== m))} className="ml-1 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Hoạt chất dị ứng */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Hoạt chất dị ứng:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="VD: Amoxicillin, Ibuprofen..."
                    value={ingInput}
                    onChange={(e) => setIngInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (ingInput.trim() && !allergicIngredients.includes(ingInput.trim())) {
                          setAllergicIngredients([...allergicIngredients, ingInput.trim()]);
                          setIngInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (ingInput.trim() && !allergicIngredients.includes(ingInput.trim())) {
                        setAllergicIngredients([...allergicIngredients, ingInput.trim()]);
                        setIngInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold"
                  >
                    + Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {allergicIngredients.map((ing) => (
                    <span key={ing} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[11px] font-bold">
                      {ing}
                      <button type="button" onClick={() => setAllergicIngredients(allergicIngredients.filter((x) => x !== ing))} className="ml-1 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bệnh nền */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Bệnh nền mạn tính:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="VD: Viêm loét dạ dày, Tăng huyết áp..."
                    value={condInput}
                    onChange={(e) => setCondInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (condInput.trim() && !chronicConditions.includes(condInput.trim())) {
                          setChronicConditions([...chronicConditions, condInput.trim()]);
                          setCondInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (condInput.trim() && !chronicConditions.includes(condInput.trim())) {
                        setChronicConditions([...chronicConditions, condInput.trim()]);
                        setCondInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold"
                  >
                    + Thêm
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {chronicConditions.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-900 rounded-md text-[11px] font-bold">
                      {c}
                      <button type="button" onClick={() => setChronicConditions(chronicConditions.filter((x) => x !== c))} className="ml-1 cursor-pointer">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Ghi chú & Nhóm máu */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm máu:</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Chưa rõ">Chưa rõ</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O+">O+</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú y tế:</label>
                  <input
                    type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="text-[11px] text-slate-400">
            * Dữ liệu được đồng bộ realtime vào Hồ sơ Y tế điện tử
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Lưu hồ sơ bệnh nhân</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerClinicalModal;
