import React, { useState, useEffect, useRef } from "react";
import { X, RotateCcw, Bot, Sparkles, ShoppingBag, ShieldCheck, ChevronDown, Check, AlertCircle } from "lucide-react";
import { ChatMessage, MessageItem } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { ChatDrugItem } from "./DrugCard";
import { prescriptionService } from "../../services/sales/prescription.service";
import { cartService } from "../../services/sales/cart.service";
import api from "../../services/core/api";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

const INITIAL_WELCOME_MESSAGE: MessageItem = {
  id: "welcome-1",
  sender: "bot",
  text: "Xin chào! Tôi là Trợ lý Dược sĩ AI của VINAPharmacy. Bạn đang gặp triệu chứng gì hoặc cần tư vấn sử dụng thuốc nào hôm nay?",
  timestamp: "Vừa xong",
  disclaimer: "Tư vấn AI mang tính chất tham khảo y khoa, không thay thế chẩn đoán của bác sĩ.",
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, onMinimize }) => {
  const [messages, setMessages] = useState<MessageItem[]>([INITIAL_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ age_group?: string; gender?: string; allergies?: string[] }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user profile if logged in (for personalized consultation)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/api/users/profile")
      .then((res) => {
        if (res.data) {
          const profile = res.data;
          let calculatedAgeGroup = "adult";
          if (profile.age) {
            const age = Number(profile.age);
            if (age < 15) calculatedAgeGroup = "child";
            else if (age > 60) calculatedAgeGroup = "elderly";
          }
          setUserProfile({
            age_group: calculatedAgeGroup,
            gender: profile.gender,
            allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
          });
        }
      })
      .catch(() => {
        // Silently ignore if profile cannot be fetched
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAddToCart = async (drug: ChatDrugItem): Promise<boolean> => {
    if (!drug.medicine_id || !drug.in_stock) return false;
    const token = localStorage.getItem("token");

    try {
      if (!token) {
        // Guest mode: save to guest_cart in localStorage
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const existing = cart.find((it: any) => it.id === drug.medicine_id || it._id === drug.medicine_id);

        if (existing) {
          if (existing.quantity < drug.stock) {
            existing.quantity += 1;
          }
        } else {
          cart.push({
            id: drug.medicine_id,
            _id: drug.medicine_id,
            name: drug.name,
            category: drug.category || "Dược phẩm",
            price: drug.price,
            quantity: 1,
            unit: drug.unit || "Hộp",
            stock: drug.stock,
            active_ingredient: drug.active_ingredient || "",
            image: drug.image || "",
            drug_classification: drug.drug_classification,
            is_supplement: drug.is_supplement,
          });
        }
        localStorage.setItem("guest_cart", JSON.stringify(cart));
      } else {
        // Logged-in mode: add via cart service API
        await cartService.addToCart(drug.medicine_id, 1);
      }

      // Notify header and components
      window.dispatchEvent(new Event("cartUpdated"));
      showToast(`Đã thêm "${drug.name}" vào giỏ hàng`);
      return true;
    } catch (err: any) {
      console.error("Lỗi thêm vào giỏ hàng:", err);
      showToast("Không thể thêm vào giỏ hàng, vui lòng thử lại!");
      return false;
    }
  };

  const handleAddAllToCart = async (drugs: ChatDrugItem[]) => {
    let count = 0;
    for (const drug of drugs) {
      if (drug.medicine_id && drug.in_stock) {
        const ok = await handleAddToCart(drug);
        if (ok) count++;
      }
    }
    if (count > 0) {
      showToast(`Đã thêm thành công ${count} sản phẩm vào giỏ hàng`);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build history (last 6 messages for token efficiency)
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const res = await prescriptionService.chatConsult({
        message: text,
        history: historyPayload,
        age_group: userProfile.age_group,
        gender: userProfile.gender,
        allergies: userProfile.allergies,
      });

      if (res && res.success) {
        const botMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: res.message,
          drugs: res.drugs || [],
          warnings: res.warnings,
          follow_up_question: res.follow_up_question,
          disclaimer: res.disclaimer,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Xin lỗi bạn, hệ thống AI tạm thời gặp sự cố khi xử lý thông tin. Bạn có thể gửi lại triệu chứng để tôi tư vấn lại nhé.",
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      console.error("Lỗi tư vấn AI Chatbot:", err);
      const errMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "Không thể kết nối đến máy chủ AI Dược sĩ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau giây lát.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[420px] max-w-[430px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-4 right-4 z-60 bg-slate-900/95 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
            <Bot size={20} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-700"></span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm leading-tight">Dược Sĩ AI</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/20 text-white tracking-wider uppercase">
                Flash
              </span>
            </div>
            <span className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Trực tuyến 24/7 • VINAPharmacy
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearHistory}
            className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Xóa lịch sử cuộc trò chuyện"
          >
            <RotateCcw size={15} />
          </button>

          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ChevronDown size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col bg-slate-50/50">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onAddToCart={handleAddToCart}
            onAddAllToCart={handleAddAllToCart}
            onQuickReplySelect={(text) => handleSendMessage(text)}
          />
        ))}

        {/* Quick Replies (show when only welcome message is present) */}
        {messages.length === 1 && (
          <div className="my-2 animate-in fade-in duration-300">
            <QuickReplies onSelect={(opt) => handleSendMessage(opt)} disabled={isLoading} />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5 my-3 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Bot size={18} />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
              </div>
              <span className="text-xs text-slate-500 font-medium ml-1">
                Dược sĩ đang phân tích triệu chứng & tìm thuốc...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Chat Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
};
