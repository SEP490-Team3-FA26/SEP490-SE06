import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Copy,
  ChevronRight,
  Clock,
  Store,
  UserCheck,
  Send,
  Loader2,
  Heart,
} from 'lucide-react';
import { feedbackService } from '../../services/feedback/feedback.service';

const POSITIVE_TAGS = [
  'Dược sĩ tư vấn tận tình',
  'Thuốc đầy đủ, đúng đơn',
  'Không gian quầy sạch sẽ',
  'Thanh toán & in bill nhanh',
  'Giá cả hợp lý',
  'Thái độ niềm nở, ân cần',
];

const NEGATIVE_TAGS = [
  'Thời gian chờ đợi lâu',
  'Dược sĩ chưa nhiệt tình',
  'Hết loại thuốc cần mua',
  'Giá thuốc cao hơn kỳ vọng',
  'Không gian chật chội',
  'Chưa giải thích rõ cách dùng thuốc',
];

export const FeedbackPage: React.FC = () => {
  const { orderCode: paramCode } = useParams<{ orderCode?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderCode = paramCode || searchParams.get('code') || searchParams.get('orderCode') || '';

  // Order state
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);
  const [orderData, setOrderData] = useState<any>(null);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Result state
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!orderCode) {
      setLoadingOrder(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoadingOrder(true);
        const data = await feedbackService.lookupOrder(orderCode);
        setOrderData(data);
        if (data.customerPhone) setPhone(data.customerPhone);
        if (data.customerName) setCustomerName(data.customerName);
      } catch (err: any) {
        console.warn('Lỗi tra cứu đơn hàng:', err);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [orderCode]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim()) {
      setErrorMsg('Vui lòng nhập Số điện thoại để hệ thống cộng điểm thưởng và gửi mã giảm giá cho bạn.');
      return;
    }

    if (!orderCode) {
      setErrorMsg('Thiếu mã hóa đơn. Vui lòng quét lại mã QR trên hóa đơn của bạn.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await feedbackService.submitFeedback({
        orderCode,
        branchId: orderData?.branchId || 'BR-001',
        branchName: orderData?.branchName || 'Chi nhánh ABC Pharmacy',
        customerPhone: phone.trim(),
        customerName: customerName.trim(),
        rating,
        tags: selectedTags,
        comment: comment.trim(),
      });

      setSubmittedResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình hoàn tất đánh giá thành công
  if (submittedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 max-w-md w-full p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 size={44} className="text-emerald-600 animate-bounce" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cảm Ơn Đóng Góp Của Bạn!</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Ý kiến của bạn là động lực to lớn giúp chi nhánh <strong className="text-slate-800">{orderData?.branchName || 'ABC Pharmacy'}</strong> không ngừng nâng cao chất lượng phục vụ.
          </p>

          {/* Hộp điểm thưởng Loyalty */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-left">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Sparkles size={18} className="text-emerald-600" />
              <span>Điểm Thưởng Tích Lũy Thành Viên:</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              +{submittedResult.rewardPointsEarned?.toLocaleString('vi-VN') || '1.000'} Điểm
              <span className="text-xs text-emerald-600 font-medium ml-2">
                (Đã cộng vào SĐT {phone})
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              Hạng thành viên hiện tại: <strong className="uppercase">{submittedResult.customerTier || 'Bronze'}</strong>
            </p>
          </div>

          {/* Voucher quà tặng cho lần sau */}
          {submittedResult.voucher && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mt-4 text-left">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Gift size={18} className="text-amber-600" />
                <span>Quà Tặng Cho Lần Mua Kế Tiếp:</span>
              </div>
              <div className="flex items-center justify-between mt-3 bg-white p-2.5 rounded-xl border border-dashed border-amber-300">
                <span className="font-mono font-black text-base text-amber-700 tracking-wider">
                  {submittedResult.voucher.code}
                </span>
                <button
                  onClick={() => handleCopyCode(submittedResult.voucher.code)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Copy size={13} /> {copiedVoucher ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p className="text-[11px] text-amber-800 mt-2 font-medium">
                {submittedResult.voucher.description} (Áp dụng trong {submittedResult.voucher.expiryDays} ngày).
              </p>
            </div>
          )}

          <button
            onClick={() => navigate('/customer/shop')}
            className="w-full mt-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            Tiếp Tục Khám Phá Cửa Hàng <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex justify-center items-start">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-lg border border-slate-200/80 overflow-hidden">
        {/* Header thương hiệu */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Heart size={14} className="fill-white" /> Trải Nghiệm Khách Hàng
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Đánh Giá Dịch Vụ Nhà Thuốc</h1>
          <p className="text-emerald-100 text-xs mt-1">
            Góp ý của bạn giúp dược sĩ và chi nhánh phục vụ bạn chu đáo hơn!
          </p>
        </div>

        {/* Thông tin đơn hàng & chi nhánh */}
        <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Store size={16} className="text-emerald-700" />
            <span>{orderData?.branchName || 'ABC Pharmacy'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-mono">
            <Clock size={14} />
            <span>Mã: {orderCode || 'Vãng lai'}</span>
          </div>
        </div>

        {/* Banner điểm thưởng Loyalty */}
        <div className="m-4 p-3.5 bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl border border-amber-200/70 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Gift size={20} className="text-amber-600" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-amber-900">Quà Tặng Tri Ân Đánh Giá</div>
            <div className="text-slate-600 mt-0.5 leading-snug">
              Nhận ngay <strong className="text-emerald-700">+1.000đ – +2.000đ Điểm Thưởng</strong> tích lũy và <strong className="text-amber-800">Voucher 5.000đ</strong> cho đơn kế tiếp!
            </div>
          </div>
        </div>

        {/* Form đánh giá */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chấm sao 1-5 */}
          <div className="text-center">
            <label className="block text-sm font-black text-slate-800 mb-3">
              Bạn đánh giá trải nghiệm hôm nay thế nào?
            </label>
            <div className="flex justify-center items-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Star
                    size={38}
                    className={`${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                        : 'text-slate-200 fill-slate-50'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-2">
              {rating === 5 && '🌟 Xuất sắc, rất hài lòng!'}
              {rating === 4 && '😊 Hài lòng, dịch vụ tốt'}
              {rating === 3 && '😐 Bình thường, tạm ổn'}
              {rating === 2 && '🙁 Chưa hài lòng, cần cải thiện'}
              {rating === 1 && '😡 Rất thất vọng, phục vụ kém'}
            </div>
          </div>

          {/* Chọn Tag nhanh */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Điểm bạn cảm thấy ấn tượng hoặc cần góp ý:
            </label>
            <div className="flex flex-wrap gap-2">
              {(rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS).map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? rating >= 4
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nhận xét chi tiết */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nhận xét chi tiết (tùy chọn):
              </label>
              {comment.trim().length >= 30 && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Sparkles size={12} /> Đạt mốc thưởng +1.000 điểm
                </span>
              )}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ thêm cảm nhận của bạn về dược sĩ, thời gian chờ hoặc thuốc..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Thông tin định danh nhận điểm */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <UserCheck size={16} className="text-emerald-600" />
              <span>Thông tin nhận điểm & Voucher quà tặng:</span>
            </div>
            <div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại của bạn (bắt buộc)..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                * Điểm thưởng sẽ được cộng trực tiếp vào số điện thoại này để trừ tiền cho lần mua sau.
              </span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Họ và tên của bạn (tùy chọn)..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Nút gửi đánh giá */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Đang gửi đánh giá...
              </>
            ) : (
              <>
                <Send size={16} /> Gửi Đánh Giá & Nhận Quà
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
