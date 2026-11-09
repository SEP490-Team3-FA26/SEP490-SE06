// ProductDetailView.tsx - Reusable Component Chi Tiết Dược Phẩm Chuẩn Nhà Thuốc Long Châu
import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  RefreshCw,
  PhoneCall,
  Star,
  ShoppingCart,
  Zap,
  Heart,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Info,
  ShieldAlert,
  ChevronRight,
  Package,
} from 'lucide-react';
import { ProductReviewsSection } from './ProductReviewsSection';

interface ProductDetailViewProps {
  medicine: any;
  onAddToCart: (med: any, quantity: number, unit: string) => Promise<void> | void;
  onBuyNow?: (med: any, quantity: number, unit: string) => Promise<void> | void;
  isAdded?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (med: any) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  medicine,
  onAddToCart,
  onBuyNow,
  isAdded = false,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'info' | 'dosage' | 'ingredients' | 'sideEffects'>('info');

  const med = medicine || {};
  const medId = med.id || med._id || '';
  const isRx = med.drug_classification === 'PRESCRIPTION_ANTIBIOTIC' || med.prescription_status === 1;
  const isOutOfStock = med.stock !== undefined && med.stock <= 0;

  // Xử lý danh sách ảnh sản phẩm (Gallery thumbnails)
  const allImages: string[] = [
    med.image,
    ...(Array.isArray(med.images) ? med.images : []),
  ].filter(Boolean);

  const [selectedImage, setSelectedImage] = useState<string>(
    allImages[0] ||
      'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60',
  );

  // Bộ phân giải quy cách đóng gói (Packaging Unit Converter: Hộp / Vỉ / Viên)
  const parsePackaging = (spec: string, defaultUnit: string) => {
    const cleanSpec = (spec || '').toLowerCase().trim();
    const regexFull = /hộp\s+(\d+)\s+vỉ\s*x\s*(\d+)\s+viên/;
    const regexBoxPills = /hộp\s+(\d+)\s+viên/;
    const regexBoxBlisters = /hộp\s+(\d+)\s+vỉ/;

    let units = [defaultUnit || 'Hộp'];
    let multipliers: { [key: string]: number } = { [defaultUnit || 'Hộp']: 1 };

    const matchFull = cleanSpec.match(regexFull);
    if (matchFull) {
      const a = parseInt(matchFull[1], 10);
      const b = parseInt(matchFull[2], 10);
      return { units: ['Hộp', 'Vỉ', 'Viên'], multipliers: { Hộp: a * b, Vỉ: b, Viên: 1 } };
    }
    const matchBoxPills = cleanSpec.match(regexBoxPills);
    if (matchBoxPills) {
      const b = parseInt(matchBoxPills[1], 10);
      return { units: ['Hộp', 'Viên'], multipliers: { Hộp: b, Viên: 1 } };
    }
    const matchBoxBlisters = cleanSpec.match(regexBoxBlisters);
    if (matchBoxBlisters) {
      const a = parseInt(matchBoxBlisters[1], 10);
      return { units: ['Hộp', 'Vỉ'], multipliers: { Hộp: a, Vỉ: 1 } };
    }
    return { units, multipliers };
  };

  const packSpec =
    med.thong_tin_chi_tiet?.['Quy cách đóng gói'] ||
    med.thong_tin_chi_tiet?.['Quy cách'] ||
    '';
  const { units, multipliers } = parsePackaging(packSpec, med.unit || 'Hộp');
  const [selectedUnit, setSelectedUnit] = useState<string>(units[0] || med.unit || 'Hộp');

  const currentMultiplier = multipliers[selectedUnit] || 1;
  const basePrice = Number(med.price) || 0;
  const displayPrice = basePrice * currentMultiplier;

  const countryName =
    med.thong_tin_chi_tiet?.['Nước sản xuất'] ||
    med.thong_tin_chi_tiet?.['Xuất xứ'] ||
    'Việt Nam';
  const manufacturerName =
    med.manufacturer ||
    med.thong_tin_chi_tiet?.['Nhà sản xuất'] ||
    'Dược phẩm chất lượng cao';
  const brandName =
    med.brand ||
    med.thong_tin_chi_tiet?.['Thương hiệu'] ||
    manufacturerName;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto text-left">
      {/* ========================================================================= */}
      {/* 1. KHỐI ĐẶT MUA CHÍNH (HERO 2-COLUMN SECTION CHUẨN LONG CHÂU) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CỘT TRÁI: GALLERY HÌNH ẢNH & CAM KẾT VÀNG */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Khung ảnh chính */}
          <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-6 border border-slate-100 flex items-center justify-center overflow-hidden group">
            <img
              src={selectedImage}
              alt={med.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src =
                  'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60';
              }}
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />

            {/* Badge Kê đơn vs Không kê đơn */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                  isRx
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-blue-50 text-[#0057cd] border-blue-200'
                }`}
              >
                {isRx ? 'Thuốc kê đơn (Rx)' : 'Không kê đơn (OTC)'}
              </span>
            </div>

            {/* Nút yêu thích */}
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(med)}
                className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                  isWishlisted
                    ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-200'
                    : 'bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-white'
                }`}
                title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              >
                <Heart size={16} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            )}
          </div>

          {/* Dải ảnh thumbnails nếu có nhiều ảnh */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-xl border p-1 bg-white shrink-0 overflow-hidden transition-all cursor-pointer ${
                    selectedImage === img
                      ? 'border-[#0057cd] ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* 4 Cam Kết Vàng Chuẩn GPP (Long Châu Style) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">100% Chính hãng</span>
                <span className="text-[10px] text-slate-500 leading-tight">Đạt chuẩn GPP Bộ Y Tế</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
              <RefreshCw size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">Đổi trả 30 ngày</span>
                <span className="text-[10px] text-slate-500 leading-tight">Lỗi 1 đổi 1 nhanh chóng</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
              <Truck size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">Giao siêu tốc 2H</span>
                <span className="text-[10px] text-slate-500 leading-tight">Bảo quản thùng lạnh GSP</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2.5">
              <PhoneCall size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-800">Dược sĩ 24/7</span>
                <span className="text-[10px] text-slate-500 leading-tight">Tư vấn toa miễn phí</span>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: THÔNG TIN SẢN PHẨM & HỘP ĐẶT MUA HÀNG */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Thương hiệu & Nhãn danh mục */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#0057cd] uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              Thương hiệu: {brandName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Xuất xứ: {countryName}
            </span>
          </div>

          {/* Tên sản phẩm chính */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug tracking-tight">
            {med.name}
          </h1>

          {/* Đánh giá sao & Mã SKU */}
          <div className="flex items-center gap-4 flex-wrap text-xs border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={15}
                    className={
                      s <= Math.round(med.averageRating || 5)
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-200'
                    }
                  />
                ))}
              </div>
              <strong className="font-bold text-slate-800">
                {(med.averageRating || 5.0).toFixed(1)}
              </strong>
              <span className="text-slate-400">({med.reviewCount || 0} đánh giá)</span>
            </div>

            <span className="text-slate-300">|</span>

            <div className="text-slate-500 font-mono text-[11px]">
              Mã: <strong className="text-slate-800">{med.sku || med.barcode || medId.slice(-8).toUpperCase()}</strong>
            </div>

            <span className="text-slate-300">|</span>

            <div>
              {isOutOfStock ? (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle size={13} /> Tạm hết hàng
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Sẵn sàng giao hàng
                </span>
              )}
            </div>
          </div>

          {/* Khối giá tiền & Quy cách đóng gói */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-[#0057cd]">
                {displayPrice.toLocaleString('vi-VN')}₫
              </span>
              <span className="text-sm font-semibold text-slate-500">
                / {selectedUnit}
              </span>
            </div>

            {/* Bộ chọn đơn vị quy đổi (Hộp / Vỉ / Viên) chuẩn Long Châu */}
            {units.length > 1 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-bold text-slate-600">Chọn đơn vị đóng gói:</span>
                <div className="flex gap-2">
                  {units.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setSelectedUnit(u)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        selectedUnit === u
                          ? 'bg-[#0057cd] text-white border-[#0057cd] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stepper số lượng & Nút Thêm vào giỏ / Mua ngay */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {/* Bộ tăng giảm số lượng */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-100 border border-slate-200 rounded-2xl p-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={isOutOfStock}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-40 cursor-pointer"
              >
                -
              </button>
              <span className="w-10 text-center font-black text-slate-900 text-sm">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(med.stock || 999, q + 1))}
                disabled={isOutOfStock || quantity >= (med.stock || 999)}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-40 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Nút Thêm vào giỏ hàng */}
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => onAddToCart(med, quantity * currentMultiplier, selectedUnit)}
              className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : isAdded
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : 'bg-[#0057cd] hover:bg-[#0047a5] text-white shadow-blue-500/25'
              }`}
            >
              {isOutOfStock ? (
                'Tạm hết hàng'
              ) : isAdded ? (
                <>
                  <CheckCircle2 size={18} /> Đã thêm vào giỏ!
                </>
              ) : (
                <>
                  <ShoppingCart size={18} /> Thêm vào giỏ hàng
                </>
              )}
            </button>

            {/* Nút Mua Ngay */}
            {onBuyNow && !isOutOfStock && (
              <button
                type="button"
                onClick={() => onBuyNow(med, quantity * currentMultiplier, selectedUnit)}
                className="py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
              >
                <Zap size={18} /> Mua ngay
              </button>
            )}
          </div>

          {/* Bảng tóm tắt thông số dược học nhanh */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">
                Hoạt chất chính
              </span>
              <strong className="text-slate-800 line-clamp-1 block mt-0.5">
                {med.active_ingredient || 'Đang cập nhật'}
              </strong>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">
                Dạng bào chế
              </span>
              <strong className="text-slate-800 line-clamp-1 block mt-0.5">
                {med.dosage_form || 'Viên nén / Dung dịch'}
              </strong>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">
                Quy cách đóng gói
              </span>
              <strong className="text-slate-800 line-clamp-1 block mt-0.5">
                {packSpec || `${med.unit || 'Hộp'}`}
              </strong>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[10px] font-black text-[#0057cd] uppercase tracking-wider block">
                Nhà sản xuất
              </span>
              <strong className="text-slate-800 line-clamp-1 block mt-0.5">
                {manufacturerName}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KHỐI THÔNG TIN DƯỢC LÝ CHI TIẾT (TABS CHUẨN DƯỢC THƯ) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 text-xs sm:text-sm font-bold no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'info'
                ? 'bg-[#0057cd] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Info size={16} /> Công dụng & Chỉ định
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dosage')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'dosage'
                ? 'bg-[#0057cd] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity size={16} /> Cách dùng & Liều lượng
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'ingredients'
                ? 'bg-[#0057cd] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText size={16} /> Thành phần hoạt chất
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sideEffects')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'sideEffects'
                ? 'bg-[#0057cd] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert size={16} /> Tác dụng phụ & Thận trọng
          </button>
        </div>

        {/* Nội dung theo từng Tab */}
        <div className="text-slate-700 text-xs sm:text-sm leading-relaxed space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Chỉ định và Công dụng thuốc</h3>
              <p>{med.cong_dung || 'Chưa cập nhật mô tả chi tiết công dụng của thuốc.'}</p>
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs">
                💡 <strong>Lời khuyên dược sĩ:</strong> Hãy đọc kỹ hướng dẫn sử dụng trước khi dùng. Nếu các triệu chứng không thuyên giảm sau 3 - 5 ngày dùng thuốc, vui lòng tham khảo ý kiến dược sĩ hoặc bác sĩ chuyên khoa.
              </div>
            </div>
          )}

          {activeTab === 'dosage' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Hướng dẫn sử dụng và Liều dùng</h3>
              <p>{med.cach_dung || 'Dùng theo chỉ định của bác sĩ hoặc hướng dẫn trên tờ rơi sản phẩm.'}</p>
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-900 text-xs">
                ⚠️ <strong>Cảnh báo:</strong> Tuyệt đối không tự ý tăng hoặc giảm liều mà không có chỉ định từ nhân viên y tế có chuyên môn.
              </div>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Thành phần dược liệu và Hoạt chất</h3>
              <p>
                Hoạt chất chính: <strong>{med.active_ingredient || 'Đang cập nhật'}</strong>
              </p>
              {med.strength && <p>Hàm lượng: <strong>{med.strength}</strong></p>}
              <p className="text-slate-500 text-xs">
                Các tá dược vừa đủ theo tiêu chuẩn Dược thư Quốc gia Việt Nam.
              </p>
            </div>
          )}

          {activeTab === 'sideEffects' && (
            <div className="space-y-3">
              <h3 className="text-base font-black text-slate-900">Tác dụng phụ cần lưu ý</h3>
              <p>{med.tac_dung_phu || 'Chưa ghi nhận tác dụng phụ nguy hiểm. Ngưng sử dụng ngay nếu có dấu hiệu phát ban, dị ứng hoặc khó thở.'}</p>
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-rose-900 text-xs">
                🛑 <strong>Chống chỉ định:</strong> Người mẫn cảm với bất kỳ thành phần nào của thuốc. Phụ nữ mang thai hoặc cho con bú cần hỏi ý kiến bác sĩ.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KHỐI ĐÁNH GIÁ & NHẬN XÉT CỦA KHÁCH HÀNG (NHÚNG TRỰC TIẾP TRÊN TRANG) */}
      {/* ========================================================================= */}
      <ProductReviewsSection
        medicineId={medId}
        medicineName={med.name}
        medicine={med}
      />
    </div>
  );
};

