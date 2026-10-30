import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles } from "lucide-react";
import { ChatWindow } from "./ChatWindow";
import { DoveFigure, DoveFigureHandle } from "../mascot/DoveFigure";

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadPulse, setHasUnreadPulse] = useState(true);
  const doveRef = useRef<DoveFigureHandle>(null);

  // Close chatbox when pressing Escape key
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
      doveRef.current?.hup();
    }
  };

  return (
    <>
      {/* Floating launcher button for AI Pharmacist Dove */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
        {!isOpen && (
          <div className="mb-2 hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-slate-700 text-xs font-medium py-1.5 px-3 rounded-full shadow-md border border-slate-100 animate-bounce duration-1000">
            <Sparkles size={12} className="text-amber-500 shrink-0" />
            <span>Tư vấn sức khỏe AI</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggle}
          onMouseEnter={() => {
            if (!isOpen) doveRef.current?.hup();
          }}
          className={`relative rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer ${
            isOpen
              ? "w-12 h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-lg rotate-90"
              : "w-14 h-14 bg-white border border-slate-200/80 shadow-lg hover:shadow-xl hover:scale-105 p-0.5"
          }`}
          aria-label={isOpen ? "Close AI chat" : "Open AI Pharmacist Dove chat"}
        >
          {isOpen ? (
            <X size={20} className="stroke-[2.5]" />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center overflow-hidden pt-1 relative">
              <DoveFigure
                ref={doveRef}
                size={48}
                kaal={true}
                speels={true}
                paasei={false}
              />
              {/* Online status indicator */}
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-10"></span>
              {hasUnreadPulse && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping opacity-75 z-0"></span>
              )}
            </div>
          )}
        </button>
      </div>

      {/* AI Chat Window Modal / Widget */}
      <ChatWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsOpen(false)}
      />
    </>
  );
};

export default ChatWidget;
