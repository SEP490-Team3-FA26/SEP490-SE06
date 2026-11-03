import React from 'react';
import { Sparkles } from 'lucide-react';
import { CustomerClinicalSafety } from '../../services/sales/customer.service';

interface SafeDrugRecommendationsProps {
  profile: CustomerClinicalSafety;
}

/**
 * Linh kiện hiển thị danh mục thuốc an toàn gợi ý theo thể trạng người dùng (UC-107)
 * Phân tách theo chuẩn FE-COMPONENT để tối ưu tái sử dụng và giảm tải dòng mã nguồn
 */
export const SafeDrugRecommendations: React.FC<SafeDrugRecommendationsProps> = ({ profile }) => {
  const hasStomachUlcer = profile.chronicConditions?.some((c) =>
    c.toLowerCase().includes('da day')
  );
  const hasHypertension = profile.chronicConditions?.some((c) =>
    c.toLowerCase().includes('huyet ap')
  );
  const hasPenicillinAllergy = profile.allergies?.some((a) =>
    a.toLowerCase().includes('penicillin')
  );

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-50 rounded-3xl p-6 border border-blue-100 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
          <Sparkles size={16} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Gợi Ý Thuốc An Toàn Phù Hợp Thể Trạng (AI Clinical Advisor)
          </h3>
          <p className="text-xs text-slate-500">
            Dựa trên bệnh án điện tử, hệ thống phân loại danh mục thuốc an toàn nên dùng khi gặp các triệu chứng thông thường:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Triệu chứng 1: Hạ sốt & Giảm đau */}
        <div className="p-4 bg-white rounded-2xl border border-blue-200/60 shadow-xs space-y-2">
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
            Hạ sốt & Giảm đau
          </span>
          <h4 className="text-sm font-extrabold text-slate-800">Paracetamol 500mg</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {hasStomachUlcer
              ? 'Lựa chọn an toàn số 1 cho người có bệnh lý dạ dày (không gây viêm loét như Aspirin/Ibuprofen).'
              : 'Thuốc giảm đau hạ sốt êm dịu, an toàn khi sử dụng đúng liều lượng khuyến cáo.'}
          </p>
        </div>

        {/* Triệu chứng 2: Nghẹt mũi & Viêm xoang */}
        <div className="p-4 bg-white rounded-2xl border border-blue-200/60 shadow-xs space-y-2">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block">
            Viêm mũi & Cảm cúm
          </span>
          <h4 className="text-sm font-extrabold text-slate-800">Xịt Mũi Nước Biển Sâu</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {hasHypertension
              ? 'An toàn tuyệt đối cho người tăng huyết áp, tránh nguy cơ co mạch kịch phát do thuốc uống thông mũi.'
              : 'Vệ sinh đường thở tự nhiên, làm sạch dịch nhầy mà không gây nhờn thuốc.'}
          </p>
        </div>

        {/* Triệu chứng 3: Kháng sinh khi cần thiết */}
        <div className="p-4 bg-white rounded-2xl border border-blue-200/60 shadow-xs space-y-2">
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
            Kháng sinh theo chỉ định
          </span>
          <h4 className="text-sm font-extrabold text-slate-800">
            {hasPenicillinAllergy ? 'Nhóm Macrolid (Azithromycin)' : 'Kháng sinh chuẩn bác sĩ'}
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {hasPenicillinAllergy
              ? 'Lựa chọn thay thế an toàn cho bệnh nhân dị ứng Penicillin/Amoxicillin, tránh nguy cơ sốc phản vệ.'
              : 'Cần tham vấn Dược sĩ hoặc bác sĩ trước khi sử dụng kháng sinh.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafeDrugRecommendations;
