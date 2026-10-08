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

  // Sync input value when currentPage changes from outside
  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  const handleJump = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      // Reset to current page if input is invalid
      setInputPage(currentPage.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJump();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 px-5 py-3 shadow-sm text-slate-600">
      {/* Page count info */}
      <div className="text-xs font-semibold text-slate-500">
        Hiển thị trang{" "}
        <span className="font-bold text-emerald-600">{currentPage}</span>
        {" "}
        /{" "}
        <span className="font-bold text-emerald-600">{totalPages}</span>
        <span className="ml-1 text-slate-400 font-normal">
          ({totalItems.toLocaleString("vi-VN")} sản phẩm)
        </span>
      </div>

      {/* Navigation controls + jump input */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Go to first page */}
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          aria-label="Go to first page"
          className="p-2 bg-white/80 border border-slate-200/80 rounded-xl text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Go to previous page */}
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
          className="px-3.5 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Trước</span>
        </button>

        {/* Direct page jump input */}
        <form
          onSubmit={handleJump}
          className="flex items-center gap-1.5 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-sm"
        >
          <span className="text-xs font-medium text-slate-500">Trang</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-14 px-1.5 py-0.5 text-center text-xs font-black text-emerald-700 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:bg-white transition-all"
          />
          <span className="text-xs font-semibold text-slate-400">/ {totalPages}</span>
          <button
            type="submit"
            aria-label="Jump to entered page"
            className="ml-1 px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <span>Đi</span>
            <CornerDownLeft size={12} />
          </button>
        </form>

        {/* Go to next page */}
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
          className="px-3.5 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>Sau</span>
          <ChevronRight size={16} />
        </button>

        {/* Go to last page */}
        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
          className="p-2 bg-white/80 border border-slate-200/80 rounded-xl text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
