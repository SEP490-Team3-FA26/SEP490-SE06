import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Mic, Square, AlertCircle, Loader2, ImagePlus, X } from "lucide-react";
import { useVoiceInput } from "../../hooks/useVoiceInput";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Component Ô Nhập Tin Nhắn Chat (Pure UI Component)
 * Hỗ trợ nhập text, nhận diện giọng nói (STT), gửi ảnh (DeepSeek Vision) với nén canvas client-side.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Mô tả triệu chứng hoặc gửi ảnh đơn thuốc, vỉ thuốc...",
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nén ảnh client-side qua canvas (tối đa 1024px JPEG) để tối ưu payload và token DeepSeek Vision
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 1024;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageToBase64(file);
        setSelectedImage(compressed);
      } catch (err) {
        console.warn("Lỗi đọc ảnh:", err);
      }
    }
    // Reset file input để có thể chọn lại cùng 1 file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Hỗ trợ dán ảnh trực tiếp từ clipboard (Ctrl + V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const compressed = await compressImageToBase64(file);
              setSelectedImage(compressed);
            } catch (err) {
              console.warn("Lỗi dán ảnh:", err);
            }
            return;
          }
        }
      }
    }
  };

  // Tự động điều chỉnh chiều cao của textarea khi text thay đổi
  const handleUpdateText = (newText: string) => {
    setText(newText);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 110)}px`;
    }
  };

  // Tách biệt toàn bộ logic nhận diện giọng nói và API Backend vào Custom Hook useVoiceInput
  const {
    isListening,
    isTranscribingBE,
    voiceError,
    stopListening,
    toggleVoiceInput,
  } = useVoiceInput({
    currentText: text,
    onTextChange: handleUpdateText,
  });

  // Tự động trỏ con trỏ vào ô nhập khi mở
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Xử lý phím Enter gửi tin nhắn
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Xử lý gửi tin nhắn
  const handleSubmit = () => {
    if (isListening) {
      stopListening();
    }
    const trimmed = text.trim();
    if ((!trimmed && !selectedImage) || disabled) return;
    onSend(trimmed, selectedImage || undefined);
    setText("");
    setSelectedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Xử lý khi người dùng gõ phím trực tiếp
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleUpdateText(e.target.value);
  };

  const canSubmit = (Boolean(text.trim()) || Boolean(selectedImage)) && !disabled;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* Khung preview ảnh đã chọn trước khi gửi */}
      {selectedImage && (
        <div className="relative inline-flex items-center self-start bg-slate-100 p-1 rounded-xl border border-slate-200">
          <img
            src={selectedImage}
            alt="Ảnh xem trước"
            className="w-14 h-14 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="Xóa ảnh"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Thanh trạng thái khi đang ghi âm giọng nói */}
      {isListening && (
        <div className="flex items-center justify-between px-3 py-1 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-medium text-[11px]">
              Đang nghe bạn nói tiếng Việt... Hãy nói triệu chứng hoặc thuốc
            </span>
          </div>
          <button
            type="button"
            onClick={stopListening}
            aria-label="Dừng nghe giọng nói"
            className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Hoàn tất
          </button>
        </div>
      )}

      {/* Hiển thị trạng thái Backend đang xử lý âm thanh (nếu dùng Whisper) */}
      {isTranscribingBE && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs animate-in fade-in duration-150">
          <Loader2 size={13} className="animate-spin text-blue-600" />
          <span className="font-medium text-[11px]">Dược sĩ AI đang phân tích âm thanh...</span>
        </div>
      )}

      {/* Thông báo lỗi nếu microphone không được cấp quyền */}
      {voiceError && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl animate-in fade-in duration-150">
          <AlertCircle size={12} className="text-amber-600 shrink-0" />
          <span>{voiceError}</span>
        </div>
      )}

      {/* Khung nhập tin nhắn tối giản */}
      <div
        className={`relative flex items-end gap-1.5 bg-slate-50 border rounded-2xl px-2.5 py-1.5 transition-all ${
          isListening
            ? "border-rose-400 ring-2 ring-rose-100 bg-white"
            : "border-slate-200/80 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-50"
        }`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={isListening ? "Đang nghe giọng nói của bạn..." : placeholder}
          aria-label="Nội dung tin nhắn tư vấn y tế"
          className="w-full resize-none bg-transparent py-1 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed max-h-28 overflow-y-auto"
        />

        {/* Input ẩn để chọn file ảnh */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Nút gửi ảnh DeepSeek Vision */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Gửi ảnh đơn thuốc hoặc vỉ thuốc"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-200/70 transition-all cursor-pointer"
          title="Gửi ảnh đơn thuốc, vỉ thuốc hoặc triệu chứng"
        >
          <ImagePlus size={16} />
        </button>

        {/* Nút Microphone nhận diện giọng nói */}
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={disabled || isTranscribingBE}
          aria-label={isListening ? "Dừng ghi âm giọng nói" : "Nhập bằng giọng nói tiếng Việt"}
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isListening
              ? "bg-rose-500 text-white animate-pulse shadow-xs"
              : isTranscribingBE
              ? "bg-blue-100 text-blue-600 cursor-wait"
              : "text-slate-400 hover:text-blue-600 hover:bg-slate-200/70"
          }`}
          title={isListening ? "Nhấn để dừng ghi âm" : "Nói để nhập văn bản (Voice to text)"}
        >
          {isListening ? (
            <Square size={11} className="fill-white" />
          ) : isTranscribingBE ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Mic size={15} />
          )}
        </button>

        {/* Nút Gửi tin nhắn */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Gửi tin nhắn"
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            canSubmit
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          title="Gửi tin nhắn"
        >
          <ArrowUp size={14} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
