import React from "react";
import { Link } from "react-router-dom";
import { DoveMascotHero } from "./DoveMascotHero";
import { BrainCircuit, ShieldCheck, HeartPulse, Clock, Sparkles, ArrowRight, Download } from "lucide-react";

export function DoveMascotSection() {
  return (
    <section className="py-12 px-4 max-w-7xl mx-auto w-full">
      <div className="bg-gradient-to-br from-slate-900 via-[#002b66] to-[#004bb5] rounded-[36px] p-8 md:p-14 text-white shadow-2xl overflow-hidden relative border border-blue-400/20">
        {/* Abstract background glowing shapes */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-sky-400/15 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-emerald-400/10 rounded-full blur-[90px] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text / Story Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-xs font-black uppercase tracking-wider mb-5">
              <Sparkles size={14} className="text-amber-400" />
              Mascot Chính Thức • ABC Care 3.0
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
              Gặp gỡ <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-teal-200 to-amber-200">Bồ Câu Y Tế</span>, người bạn đồng hành sức khỏe
            </h2>

            <p className="text-slate-200 text-sm sm:text-base font-normal leading-relaxed mb-6 max-w-xl">
              Chim bồ câu trắng từ lâu là biểu tượng của sự bình an và phục hồi. Tại ABC Pharmacy, 
              chú chim bồ câu nhỏ mang trên mình ống nghe và túi cứu thương con con — luôn sẵn sàng 
              lắng nghe, hỗ trợ tra cứu tương tác thuốc và nhắc nhở bạn chăm sóc bản thân mỗi ngày.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mb-8 max-w-xl">
              {[
                {
                  icon: <BrainCircuit size={16} className="text-sky-300" />,
                  title: "Tra cứu tương tác AI",
                  desc: "Đối chiếu hoạt chất chuẩn Dược thư"
                },
                {
                  icon: <ShieldCheck size={16} className="text-emerald-300" />,
                  title: "100% Chuẩn GPP",
                  desc: "Kiểm định nghiêm ngặt theo lô & HSD"
                },
                {
                  icon: <Clock size={16} className="text-amber-300" />,
                  title: "Tư vấn 24/7",
                  desc: "Giải đáp thắc mắc sức khỏe tức thì"
                },
                {
                  icon: <HeartPulse size={16} className="text-rose-300" />,
                  title: "Ân cần & Thấu hiểu",
                  desc: "Giảm áp lực và lo âu khi đi mua thuốc"
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-white/10 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <p className="text-[11px] text-slate-300">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/interactions"
                className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-900 font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2"
              >
                Trải nghiệm Trợ Lý AI <ArrowRight size={15} />
              </Link>

              <a
                href="/mascot/dove-fallback.png"
                target="_blank"
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all flex items-center gap-2"
              >
                <Download size={15} /> Xem ảnh Mascot HD
              </a>
            </div>
          </div>

          {/* Right Mascot Interactive Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm">
              <DoveMascotHero />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
