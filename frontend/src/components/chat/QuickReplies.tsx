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
  const safeOptions = options || DEFAULT_OPTIONS;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <Sparkles size={11} className="text-amber-500" />
        <span>Gợi ý triệu chứng nhanh:</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(safeOptions || []).map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className="text-xs font-normal px-3 py-1 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
