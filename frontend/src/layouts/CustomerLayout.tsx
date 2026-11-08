import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { CustomerHeader } from "../components/common/CustomerHeader";
import { ChatWidget } from "../components/chat";
import { FirstTimeHealthOnboardingModal } from "../components/health/FirstTimeHealthOnboardingModal";
import { authService } from "../services/auth/auth.service";
import { customerService } from "../services/sales/customer.service";

export function CustomerLayout() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Kiểm tra nếu người dùng đã đăng nhập và chưa hoàn tất hồ sơ y khoa ban đầu
    const user = authService.getCurrentUser();
    if (!user) return;
    setUserProfile(user);

    // Kiểm tra nếu người dùng đã đăng nhập và chưa hoàn tất hồ sơ y khoa ban đầu (Bắt buộc Hard Gate)
    const checkHealthProfile = async () => {
      try {
        const clinical = await customerService.getMyClinicalProfile();
        // Nếu cờ hasCompletedHealthOnboarding chưa bật -> bắt buộc hiển thị form khai báo
        if (clinical && clinical.hasCompletedHealthOnboarding === false) {
          setIsOnboardingOpen(true);
        }
      } catch (err) {
        console.warn("Không thể kiểm tra hồ sơ y khoa tự động:", err);
      }
    };

    checkHealthProfile();
  }, []);

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
            <span className="text-sky-400 font-bold">● Đạt chuẩn GPP Bộ Y Tế</span>
            <span className="text-slate-500">|</span>
            <span className="text-blue-400">AI-driven prescription & retail</span>
          </div>
        </div>
      </footer>

      {/* Dược sĩ Bồ Câu AI nổi ở góc phải (đã gộp linh vật và khung chat) */}
      <ChatWidget />

      {/* Modal Khai Báo Hồ Sơ Y Khoa Khi Signin Lần Đầu (Bắt buộc hoàn thành - Hard Gate) */}
      <FirstTimeHealthOnboardingModal
        isOpen={isOnboardingOpen}
        isRequired={true}
        onClose={() => setIsOnboardingOpen(false)}
        userFullName={userProfile?.fullName || userProfile?.email || "Quý khách"}
        onSuccess={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}

