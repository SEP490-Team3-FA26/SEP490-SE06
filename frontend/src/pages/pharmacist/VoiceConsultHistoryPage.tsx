import { useState } from "react";
import VoiceConsultationHistoryView from "./components/VoiceConsultationHistoryView";

// Independent Page for Voice Consultation & AI Clinical Audit History (UC-70)
export default function VoiceConsultHistoryPage() {
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" | "warning" | "info" }[]
  >([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans p-6 overflow-hidden">
      <VoiceConsultationHistoryView showToast={showToast} />
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4.5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold tracking-wide transition-all ${
              toast.type === "error"
                ? "bg-rose-900/95 text-rose-100 border-rose-700/80"
                : toast.type === "warning"
                ? "bg-amber-900/95 text-amber-100 border-amber-700/80"
                : toast.type === "info"
                ? "bg-blue-900/95 text-blue-100 border-blue-700/80"
                : "bg-emerald-950/95 text-emerald-100 border-emerald-700/80"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
