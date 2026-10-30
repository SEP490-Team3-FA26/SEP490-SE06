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
  MessageSquare,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Edit2,
  Database,
  HardDrive,
  QrCode,
  ShoppingBag,
  LogIn,
} from "lucide-react";
import { ChatMessage, MessageItem } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { ChatDrugItem } from "./DrugCard";
import { prescriptionService } from "../../services/sales/prescription.service";
import { cartService } from "../../services/sales/cart.service";
import { useChatPayOSCheckout } from "../../hooks/useChatPayOSCheckout";
import { notifyAuthLoginRequired } from "../../utils/authEvents";
import { DoveFigure } from "../mascot/DoveFigure";
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
const STORAGE_FULLSCREEN_KEY = "abc_pharmacy_chat_is_fullscreen";

const INITIAL_WELCOME_MESSAGE: MessageItem = {
  id: "welcome-1",
  sender: "bot",
  text: "Xin chào! Tôi là Trợ lý Dược sĩ Bồ Câu AI của ABC Pharmacy. Bạn đang gặp triệu chứng gì hoặc cần tư vấn sử dụng thuốc nào hôm nay?",
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
  // Fullscreen state with persistent storage
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (defaultFullscreen) return true;
    try {
      const saved = localStorage.getItem(STORAGE_FULLSCREEN_KEY);
      if (saved !== null) return saved === "true";
    } catch {
      // Fallback
    }
    return false;
  });

  // Sidebar toggle state in fullscreen mode
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sessions history drawer state for widget mode
  const [showHistory, setShowHistory] = useState(false);

  // Inline rename session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Sessions collection state
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

  // Current active session and its messages
  const activeSession = (sessions || []).find((s) => s.id === currentSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [INITIAL_WELCOME_MESSAGE];

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{
    age_group?: string;
    gender?: string;
    allergies?: string[];
    fullName?: string;
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check login state and ensure valid currentSessionId
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(Boolean(token));

    if (!currentSessionId && (sessions || []).length > 0) {
      setCurrentSessionId(sessions[0].id);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  // Load user profile and cloud sessions if logged in
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const profileRes = await api.get("/api/auth/profile");
        if (profileRes?.data) {
          const u = profileRes.data;
          setUserProfile({
            fullName: u.fullName || u.name,
            name: u.fullName || u.name,
            phone: u.phone || u.phoneNumber,
            address: u.address,
            email: u.email,
            age_group: u.age ? (u.age < 18 ? "child" : u.age > 60 ? "elderly" : "adult") : undefined,
            gender: u.gender,
            allergies: u.allergies || [],
          });
        }
      } catch {
        // Fallback silently if offline or token expired
      }

      try {
        const cloudSessionsRes = await prescriptionService.getChatSessions();
        if (cloudSessionsRes?.success && Array.isArray(cloudSessionsRes.sessions) && cloudSessionsRes.sessions.length > 0) {
          setSessions(cloudSessionsRes.sessions);
          if (!cloudSessionsRes.sessions.some((s) => s.id === currentSessionId)) {
            setCurrentSessionId(cloudSessionsRes.sessions[0].id);
          }
        }
      } catch {
        // Fallback to local storage if cloud fetch fails
      }
    };

    fetchUserData();
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // Storage quota safety fallback
    }
  }, [sessions]);

  // Scroll to bottom on new messages or loading state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_FULLSCREEN_KEY, String(next));
      return next;
    });
  };

  // Update messages in the current session
  const updateCurrentSessionMessages = (newMessages: MessageItem[], autoTitleQuery?: string) => {
    const now = Date.now();
    let updatedActiveSession: ChatSession | null = null;

    setSessions((prev) =>
      (prev || []).map((s) => {
        if (s.id === currentSessionId) {
          let title = s.title;
          if (
            (!title || title === "Cuộc trò chuyện mới") &&
            autoTitleQuery &&
            autoTitleQuery.trim().length > 0
          ) {
            const clean = autoTitleQuery.trim();
            title = clean.length > 30 ? clean.substring(0, 30) + "..." : clean;
          }
          const updated = {
            ...s,
            title,
            updatedAt: now,
            messages: newMessages,
          };
          updatedActiveSession = updated;
          return updated;
        }
        return s;
      })
    );

    // Sync to backend MongoDB if logged in
    const token = localStorage.getItem("token");
    if (token && updatedActiveSession) {
      prescriptionService.saveChatSession(updatedActiveSession).catch(() => {});
    }
  };

  // Add single drug to cart for both guests and authenticated users
  const addToCartItem = async (drug: ChatDrugItem): Promise<boolean> => {
    if (!drug.medicine_id || !drug.in_stock) return false;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // Guest cart in localStorage
        const guestCartStr = localStorage.getItem("guest_cart");
        const cart = guestCartStr ? JSON.parse(guestCartStr) : [];
        const existing = cart.find(
          (it: { id?: string; _id?: string; quantity: number }) =>
            it.id === drug.medicine_id || it._id === drug.medicine_id
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
      return true;
    } catch {
      return false;
    }
  };

  // Add drug to cart with toast notification
  const handleAddToCart = async (drug: ChatDrugItem): Promise<boolean> => {
    if (!drug.medicine_id) return false;
    try {
      const added = await addToCartItem(drug);
      if (added) {
        showToast(`Đã thêm "${drug.name}" vào giỏ hàng`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Add all suggested drugs to cart
  const handleAddAllToCart = async (drugs: ChatDrugItem[]): Promise<void> => {
    try {
      let count = 0;
      for (const d of drugs) {
        if (d.in_stock && d.medicine_id) {
          const ok = await addToCartItem(d);
          if (ok) count++;
        }
      }
      if (count > 0) {
        showToast(`Đã thêm ${count} sản phẩm vào giỏ hàng!`);
      }
    } catch {
      showToast("Lỗi khi thêm danh sách thuốc");
    }
  };

  // Custom hook managing cart state and PayOS integration
  const {
    cartCount,
    isProcessingOrder,
    isPaymentIntent,
    processPayOSOrder,
    buyNowDrug,
  } = useChatPayOSCheckout({
    customerInfo: userProfile,
    onSuccessMessage: (msg) => {
      updateCurrentSessionMessages([...messages, msg]);
    },
    onEmptyCart: () => {
      showToast("Giỏ hàng của bạn đang trống!");
    },
    onError: (errMsg) => {
      showToast(errMsg);
    },
    onLoginRequired: () => {
      notifyAuthLoginRequired();
    },
  });

  // Action button click handler (e.g. login prompt)
  const handleMessageAction = (action: string) => {
    if (action === "LOGIN") {
      notifyAuthLoginRequired();
    }
  };

  // Instant buy single drug via VietQR PayOS
  const handleBuyNowDrug = async (drug: ChatDrugItem) => {
    const userPromptMsg: MessageItem = {
      id: `user-buy-${Date.now()}`,
      sender: "user",
      text: `Mua ngay sản phẩm "${drug.name}"`,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    updateCurrentSessionMessages([...messages, userPromptMsg], userPromptMsg.text);
    await buyNowDrug(drug);
  };

  // Callback when PayOS confirms transaction completion
  const handlePaymentSuccess = (orderCode: number) => {
    const successMsg: MessageItem = {
      id: `bot-paid-${Date.now()}`,
      sender: "bot",
      text: `🎉 Tuyệt vời! Dược sĩ Bồ Câu xác nhận đã nhận được thanh toán thành công qua PayOS cho đơn hàng #${orderCode}. Đơn hàng đã được ghi nhận trên hệ thống và nhân viên ABC Pharmacy đang chuẩn bị đóng gói để giao đến bạn sớm nhất! Cảm ơn bạn! ❤️`,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    updateCurrentSessionMessages([...messages, successMsg]);
    showToast("Thanh toán PayOS thành công!");
  };

  const handleSendMessage = async (text: string, imageBase64?: string) => {
    const trimmedText = text.trim();
    if ((!trimmedText && !imageBase64) || isLoading) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmedText,
      imageUrl: imageBase64,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newMessages = [...messages, userMsg];
    updateCurrentSessionMessages(newMessages, trimmedText || "Gửi hình ảnh");

    // Check payment intent via PayOS inside chat prompt (chỉ kiểm tra nếu có text)
    if (trimmedText && isPaymentIntent(trimmedText)) {
      await processPayOSOrder();
      return;
    }

    setIsLoading(true);

    try {
      // Xây dựng history đầy đủ ngữ cảnh thuốc đã đề xuất
      const historyPayload = newMessages
        .filter((m) => (m.text || (m.drugs && m.drugs.length > 0)) && !m.payment)
        .slice(-6)
        .map((m) => {
          let fullContent = m.text || "";

          // Nối thông tin các thẻ thuốc đã gợi ý vào nội dung lịch sử của assistant
          if (m.sender === "bot" && m.drugs && m.drugs.length > 0) {
            const drugDetails = m.drugs
              .map(
                (d) =>
                  `${d.name} (Hoạt chất: ${d.active_ingredient || "Rõ"}, Liều dùng: ${d.dosage || "Theo chỉ định"}, Cách dùng: ${d.usage || "Uống sau ăn"}, Giá: ${d.price}đ)`
              )
              .join("; ");
            fullContent += `\n[Thuốc Dược sĩ đã đề xuất ở lượt này: ${drugDetails}]`;
          }

          return {
            role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
            content: fullContent.trim(),
          };
        });

      const res = await prescriptionService.chatConsult({
        message: trimmedText || "Nhờ dược sĩ xem giúp hình ảnh này",
        history: historyPayload,
        image_base64: imageBase64,
        age_group: userProfile.age_group,
        gender: userProfile.gender,
        allergies: userProfile.allergies,
      });

      if (res && res.success) {
        const botMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: res.message || res.reply || "Cảm ơn bạn đã chia sẻ, dưới đây là thông tin y khoa từ Dược sĩ.",
          drugs: res.drugs || [],
          warnings: res.warnings || "",
          follow_up_question: res.follow_up_question || "",
          disclaimer: res.disclaimer || "Tư vấn AI mang tính chất tham khảo, không thay thế khám trực tiếp tại cơ sở y tế.",
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        updateCurrentSessionMessages([...newMessages, botMsg]);
      } else {
        const errorMsg: MessageItem = {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: res?.message || res?.reply || "Xin lỗi, hiện tại hệ thống AI đang quá tải. Bạn vui lòng thử lại sau giây lát nhé!",
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        updateCurrentSessionMessages([...newMessages, errorMsg]);
      }
    } catch {
      const fallbackMsg: MessageItem = {
        id: `bot-err-${Date.now()}`,
        sender: "bot",
        text: "Không thể kết nối đến máy chủ Dược sĩ AI. Vui lòng kiểm tra lại kết nối mạng.",
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      updateCurrentSessionMessages([...newMessages, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new chat session
  const handleStartNewChat = () => {
    const newSess = createNewSession();
    setSessions((prev) => [newSess, ...(prev || [])]);
    setCurrentSessionId(newSess.id);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, newSess.id);
    setShowHistory(false);
    showToast("Đã tạo cuộc trò chuyện mới");

    const token = localStorage.getItem("token");
    if (token) {
      prescriptionService.saveChatSession(newSess).catch(() => {});
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, sessionId);
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = (sessions || []).filter((s) => s.id !== sessionId);
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

    const token = localStorage.getItem("token");
    if (token) {
      prescriptionService.deleteChatSession(sessionId).catch(() => {});
    }
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (sessionId: string) => {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    let renamedSession: ChatSession | null = null;
    setSessions((prev) =>
      (prev || []).map((s) => {
        if (s.id === sessionId) {
          const updated = { ...s, title: editingTitle.trim() };
          renamedSession = updated;
          return updated;
        }
        return s;
      })
    );
    setEditingSessionId(null);
    showToast("Đã cập nhật tên cuộc trò chuyện");

    const token = localStorage.getItem("token");
    if (token && renamedSession) {
      prescriptionService.saveChatSession(renamedSession).catch(() => {});
    }
  };

  const handleClearCurrentSession = () => {
    const resetMessages = [
      {
        ...INITIAL_WELCOME_MESSAGE,
        id: `welcome_${Date.now()}`,
      },
    ];
    updateCurrentSessionMessages(resetMessages);
    showToast("Đã làm mới cuộc trò chuyện");
  };

  // Group chat sessions by date for organized sidebar listing
  const groupSessions = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const last7DaysStart = todayStart - 6 * 86400000;

    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const previous7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    (sessions || []).forEach((s) => {
      const time = s.updatedAt || s.createdAt;
      if (time >= todayStart) {
        today.push(s);
      } else if (time >= yesterdayStart) {
        yesterday.push(s);
      } else if (time >= last7DaysStart) {
        previous7Days.push(s);
      } else {
        older.push(s);
      }
    });

    return [
      { title: "Hôm nay", items: today },
      { title: "Hôm qua", items: yesterday },
      { title: "7 ngày trước", items: previous7Days },
      { title: "Cũ hơn", items: older },
    ].filter((group) => group.items.length > 0);
  };

  if (!isOpen) return null;

  // Render individual session item in sidebar or history drawer
  const renderSessionItem = (sess: ChatSession) => {
    const isActive = sess.id === currentSessionId;
    const isEditing = editingSessionId === sess.id;
    const formattedTime = new Date(sess.updatedAt || sess.createdAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMessagesCount = (sess.messages || []).filter((m) => m.sender === "user").length;

    return (
      <div
        key={sess.id}
        onClick={() => !isEditing && handleSelectSession(sess.id)}
        className={`group relative w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-left select-none ${
          isActive
            ? "bg-slate-50 border-slate-300 text-slate-900 shadow-2xs"
            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
              isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
            }`}
          >
            <MessageSquare size={13} />
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input id={`rename-input-${sess.id}`} aria-label="Tên cuộc trò chuyện"
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(sess.id);
                    if (e.key === "Escape") setEditingSessionId(null);
                  }}
                  autoFocus
                  className="w-full text-xs font-medium px-2 py-0.5 rounded border border-blue-400 bg-white text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(sess.id)}
                  aria-label="Lưu tên cuộc trò chuyện"
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                  title="Lưu tên"
                >
                  <Check size={13} />
                </button>
              </div>
            ) : (
              <>
                <h4
                  className={`text-xs truncate leading-tight ${
                    isActive ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                  }`}
                  title={sess.title}
                >
                  {sess.title || "Cuộc trò chuyện"}
                </h4>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                  <span>{formattedTime}</span>
                  <span>•</span>
                  <span>{userMessagesCount} tin</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleStartRename(sess, e)}
              aria-label="Đổi tên cuộc trò chuyện"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Đổi tên"
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteSession(sess.id, e)}
              aria-label="Xóa cuộc trò chuyện"
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Xóa"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`z-50 bg-white font-sans transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 w-full h-full flex flex-row overflow-hidden shadow-none"
          : "fixed bottom-4 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[420px] max-w-[430px] h-[600px] max-h-[85vh] rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/5 flex flex-col overflow-hidden"
      }`}
    >
      {/* Toast Alert Feedback */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-medium px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 animate-in fade-in duration-200">
          <Check size={13} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fullscreen Sidebar Navigation */}
      {isFullscreen && isSidebarOpen && (
        <aside className="w-72 sm:w-80 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full select-none">
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden pt-0.5 shadow-2xs">
                <DoveFigure size={28} kaal={true} decoratief={true} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-slate-900">
                  ABC Pharmacy
                </span>
                <span className="text-[11px] text-slate-400">
                  Dược Sĩ Bồ Câu AI
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Thu gọn danh sách lịch sử"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Thu gọn"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>

          {/* New Chat Action Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={handleStartNewChat}
              aria-label="Tạo cuộc trò chuyện mới"
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus size={14} />
              <span>Cuộc trò chuyện mới</span>
            </button>
          </div>

          {/* Grouped Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
            {(groupSessions() || []).map((grp) => (
              <div key={grp.title} className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 block">
                  {grp.title}
                </span>
                <div className="space-y-1">
                  {(grp.items || []).map((sess) => renderSessionItem(sess))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer with Sync Status */}
          <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              {isLoggedIn ? (
                <>
                  <Database size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-[11px] text-slate-600 truncate">
                    Đồng bộ Cloud
                  </span>
                </>
              ) : (
                <>
                  <HardDrive size={13} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] text-slate-400 truncate">
                    Lưu trình duyệt
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {(sessions || []).length} phiên
            </span>
          </div>
        </aside>
      )}

      {/* Main Chat Canvas Area */}
      <main className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
        {/* Minimalist Medical Navbar Header */}
        <header className="flex items-center justify-between shrink-0 select-none px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* Toggle Sidebar Button (Fullscreen only) */}
            {isFullscreen && !isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Mở danh sách lịch sử"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Mở danh sách"
              >
                <PanelLeftOpen size={17} />
              </button>
            )}

            {/* Mascot Avatar Figure */}
            <div className="relative w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden pt-0.5 shadow-2xs shrink-0">
              <DoveFigure size={28} kaal={true} decoratief={true} />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
            </div>

            {/* Title & Online Status */}
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 text-xs sm:text-[13px] leading-tight">
                {isFullscreen
                  ? activeSession?.title || "Dược Sĩ Bồ Câu AI"
                  : "Dược Sĩ Bồ Câu AI"}
              </span>
              <span className="text-[10px] flex items-center gap-1 text-slate-400 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Trực tuyến 24/7 • ABC Pharmacy
              </span>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-0.5">
            {/* History Drawer toggle (Widget mode) */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                aria-label="Xem lịch sử cuộc trò chuyện"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showHistory
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Lịch sử trò chuyện"
              >
                <History size={14} />
              </button>
            )}

            {/* Clear current session messages */}
            <button
              type="button"
              onClick={handleClearCurrentSession}
              aria-label="Làm mới cuộc trò chuyện này"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Làm mới trò chuyện"
            >
              <RotateCcw size={14} />
            </button>

            {/* Fullscreen Expand / Minimize toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình"}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            {/* Minimize widget down */}
            {onMinimize && !isFullscreen && (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Thu nhỏ xuống góc"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ChevronDown size={16} />
              </button>
            )}

            {/* Close chat window */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ chat"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {/* Widget Mode History Drawer */}
        {!isFullscreen && showHistory ? (
          <div className="absolute inset-0 z-30 bg-white flex flex-col animate-in fade-in duration-150">
            {/* History Drawer Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1.5 text-slate-700">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  aria-label="Quay lại cuộc trò chuyện"
                  className="p-1 rounded-md hover:bg-slate-200/70 text-slate-500 transition-colors cursor-pointer"
                  title="Quay lại"
                >
                  <ArrowLeft size={15} />
                </button>
                <span className="font-semibold text-xs text-slate-700">
                  Lịch sử ({ (sessions || []).length })
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartNewChat}
                aria-label="Tạo cuộc trò chuyện mới"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Mới</span>
              </button>
            </div>

            {/* Sessions List in Drawer */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {(sessions || []).map((sess) => renderSessionItem(sess))}
            </div>

            {/* Sync status footer */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-1.5 text-[10px] text-slate-400">
              {isLoggedIn ? (
                <>
                  <Database size={12} className="text-emerald-500" />
                  <span>Đồng bộ Cloud</span>
                </>
              ) : (
                <>
                  <HardDrive size={12} className="text-amber-500" />
                  <span>Lưu trên trình duyệt</span>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* Chat Messages Viewport */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col bg-slate-50/40">
          <div
            className={`w-full ${
              isFullscreen ? "max-w-3xl mx-auto py-2" : "max-w-full"
            }`}
          >
            {(messages || []).map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onAddToCart={handleAddToCart}
                onAddAllToCart={handleAddAllToCart}
                onQuickReplySelect={(text) => handleSendMessage(text)}
                onBuyNow={handleBuyNowDrug}
                onPaymentSuccess={handlePaymentSuccess}
                onActionClick={handleMessageAction}
              />
            ))}

            {/* Quick Replies prompt (rendered on single initial welcome message) */}
            {messages.length === 1 && (
              <div className="my-2.5 animate-in fade-in duration-200">
                <QuickReplies
                  onSelect={(opt) => handleSendMessage(opt)}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 my-2 animate-in fade-in duration-150">
                <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal ml-0.5">
                    Dược sĩ đang phân tích triệu chứng...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Minimalist Cart Status Banner & VietQR Checkout Button */}
        {cartCount > 0 && (
          <div className="w-full bg-slate-50/90 border-t border-slate-100 px-3.5 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <ShoppingBag size={13} className="text-blue-600" />
              <span>
                Giỏ hàng: <strong className="font-mono tabular-nums text-slate-900">{cartCount}</strong> món
              </span>
            </div>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => processPayOSOrder()}
                disabled={isLoading || isProcessingOrder}
                aria-label="Thanh toán VietQR PayOS"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <QrCode size={12} />
                <span>{isProcessingOrder ? "Đang tạo..." : "Thanh toán PayOS"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => notifyAuthLoginRequired()}
                aria-label="Đăng nhập để thanh toán"
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogIn size={12} />
                <span>Đăng nhập thanh toán</span>
              </button>
            )}
          </div>
        )}

        {/* Chat Input Container */}
        <div
          className={`w-full shrink-0 ${
            isFullscreen
              ? "bg-white border-t border-slate-100 p-3 sm:p-4"
              : "bg-white border-t border-slate-100 p-2.5"
          }`}
        >
          <div className={isFullscreen ? "max-w-3xl mx-auto w-full" : "w-full"}>
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatWindow;
