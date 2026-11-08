// ProductReviewModal.tsx - Modal Đánh Giá & Xem Tất Cả Review Sản Phẩm Thuốc Trên Web (UC-77)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  X,
  Upload,
  CheckCircle2,
  ThumbsUp,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { medicineService } from '../../services/inventory/medicine.service';
import { sanitizeReviewerName, maskReviewerPhone } from '../../utils/reviewSanitizer';
import {
  productReviewService,
  ProductReviewItem,
  ProductReviewSummary,
} from '../../services/inventory/productReview.service';

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: any; // Thông tin thuốc: id/_id, name, image, sku, unit, price
  order?: any; // Thông tin đơn hàng (nếu đánh giá từ lịch sử đơn hàng)
  initialMode?: 'WRITE' | 'VIEW_ALL';
  onSuccess?: () => void;
}

const POSITIVE_TAGS = ['Hiệu quả tốt', 'Đóng gói cẩn thận', 'Giao hàng nhanh', 'Hàng chính hãng', 'Giá hợp lý'];
const NEUTRAL_TAGS = ['Dùng được', 'Bình thường'];
const NEGATIVE_TAGS = ['Kém hiệu quả', 'Bao bì xấu', 'Giao trễ', 'Khác hàng mô tả'];

const RATING_DESC: Record<number, { label: string; color: string }> = {
  5: { label: 'Tuyệt vời & Rất khuyến nghị', color: 'text-amber-500' },
  4: { label: 'Hài lòng', color: 'text-emerald-600' },
  3: { label: 'Bình thường', color: 'text-amber-600' },
  2: { label: 'Không hài lòng', color: 'text-orange-600' },
  1: { label: 'Rất thất vọng', color: 'text-rose-600' },
};

export const ProductReviewModal: React.FC<ProductReviewModalProps> = ({
  isOpen,
  onClose,
  medicine,
  order,
  initialMode = 'WRITE',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'WRITE' | 'VIEW_ALL'>(initialMode);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Hiệu quả tốt', 'Hàng chính hãng']);
  const [comment, setComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerPhone, setReviewerPhone] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hiển thị toast thông báo tương tác trong modal
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Reviews List State
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [starFilter, setStarFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});
  const [medicineDetail, setMedicineDetail] = useState<any>(null);

  const medicineId = medicine?.id || medicine?._id || medicine?.medicineId || '';
  const medicineName = medicine?.name || medicine?.medicineName || 'Sản phẩm thuốc';
  const orderId = order?.id || order?._id || (order ? 'ORD-GUEST' : 'ORD-ONLINE');
  const orderCode = String(order?.orderCode || orderId);

  // Tự động tải thông tin chi tiết và ảnh thực tế của thuốc từ Database nếu chưa có
  useEffect(() => {
    if (isOpen && medicineId) {
      if (medicineService && typeof medicineService.getMedicineById === 'function') {
        medicineService
          .getMedicineById(medicineId)
          .then((data) => {
            if (data) setMedicineDetail(data);
          })
          .catch((err) => {
            console.warn('Lỗi khi nạp ảnh/thông tin thuốc:', err);
          });
      }
    }
  }, [isOpen, medicineId]);

  const displayImage =
    medicineDetail?.image ||
    (Array.isArray(medicineDetail?.images) && medicineDetail?.images[0]) ||
    medicine?.image ||
    (Array.isArray(medicine?.images) && medicine?.images[0]) ||
    'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
  const displayPrice = medicineDetail?.price || medicine?.price;
  const displayUnit = medicineDetail?.unit || medicine?.unit || 'Hộp';
  const displayCategory = medicineDetail?.category || medicine?.category;

  // Điền trước thông tin người dùng từ localStorage hoặc đơn hàng
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSuccessMessage(null);
      setErrorMessage(null);

      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setReviewerName(u.fullName || u.name || order?.patientName || '');
          setReviewerPhone(u.phone || order?.patientPhone || '');
        } else if (order) {
          setReviewerName(order.patientName || '');
          setReviewerPhone(order.patientPhone || '');
        }
      } catch (e) {
        // Bỏ qua lỗi parse
      }
    }
  }, [isOpen, initialMode, order]);

  // Tải danh sách đánh giá từ API
  const fetchReviews = useCallback(async () => {
    if (!medicineId) return;
    try {
      setLoadingReviews(true);
      const queryParams: { page: number; limit: number; rating?: number } = { page, limit: 10 };
      if (typeof starFilter === 'number') {
        queryParams.rating = starFilter;
      }
      const [reviewList, sumData] = await Promise.all([
        productReviewService.getReviews(medicineId, queryParams),
        productReviewService.getReviewSummary(medicineId),
      ]);

      setReviews(reviewList?.data || []);
      setTotalPages(reviewList?.totalPages || 1);
      setTotalCount(reviewList?.total || 0);
      setSummary(sumData);
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách review:', err);
    } finally {
      setLoadingReviews(false);
    }
  }, [medicineId, page, starFilter]);

  useEffect(() => {
    if (isOpen && medicineId) {
      fetchReviews();
    }
  }, [isOpen, medicineId, fetchReviews]);

  if (!isOpen) return null;

  // Cập nhật tag gợi ý theo số sao
  const currentTags = rating >= 4 ? POSITIVE_TAGS : rating === 3 ? NEUTRAL_TAGS : NEGATIVE_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Xử lý upload ảnh lên Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= 3) {
      showToast('Bạn chỉ có thể tải lên tối đa 3 ảnh đánh giá.', 'warning');
      return;
    }

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa là 5MB.', 'warning');
      return;
    }

    try {
      setIsUploadingImage(true);
      setErrorMessage(null);
      const res = await productReviewService.uploadImage(file);
      if (res && res.url) {
        setImages((prev) => [...prev, res.url]);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên Cloudinary');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Gửi bài đánh giá
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId) {
      setErrorMessage('Không tìm thấy thông tin sản phẩm để đánh giá');
      return;
    }
    if (!reviewerName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn');
      return;
    }
    if (!reviewerPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        medicineId,
        medicineName,
        orderId,
        orderCode,
        reviewerName: reviewerName.trim(),
        reviewerPhone: reviewerPhone.trim(),
        rating,
        comment: comment.trim(),
        images,
        tags: selectedTags,
        isVerifiedPurchase: true,
      };

      await productReviewService.submitReview(medicineId, payload);

      setSuccessMessage('🎉 Đã gửi đánh giá thành công! Cảm ơn bạn đã phản hồi.');
      
      // Tự động làm mới danh sách bài đánh giá ngay lập tức
      await fetchReviews();

      // Thông báo cho component cha nếu cần
      if (onSuccess) onSuccess();

      // Sau 1.2s chuyển tự động sang tab xem tất cả bài đánh giá
      setTimeout(() => {
        setMode('VIEW_ALL');
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Lỗi khi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bình chọn hữu ích (Optimistic UI)
  const handleVoteHelpful = async (reviewId: string) => {
    if (votedReviews[reviewId]) return;
    setVotedReviews((prev) => ({ ...prev, [reviewId]: true }));
    setReviews((prev) =>
      prev.map((r) => (r._id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r)),
    );

    try {
      await productReviewService.voteHelpful(reviewId);
    } catch (err) {
      // Rollback nếu thất bại
      setVotedReviews((prev) => ({ ...prev, [reviewId]: false }));
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, helpfulCount: Math.max(0, (r.helpfulCount || 0) - 1) } : r)),
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Thông báo tương tác */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[130] flex items-center gap-2.5 px-4 py-2 rounded-2xl shadow-xl border text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto bg-slate-900/95 text-white border-slate-700/80">
            {toast.type === 'error' && <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle size={16} className="text-amber-400 shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles size={16} className="text-sky-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Star size={20} className="fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Đánh Giá & Review Sản Phẩm
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {medicineName} {summary?.averageRating ? `• ⭐ ${summary.averageRating}/5 (${summary.totalReviews} đánh giá)` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all cursor-pointer"
            title="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher: Viết đánh giá vs Xem tất cả */}
        <div className="px-5 pt-3 bg-white border-b border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode('WRITE')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
              mode === 'WRITE' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={14} />
            <span>Viết Đánh Giá Mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('VIEW_ALL');
              fetchReviews();
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
              mode === 'VIEW_ALL' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare size={14} />
            <span>Xem Tất Cả Đánh Giá ({summary?.totalReviews || totalCount})</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar text-left">
          {/* Thông báo thành công */}
          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div className="text-xs font-bold">{successMessage}</div>
            </div>
          )}

          {/* Thông báo lỗi */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="text-rose-600 shrink-0" />
              <div className="text-xs font-bold">{errorMessage}</div>
            </div>
          )}

          {mode === 'WRITE' ? (
            /* =========================================================================
               TAB 1: FORM VIẾT ĐÁNH GIÁ (UC-77)
               ========================================================================= */
            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Card Thuốc được đánh giá với ảnh thực tế sắc nét */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  <img
                    src={displayImage}
                    alt={medicineName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
                    }}
                    className="max-h-full max-w-full object-contain hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {displayCategory && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 tracking-wider">
                      {displayCategory}
                    </span>
                  )}
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 line-clamp-2 mt-1">
                    {medicineName}
                  </h4>
                  <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500">
                    {displayPrice && (
                      <strong className="text-blue-600 font-bold">
                        {displayPrice.toLocaleString()} đ / {displayUnit}
                      </strong>
                    )}
                    {orderCode && <span>• Đơn hàng #{orderCode}</span>}
                  </div>
                </div>
              </div>

              {/* Bộ chọn số sao tương tác */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Chất lượng sản phẩm thuốc thế nào?
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const isFilled = (hoverRating || rating) >= starIndex;
                    return (
                      <button
                        key={starIndex}
                        type="button"
                        onClick={() => setRating(starIndex)}
                        onMouseEnter={() => setHoverRating(starIndex)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        title={`${starIndex} sao`}
                      >
                        <Star
                          size={32}
                          className={
                            isFilled
                              ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                              : 'text-slate-300'
                          }
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-bold">
                  <span className={RATING_DESC[rating]?.color || 'text-slate-700'}>
                    {rating} sao — {RATING_DESC[rating]?.label}
                  </span>
                </div>
              </div>

              {/* Tags cảm nhận nhanh */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Cảm nhận nhanh của bạn:
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentTags.map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isSelected
                            ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Tag size={12} />
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nhận xét chi tiết */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Chia sẻ thêm về trải nghiệm sử dụng (Tùy chọn):
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Hãy chia sẻ thêm về tác dụng hạ sốt/giảm đau, hạn sử dụng, bao bì bảo quản GSP hoặc tư vấn của dược sĩ..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                <div className="text-[11px] text-slate-400 text-right mt-1">
                  {comment.length} / 1000 ký tự
                </div>
              </div>

              {/* Tải ảnh thực tế lên Cloudinary */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Hình ảnh thực tế sản phẩm (Tối đa 3 ảnh):
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden group bg-slate-50"
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-slate-900/70 text-white rounded-full hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {images.length < 3 && (
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-sky-600 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-emerald-600" />
                          <span className="text-[10px] font-bold">Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          <span className="text-[10px] font-bold">Thêm ảnh</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1.5">
                  Ảnh được lưu trữ an toàn trên máy chủ Cloudinary CDN.
                </span>
              </div>

              {/* Thông tin người đánh giá */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Họ và tên của bạn:
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Số điện thoại xác thực:
                  </label>
                  <input
                    type="tel"
                    required
                    value={reviewerPhone}
                    onChange={(e) => setReviewerPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                🔒 Số điện thoại của bạn sẽ được bảo mật và ẩn 4 số giữa khi hiển thị công khai.
              </p>

              {/* Nút Submit */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="flex-2 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang gửi đánh giá...</span>
                    </>
                  ) : (
                    <>
                      <Star size={15} className="fill-white" />
                      <span>GỬI ĐÁNH GIÁ SẢN PHẨM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* =========================================================================
               TAB 2: XEM TẤT CẢ BÀI ĐÁNH GIÁ CỦA SẢN PHẨM (UC-77)
               ========================================================================= */
            <div className="space-y-5">
              {/* Card thông tin thuốc ở đầu trang Xem tất cả đánh giá */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  <img
                    src={displayImage}
                    alt={medicineName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {displayCategory && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 tracking-wider">
                      {displayCategory}
                    </span>
                  )}
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 line-clamp-2 mt-1">
                    {medicineName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    {displayPrice && (
                      <span className="text-blue-600 font-bold">
                        {displayPrice.toLocaleString()} đ / {displayUnit}
                      </span>
                    )}
                    <span>• {summary?.totalReviews || totalCount} đánh giá từ khách hàng</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('WRITE')}
                  className="hidden sm:inline-flex px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  <Sparkles size={13} />
                  <span>Viết đánh giá</span>
                </button>
              </div>

              {/* Bảng tổng hợp xếp hạng Scorecard */}
              {summary && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
                  <div className="text-center sm:border-r sm:border-slate-200 sm:pr-6 shrink-0">
                    <div className="text-4xl font-black text-slate-800 tracking-tight">
                      {summary.averageRating.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 my-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          className={
                            s <= Math.round(summary.averageRating)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {summary.totalReviews} bài đánh giá
                    </span>
                  </div>

                  {/* Thanh phân bố từng sao */}
                  <div className="flex-1 w-full space-y-1.5">
                    {[5, 4, 3, 2, 1].map((starNum) => {
                      const pct = summary.percentages[starNum] || 0;
                      const count = summary.ratingBreakdown[starNum] || 0;
                      return (
                        <div key={starNum} className="flex items-center gap-2.5 text-xs">
                          <span className="w-8 font-bold text-slate-600">{starNum}⭐</span>
                          <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-[11px] text-slate-400 font-semibold">
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bộ lọc số sao */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStarFilter(undefined);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    starFilter === undefined
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Tất cả ({summary?.totalReviews || totalCount})
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStarFilter(s);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      starFilter === s
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s} sao ({summary?.ratingBreakdown[s] || 0})
                  </button>
                ))}
              </div>

              {/* Danh sách các bài Review */}
              {loadingReviews ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-500">Đang tải danh sách đánh giá...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                  <MessageSquare size={36} className="text-slate-300 mx-auto" />
                  <div>
                    <h5 className="text-sm font-bold text-slate-700">Chưa có đánh giá nào</h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('WRITE')}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    <span>Viết Đánh Giá Ngay</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {reviews.map((rev) => (
                    <div
                      key={rev._id}
                      className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2.5 hover:border-slate-300 transition-colors shadow-sm"
                    >
                      {/* Review Header */}
                      <div className="flex items-center justify-between">
                        {(() => {
                          const cleanName = sanitizeReviewerName(rev.reviewerName);
                          const cleanPhone = maskReviewerPhone(rev.reviewerPhone);
                          const cleanLetter = (cleanName || 'K')[0].toUpperCase();
                          return (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold">
                                {cleanLetter}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800">
                                    {cleanName}
                                  </span>
                                  {rev.isVerifiedPurchase && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                      <ShieldCheck size={10} />
                                      <span>Đã mua tại nhà thuốc</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {cleanPhone ? cleanPhone + ' • ' : ''}
                                  {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={13}
                              className={
                                s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      {rev.tags && rev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {rev.tags.map((t, tidx) => (
                            <span
                              key={tidx}
                              className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md text-[10px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Comment */}
                      {rev.comment ? (
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {rev.comment}
                        </p>
                      ) : null}

                      {/* Attached Photos với nhãn và nút xem phóng to */}
                      {rev.images && rev.images.length > 0 && (
                        <div className="pt-1 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 block">
                            📷 Hình ảnh thực tế từ người mua ({rev.images.length}):
                          </span>
                          <div className="flex gap-2.5 flex-wrap">
                            {rev.images.map((img, iidx) => (
                              <button
                                key={iidx}
                                type="button"
                                onClick={() => setLightboxImage(img)}
                                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 overflow-hidden hover:border-sky-500 transition-all cursor-pointer bg-slate-50 shadow-xs"
                                title="Bấm để xem ảnh phóng to"
                              >
                                <img
                                  src={img}
                                  alt="Ảnh đánh giá thực tế"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Helpful Button */}
                      <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleVoteHelpful(rev._id)}
                          className={`text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            votedReviews[rev._id]
                              ? 'bg-sky-50 text-sky-600'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <ThumbsUp size={12} className={votedReviews[rev._id] ? 'fill-sky-600' : ''} />
                          <span>Hữu ích ({rev.helpfulCount || 0})</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Phân trang */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 text-xs text-slate-500 font-bold">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft size={14} />
                        <span>Trang trước</span>
                      </button>
                      <span>
                        Trang {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Trang sau</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Xem Ảnh Phóng To (Lightbox) */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-2xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightboxImage}
                alt="Phóng to ảnh"
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
