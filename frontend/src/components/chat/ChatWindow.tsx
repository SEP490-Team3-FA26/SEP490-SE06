import React, { useState, useEffect, useRef } from "react";
import {
  X,
  RotateCcw,
  Bot,
  ChevronDown,
  Check,
  Maximize2,
  Minimize2,
  History,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
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
  defaultFullscreen?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: MessageItem[];
}

const STORAGE_SESSIONS_KEY = "abc_pharmacy_chat_sessions_v1";
const STORAGE_ACTIVE_ID_KEY = "abc_pharmacy_chat_active_session_id";

const INITIAL_WELCOME_MESSAGE: MessageItem = {
  id: "welcome-1",
  sender: "bot",
  text: "Xin chào! Tôi là Trợ lý Dược sĩ AI của ABC Pharmacy. Bạn đang gặp triệu chứng gì hoặc cần tư vấn sử dụng thuốc nào hôm nay?",
  timestamp: "Vừa xong",
  disclaimer: "Tư vấn AI mang tính chất tham khảo y khoa, không thay thế chẩn đoán của bác sĩ.",
};

const createNewSession = (): ChatSession => {
  const now = Date.now();
  return {
    id: `session_${now}`,
    title: "Cuộc trò chuyện mới",
    createdAt: now,
    updatedAt: now,
    messages: [{ ...INITIAL_WELCOME_MESSAGE, id: `welcome_${now}` }],
  };
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  onMinimize,
  defaultFullscreen = false,
}) => {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  // Sessions history drawer state
  const [showHistory, setShowHistory] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createNewSession()];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (savedActive) return savedActive;
    } catch {
      // Fallback
    }
    return "";
  });

  // Current session messages
  const activeSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [INITIAL_WELCOME_MESSAGE];

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    age_group?: string;
    gender?: string;
    allergies?: string[];
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure valid currentSessionId
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Lỗi lưu sessions vào localStorage:", e);
    }
  }, [sessions]);

  // Load user profile if logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api
      .get("/api/users/profile")
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
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !showHistory) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, showHistory]);

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
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const existing = cart.find(
          (it: any) => it.id === drug.medicine_id || it._id === drug.medicine_id
        );

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
        await cartService.addToCart(drug.medicine_id, 1);
      }

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

  const updateCurrentSessionMessages = (newMessages: MessageItem[], userTextPrompt?: string) => {
    const activeId = currentSessionId || (sessions[0] && sessions[0].id);
    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id === activeId) {
          let newTitle = s.title;
          if (
            (newTitle === "Cuộc trò chuyện mới" || !newTitle) &&
            userTextPrompt &&
            userTextPrompt.trim().length > 0
          ) {
            newTitle =
              userTextPrompt.trim().length > 36
                ? `${userTextPrompt.trim().slice(0, 36)}...`
                : userTextPrompt.trim();
          }
          return {
            ...s,
            title: newTitle,
            updatedAt: Date.now(),
            messages: newMessages,
          };
        }
        return s;
      })
    );
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newMessages = [...messages, userMsg];
    updateCurrentSessionMessages(newMessages, text);
    setIsLoading(true);

    try {
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
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        updateCurrentSessionMessages([...newMessages, botMsg]);
      } else {
        const errMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: "Xin lỗi bạn, hệ thống AI tạm thời gặp sự cố khi xử lý thông tin. Bạn có thể gửi lại triệu chứng để tôi tư vấn lại nhé.",
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        updateCurrentSessionMessages([...newMessages, errMsg]);
      }
    } catch (err: any) {
      console.error("Lỗi tư vấn AI Chatbot:", err);
      const errMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "Không thể kết nối đến máy chủ AI Dược sĩ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau giây lát.",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      updateCurrentSessionMessages([...newMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewChat = () => {
    const newSession = createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, newSession.id);
    setShowHistory(false);
    showToast("Đã bắt đầu cuộc trò chuyện mới");
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, sessionId);
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    if (updated.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setCurrentSessionId(fresh.id);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, fresh.id);
    } else {
      setSessions(updated);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(updated[0].id);
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, updated[0].id);
      }
    }
    showToast("Đã xóa cuộc trò chuyện");
  };

  const handleClearCurrentSession = () => {
    const resetMessages = [
      {
        ...INITIAL_WELCOME_MESSAGE,
        id: `welcome_${Date.now()}`,
      },
    ];
    updateCurrentSessionMessages(resetMessages);
    showToast("Đã làm mới cuộc trò chuyện hiện tại");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`z-50 bg-white shadow-2xl flex flex-col font-sans transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 w-full h-full rounded-none"
          : "fixed bottom-4 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[440px] max-w-[450px] h-[600px] max-h-[85vh] rounded-3xl border border-slate-200/90 overflow-hidden"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-4 right-4 z-70 bg-slate-900/95 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in duration-200">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
            <Bot size={20} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-700"></span>
          </div>

          <div className="flex flex-col">
            <span className="font-extrabold text-sm leading-tight tracking-wide">
              Dược Sĩ AI
            </span>
            <span className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Trực tuyến 24/7 • ABC Pharmacy
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Lịch sử hội thoại */}
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              showHistory
                ? "bg-white text-blue-700 shadow-sm"
                : "hover:bg-white/15 text-white/80 hover:text-white"
            }`}
            title="Lịch sử cuộc trò chuyện"
            aria-label="Lịch sử chat"
          >
            <History size={16} />
          </button>

          {/* Làm mới đoạn chat hiện tại */}
          <button
            type="button"
            onClick={handleClearCurrentSession}
            className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Làm mới cuộc trò chuyện này"
            aria-label="Làm mới"
          >
            <RotateCcw size={15} />
          </button>

          {/* Nút Phóng to / Thu nhỏ toàn màn hình */}
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình"}
            aria-label="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Thu nhỏ widget */}
          {onMinimize && !isFullscreen && (
            <button
              type="button"
              onClick={onMinimize}
              className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Thu nhỏ xuống góc"
              aria-label="Thu nhỏ"
            >
              <ChevronDown size={18} />
            </button>
          )}

          {/* Đóng cửa sổ */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ chat"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Container: Messages or History Drawer */}
      <div className="relative flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        {/* History Drawer Overlay */}
        {showHistory ? (
          <div className="absolute inset-0 z-30 bg-white flex flex-col animate-in fade-in slide-in-from-left duration-200">
            {/* History Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2 text-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
                  title="Quay lại chat"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Lịch sử tư vấn ({sessions.length})
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Chat mới</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                const formattedTime = new Date(sess.updatedAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const userMessagesCount = sess.messages.filter((m) => m.sender === "user").length;

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group w-full p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                      isActive
                        ? "bg-blue-50/80 border-blue-200 shadow-xs"
                        : "bg-white border-slate-200/80 hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                        }`}
                      >
                        <MessageSquare size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs font-bold truncate leading-snug ${
                            isActive ? "text-blue-900" : "text-slate-800"
                          }`}
                        >
                          {sess.title || "Cuộc trò chuyện"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {formattedTime}
                          </span>
                          <span>•</span>
                          <span>{userMessagesCount} câu hỏi</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Xóa phiên này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col bg-slate-50/50">
          <div className={`${isFullscreen ? "max-w-4xl mx-auto w-full" : "w-full"}`}>
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
              <div className="my-3 animate-in fade-in duration-300">
                <QuickReplies
                  onSelect={(opt) => handleSendMessage(opt)}
                  disabled={isLoading}
                />
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
                    Dược sĩ đang phân tích triệu chứng và tìm thuốc...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Footer Chat Input */}
        <div className={`w-full ${isFullscreen ? "max-w-4xl mx-auto" : ""}`}>
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
