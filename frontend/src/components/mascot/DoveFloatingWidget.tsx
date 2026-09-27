import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DoveFigure, DoveFigureHandle } from "./DoveFigure";
import { BrainCircuit, X, MessageSquareQuote, Sparkles } from "lucide-react";

export function DoveFloatingWidget() {
  const doveRef = useRef<DoveFigureHandle>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const TIPS = [
    "Bạn cần tìm thuốc gì hôm nay? Bồ Câu có thể hỗ trợ bạn kiểm tra tương tác thuốc bằng AI đấy!",
    "Mẹo: Uống nhiều nước ấm khi uống thuốc để thuốc tan nhanh và giảm kích ứng dạ dày nhé.",
    "Bạn có đơn thuốc của bác sĩ? Hãy gửi ảnh đơn thuốc để Dược sĩ ABC Pharmacy báo giá ngay.",
  ];

  const handleOpen = () => {
    setIsOpen(!isOpen);
    doveRef.current?.hup();
  };

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
    doveRef.current?.hup();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      {/* Speech / Action Popup */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white/95 backdrop-blur-md border border-blue-100 rounded-3xl p-5 shadow-2xl shadow-blue-900/15 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Bồ Câu Y Tế AI
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div
            onClick={handleNextTip}
            className="bg-blue-50/70 hover:bg-blue-50 rounded-2xl p-3.5 mb-3 border border-blue-100 cursor-pointer transition-colors"
            title="Bấm để xem mẹo tiếp theo"
          >
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              "{TIPS[tipIndex]}"
            </p>
            <span className="text-[10px] font-bold text-blue-600 block mt-1.5">
              👉 Bấm để xem lời khuyên khác
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/interactions"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold text-[11px] hover:shadow-md hover:shadow-blue-500/20 transition-all text-center"
            >
              <BrainCircuit size={13} />
              Tra Tương Tác AI
            </Link>
            <Link
              to="/customer/shop"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[11px] transition-all text-center"
            >
              <Sparkles size={13} className="text-amber-500" />
              Mua Thuốc
            </Link>
          </div>
        </div>
      )}

      {/* Floating Mascot Trigger Button */}
      <div className="relative group">
        {!isOpen && (
          <div className="absolute -top-10 right-0 bg-slate-900/90 text-white text-[11px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Gặp Bồ Câu Y Tế nè! 👋
          </div>
        )}

        <button
          onClick={handleOpen}
          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#0057cd] via-[#0284c7] to-teal-400 p-1 shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center overflow-hidden cursor-pointer"
          aria-label="Trợ lý Bồ câu Y tế"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden pt-1">
            <DoveFigure
              ref={doveRef}
              size={56}
              kaal={true}
              speels={true}
              paasei={false}
              label="Mascot Bồ câu"
            />
          </div>
          {/* Notification online dot */}
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
        </button>
      </div>
    </div>
  );
}
