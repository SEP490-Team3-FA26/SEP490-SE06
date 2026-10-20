import React, { useState } from "react";
import { AlertTriangle, Sparkles, CheckCircle, ShoppingBag, CornerDownRight, LogIn } from "lucide-react";
import { DrugCard, ChatDrugItem } from "./DrugCard";
import { DoveFigure } from "../mascot/DoveFigure";
import { PayOSCard, PayOSPaymentData } from "./PayOSCard";

export type { PayOSPaymentData } from "./PayOSCard";

export interface MessageActionButton {
  label: string;
  action: "LOGIN" | "SHOP" | string;
}

export interface MessageItem {
  id: string;
  sender: "user" | "bot";
  text: string;
  drugs?: ChatDrugItem[];
  warnings?: string;
  follow_up_question?: string;
  disclaimer?: string;
  timestamp: string;
  payment?: PayOSPaymentData;
  actionButton?: MessageActionButton;
  imageUrl?: string;
}

interface ChatMessageProps {
  message: MessageItem;
  onAddToCart: (drug: ChatDrugItem) => Promise<boolean>;
  onAddAllToCart?: (drugs: ChatDrugItem[]) => Promise<void>;
  onQuickReplySelect?: (text: string) => void;
  onBuyNow?: (drug: ChatDrugItem) => void;
  onPaymentSuccess?: (orderCode: number) => void;
  onActionClick?: (action: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onAddToCart,
  onAddAllToCart,
  onQuickReplySelect,
  onBuyNow,
  onPaymentSuccess,
  onActionClick,
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
      <div className="flex justify-end my-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="max-w-[85%] sm:max-w-[78%] flex flex-col items-end gap-1">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Ảnh đính kèm"
              className="max-h-48 rounded-2xl border border-slate-200 object-cover shadow-2xs"
            />
          )}
          {message.text ? (
            <div className="bg-blue-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs shadow-none">
              <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed">{message.text}</p>
            </div>
          ) : null}
          <span className="block text-[10px] text-slate-400 text-right mt-0.5 px-1 font-normal">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 my-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {/* Bot Avatar: Medical Dove Figure */}
      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 overflow-hidden pt-0.5">
        <DoveFigure size={24} kaal={true} decoratief={true} />
      </div>

      <div className="flex-1 max-w-[92%] sm:max-w-[85%] flex flex-col gap-2">
        {/* Header bot */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-xs font-semibold text-slate-700">Dược sĩ Bồ Câu AI</span>
          <span className="text-[10px] text-slate-400 ml-auto">{message.timestamp}</span>
        </div>

        {/* Text response message */}
        {message.text && (
          <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3 text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs">
            {message.text}

            {/* Action Call-to-Action button if required (e.g. login to pay) */}
            {message.actionButton && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center">
                <button
                  type="button"
                  onClick={() => onActionClick?.(message.actionButton!.action)}
                  aria-label={message.actionButton.label}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn size={13} className="stroke-[2.5]" />
                  <span>{message.actionButton.label}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Safety Warning notice if flagged by AI */}
        {message.warnings && message.warnings.trim().length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 flex items-start gap-2 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-800 mb-0.5">Lưu ý an toàn:</span>
              <p className="text-amber-700">{message.warnings}</p>
            </div>
          </div>
        )}

        {/* VietQR PayOS payment embed if active */}
        {message.payment && (
          <PayOSCard
            payment={message.payment}
            onPaymentSuccess={onPaymentSuccess}
          />
        )}

        {/* Recommended Drugs List */}
        {message.drugs && message.drugs.length > 0 && (
          <div className="flex flex-col gap-2 bg-slate-50/60 border border-slate-200/60 rounded-xl p-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles size={13} className="text-blue-600" />
                Dược phẩm đề xuất ({message.drugs.length})
              </span>

              {availableDrugs.length >= 2 && onAddAllToCart && (
                <button
                  type="button"
                  onClick={handleAddAll}
                  disabled={isAddingAll}
                  aria-label="Thêm tất cả sản phẩm vào giỏ hàng"
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                    addedAllSuccess
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-blue-700 hover:bg-blue-50 border border-slate-200"
                  }`}
                >
                  {addedAllSuccess ? (
                    <>
                      <CheckCircle size={11} /> Đã thêm cả {availableDrugs.length}
                    </>
                  ) : isAddingAll ? (
                    "Đang thêm..."
                  ) : (
                    <>
                      <ShoppingBag size={11} /> Thêm cả {availableDrugs.length}
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 mt-0.5">
              {(message.drugs || []).map((drug, idx) => (
                <DrugCard
                  key={idx}
                  drug={drug}
                  onAddToCart={onAddToCart}
                  onBuyNow={onBuyNow}
                />
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Question prompt */}
        {message.follow_up_question && (
          <div className="bg-sky-50/60 border border-sky-200/60 rounded-xl p-2.5 flex items-start gap-1.5">
            <CornerDownRight size={13} className="text-sky-600 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-900 font-medium leading-relaxed">
              {message.follow_up_question}
            </p>
          </div>
        )}

        {/* Medical disclaimer note */}
        {message.disclaimer && (
          <p className="text-[10px] text-slate-400 italic px-1 leading-tight">
            * {message.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
