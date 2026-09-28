import React from 'react';
import {
  Users,
  HeartPulse,
  Crown,
  AlertTriangle,
  Moon,
  TrendingUp,
  RefreshCw,
  Gift,
  PhoneCall,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useCustomerRFM } from '../../hooks/useCustomerRFM';

interface Props {
  selectedBranch: string;
}

export const CustomerRFMTab: React.FC<Props> = ({ selectedBranch }) => {
  const {
    overview,
    atRiskList,
    loading,
    calculating,
    error,
    recalculateRFM,
    refreshOverview,
  } = useCustomerRFM(selectedBranch === 'all' ? undefined : selectedBranch);

  const handleRecalculate = async () => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn kích hoạt tính toán lại phân cụm RFM toàn chuỗi? Quá trình sẽ phân tích lại toàn bộ lịch sử đơn hàng 12 tháng qua.'
      )
    ) {
      return;
    }
    const res = await recalculateRFM();
    if (res.success) {
      alert(res.message || 'Đã kích hoạt tính toán RFM ngầm thành công!');
    } else {
      alert(res.error || 'Có lỗi xảy ra khi kích hoạt tính toán RFM');
    }
  };

  const segmentConfig: Record<
    string,
    { label: string; desc: string; icon: any; color: string; badgeBg: string }
  > = {
    CHAMPIONS: {
      label: 'Khách Kim Cương (Champions)',
      desc: 'Mua hàng thường xuyên, giá trị giỏ hàng cao nhất chuỗi.',
      icon: Crown,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
    },
    LOYAL_CHRONIC: {
      label: 'Khách Mãn Tính Trung Thành',
      desc: 'Khách hàng mua thuốc định kỳ theo chu kỳ 30 ngày (Tiểu đường, Tim mạch...).',
      icon: HeartPulse,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
    },
    POTENTIAL_LOYALIST: {
      label: 'Khách Tiềm Năng',
      desc: 'Mua hàng gần đây với chi tiêu khá tốt, cần kích thích mua thêm.',
      icon: Sparkles,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    AT_RISK: {
      label: 'Nguy Cơ Rời Bỏ (At-Risk)',
      desc: 'Quá hạn toa định kỳ hoặc lâu chưa quay lại, cần Dược sĩ CSKH khẩn cấp!',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-800',
    },
    HIBERNATING: {
      label: 'Khách Ngủ Đông',
      desc: 'Lâu không phát sinh đơn hàng, giá trị chi tiêu thấp.',
      icon: Moon,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-800',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header & Kích hoạt tính toán */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Phân Nhóm Khách Hàng Theo Hành Vi Mua Sắm (Adaptive RFM)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-100 text-purple-700">
              Ngành Dược
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thuật toán phân cụm thích ứng: Tách biệt bệnh mãn tính chu kỳ 30 ngày & loại trừ khách vãng lai `GUEST_RETAIL`.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshOverview()}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleRecalculate}
            disabled={calculating}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={calculating ? 'animate-spin' : ''} />
            {calculating ? 'Đang phân tích...' : 'Tính Toán Lại RFM'}
          </button>
        </div>
      </div>

      {/* 5 Thẻ Phân Cụm RFM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(segmentConfig).map(([key, config]) => {
          const Icon = config.icon;
          const segmentData = overview?.segments?.[key] || {
            count: 0,
            totalRevenue: 0,
            avgSpent: 0,
          };
          return (
            <div
              key={key}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${config.color}`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badgeBg}`}>
                    {segmentData.count} khách
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 mt-3 line-clamp-1">
                  {config.label}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{config.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3">
                <p className="text-[10px] text-slate-400 font-medium">Doanh thu 12T:</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">
                  {(segmentData.totalRevenue || 0).toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bảng Danh Sách Khách Hàng AT_RISK Cần Dược Sĩ / CSKH Chăm Sóc */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-600" size={18} />
            <h3 className="text-sm font-bold text-slate-900">
              Danh Sách Bệnh Nhân Mãn Tính Cần Nhắc Toa & Giữ Chân (At-Risk)
            </h3>
          </div>
          <span className="text-xs font-medium text-orange-700">
            Tự động gợi ý toa tái khám & mã Voucher cứu khách
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Loại khách</th>
                <th className="py-3 px-4 text-center">Chu kỳ / Lần mua cuối</th>
                <th className="py-3 px-4 text-center">Điểm RFM</th>
                <th className="py-3 px-4 text-right">Tổng chi tiêu 12T</th>
                <th className="py-3 px-4">Dự kiến hết thuốc</th>
                <th className="py-3 px-4">Voucher kích cầu gợi ý</th>
                <th className="py-3 px-4 text-center">Hành động CSKH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Đang tải danh sách phân cụm...
                  </td>
                </tr>
              ) : atRiskList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Tuyệt vời! Không có khách hàng mãn tính nào bị rơi vào nhóm At-Risk.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tất cả bệnh nhân mãn tính đều đang tái mua đúng chu kỳ hoặc đã được chăm sóc.
                    </p>
                  </td>
                </tr>
              ) : (
                atRiskList.map((customer) => (
                  <tr key={customer.phone} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {customer.fullName || 'Khách Hàng Thành Viên'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                      {customer.phone}
                    </td>
                    <td className="py-3 px-4">
                      {customer.customerType === 'CHRONIC_PATIENT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <HeartPulse size={11} /> Mãn tính (30 ngày)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          Tiêu dùng lẻ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      <span className="font-bold text-rose-600">{customer.recencyDays}</span> ngày trước
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold">
                        {customer.rfmScoreStr || `${customer.rScore}${customer.fScore}${customer.mScore}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {(customer.totalSpent12M || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-orange-700 font-semibold text-xs">
                      {customer.predictedRefillDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(customer.predictedRefillDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {customer.recommendedVoucher ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <Gift size={12} />
                          {customer.recommendedVoucher}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Mặc định 5%</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <a
                        href={`tel:${customer.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors"
                      >
                        <PhoneCall size={12} />
                        Gọi Nhắc Toa
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
