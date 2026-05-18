import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { getSessionUser } from '@/lib/auth';
import type { Role } from './CRMLayout';

const typeIcon: Record<string, string> = {
  info: 'ri-information-line',
  success: 'ri-check-double-line',
  warning: 'ri-alert-line',
  danger: 'ri-close-circle-line',
};

const typeColor: Record<string, string> = {
  info: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return d.toLocaleDateString('ru-RU');
}

interface NotificationsPopoverProps {
  role: Role;
}

export default function NotificationsPopover({ role }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const crm = useCRM();
  const session = getSessionUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    if (!session) return [];
    return crm.getNotificationsForUser(session.id, session.role);
  }, [crm, session, crm.notifications]);

  const unreadCount = items.filter((i) => !i.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleClick = (id: string, link: string) => {
    crm.markNotificationRead(id);
    setOpen(false);
    navigate(link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 cursor-pointer relative"
        aria-label="Уведомления"
      >
        <i className="ri-notification-3-line text-gray-500 text-base" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Уведомления</span>
            {unreadCount > 0 && session && (
              <button
                type="button"
                onClick={() => crm.markAllNotificationsRead(session.id)}
                className="text-xs text-blue-900 font-medium cursor-pointer"
              >
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Нет уведомлений</div>
            ) : (
              items.slice(0, 30).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item.id, item.link)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-gray-50 flex gap-3 cursor-pointer ${
                    !item.read ? 'bg-slate-50/40' : ''
                  }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${typeColor[item.type]}`}>
                    <i className={`${typeIcon[item.type]} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.title}</span>
                      {!item.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.message}</p>
                    <span className="text-[11px] text-gray-400 mt-1 block">{formatTime(item.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
