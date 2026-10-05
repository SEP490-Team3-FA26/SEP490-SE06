import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  Trash2,
  ShoppingCart,
  Calendar,
  ShieldCheck,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Info,
} from 'lucide-react';
import {
  recommendationService,
  RecommendationData,
  RecommendedMedicine,
} from '../../services/recommendation/recommendation.service';

interface Props {
  onSelectKeyword?: (keyword: string) => void;
  onAddToCart?: (medicine: RecommendedMedicine) => void;
  className?: string;
}

export const PharmaSmartRecommender: React.FC<Props> = ({
  onSelectKeyword,
  onAddToCart,
  className = '',
}) => {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);

  // Lấy thông tin user hiện tại nếu có đăng nhập
  const getUserInfo = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return {
          phone: u.phone,
          userId: u.id || u._id,
        };
      }
    } catch (e) {}
    return { phone: undefined, userId: undefined };
  };

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const { phone, userId } = getUserInfo();
      const res = await recommendationService.getRecommendationsForYou({
        phone,
        userId,
      });
      setData(res);
    } catch (err) {
      console.warn('Lỗi khi tải gợi ý thông minh:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleClearSearches = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tìm kiếm cá nhân?')) return;
    const { phone, userId } = getUserInfo();
    await recommendationService.clearRecentSearches({ phone, userId });
    loadRecommendations();
  };

  const handleAddToCart = (item: RecommendedMedicine) => {
    setAddingId(item._id);
    if (onAddToCart) {
      onAddToCart(item);
    } else {
      // Fallback add to guest_cart / customer_cart in localStorage
      const cartKey = localStorage.getItem('token') ? 'customer_cart' : 'guest_cart';
      try {
        const existing = JSON.parse(localStorage.getItem(cartKey) || '[]');
        const idx = existing.findIndex((c: any) => c.medicineId === item._id || c.id === item._id);
        if (idx >= 0) {
          existing[idx].quantity = (existing[idx].quantity || 1) + 1;
        } else {
          existing.push({
            medicineId: item._id,
            id: item._id,
            name: item.name,
            price: item.price,
            image: item.image,
            unit: item.unit || 'Hộp',
            quantity: 1,
          });
        }
        localStorage.setItem(cartKey, JSON.stringify(existing));
        window.dispatchEvent(new Event('cartUpdated'));
      } catch (e) {}
    }
    setTimeout(() => setAddingId(null), 700);
  };

  const handleApplyVoucher = (voucherCode: string) => {
    localStorage.setItem('applied_voucher', voucherCode);
    setAppliedVoucher(voucherCode);
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse ${className}`}>
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || (!data.items?.length && !data.chronicReminder)) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ========================================================================= */}
      {/* 1. CHRONIC MEDICATION REFILL ALERT (NHẮC NẠP THUỐC MÃN TÍNH RFM) */}
      {/* ========================================================================= */}
      {data.chronicReminder && data.chronicReminder.isDue && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-2xl p-5 shadow-lg shadow-teal-900/10">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-900">
                    Nhắc Nạp Thuốc Định Kỳ (RFM)
                  </span>
                  <span className="text-xs text-emerald-100 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Còn {data.chronicReminder.daysRemaining} ngày nữa
                  </span>
                </div>
                <h4 className="text-base font-bold text-white leading-tight">
                  Chào {data.chronicReminder.patientName || 'Quý khách'}, đến hẹn tái nạp thuốc định kỳ!
                </h4>
                <p className="text-xs text-emerald-100/90 max-w-xl">
                  {data.chronicReminder.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              {data.chronicReminder.recommendedVoucher && (
                <button
                  onClick={() => handleApplyVoucher(data.chronicReminder!.recommendedVoucher!)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    appliedVoucher === data.chronicReminder.recommendedVoucher
                      ? 'bg-emerald-800 text-emerald-200 border border-emerald-500'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  {appliedVoucher === data.chronicReminder.recommendedVoucher ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      Đã lưu mã {data.chronicReminder.recommendedVoucher}
                    </>
                  ) : (
                    <>
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      Nhận mã: {data.chronicReminder.recommendedVoucher}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHARMA-SMART RECOMMENDATION WIDGET (DÀNH RIÊNG CHO BẠN) */}
      {/* ========================================================================= */}
      {data.items && data.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          {/* Header & Lý do gợi ý minh bạch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-blue-600 fill-blue-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  Dành Riêng Cho Bạn
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    Pharma Smart Recommender
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-600">{data.recommendationReason}</span>
              </p>
            </div>

            {/* Từ khóa tìm kiếm gần đây */}
            {data.recentSearches && data.recentSearches.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Gần đây:</span>
                {data.recentSearches.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectKeyword && onSelectKeyword(kw)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors font-medium border border-slate-200/60"
                  >
                    <Search className="w-2.5 h-2.5 text-slate-400" />
                    {kw}
                  </button>
                ))}
                <button
                  onClick={handleClearSearches}
                  title="Xóa lịch sử tìm kiếm cá nhân (Nghị định 13/2023)"
                  className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Grid sản phẩm gợi ý */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {data.items.slice(0, 8).map((item) => (
              <div
                key={item._id}
                className="group relative flex flex-col justify-between bg-slate-50/50 hover:bg-white border border-slate-200/70 hover:border-blue-300 rounded-xl p-3 transition-all duration-200 hover:shadow-md"
              >
                <div>
                  {/* Category & Safe Badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                      {item.category || 'TPCN'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                      <ShieldCheck className="w-2.5 h-2.5" /> An toàn
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-full h-28 bg-white rounded-lg flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-100">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=60'
                      }
                      alt={item.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* Name */}
                  <h4
                    className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                </div>

                {/* Price & Action */}
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-rose-600">
                      {(item.price || 0).toLocaleString('vi-VN')} đ
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      /{item.unit || 'Hộp'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={addingId === item._id}
                    className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                      addingId === item._id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
                    }`}
                    title="Thêm vào giỏ hàng"
                  >
                    {addingId === item._id ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Cam kết Y khoa */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              100% sản phẩm bổ trợ đã qua kiểm định y tế theo quy định Dược
            </span>
            <span className="hidden sm:inline text-slate-400">
              Không áp dụng gợi ý thương mại cho Thuốc kê đơn (Rx)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
