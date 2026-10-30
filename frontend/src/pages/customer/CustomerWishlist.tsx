import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';
import { cartService } from '../../services/sales/cart.service';

/**
 * Trang giao diện Danh sách sản phẩm yêu thích (Wishlist) dành cho Khách hàng (UC-96)
 * Tuân thủ quy chuẩn thiết kế y tế hiện đại, responsive, hỗ trợ Optimistic UI và thêm nhanh vào giỏ hàng
 */
export function CustomerWishlist() {
  const navigate = useNavigate();
  const { items, loading, removeFromWishlist, clearWishlist, totalCount } = useWishlist();

  // State tìm kiếm, lọc và sắp xếp trong danh sách yêu thích
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // State thêm vào giỏ hàng
  const [addingIds, setAddingIds] = useState<{ [id: string]: boolean }>({});
  const [addedIds, setAddedIds] = useState<{ [id: string]: boolean }>({});

  // Modal xác nhận làm trống danh sách
  const [showClearModal, setShowClearModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Trích xuất danh sách danh mục duy nhất từ các sản phẩm yêu thích
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items]);

  // Lọc và sắp xếp các mục hiển thị
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Lọc theo từ khóa tìm kiếm (tên thuốc, hoạt chất)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.active_ingredient?.toLowerCase().includes(q) ||
          it.category?.toLowerCase().includes(q)
      );
    }

    // Lọc theo danh mục
    if (selectedCategory !== 'ALL') {
      result = result.filter((it) => it.category === selectedCategory);
    }

    // Sắp xếp
    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      // Mới nhất (theo addedAt)
      result.sort((a, b) => {
        const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return result;
  }, [items, searchQuery, selectedCategory, sortBy]);

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = async (item: any) => {
    const medId = item.id || item._id;
    if (!medId) return;

    try {
      setAddingIds((prev) => ({ ...prev, [medId]: true }));
      await cartService.addProduct(item, 1);

      setAddedIds((prev) => ({ ...prev, [medId]: true }));
      showToast(`Đã thêm "${item.name}" vào giỏ hàng!`);

      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [medId]: false }));
      }, 2000);
    } catch (err: any) {
      console.error('Lỗi khi thêm vào giỏ hàng:', err);
      showToast('Không thể thêm sản phẩm vào giỏ hàng');
    } finally {
      setAddingIds((prev) => ({ ...prev, [medId]: false }));
    }
  };

  // Xóa một mục khỏi wishlist
  const handleRemove = async (medicineId: string, medicineName: string) => {
    const res = await removeFromWishlist(medicineId);
    if (res.success) {
      showToast(`Đã xóa "${medicineName}" khỏi yêu thích`);
    }
  };

  // Dọn sạch wishlist
  const handleConfirmClear = async () => {
    await clearWishlist();
    setShowClearModal(false);
    showToast('Đã làm trống toàn bộ danh sách yêu thích');
  };

  return (
    <div className="flex flex-col gap-6 flex-1 max-w-7xl mx-auto w-full pb-16">
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. BREADCRUMB & HEADER */}
      {/* ========================================================================= */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/" className="text-[#0057cd] hover:underline">
          Trang chủ
        </Link>
        <span className="text-slate-300">/</span>
        <Link to="/customer/shop" className="text-[#0057cd] hover:underline">
          Cửa hàng thuốc
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-bold">Sản phẩm yêu thích</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-transparent p-6 rounded-3xl border border-rose-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
            <Heart size={28} className="fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Danh Sách Yêu Thích
              </h1>
              <span className="px-3 py-1 bg-rose-500 text-white text-xs font-extrabold rounded-full shadow-xs">
                {totalCount} sản phẩm
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Lưu giữ các sản phẩm dược phẩm bạn quan tâm để dễ dàng theo dõi giá và đặt hàng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/customer/shop"
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            Tiếp tục mua sắm
          </Link>
          {totalCount > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={16} />
              Dọn sạch
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC (Khi có sản phẩm) */}
      {/* ========================================================================= */}
      {totalCount > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3.5">
          {/* Ô tìm kiếm */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm theo tên thuốc, hoạt chất..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Bộ lọc danh mục & Sắp xếp */}
          <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
              >
                <option value="ALL">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-slate-400 text-xs font-semibold hidden sm:inline">Sắp xếp:</span>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Mới nhất
              </button>
              <button
                onClick={() => setSortBy('price-asc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'price-asc'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Giá thấp
              </button>
              <button
                onClick={() => setSortBy('price-desc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'price-desc'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Giá cao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NỘI DUNG DANH SÁCH SẢN PHẨM HOẶC TRẠNG THÁI RỖNG */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Đang tải danh sách yêu thích...
          </span>
        </div>
      ) : totalCount === 0 ? (
        /* Empty State hoàn toàn trống */
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 mb-5 ring-8 ring-rose-50/50">
            <Heart size={44} className="stroke-[1.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Danh sách yêu thích của bạn đang trống
          </h2>
          <p className="text-slate-500 text-sm max-w-md mt-2 leading-relaxed">
            Hãy khám phá các danh mục dược phẩm và nhấn vào biểu tượng trái tim để lưu lại những sản phẩm bạn quan tâm nhé!
          </p>
          <Link
            to="/customer/shop"
            className="mt-6 px-6 py-3 bg-[#0057cd] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={18} />
            Khám phá cửa hàng thuốc ngay
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Không tìm thấy kết quả phù hợp với bộ lọc */
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-slate-200 text-center">
          <PackageOpen size={40} className="text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="text-slate-400 text-xs mt-1">Vui lòng thử tìm với từ khóa khác hoặc xóa bộ lọc.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        /* Lưới hiển thị các sản phẩm yêu thích */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const medId = item.id || item._id;
            const isOutOfStock = item.stock !== undefined && item.stock <= 0;
            const isAdding = !!addingIds[medId];
            const isAdded = !!addedIds[medId];

            return (
              <div
                key={medId}
                className="group relative bg-white rounded-3xl border border-slate-200/80 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Khu vực ảnh sản phẩm */}
                <div className="relative bg-gradient-to-br from-slate-50 to-rose-50/20 h-48 flex items-center justify-center p-4 overflow-hidden">
                  <img
                    src={
                      item.image ||
                      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60'
                    }
                    alt={item.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src =
                        'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop&q=60';
                    }}
                  />

                  {/* Nút xóa nhanh khỏi wishlist */}
                  <button
                    onClick={() => handleRemove(medId, item.name)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    title="Xóa khỏi danh sách yêu thích"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Badge danh mục */}
                  {item.category && (
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-xs text-[10px] font-bold text-slate-600 rounded-lg shadow-2xs border border-slate-100">
                      {item.category}
                    </span>
                  )}

                  {/* Cảnh báo hết hàng */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1 bg-slate-800 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                        Hết hàng
                      </span>
                    </div>
                  )}
                </div>

                {/* Nội dung thông tin sản phẩm */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <h3
                      title={item.name}
                      className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-2 leading-snug"
                    >
                      {item.name}
                    </h3>

                    {/* Hoạt chất chính */}
                    {item.active_ingredient && (
                      <p className="text-[11px] text-slate-500 font-medium truncate" title={item.active_ingredient}>
                        Hoạt chất: <span className="text-slate-700">{item.active_ingredient}</span>
                      </p>
                    )}

                    {/* Đơn vị tính */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Đơn vị: {item.unit || 'Hộp'}</span>
                      {item.dosage_form && <span>• {item.dosage_form}</span>}
                    </div>
                  </div>

                  {/* Giá thành & Nút Thêm vào giỏ */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-base font-black text-rose-600">
                        {(item.price || 0).toLocaleString('vi-VN')}₫
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">/ {item.unit || 'Hộp'}</span>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock || isAdding}
                      onClick={() => handleAddToCart(item)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isAdded
                          ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : 'bg-[#0057cd] hover:bg-blue-700 text-white shadow-blue-200 active:scale-95'
                      }`}
                    >
                      {isAdding ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : isAdded ? (
                        <>
                          <CheckCircle2 size={14} />
                          Đã thêm
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          Thêm giỏ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL XÁC NHẬN DỌN SẠCH DANH SÁCH */}
      {/* ========================================================================= */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Làm trống danh sách yêu thích?</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ {totalCount} sản phẩm khỏi danh sách yêu thích không? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer"
              >
                Xác nhận xóa hết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CustomerWishlist;
