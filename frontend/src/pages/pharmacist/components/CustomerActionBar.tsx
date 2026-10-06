import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  X,
} from 'lucide-react';
import {
  FullCustomerProfile,
  RecentCustomerRecord,
  QuickRegisterCustomerDto,
} from '../../../services/sales/customer.service';
import { QuickRegisterCustomerModal } from './QuickRegisterCustomerModal';
import { CustomerClinicalModal } from './CustomerClinicalModal';

interface CustomerActionBarProps {
  customer: FullCustomerProfile | null;
  isWalkIn: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSearching: boolean;
  searchError: string | null;
  isNotFound: boolean;
  recentCustomers: RecentCustomerRecord[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (phone?: string) => void;
  onQuickRegister: (dto: QuickRegisterCustomerDto) => Promise<{ success: boolean; error?: string }>;
  onSelectRecent: (item: RecentCustomerRecord) => void;
  onWalkIn: () => void;
  onClear: () => void;
  usePoints: boolean;
  onToggleUsePoints: (use: boolean) => void;
  redeemedPoints: number;
}

export const CustomerActionBar: React.FC<CustomerActionBarProps> = ({
  customer,
  isWalkIn,
  searchQuery,
  setSearchQuery,
  isSearching,
  searchError,
  isNotFound,
  recentCustomers,
  inputRef,
  onSearch,
  onQuickRegister,
  onSelectRecent,
  onWalkIn,
  onClear,
  usePoints,
  onToggleUsePoints,
  redeemedPoints,
}) => {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-[16px] p-4 shadow-sm">
        {/* Card Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
            KHÁCH HÀNG THÂN THIẾT
          </h3>
          {customer ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
              {customer.loyalty.tier} VIP
            </span>
          ) : isWalkIn ? (
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded uppercase">
              Khách Lẻ • Guest
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Thêm</span>
              </button>
              <button
                type="button"
                onClick={onWalkIn}
                title="Bật chế độ khách lẻ (Role: Guest)"
                className="px-2 py-1 border rounded-lg font-semibold text-[11px] cursor-pointer flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>Khách lẻ</span>
              </button>
            </div>
          )}
        </div>

        {/* CASE 1: CUSTOMER IDENTIFIED */}
        {customer ? (
          <div className="flex flex-col gap-2.5 text-xs text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <UserCheck size={15} />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-[13px]">
                    {customer.loyalty.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">
                    {customer.loyalty.phone}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsClinicalModalOpen(true)}
                  className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg font-semibold cursor-pointer"
                >
                  Hồ sơ
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  title="Xóa khách hàng vừa tìm"
                  className="px-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold cursor-pointer flex items-center gap-1"
                >
                  <X size={12} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500 font-medium">Điểm tích lũy:</span>
              <strong className="text-emerald-700 font-mono font-bold text-xs">
                {customer.loyalty.points.toLocaleString()}đ
              </strong>
            </div>

            {customer.clinical.allergies && customer.clinical.allergies.length > 0 && (
              <div className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                Dị ứng: {customer.clinical.allergies.join(', ')}
              </div>
            )}

            {customer.loyalty.points > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => onToggleUsePoints(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">Dùng điểm</span>
                </label>
                {usePoints && (
                  <span className="text-xs font-bold text-emerald-700 font-mono">
                    -{redeemedPoints.toLocaleString()}đ
                  </span>
                )}
              </div>
            )}
          </div>
        ) : isWalkIn ? (
          /* CASE 2: WALK-IN GUEST (KHÔNG CẦN NHẬP SĐT) */
          <div className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <UserX size={15} />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-[13px]">
                  Khách lẻ vãng lai
                </div>
                <div className="text-[11px] text-slate-500">
                  Không cần SĐT • Vai trò: <strong className="font-mono text-emerald-700">Role: guest</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onWalkIn}
              title="Hủy chế độ khách lẻ để tìm kiếm theo SĐT"
              className="px-2.5 py-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold cursor-pointer flex items-center gap-1"
            >
              <X size={12} />
              <span>Hủy</span>
            </button>
          </div>
        ) : (
          /* CASE 3: SEARCH / IDLE STATE (CÓ NHẬP SĐT) */
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập SĐT khách hàng... (Enter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-3 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      onClear();
                    }}
                    title="Xóa nội dung tìm kiếm"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSearch()}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs rounded-lg cursor-pointer h-full"
                >
                  {isSearching ? '...' : 'Tìm'}
                </button>
              </div>
            </div>

            {/* Validation Error Notification */}
            {searchError && !isNotFound && (
              <div className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-[11px] text-rose-700 font-medium">
                <AlertCircle size={13} className="shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Not Found Notification */}
            {isNotFound && (
              <div className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-[11px] text-amber-800">
                <span>Chưa có SĐT <strong>{searchQuery}</strong></span>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="font-bold underline text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  + Đăng ký
                </button>
              </div>
            )}

            {/* Recent Customers List */}
            {recentCustomers.length > 0 && !isNotFound && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 pt-0.5">
                <span className="text-slate-400">Gần đây:</span>
                {recentCustomers.map((rc) => (
                  <button
                    key={rc.phone}
                    type="button"
                    onClick={() => onSelectRecent(rc)}
                    className="hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    {rc.fullName} ({rc.phone.slice(-4)})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <QuickRegisterCustomerModal
        isOpen={isRegisterModalOpen}
        initialPhone={searchQuery}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmit={async (dto) => {
          const res = await onQuickRegister(dto);
          if (res.success) {
            setIsRegisterModalOpen(false);
          }
          return res;
        }}
      />

      <CustomerClinicalModal
        isOpen={isClinicalModalOpen}
        customer={customer}
        onClose={() => setIsClinicalModalOpen(false)}
      />
    </>
  );
};
