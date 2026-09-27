import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DoveFigure, DoveFigureHandle, DoveStand } from "./DoveFigure";
import { Sparkles, BrainCircuit, HeartHandshake, Smile, RefreshCw } from "lucide-react";

const TIPS = [
  "Chào bạn! Mình là Bồ Câu Y Tế, trợ lý sức khỏe số của ABC Pharmacy!",
  "Gợi ý: Kiểm tra tương tác thuốc bằng AI để tránh các phản ứng phụ nguy hiểm nhé.",
  "Mọi lô thuốc tại đây đều được kiểm định chuẩn GPP và lưu hành minh bạch.",
  "Mẹo nhỏ: Nhớ uống thuốc đúng giờ và đủ liều theo hướng dẫn của dược sĩ!",
  "Hôm nay bạn thấy trong người thế nào? Cần mình hỗ trợ tìm thuốc gì không?"
];

export function DoveMascotHero() {
  const doveRef = useRef<DoveFigureHandle>(null);
  const [stand, setStand] = useState<DoveStand>("idle");
  const [tipIndex, setTipIndex] = useState(0);
  const [isTalking, setIsTalking] = useState(false);

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
    doveRef.current?.hup();
    triggerSpeechAnimation();
  };

  const triggerSpeechAnimation = () => {
    setIsTalking(true);
    setStand("praat");
    let count = 0;
    const interval = setInterval(() => {
      count++;
      // Random volume envelope simulation
      const randomVol = Math.random() * 0.8 + 0.2;
      doveRef.current?.zetAmp(randomVol);
      if (count > 12) {
        clearInterval(interval);
        doveRef.current?.zetAmp(0);
        setStand("idle");
        setIsTalking(false);
      }
    }, 120);
  };

  const toggleStand = () => {
    const stands: DoveStand[] = ["idle", "denkt", "alert", "slaapt"];
    const next = stands[(stands.indexOf(stand) + 1) % stands.length];
    setStand(next);
    if (next === "slaapt") {
      // Dove sleeping
    } else {
      doveRef.current?.hup();
    }
  };

  return (
    <div className="relative bg-gradient-to-b from-white to-blue-50/60 border border-blue-100 rounded-[32px] p-6 sm:p-7 shadow-xl shadow-blue-500/5 overflow-hidden flex flex-col items-center text-center group">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Top Header Badge */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Trợ Lý Sức Khỏe AI
        </span>

        <button
          onClick={toggleStand}
          className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/80 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          title="Đổi trạng thái biểu cảm"
        >
          <RefreshCw size={12} className={stand !== "idle" ? "text-blue-600" : ""} />
          <span className="capitalize">{stand}</span>
        </button>
      </div>

      {/* Speech Bubble */}
      <div className="relative w-full bg-white border border-blue-100 rounded-2xl p-3.5 shadow-sm text-left mb-2 transition-all">
        <p className="text-xs font-semibold text-slate-700 leading-relaxed min-h-[38px] flex items-center">
          {TIPS[tipIndex]}
        </p>
        {/* Little triangle arrow pointing down to dove */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-blue-100 rotate-45"></div>
      </div>

      {/* The Mascot SVG Figure */}
      <div className="relative py-1 flex items-center justify-center">
        <DoveFigure
          ref={doveRef}
          stand={stand}
          size={200}
          oogVolgen={true}
          speels={true}
          paasei={true}
          label="Mascot Bồ câu Y tế ABC Pharmacy"
        />
      </div>

      {/* Hint Text */}
      <p className="text-[10px] font-medium text-slate-400 mb-4 select-none">
        💡 <span className="text-slate-500 font-semibold">Tương tác:</span> Click bụng để nhún nhảy, gõ trán để thử Easter Egg!
      </p>

      {/* Interactive Action Buttons */}
      <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={handleNextTip}
          disabled={isTalking}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-[#0d6efd] font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Smile size={14} />
          Trò chuyện
        </button>

        <Link
          to="/interactions"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#0d6efd] to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20 active:scale-95"
        >
          <BrainCircuit size={14} />
          Hỏi AI
        </Link>
      </div>
    </div>
  );
}
