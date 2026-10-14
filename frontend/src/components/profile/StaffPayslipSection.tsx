import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Coins,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { payrollService, PersonalPayslip } from "../../services/hr/payroll.service";

interface Props {
  userRole?: string;
}

export function StaffPayslipSection({ userRole }: Props) {
  const [payslips, setPayslips] = useState<PersonalPayslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const loadPayslips = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await payrollService.getMyPayslips();
      setPayslips(data || []);
    } catch (err: any) {
      console.warn("Chưa có phiếu lương cá nhân:", err);
      // Bắt lỗi êm dịu, không văng lỗi timeout microservice ra màn hình người dùng
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, []);

  const formatVND = (num: number) => {
    return (num || 0).toLocaleString("vi-VN") + " ₫";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Đã Phê Duyệt</span>;
      case "PAID":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Đã Thanh Toán</span>;
      case "SUBMITTED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Chờ Duyệt</span>;
      case "DRAFT":
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Dự Thảo</span>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-2">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <p className="text-xs text-slate-500 font-semibold">Đang tải phiếu lương cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Receipt className="text-emerald-600" size={20} />
          <h2 className="text-sm font-bold text-slate-900">Phiếu Lương & Thu Nhập Cá Nhân</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Minh bạch thu nhập theo ca & hoa hồng</span>
          {userRole === 'branch' && (
            <Link
              to="/branch/payroll"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 border-l border-slate-200 pl-3"
            >
              Bảng lương chi nhánh <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {error && !error.includes("timeout") && !error.includes("Microservice") && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <Coins size={32} className="mx-auto mb-2 opacity-40 text-emerald-600" />
          <p className="text-xs font-semibold text-slate-600">Chưa có phiếu lương cá nhân nào trong kỳ này</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-md mx-auto">
            {userRole === 'branch'
              ? 'Phiếu lương cá nhân của bạn sẽ hiển thị tại đây khi bảng lương cơ sở được tính toán và lưu trữ.'
              : 'Phiếu lương sẽ hiển thị tại đây khi quản lý chi nhánh chốt công tháng.'}
          </p>
          {userRole === 'branch' && (
            <div className="mt-3.5">
              <Link
                to="/branch/payroll"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition border border-emerald-200"
              >
                Quản lý & Duyệt Bảng Lương Chi Nhánh →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {payslips.map((ps, idx) => {
            const isExpanded = expandedIndex === idx;
            const item = ps.item;
            if (!item) return null;

            return (
              <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-100">
                      T{ps.month}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">Tháng {ps.month}/{ps.year}</h3>
                        {getStatusBadge(ps.status)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ca làm thực tế: <strong className="text-slate-700">{item.actualShifts}</strong> / {item.standardShifts} ca
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700 block">
                        {formatVND(item.netSalary)}
                      </span>
                      <span className="text-[10px] text-slate-400">Thực lĩnh</span>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Chi tiết phiếu lương mở rộng */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Lương cơ bản:</span>
                        <strong className="text-slate-800">{formatVND(item.baseSalary)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Lương ca chuẩn ({item.actualShifts} ca):</span>
                        <strong className="text-slate-800">{formatVND(item.standardSalary)}</strong>
                      </div>
                      {item.otSalary > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Lương thêm ca (OT):</span>
                          <strong className="text-slate-800">+{formatVND(item.otSalary)}</strong>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Phụ cấp bằng cấp & CCHN:</span>
                        <strong className="text-amber-700">+{formatVND(item.certificateAllowance)}</strong>
                      </div>
                      {item.picAllowance > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Phụ cấp PTCM Chi nhánh:</span>
                          <strong className="text-indigo-700">+{formatVND(item.picAllowance)}</strong>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Phụ cấp ăn trưa ({item.actualShifts} ca):</span>
                        <strong className="text-slate-800">+{formatVND(item.mealAllowance)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Hoa hồng bán hàng POS (1%):</span>
                        <strong className="text-purple-700">+{formatVND(item.commissionAmount)}</strong>
                      </div>
                      {item.personalSalesRevenue > 0 && (
                        <div className="text-[10px] text-slate-400 text-right">
                          (Doanh thu POS cá nhân: {formatVND(item.personalSalesRevenue)})
                        </div>
                      )}
                      {item.penalties > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Khấu trừ đi muộn / vi phạm:</span>
                          <strong>-{formatVND(item.penalties)}</strong>
                        </div>
                      )}
                      {item.manualAdjustment !== 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Điều chỉnh khác:</span>
                          <strong>{item.manualAdjustment > 0 ? "+" : ""}{formatVND(item.manualAdjustment)}</strong>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-xs text-emerald-800">
                        <span>Lương thực lĩnh chuyển khoản:</span>
                        <span className="text-sm">{formatVND(item.netSalary)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
