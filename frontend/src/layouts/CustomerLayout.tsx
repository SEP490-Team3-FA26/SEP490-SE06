import { Outlet } from "react-router-dom";
import { CustomerHeader } from "../components/common/CustomerHeader";
import { DoveFloatingWidget } from "../components/mascot/DoveFloatingWidget";
import { ChatWidget } from "../components/chat";

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col selection:bg-[#0d6efd] selection:text-white">
      {/* Synchronized Unified Header (Matching Landing Page 100%) */}
      <CustomerHeader />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <Outlet />
      </main>

      {/* Compliant Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ABC Pharmacy. Chuỗi nhà thuốc số 3.0 & Cổng mua sắm Dược phẩm AI an toàn.</p>
          <div className="flex gap-4">
            <span className="text-emerald-500 font-bold">● Đạt chuẩn GPP Bộ Y Tế</span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-400">AI-driven prescription & retail</span>
          </div>
        </div>
      </footer>

      {/* Floating Mascot Companion */}
      <DoveFloatingWidget />

      {/* Floating AI Pharmacist Chatbot */}
      <ChatWidget />
    </div>
  );
}
