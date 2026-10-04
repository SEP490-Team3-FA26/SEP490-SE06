import React, { useState, useEffect } from "react";
import { MessageSquare, X, Bot, Sparkles } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadPulse, setHasUnreadPulse] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnreadPulse(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
        {!isOpen && (
          <div className="mb-2 hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold py-1.5 px-3.5 rounded-full shadow-lg border border-blue-100 animate-bounce duration-1000">
            <Sparkles size={13} className="text-amber-500 shrink-0" />
            <span>Tư vấn sức khỏe với Dược sĩ AI</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          className={`relative w-15 h-15 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all duration-300 active:scale-95 cursor-pointer ${
            isOpen
              ? "bg-slate-800 hover:bg-slate-900 text-white rotate-90"
              : "bg-gradient-to-tr from-blue-600 via-sky-600 to-indigo-600 text-white hover:scale-105"
          }`}
          aria-label={isOpen ? "Đóng chatbox" : "Mở Dược sĩ AI"}
        >
          {isOpen ? (
            <X size={24} className="stroke-[2.5]" />
          ) : (
            <>
              <Bot size={28} className="stroke-[2]" />
              {/* Online pulse dot */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
              {hasUnreadPulse && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsOpen(false)}
      />
    </>
  );
};

export default ChatWidget;
