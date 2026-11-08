// ProductReviewsSection.tsx - Khối Đánh Giá & Nhận Xét Sản Phẩm Nhúng Trực Tiếp (UC-77 Chuẩn Long Châu)
import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Tag,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  productReviewService,
  ProductReviewItem,
  ProductReviewSummary,
} from '../../services/inventory/productReview.service';
import { ProductReviewModal } from './ProductReviewModal';
import { sanitizeReviewerName, maskReviewerPhone } from '../../utils/reviewSanitizer';

interface ProductReviewsSectionProps {
  medicineId: string;
  medicineName: string;
  medicine?: any;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  medicineId,
  medicineName,
  medicine,
}) => {
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState<boolean>(false);

  // Tải danh sách đánh giá và tổng kết điểm sao từ backend
  const fetchReviewsData = useCallback(async () => {
    if (!medicineId) return;
    try {
      setLoading(true);
      const queryParams: { page: number; limit: number; rating?: number } = {
        page,
        limit: 5,
      };
      if (typeof starFilter === 'number') {
        queryParams.rating = starFilter;
      }

      const [reviewList, sumData] = await Promise.all([
        productReviewService.getReviews(medicineId, queryParams).catch(() => ({
          data: [],
          total: 0,
          totalPages: 1,
          page: 1,
          limit: 5,
        })),
        productReviewService.getReviewSummary(medicineId).catch(() => null),
      ]);

      setReviews(reviewList?.data || []);
      setTotalPages(reviewList?.totalPages || 1);
      setTotalCount(reviewList?.total || 0);
      if (sumData) {
        setSummary(sumData);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu review sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  }, [medicineId, page, starFilter]);

  useEffect(() => {
    fetchReviewsData();
  }, [fetchReviewsData]);

  // Bình chọn hữu ích (Helpful thumbs-up) với Optimistic UI
  const handleVoteHelpful = async (reviewId: string) => {
    if (votedReviews[reviewId]) return;

    // Đánh dấu đã vote trên giao diện ngay lập tức
    setVotedReviews((prev) => ({ ...prev, [reviewId]: true }));
    setReviews((prev) =>
      prev.map((r) =>
        r._id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r,
      ),
    );

    try {
      await productReviewService.voteHelpful(reviewId);
    } catch (err) {
      // Rollback lại nếu lỗi kết nối
      setVotedReviews((prev) => ({ ...prev, [reviewId]: false }));
      setReviews((prev) =>
        prev.map((r) =>
          r._id === reviewId
            ? { ...r, helpfulCount: Math.max(0, (r.helpfulCount || 0) - 1) }
            : r,
        ),
      );
    }
  };
// Định dạng ngày tháng đánh giá
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Mới đây';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'Mới đây';
    }
  };

  const avgRating = summary?.averageRating || medicine?.averageRating || 5.0;
  const totalReviewsCount = summary?.totalReviews ?? medicine?.reviewCount ?? totalCount;

  return (
    <section className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-8 text-left">
      {/* Tiêu đề mục Review */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Star size={18} className="fill-amber-500" />
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Khách Hàng Đánh Giá & Nhận Xét
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Tổng hợp nhận xét thực tế từ người dùng đã mua sản phẩm tại chuỗi nhà thuốc ABC Pharmacy
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWriteModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-[#0057cd] hover:from-sky-600 hover:to-[#0047a5] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Sparkles size={16} />
          <span>Viết Đánh Giá Ngay</span>
        </button>
      </div>

      {/* Scorecard tổng quan & Thanh phân bổ phần trăm từng sao (Chuẩn Long Châu) */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200/80 flex flex-col md:flex-row items-center gap-8">
        {/* Điểm trung bình lớn */}
        <div className="text-center md:border-r md:border-slate-200 md:pr-8 shrink-0 min-w-[160px]">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight block">
            {avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
          </span>
          <div className="flex items-center justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={20}
                className={
                  s <= Math.round(avgRating)
                    ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                    : 'text-slate-300'
                }
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-500 block">
            {totalReviewsCount} bài đánh giá xác thực
          </span>
        </div>

        {/* Cột các thanh phần trăm sao */}
        <div className="flex-1 w-full space-y-2">
          {[5, 4, 3, 2, 1].map((starNum) => {
            const count = summary?.ratingBreakdown?.[starNum] || 0;
            const pct = summary?.percentages?.[starNum] || (totalReviewsCount > 0 && starNum === 5 ? 100 : 0);
            return (
              <div
                key={starNum}
                onClick={() => {
                  setStarFilter(starFilter === starNum ? undefined : starNum);
                  setPage(1);
                }}
                className="flex items-center gap-3 text-xs group cursor-pointer"
              >
                <div className="w-12 flex items-center gap-1 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                  <span>{starNum}</span>
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                </div>

                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <span className="w-16 text-right text-[11px] text-slate-400 font-semibold group-hover:text-slate-700">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thanh bộ lọc số sao (Pill Filter Buttons) */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
          Lọc đánh giá:
        </span>
        <button
          type="button"
          onClick={() => {
            setStarFilter(undefined);
            setPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            starFilter === undefined
              ? 'bg-[#0057cd] text-white border-[#0057cd] shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tất cả ({totalReviewsCount})
        </button>

        {[5, 4, 3, 2, 1].map((s) => {
          const count = summary?.ratingBreakdown?.[s] || 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStarFilter(starFilter === s ? undefined : s);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                starFilter === s
                  ? 'bg-[#0057cd] text-white border-[#0057cd] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{s} sao</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Danh sách các bài đánh giá thực tế */}
      <div className="space-y-4 pt-2">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-slate-500">Đang tải nhận xét thực tế từ khách hàng...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-3 bg-slate-50/50 p-6">
            <MessageSquare size={40} className="text-slate-300 mx-auto" />
            <div>
              <h5 className="text-sm sm:text-base font-black text-slate-700">
                Chưa có đánh giá nào {starFilter ? `cho mức ${starFilter} sao` : ''}
              </h5>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Hãy là người đầu tiên chia sẻ cảm nhận về hiệu quả và chất lượng của sản phẩm thuốc này!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWriteModalOpen(true)}
              className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#0047a5] text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={14} />
              <span>Viết Đánh Giá Ngay</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const displayName = sanitizeReviewerName(rev.reviewerName);
              const displayPhone = maskReviewerPhone(rev.reviewerPhone);
              const avatarLetter = (displayName || 'K')[0].toUpperCase();

              return (
              <div
                key={rev._id}
                className="p-5 bg-white border border-slate-200/90 rounded-2xl space-y-3 hover:border-blue-200 transition-colors shadow-2xs"
              >
                {/* Header nhận xét: Avatar, Tên, Ngày, Badge verified purchase */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-black flex items-center justify-center text-sm shadow-xs uppercase shrink-0">
                      {avatarLetter}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-bold text-slate-800">
                          {displayName}
                        </strong>
                        {displayPhone && (
                          <span className="text-xs text-slate-400 font-mono">
                            ({displayPhone})
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck size={11} className="text-emerald-600" />
                          Đã mua tại ABC Pharmacy
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Đánh giá ngày {formatDate(rev.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Số sao của đánh giá này */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={
                          s <= rev.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-200'
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Các tag cảm nhận nhanh */}
                {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1"
                      >
                        <Tag size={10} />
                        <span>{t}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Nội dung nhận xét chi tiết */}
                {rev.comment && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                    {rev.comment}
                  </p>
                )}

                {/* Ảnh thực tế khách hàng upload */}
                {Array.isArray(rev.images) && rev.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rev.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setLightboxImage(imgUrl)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-slate-50 flex items-center justify-center shadow-2xs"
                      >
                        <img
                          src={imgUrl}
                          alt={`Ảnh đánh giá ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer nhận xét: Bình chọn hữu ích */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="text-[11px] text-slate-400">
                    Phản hồi hữu ích cho người bệnh khác
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVoteHelpful(rev._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      votedReviews[rev._id]
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <ThumbsUp
                      size={13}
                      className={votedReviews[rev._id] ? 'fill-emerald-600 text-emerald-600' : ''}
                    />
                    <span>Hữu ích ({rev.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}

            {/* Phân trang đánh giá */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-600 px-3">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox phóng to ảnh khi click */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              className="max-h-[85vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Modal Viết Đánh Giá Sản Phẩm (UC-77) */}
      <ProductReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        medicine={{
          id: medicineId,
          _id: medicineId,
          name: medicineName,
          price: medicine?.price,
          unit: medicine?.unit,
          image: medicine?.image || (Array.isArray(medicine?.images) ? medicine?.images[0] : null),
        }}
        initialMode="WRITE"
        onSuccess={() => {
          fetchReviewsData();
        }}
      />
    </section>
  );
};

