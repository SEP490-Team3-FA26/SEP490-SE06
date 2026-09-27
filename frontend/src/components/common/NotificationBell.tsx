import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, CheckCircle2, XCircle, ArrowRightLeft, Calendar } from "lucide-react";
import { hrService, StaffNotification } from "../../services/hr/hr.service";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        hrService.listNotifications(10, 0),
        hrService.getUnreadCount()
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error("Lỗi lấy thông báo", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Polling every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await hrService.markRead(); // no id = mark all
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await hrService.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'shift_swap_request': return <ArrowRightLeft className="text-yellow-600" size={16} />;
      case 'shift_swap_approved': return <CheckCircle2 className="text-emerald-600" size={16} />;
      case 'shift_swap_rejected': return <XCircle className="text-rose-600" size={16} />;
      case 'schedule_published': return <Calendar className="text-blue-600" size={16} />;
      default: return <Bell className="text-slate-600" size={16} />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'shift_swap_request': return 'bg-yellow-100';
      case 'shift_swap_approved': return 'bg-emerald-100';
      case 'shift_swap_rejected': return 'bg-rose-100';
      case 'schedule_published': return 'bg-blue-100';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden origin-top-right">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#0057cd] hover:text-[#00419e] flex items-center gap-1"
              >
                <Check size={14} /> Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(noti => (
                  <div key={noti._id} className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${noti.isRead ? 'opacity-60' : 'bg-blue-50/20'}`}>
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getBg(noti.type)}`}>
                      {getIcon(noti.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm mb-0.5 truncate ${noti.isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'}`}>
                        {noti.title}
                      </h4>
                      <p className={`text-xs mb-1 line-clamp-2 ${noti.isRead ? 'text-slate-500' : 'text-slate-600'}`}>
                        {noti.message}
                      </p>
                      <div className="flex items-center text-[10px] text-slate-400 gap-1 font-medium">
                        <Clock size={10} />
                        {timeAgo(noti.createdAt)}
                      </div>
                    </div>
                    {!noti.isRead && (
                      <button 
                        onClick={(e) => handleMarkRead(noti._id, e)}
                        className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-[#0057cd] hover:scale-150 transition-transform"
                        title="Đánh dấu đã đọc"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
