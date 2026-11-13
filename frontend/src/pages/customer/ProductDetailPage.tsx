// ProductDetailPage.tsx - Trang Chi Tiết Sản Phẩm Dược Phẩm Đồng Bộ Chuẩn Long Châu (Issue #267)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  ChevronRight,
  AlertCircle,
  Home,
  ShoppingBag,
  Sparkles,
  Package,
} from 'lucide-react';
import { medicineService } from '../../services/inventory/medicine.service';
import { cartService } from '../../services/sales/cart.service';
import { useWishlist } from '../../hooks/useWishlist';
import { ProductDetailView } from '../../components/customer/ProductDetailView';
import { MedicineCard } from '../../components/MedicineCard';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [medicine, setMedicine] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<{ [key: string]: boolean }>({});
  const [relatedMedicines, setRelatedMedicines] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Hiển thị toast thông báo nội bộ (Tuyệt đối không dùng alert của trình duyệt)
  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Nạp thông tin sản phẩm từ API
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    medicineService
      .getMedicineById(id)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('Không tìm thấy thông tin sản phẩm dược phẩm này.');
        } else {
          setMedicine(data);
          // Cập nhật title trình duyệt
          document.title = `${data.name} | ABC Pharmacy`;

          // Tải các sản phẩm tương tự cùng danh mục
          if (data.category) {
            setLoadingRelated(true);
            medicineService
              .getMedicines({
                category: data.category,
                limit: 6,
                bypassAiSearch: true,
                directDb: true,
              })
              .then((res) => {
                if (!isMounted) return;
                const filtered = (res?.data || []).filter(
                  (m: any) => (m.id || m._id) !== (data.id || data._id),
                );
                setRelatedMedicines(filtered.slice(0, 4));
              })
              .catch(() => {})
              .finally(() => {
                if (isMounted) setLoadingRelated(false);
              });
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.message || err.message || 'Lỗi khi tải thông tin thuốc');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = async (med: any, quantity: number = 1, unit?: string) => {
    const medId = med.id || med._id;
    try {
      await cartService.addProduct(med, quantity);
      setAddedItems((prev) => ({ ...prev, [medId]: true }));
      showToast(`Đã thêm ${quantity} ${unit || med.unit || 'sản phẩm'} vào giỏ hàng!`, 'success');
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [medId]: false }));
      }, 2000);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi thêm vào giỏ hàng', 'warning');
    }
  };

  // Xử lý Mua Ngay
  const handleBuyNow = async (med: any, quantity: number = 1, unit?: string) => {
    await handleAddToCart(med, quantity, unit);
    navigate('/customer/cart');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 flex-1 text-center">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
        <span className="text-xs font-black uppercase text-slate-400 tracking-widest">
          Đang tải thông tin dược phẩm chuẩn GPP...
        </span>
      </div>
    );
  }

  if (error || !medicine) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto flex-1 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Không tìm thấy sản phẩm</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'Sản phẩm bạn đang tìm kiếm có thể đã ngừng kinh doanh hoặc đường dẫn không đúng.'}
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            to="/customer/shop"
            className="px-5 py-2.5 rounded-xl bg-[#0057cd] text-white font-bold text-xs hover:bg-[#0047a5] transition-all"
          >
            Quay lại cửa hàng
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const medId = medicine.id || medicine._id;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Toast thông báo nội bộ */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-[120] text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 animate-in slide-in-from-top-3 ${
            toast.type === 'error' || toast.type === 'warning'
              ? 'bg-rose-950 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' || toast.type === 'warning' ? (
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
          ) : (
            <ShoppingBag size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. BREADCRUMBS NAVIGATION (CHUẨN LONG CHÂU) */}
      {/* ========================================================================= */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-x-auto whitespace-nowrap no-scrollbar py-1">
        <Link to="/" className="text-[#0057cd] hover:underline flex items-center gap-1">
          <Home size={13} />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight size={13} className="text-slate-300 shrink-0" />

        <Link to="/customer/shop" className="text-[#0057cd] hover:underline">
          Thuốc & Dược phẩm
        </Link>
        <ChevronRight size={13} className="text-slate-300 shrink-0" />

        {medicine.category && (
          <>
            <Link
              to={`/customer/shop?category=${encodeURIComponent(medicine.category)}`}
              className="text-[#0057cd] hover:underline"
            >
              {medicine.category}
            </Link>
            <ChevronRight size={13} className="text-slate-300 shrink-0" />
          </>
        )}

        <span className="text-slate-800 font-bold truncate max-w-xs sm:max-w-md">
          {medicine.name}
        </span>
      </nav>

      {/* ========================================================================= */}
      {/* 2. REUSABLE PRODUCT DETAIL VIEW (CHUẨN LONG CHÂU 100%) */}
      {/* ========================================================================= */}
      <ProductDetailView
        medicine={medicine}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        isAdded={!!addedItems[medId]}
        isWishlisted={isInWishlist(medId)}
        onToggleWishlist={toggleWishlist}
      />

      {/* ========================================================================= */}
      {/* 3. KHỐI SẢN PHẨM TƯƠNG TỰ CÙNG DANH MỤC (RECOMMENDED CAROUSEL) */}
      {/* ========================================================================= */}
      {relatedMedicines.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-5 text-left mt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#0057cd] border border-blue-100">
                <Sparkles size={18} />
              </span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Sản Phẩm Tương Tự Cùng Nhóm
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Các loại thuốc thuộc danh mục {medicine.category} được dược sĩ khuyên dùng
                </p>
              </div>
            </div>

            <Link
              to={`/customer/shop?category=${encodeURIComponent(medicine.category || '')}`}
              className="text-xs font-black text-[#0057cd] hover:underline hidden sm:inline-flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedMedicines.map((relMed) => {
              const relId = relMed.id || relMed._id;
              return (
                <MedicineCard
                  key={relId}
                  med={relMed}
                  added={!!addedItems[relId]}
                  isWishlisted={isInWishlist(relId)}
                  onToggleWishlist={toggleWishlist}
                  onClick={() => navigate(`/customer/product/${relId}`)}
                  onAddToCart={(m, qty) => handleAddToCart(m, qty)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

