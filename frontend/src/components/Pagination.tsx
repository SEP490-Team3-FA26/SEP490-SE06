import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CornerDownLeft } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  totalItems: number;
}

export function Pagination({ currentPage, setCurrentPage, totalPages, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  const [inputPage, setInputPage] = useState<string>(currentPage.toString());

  // Đồng bộ giá trị input khi currentPage thay đổi từ bên ngoài
  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  const handleJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      // Reset về trang hiện tại nếu nhập số không hợp lệ
      setInputPage(currentPage.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJump();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-6 mb-2 py-2 px-1 text-slate-600">
      {/* Thông tin tổng số lượng */}
      <div className="text-xs font-semibold text-slate-500">
        Hiển thị trang <span className="font-bold text-slate-800">{currentPage}</span> / <span className="font-bold text-slate-800">{totalPages}</span>
        <span className="ml-1 text-slate-400 font-normal">({totalItems.toLocaleString("vi-VN")} sản phẩm)</span>
      </div>

      {/* Cụm điều khiển chuyển trang & Nhập số trang */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Nút về trang đầu tiên */}
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          title="Về trang đầu"
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Nút trang trước */}
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Trước</span>
        </button>

        {/* Ô nhập số trang trực tiếp */}
        <form onSubmit={handleJump} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-medium text-slate-500">Trang</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-14 px-1.5 py-0.5 text-center text-xs font-black text-[#0057cd] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] focus:bg-white transition-all"
          />
          <span className="text-xs font-semibold text-slate-400">/ {totalPages}</span>
          <button
            type="submit"
            title="Nhảy đến trang đã nhập"
            className="ml-1 px-2 py-1 bg-[#0057cd] hover:bg-[#004bb1] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <span>Đi</span>
            <CornerDownLeft size={12} />
          </button>
        </form>

        {/* Nút trang sau */}
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>Sau</span>
          <ChevronRight size={16} />
        </button>

        {/* Nút đến trang cuối cùng */}
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          title="Đến trang cuối"
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
