import { LockKeyhole, X } from "lucide-react";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginRequiredModal({ isOpen, onClose, onLogin }: LoginRequiredModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0057cd]">
              <LockKeyhole size={20} />
            </div>
            <div>
              <h2 id="login-required-title" className="text-base font-black text-slate-900">
                Yêu cầu đăng nhập
              </h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo đăng nhập"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-xl bg-[#0057cd] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-[#00419e]"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
