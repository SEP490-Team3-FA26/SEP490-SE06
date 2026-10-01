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
  PanelLeftClose,
  PanelLeftOpen,
  Edit2,
  Database,
  HardDrive,
  Sparkles,
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
const STORAGE_FULLSCREEN_KEY = "abc_pharmacy_chat_is_fullscreen";

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
  // Fullscreen state with persistence
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

  // Sidebar toggle state in fullscreen
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sessions history drawer state for widget mode
  const [showHistory, setShowHistory] = useState(false);

  // Rename session inline state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{
    age_group?: string;
    gender?: string;
    allergies?: string[];
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check login state and ensure valid currentSessionId
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(Boolean(token));

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
      console.error("Loi luu sessions vao localStorage:", e);
    }
  }, [sessions]);

  // Load user profile and chat sessions from DB if logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Load profile
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

    // Sync chat sessions from MongoDB
    prescriptionService
      .getChatSessions()
      .then((res) => {
        if (res && res.success && Array.isArray(res.sessions) && res.sessions.length > 0) {
          setSessions(res.sessions);
          localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(res.sessions));
          if (!currentSessionId || !res.sessions.some((s: any) => s.id === currentSessionId)) {
            setCurrentSessionId(res.sessions[0].id);
            localStorage.setItem(STORAGE_ACTIVE_ID_KEY, res.sessions[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && (!showHistory || isFullscreen)) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, showHistory, isFullscreen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_FULLSCREEN_KEY, String(next));
      } catch {}
      return next;
    });
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
            category: drug.category || "Duoc pham",
            price: drug.price,
            quantity: 1,
            unit: drug.unit || "Hop",
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
      showToast(`Da them "${drug.name}" vao gio hang`);
      return true;
    } catch (err: any) {
      console.error("Loi them vao gio hang:", err);
      showToast("Khong the them vao gio hang, vui long thu lai!");
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
      showToast(`Da them thanh cong ${count} san pham vao gio hang`);
    }
  };

  const updateCurrentSessionMessages = (newMessages: MessageItem[], userTextPrompt?: string) => {
    const activeId = currentSessionId || (sessions[0] && sessions[0].id);
    let sessionToPersist: ChatSession | null = null;

    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id === activeId) {
          let newTitle = s.title;
          if (
            (newTitle === "Cuộc trò chuyện mới" || newTitle === "Cuoc tro chuyen moi" || !newTitle) &&
            userTextPrompt &&
            userTextPrompt.trim().length > 0
          ) {
            newTitle =
              userTextPrompt.trim().length > 36
                ? `${userTextPrompt.trim().slice(0, 36)}...`
                : userTextPrompt.trim();
          }
          const updated = {
            ...s,
            title: newTitle,
            updatedAt: Date.now(),
            messages: newMessages,
          };
          sessionToPersist = updated;
          return updated;
        }
        return s;
      })
    );

    // Save to Database if logged in
    const token = localStorage.getItem("token");
    if (token && sessionToPersist) {
      prescriptionService.saveChatSession(sessionToPersist).catch(() => {});
    }
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
          text: "Xin loi ban, he thong AI tam thoi gap su co khi xu ly thong tin. Ban co the gui lai trieu chung de toi tu van lai nhe.",
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        updateCurrentSessionMessages([...newMessages, errMsg]);
      }
    } catch (err: any) {
      console.error("Loi tu van AI Chatbot:", err);
      const errMsg: MessageItem = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "Khong the ket noi den may chu AI Duoc si. Vui long kiem tra lai ket noi mang hoac thu lai sau giay lat.",
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
    showToast("Da bat dau cuoc tro chuyen moi");

    const token = localStorage.getItem("token");
    if (token) {
      prescriptionService.saveChatSession(newSession).catch(() => {});
    }
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
    showToast("Da xoa cuoc tro chuyen");

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
      prev.map((s) => {
        if (s.id === sessionId) {
          const updated = { ...s, title: editingTitle.trim() };
          renamedSession = updated;
          return updated;
        }
        return s;
      })
    );
    setEditingSessionId(null);
    showToast("Da cap nhat ten cuoc tro chuyen");

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
    showToast("Da lam moi cuoc tro chuyen hien tai");
  };

  // Group sessions by date for professional sidebar display
  const groupSessions = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const last7DaysStart = todayStart - 6 * 86400000;

    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const previous7Days: ChatSession[] = [];
    const older: ChatSession[] = [];

    sessions.forEach((s) => {
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
      { title: "Hom nay", items: today },
      { title: "Hom qua", items: yesterday },
      { title: "7 ngay truoc", items: previous7Days },
      { title: "Cu hon", items: older },
    ].filter((group) => group.items.length > 0);
  };

  if (!isOpen) return null;

  // Render Sidebar Session Item
  const renderSessionItem = (sess: ChatSession) => {
    const isActive = sess.id === currentSessionId;
    const isEditing = editingSessionId === sess.id;
    const formattedTime = new Date(sess.updatedAt || sess.createdAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMessagesCount = sess.messages.filter((m) => m.sender === "user").length;

    return (
      <div
        key={sess.id}
        onClick={() => !isEditing && handleSelectSession(sess.id)}
        className={`group relative w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left select-none ${
          isActive
            ? "bg-blue-50/90 border-blue-300 text-blue-900 shadow-xs"
            : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isActive
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
            }`}
          >
            <MessageSquare size={14} />
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(sess.id);
                    if (e.key === "Escape") setEditingSessionId(null);
                  }}
                  autoFocus
                  className="w-full text-xs font-semibold px-2 py-0.5 rounded border border-blue-400 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(sess.id)}
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                  title="Luu ten"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <>
                <h4
                  className={`text-xs font-semibold truncate leading-tight ${
                    isActive ? "text-blue-950 font-bold" : "text-slate-800"
                  }`}
                  title={sess.title}
                >
                  {sess.title || "Cuoc tro chuyen"}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                  <span>{formattedTime}</span>
                  <span>•</span>
                  <span>{userMessagesCount} cau hoi</span>
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
              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Doi ten cuoc tro chuyen"
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteSession(sess.id, e)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Xoa cuoc tro chuyen"
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
          : "fixed bottom-4 sm:bottom-6 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[440px] max-w-[450px] h-[620px] max-h-[85vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-70 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in duration-200">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ---------------- FULLSCREEN SIDEBAR ---------------- */}
      {isFullscreen && isSidebarOpen && (
        <aside className="w-72 sm:w-80 shrink-0 bg-slate-50/90 border-r border-slate-200 flex flex-col h-full select-none">
          {/* Sidebar Top: Logo + Brand + Collapse button */}
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Bot size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  ABC Pharmacy
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  Duoc Si AI Truc Tuyen
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Thu gon danh sach"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={handleStartNewChat}
              className="w-full py-2.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus size={16} />
              <span>Cuoc tro chuyen moi</span>
            </button>
          </div>

          {/* Sessions List Grouped */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
            {groupSessions().map((grp) => (
              <div key={grp.title} className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 block">
                  {grp.title}
                </span>
                <div className="space-y-1">
                  {grp.items.map((sess) => renderSessionItem(sess))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer: Sync Status */}
          <div className="p-3.5 border-t border-slate-200 bg-white/60 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <Database size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-600 truncate">
                    Dong bo Cloud MongoDB
                  </span>
                </>
              ) : (
                <>
                  <HardDrive size={14} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-500 truncate" title="Dang nhap de dong bo tren nhieu thiet bi">
                    Luu tren trinh duyet
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {sessions.length} phien
            </span>
          </div>
        </aside>
      )}

      {/* ---------------- MAIN CHAT CANVAS ---------------- */}
      <main className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden relative">
        {/* Main Navbar */}
        <header
          className={`flex items-center justify-between shrink-0 select-none ${
            isFullscreen
              ? "px-5 py-3.5 bg-white border-b border-slate-200/80 shadow-2xs"
              : "px-4 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Toggle Sidebar Button (Fullscreen only) */}
            {isFullscreen && !isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Mo danh sach lich su"
              >
                <PanelLeftOpen size={19} />
              </button>
            )}

            {/* Widget Mode Avatar */}
            {!isFullscreen && (
              <div className="relative w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
                <Bot size={20} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-700"></span>
              </div>
            )}

            {/* Title & Status */}
            <div className="flex flex-col">
              <span
                className={`font-extrabold leading-tight tracking-wide ${
                  isFullscreen ? "text-slate-900 text-sm" : "text-white text-sm"
                }`}
              >
                {isFullscreen
                  ? activeSession?.title || "Dược Sĩ AI ABC Pharmacy"
                  : "Dược Sĩ AI"}
              </span>
              <span
                className={`text-[11px] flex items-center gap-1 font-medium ${
                  isFullscreen ? "text-slate-500" : "text-blue-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Truc tuyen 24/7 • ABC Pharmacy
              </span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            {/* Lịch sử hội thoại (Widget mode only) */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  showHistory
                    ? "bg-white text-blue-700 shadow-sm"
                    : "hover:bg-white/15 text-white/80 hover:text-white"
                }`}
                title="Lich su cuoc tro chuyen"
              >
                <History size={16} />
              </button>
            )}

            {/* Làm mới đoạn chat hiện tại */}
            <button
              type="button"
              onClick={handleClearCurrentSession}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isFullscreen
                  ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  : "hover:bg-white/15 text-white/80 hover:text-white"
              }`}
              title="Lam moi cuoc tro chuyen nay"
            >
              <RotateCcw size={15} />
            </button>

            {/* Nút Phóng to / Thu nhỏ toàn màn hình */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isFullscreen
                  ? "hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  : "hover:bg-white/15 text-white/80 hover:text-white"
              }`}
              title={isFullscreen ? "Thu nho cua so" : "Phong to toan man hinh"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Thu nhỏ widget */}
            {onMinimize && !isFullscreen && (
              <button
                type="button"
                onClick={onMinimize}
                className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Thu nho xuong goc"
              >
                <ChevronDown size={18} />
              </button>
            )}

            {/* Đóng cửa sổ */}
            <button
              type="button"
              onClick={onClose}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isFullscreen
                  ? "hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                  : "hover:bg-white/15 text-white/80 hover:text-white"
              }`}
              title="Dong cua so chat"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ---------------- WIDGET MODE HISTORY DRAWER ---------------- */}
        {!isFullscreen && showHistory ? (
          <div className="absolute inset-0 z-30 bg-white flex flex-col animate-in fade-in slide-in-from-left duration-200">
            {/* History Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2 text-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
                  title="Quay lai chat"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Lich su tu van ({sessions.length})
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Chat moi</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map((sess) => renderSessionItem(sess))}
            </div>

            {/* Sync status footer for drawer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-[11px] text-slate-500">
              {isLoggedIn ? (
                <>
                  <Database size={13} className="text-emerald-500" />
                  <span>Dong bo voi tai khoan MongoDB</span>
                </>
              ) : (
                <>
                  <HardDrive size={13} className="text-amber-500" />
                  <span>Luu cuc bo tren may</span>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* ---------------- MESSAGES VIEWPORT ---------------- */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col bg-slate-50/50">
          <div
            className={`w-full ${
              isFullscreen ? "max-w-4xl mx-auto py-2" : "max-w-full"
            }`}
          >
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
                    Duoc si dang phan tich trieu chung va tim thuoc phu hop...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ---------------- CHAT INPUT FOOTER ---------------- */}
        <div
          className={`w-full shrink-0 ${
            isFullscreen
              ? "bg-white border-t border-slate-200/80 p-3 sm:p-4"
              : "bg-white border-t border-slate-100 p-2 sm:p-3"
          }`}
        >
          <div className={isFullscreen ? "max-w-4xl mx-auto w-full" : "w-full"}>
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatWindow;
