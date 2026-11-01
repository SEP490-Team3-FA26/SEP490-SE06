import React from 'react';
import { ShieldAlert, HeartPulse, Pill, CheckCircle2 } from 'lucide-react';
import { CustomerClinicalSafety } from '../../services/sales/customer.service';

interface MedicalRecordOverviewProps {
  profile: CustomerClinicalSafety;
  hasAllergies: boolean;
  hasConditions: boolean;
}

/**
 * Linh kiện hiển thị tổng quan hồ sơ bệnh án cá nhân (Chế độ Xem)
 * Tách module theo chuẩn FE-COMPONENT của abc-frontend-skill
 */
export const MedicalRecordOverview: React.FC<MedicalRecordOverviewProps> = ({
  profile,
  hasAllergies,
  hasConditions,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Khối 1: Tiền sử dị ứng */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <span>Tiền Sử Dị Ứng Thuốc</span>
          </div>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            {hasAllergies ? 'Có ghi nhận' : 'An toàn / NKDA'}
          </span>
        </div>

        {/* Nhóm dị ứng chung */}
        <div>
          <span className="text-xs font-bold text-slate-500 block mb-1.5">
            Nhóm thuốc / Dị nguyên đã ghi nhận:
          </span>
          {profile.allergies && profile.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((a, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold"
                >
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">Không ghi nhận dị ứng nhóm thuốc</p>
          )}
        </div>

        {/* Thuốc dị ứng cụ thể */}
        <div>
          <span className="text-xs font-bold text-slate-500 block mb-1.5">
            Biệt dược cụ thể từng bị dị ứng:
          </span>
          {profile.allergicMedicines && profile.allergicMedicines.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergicMedicines.map((m, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Pill size={12} />
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">Chưa ghi nhận biệt dược cụ thể</p>
          )}
        </div>

        {/* Hoạt chất dị ứng */}
        <div>
          <span className="text-xs font-bold text-slate-500 block mb-1.5">
            Hoạt chất dược lý dị ứng:
          </span>
          {profile.allergicIngredients && profile.allergicIngredients.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergicIngredients.map((ing, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold"
                >
                  {ing}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">Chưa có kết quả xét nghiệm dị nguyên</p>
          )}
        </div>
      </div>

      {/* Khối 2: Bệnh lý nền & Thể trạng */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <HeartPulse size={18} />
            </div>
            <span>Bệnh Lý Nền & Mãn Tính</span>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            {hasConditions ? `${profile.chronicConditions?.length} bệnh nền` : 'Khỏe mạnh'}
          </span>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-500 block mb-1.5">
            Các bệnh mạn tính đang điều trị:
          </span>
          {profile.chronicConditions && profile.chronicConditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.chronicConditions.map((c, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-teal-50 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} className="text-teal-600" />
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-slate-400">Không ghi nhận bệnh lý mãn tính</p>
          )}
        </div>

        <div className="pt-2">
          <span className="text-xs font-bold text-slate-500 block mb-1">
            Ghi chú điều trị đặc biệt:
          </span>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
            {profile.medicalNotes || 'Không có ghi chú y khoa bổ sung.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordOverview;
