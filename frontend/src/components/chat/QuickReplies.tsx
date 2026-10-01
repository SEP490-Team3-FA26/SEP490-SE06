import React from "react";
import { Sparkles } from "lucide-react";

interface QuickRepliesProps {
  options?: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

const DEFAULT_OPTIONS = [
  "Tôi bị đau đầu, chóng mặt",
  "Sốt nhẹ kèm ho, đau rát họng",
  "Đau dạ dày, ợ chua sau ăn",
  "Dị ứng thời tiết, ngứa da",
  "Mệt mỏi, cần bổ sung Vitamin",
  "Cảm cúm, nghẹt mũi và hắt hơi",
];

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  options = DEFAULT_OPTIONS,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <Sparkles size={12} className="text-amber-500" />
        <span>Gợi ý triệu chứng nhanh:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200/80 hover:border-blue-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
