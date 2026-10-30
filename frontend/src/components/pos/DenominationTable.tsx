import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface DenominationItem {
  key: string;
  label: string;
  value: number;
}

export const DENOMINATIONS: DenominationItem[] = [
  { key: 'count500k', label: '500.000₫', value: 500000 },
  { key: 'count200k', label: '200.000₫', value: 200000 },
  { key: 'count100k', label: '100.000₫', value: 100000 },
  { key: 'count50k', label: '50.000₫', value: 50000 },
  { key: 'count20k', label: '20.000₫', value: 20000 },
  { key: 'count10k', label: '10.000₫', value: 10000 },
  { key: 'count5k', label: '5.000₫', value: 5000 },
  { key: 'count2k', label: '2.000₫', value: 2000 },
  { key: 'count1k', label: '1.000₫', value: 1000 },
];

interface DenominationTableProps {
  counts: Record<string, number>;
  onCountChange: (key: string, val: string) => void;
  onReset?: () => void;
}

export const DenominationTable: React.FC<DenominationTableProps> = ({
  counts,
  onCountChange,
  onReset,
}) => {
  const totalNotes = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const totalAmount = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.key] || 0) * d.value, 0);

  const handleQuickAdd = (key: string, addAmount: number) => {
    const current = counts[key] || 0;
    onCountChange(key, String(current + addAmount));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Nhập số tờ tiền mặt thực tế theo từng mệnh giá:</span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Xóa về 0</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <th className="py-2.5 px-3">Mệnh giá</th>
              <th className="py-2.5 px-3 text-center">Số tờ</th>
              <th className="py-2.5 px-3 text-center">Thêm nhanh</th>
              <th className="py-2.5 px-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DENOMINATIONS.map((d) => {
              const count = counts[d.key] || 0;
              const subtotal = count * d.value;

              return (
                <tr key={d.key} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 font-bold text-slate-700">{d.label}</td>
                  <td className="py-2 px-3 text-center">
                    <input
                      type="number"
                      min={0}
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => onCountChange(d.key, e.target.value)}
                      className="w-16 py-1 px-2 text-center font-bold bg-white border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(d.key, 1)}
                        className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(d.key, 5)}
                        className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(d.key, 10)}
                        className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                      >
                        +10
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    {subtotal.toLocaleString('vi-VN')}₫
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200 font-black text-slate-900">
              <td className="py-2.5 px-3">Tổng cộng</td>
              <td className="py-2.5 px-3 text-center text-emerald-700">{totalNotes} tờ</td>
              <td className="py-2.5 px-3"></td>
              <td className="py-2.5 px-3 text-right text-emerald-700 text-sm">
                {totalAmount.toLocaleString('vi-VN')}₫
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

