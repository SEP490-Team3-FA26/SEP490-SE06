import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Mô tả triệu chứng của bạn (ví dụ: đau đầu, sốt nhẹ 2 ngày...)",
}) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto grow textarea height (up to max 120px)
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div className="w-full bg-white border-t border-slate-100 p-3 flex flex-col gap-1.5">
      <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden leading-relaxed max-h-28 overflow-y-auto"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            text.trim() && !disabled
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-95"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          title="Gửi tin nhắn (Enter)"
        >
          <Send size={16} className={text.trim() ? "translate-x-0.5" : ""} />
        </button>
      </div>

      <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
        <span>Nhấn <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> để gửi, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Shift+Enter</kbd> xuống dòng</span>
        <span className="font-semibold text-blue-600/70">DeepSeek Flash AI</span>
      </div>
    </div>
  );
};
