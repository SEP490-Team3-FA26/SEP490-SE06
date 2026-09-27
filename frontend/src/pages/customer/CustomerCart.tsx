import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, ArrowRight, Minus, Plus, Info } from "lucide-react";
import { cartService } from "../../services/sales/cart.service";
import { voucherService } from "../../services/sales/voucher.service";

export function CustomerCart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const updateQuantityTimerRef = useRef<any>(null);

  // Custom premium non-blocking alert modal state
  const [alertModal, setAlertModal] = useState<{ message: string; title?: string; onConfirm?: () => void } | null>(null);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const showAlert = (message: string, title = "Thông báo", onConfirm?: () => void) => {
    setAlertModal({ message, title, onConfirm });
  };

  const loadCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      try {
        const guestCartStr = localStorage.getItem("guest_cart");
        const items = guestCartStr ? JSON.parse(guestCartStr) : [];
        setCartItems(items);
      } catch (err) {
        console.error("Error loading guest cart:", err);
      }
      return;
    }

    try {
      // Auto-merge guest_cart into user cart upon login
      const guestCartStr = localStorage.getItem("guest_cart");
      if (guestCartStr) {
        const guestItems = JSON.parse(guestCartStr);
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          for (const gItem of guestItems) {
            const gId = gItem.id || gItem._id;
            const gQty = Number(gItem.quantity) || 1;
            if (gId) {
              await cartService.addToCart(gId, gQty).catch(e => console.warn("Failed to merge guest item:", e));
            }
          }
          localStorage.removeItem("guest_cart");
          window.dispatchEvent(new Event("cartUpdated"));
        }
      }

      const data = await cartService.getCart();
      setCartItems(data.items || []);
    } catch (err) {
      console.error("Error loading cart:", err);
    }
  };

  useEffect(() => {
    loadCart();
    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  const updateQuantity = async (id: string, newQty: number | string) => {
    // Nếu truyền chuỗi rỗng để user xoá số nhập lại
    if (newQty === "") {
      setCartItems(prev => prev.map(it => ((it.id || it._id) === id ? { ...it, quantity: "" } : it)));
      return;
    }

    const numericQty = typeof newQty === "string" ? parseInt(newQty, 10) : newQty;
    if (isNaN(numericQty)) return;

    if (numericQty <= 0) {
      handleDelete(id);
      return;
    }

    // Check client-side stock first before sending request
    const item = cartItems.find((it) => (it.id || it._id) === id);
    if (item && numericQty > (item.stock || 999)) {
      showAlert(`Chỉ còn ${item.stock} sản phẩm khả dụng trong kho!`);
      // Revert back to stock limit
      setCartItems(prev => prev.map(it => ((it.id || it._id) === id ? { ...it, quantity: item.stock } : it)));
      return;
    }

    // Optimistic UI update cho mượt (cập nhật state ngay lập tức)
    setCartItems(prev => prev.map(it => ((it.id || it._id) === id ? { ...it, quantity: numericQty } : it)));

    const token = localStorage.getItem("token");
    if (!token) {
      // Guest mode: Cập nhật trực tiếp vào localStorage guest_cart
      try {
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const updated = cart.map((it: any) => {
          if (it.id === id || it._id === id) {
            return { ...it, quantity: numericQty };
          }
          return it;
        });
        localStorage.setItem("guest_cart", JSON.stringify(updated));
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err) {
        console.error("Error updating guest cart:", err);
      }
      return;
    }

    // Clear previous debounce timer
    if (updateQuantityTimerRef.current) {
      clearTimeout(updateQuantityTimerRef.current);
    }

    // Debounce the backend call for logged-in users
    updateQuantityTimerRef.current = setTimeout(async () => {
      try {
        await cartService.updateCartItem(id, numericQty);
        await loadCart();
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err: any) {
        // Rollback nếu có lỗi
        await loadCart();
        const msg = err.response?.data?.message || err.message || "Lỗi cập nhật giỏ hàng";
        showAlert(msg);
      }
    }, 300);
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      try {
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const filtered = cart.filter((it: any) => it.id !== id && it._id !== id);
        localStorage.setItem("guest_cart", JSON.stringify(filtered));
        setCartItems(filtered);
        window.dispatchEvent(new Event("cartUpdated"));
      } catch (err) {
        console.error("Error deleting guest cart item:", err);
      }
      return;
    }

    try {
      await cartService.deleteCartItem(id);

      await loadCart();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi xóa sản phẩm";
      showAlert(msg);
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError("Chưa nhập mã giảm giá");
      return;
    }
    setIsValidatingVoucher(true);
    setVoucherError("");
    try {
      const res = await voucherService.validateVoucher(voucherCode.trim(), subtotal);
      if (res.error) {
        setVoucherError(res.message);
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher(res);
        setVoucherError("");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi kiểm tra voucher";
      setVoucherError(msg);
      setAppliedVoucher(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  const handleProceedToCheckout = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showAlert(
        "Vui lòng đăng nhập để tiến hành thanh toán!",
        "Yêu cầu đăng nhập",
        () => navigate("/auth/login")
      );
      return;
    }
    localStorage.setItem("customer_cart", JSON.stringify(cartItems));
    if (appliedVoucher) {
      localStorage.setItem("applied_voucher", JSON.stringify(appliedVoucher));
    } else {
      localStorage.removeItem("applied_voucher");
    }
    navigate("/customer/checkout");
  };

  // Pricing calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * (Number(item.quantity) || 0), 0);
  const memberDiscount = Math.round(subtotal * 0.05); // 5% discount
  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : 0;
  const vat = Math.round(Math.max(0, subtotal - memberDiscount - voucherDiscount) * 0.08); // 8% VAT
  const total = Math.max(0, subtotal - memberDiscount - voucherDiscount + vat);

  // Check if any item has price changed
  const hasPriceChangedItem = cartItems.some((it) => it.priceChanged);

  return (
    <div className="flex flex-col gap-6 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Premium Hero Banner (Đồng bộ format như CustomerShop.tsx) */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white p-8 sm:p-10 shadow-xl border border-white/5">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-blue-500/20 via-sky-400/15 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black tracking-widest uppercase self-start text-blue-400 flex items-center gap-2">
            <ShoppingCart size={14} className="text-blue-400" />
            Giỏ Hàng Dược Phẩm Trực Tuyến ABC Pharma
          </span>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            Giỏ Hàng Mua Thuốc <br className="hidden sm:block" />
            Đối Soát & Nhận Ưu Đãi
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold max-w-2xl">
            Kiểm tra danh mục thuốc, kiểm tra tương tác dược lý AI tự động trước khi thanh toán và tích lũy điểm thưởng thành viên khi hoàn tất đơn hàng.
          </p>

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Số Loại Thuốc</span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5">{cartItems.length} Sản phẩm</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tạm Tính Giỏ Hàng</span>
              <span className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">{subtotal.toLocaleString()}đ</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tích Lũy Dự Kiến</span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">+{Math.round(total / 100).toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      </div>

      {cartItems.length > 0 ? (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Left: Cart Items List */}
          <div className="flex-1 flex flex-col gap-6 w-full">

            {/* Price change notification banner */}
            {hasPriceChangedItem && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm">Cảnh báo cập nhật giá!</h4>
                  <p className="text-[11px] text-amber-700 font-semibold mt-0.5 leading-normal">
                    Một số sản phẩm trong giỏ hàng của bạn đã được cập nhật giá mới từ hệ thống. Vui lòng kiểm tra lại đơn giá và tổng thanh toán trước khi tiến hành đặt hàng.
                  </p>
                </div>
              </div>
            )}



            {/* Cart Items Table container */}
            <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Sản Phẩm</th>
                    <th className="px-4 py-4 text-center">Số Lượng</th>
                    <th className="px-6 py-4 text-right">Đơn Giá</th>
                    <th className="px-6 py-4 text-right">Thành Tiền</th>
                    <th className="px-4 py-4 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.map((item) => {
                    const itemId = item.id || item._id;
                    return (
                      <tr key={itemId} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-extrabold text-slate-900 text-[14px]">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">{item.category}</div>
                          {item.active_ingredient && (
                            <div className="text-[10px] font-semibold text-[#0d6efd] mt-1">Hoạt chất: {item.active_ingredient}</div>
                          )}
                          {item.priceChanged && (
                            <div className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1.5 inline-block">
                              ⚠️ Đã đổi giá (Giá cũ: {item.addedPrice.toLocaleString()}₫)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex items-center justify-center gap-2.5">
                            <button
                              onClick={() => updateQuantity(itemId, (Number(item.quantity) || 1) - 1)}
                              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition-transform"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="text"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(itemId, e.target.value)}
                              onBlur={(e) => {
                                if (e.target.value === "" || Number(e.target.value) <= 0) {
                                  updateQuantity(itemId, 1);
                                }
                              }}
                              className="font-bold text-[14px] text-slate-900 w-10 text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0d6efd] focus:outline-none rounded transition-all py-0.5"
                            />
                            <button
                              onClick={() => updateQuantity(itemId, (Number(item.quantity) || 0) + 1)}
                              className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition-transform"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-medium text-slate-500">
                          {item.price.toLocaleString()}₫
                          <span className="text-[10px] text-slate-400 block mt-0.5">/{item.unit}</span>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-slate-900">
                          {(item.price * (Number(item.quantity) || 0)).toLocaleString()}₫
                        </td>
                        <td className="px-4 py-5 text-center">
                          <button
                            onClick={() => handleDelete(itemId)}
                            className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Link
              to="/customer/shop"
              className="text-xs font-bold text-[#0d6efd] hover:underline flex items-center gap-1.5 self-start"
            >
              ← Tiếp tục mua thêm thuốc khác
            </Link>
          </div>

          {/* Right: Payment Sidebar */}
          <div className="w-full xl:w-[360px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-24">

            {/* Promos */}
            <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ưu Đãi Thành Viên</span>
              <div className="mt-2.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl">
                <span className="font-black text-xs block mb-0.5">VIP Silver Member 5% Off</span>
                <p className="text-[10px] font-semibold text-emerald-700/90 leading-normal">
                  Chiết khấu thành viên được tự động áp dụng trực tiếp cho toàn bộ đơn hàng của bạn.
                </p>
              </div>
            </div>

            {/* Voucher Box */}
            <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã giảm giá / Voucher</span>
              {appliedVoucher ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 p-2.5 rounded-xl text-xs font-semibold text-emerald-800">
                  <div>
                    Mã đã dùng: <span className="font-extrabold uppercase">{appliedVoucher.code}</span>
                    <span className="block text-[10px] text-emerald-600 mt-0.5">Giảm -{appliedVoucher.discount.toLocaleString()}₫</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="text-emerald-500 hover:text-emerald-800 font-bold ml-2 text-md"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mã voucher..."
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0d6efd] focus:bg-white transition-all uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={isValidatingVoucher}
                    className="px-4 py-2 bg-[#0d6efd] hover:bg-[#0a58ca] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    {isValidatingVoucher ? "..." : "Áp dụng"}
                  </button>
                </div>
              )}
              {voucherError && (
                <span className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">{voucherError}</span>
              )}
            </div>

            {/* Total breakdown */}
            <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">Tóm tắt giỏ hàng</h3>

              <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Tạm tính / Subtotal</span>
                  <span className="font-bold text-slate-900">{subtotal.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between items-center text-[#ba1a1a]">
                  <span>Ưu đãi thành viên (5%)</span>
                  <span className="font-bold">-{memberDiscount.toLocaleString()}₫</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between items-center text-[#ba1a1a]">
                    <span>Khuyến mãi Voucher ({appliedVoucher.code})</span>
                    <span className="font-bold">-{voucherDiscount.toLocaleString()}₫</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Thuế VAT (8%)</span>
                  <span className="font-bold text-slate-900">{vat.toLocaleString()}₫</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider pb-0.5">Tổng thanh toán</span>
                  <span className="text-2xl font-black text-[#0d6efd] tracking-tight">{total.toLocaleString()}₫</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full mt-2.5 bg-[#0d6efd] hover:bg-[#0a58ca] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-blue-150 transition-all active:scale-98"
              >
                Tiến hành đặt hàng <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[24px] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4">
            <ShoppingCart size={28} />
          </div>
          <h3 className="font-bold text-slate-700 text-md">Giỏ hàng trống</h3>
          <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-normal">
            Không có sản phẩm nào trong giỏ hàng. Nhấp vào cửa hàng để chọn loại thuốc phù hợp.
          </p>
          <Link
            to="/customer/shop"
            className="mt-5 px-6 py-2.5 bg-[#0d6efd] text-white text-xs font-bold rounded-xl hover:bg-[#0a58ca] transition-all uppercase tracking-wider shadow-sm"
          >
            Vào cửa hàng ngay
          </Link>
        </div>
      )}

      {/* Premium Generic Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0d6efd] flex items-center justify-center mb-5 border border-blue-100 shadow-inner animate-pulse">
              <Info size={28} />
            </div>

            <h3 className="text-md font-black text-slate-800 tracking-tight mb-2">
              {alertModal.title || "Thông báo"}
            </h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-xs mb-6">
              {alertModal.message}
            </p>

            <button
              onClick={() => {
                if (alertModal.onConfirm) {
                  alertModal.onConfirm();
                }
                setAlertModal(null);
              }}
              className="w-full px-5 py-3 bg-[#0d6efd] hover:bg-[#0a58ca] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

