import React, { useState } from "react";
import { Bot, User, ShieldAlert, AlertTriangle, Sparkles, CheckCircle, ShoppingBag, CornerDownRight } from "lucide-react";
import { DrugCard, ChatDrugItem } from "./DrugCard";

export interface MessageItem {
  id: string;
  sender: "user" | "bot";
  text: string;
  drugs?: ChatDrugItem[];
  warnings?: string;
  follow_up_question?: string;
  disclaimer?: string;
  timestamp: string;
}

interface ChatMessageProps {
  message: MessageItem;
  onAddToCart: (drug: ChatDrugItem) => Promise<boolean>;
  onAddAllToCart?: (drugs: ChatDrugItem[]) => Promise<void>;
  onQuickReplySelect?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onAddToCart,
  onAddAllToCart,
  onQuickReplySelect,
}) => {
  const isUser = message.sender === "user";
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addedAllSuccess, setAddedAllSuccess] = useState(false);

  const availableDrugs = (message.drugs || []).filter((d) => d.in_stock && d.medicine_id);

  const handleAddAll = async () => {
    if (!onAddAllToCart || availableDrugs.length === 0 || isAddingAll) return;
    setIsAddingAll(true);
    try {
      await onAddAllToCart(availableDrugs);
      setAddedAllSuccess(true);
      setTimeout(() => setAddedAllSuccess(false), 3000);
    } finally {
      setIsAddingAll(false);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 my-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="max-w-[85%] sm:max-w-[78%]">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-sm">
            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
          </div>
          <span className="block text-[10px] text-slate-400 text-right mt-1 px-1">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 my-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
        <Bot size={18} />
      </div>

      <div className="flex-1 max-w-[92%] sm:max-w-[85%] flex flex-col gap-2.5">
        {/* Header bot */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-xs font-bold text-slate-800">Dược sĩ AI</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
            DeepSeek Flash
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">{message.timestamp}</span>
        </div>

        {/* Text response */}
        {message.text && (
          <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>
        )}

        {/* Warning callout (if any) */}
        {message.warnings && message.warnings.trim().length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-800 mb-0.5">Lưu ý an toàn:</span>
              <p className="text-amber-700 font-medium">{message.warnings}</p>
            </div>
          </div>
        )}

        {/* Recommended Drugs Section */}
        {message.drugs && message.drugs.length > 0 && (
          <div className="flex flex-col gap-2 bg-slate-50/70 border border-blue-100/80 rounded-2xl p-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-600" />
                Sản phẩm Dược sĩ đề xuất ({message.drugs.length})
              </span>

              {availableDrugs.length >= 2 && onAddAllToCart && (
                <button
                  type="button"
                  onClick={handleAddAll}
                  disabled={isAddingAll}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    addedAllSuccess
                      ? "bg-emerald-500 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  }`}
                >
                  {addedAllSuccess ? (
                    <>
                      <CheckCircle size={12} /> Đã thêm cả {availableDrugs.length} sản phẩm
                    </>
                  ) : isAddingAll ? (
                    "Đang thêm..."
                  ) : (
                    <>
                      <ShoppingBag size={12} /> Thêm cả {availableDrugs.length} vào giỏ
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {message.drugs.map((drug, idx) => (
                <DrugCard key={idx} drug={drug} onAddToCart={onAddToCart} />
              ))}
            </div>
          </div>
        )}

        {/* Follow-up question (if any) */}
        {message.follow_up_question && (
          <div className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-2.5 flex items-start gap-2">
            <CornerDownRight size={14} className="text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-sky-900 font-semibold mb-1.5">
                {message.follow_up_question}
              </p>
              {onQuickReplySelect && (
                <button
                  type="button"
                  onClick={() => onQuickReplySelect(message.follow_up_question || "")}
                  className="text-[11px] font-bold text-sky-700 bg-white hover:bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200 transition-colors cursor-pointer"
                >
                  Trả lời câu hỏi này
                </button>
              )}
            </div>
          </div>
        )}

        {/* Medical disclaimer */}
        {message.disclaimer && (
          <p className="text-[10px] text-slate-400 italic px-1 leading-tight">
            * {message.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
};
