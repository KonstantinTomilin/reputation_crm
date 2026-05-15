import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role } from './CRMLayout';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  link: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'danger';
}

const roleNotifications: Record<Role, NotificationItem[]> = {
  client: [
    { id: 'c1', title: 'Аудит выполнен', message: 'Проект «Audi» — аудит завершён, 12 ссылок готовы к работе', time: '2 мин назад', link: '/client/projects', read: false, type: 'success' },
    { id: 'c2', title: 'Новый счёт', message: 'Счёт #2451 на сумму 128 000 ₽ выставлен', time: '15 мин назад', link: '/client/billing', read: false, type: 'warning' },
    { id: 'c3', title: 'Ссылки удалены', message: 'Проект «BMW» — 8 ссылок успешно удалены', time: '1 ч назад', link: '/client/project/2', read: false, type: 'info' },
    { id: 'c4', title: 'Отчёт сформирован', message: 'Ежемесячный отчёт за апрель доступен для скачивания', time: '3 ч назад', link: '/client/reports', read: true, type: 'success' },
    { id: 'c5', title: 'Дедлайн приближается', message: 'Проект «Nike» — дедлайн через 2 дня', time: '5 ч назад', link: '/client/project/3', read: true, type: 'warning' },
  ],
  executor: [
    { id: 'e1', title: 'Новая задача', message: 'Проект «Audi» — 5 ссылок поступили в работу', time: '5 мин назад', link: '/executor', read: false, type: 'info' },
    { id: 'e2', title: 'Выплата получена', message: 'Выплата #88 на сумму 45 000 ₽ зачислена', time: '30 мин назад', link: '/executor/reports', read: false, type: 'success' },
    { id: 'e3', title: 'Ссылка вернулась', message: 'Проект «BMW» — 2 ссылки вернулись на доработку', time: '2 ч назад', link: '/executor/project/2', read: false, type: 'warning' },
    { id: 'e4', title: 'Дедлайн', message: 'Проект «Nike» — дедлайн через 2 дня, 3 ссылки в карантине', time: '4 ч назад', link: '/executor/in-progress', read: true, type: 'danger' },
    { id: 'e5', title: 'Комментарий', message: 'Менеджер оставил комментарий к проекту «Reebok»', time: '6 ч назад', link: '/executor/project/4', read: true, type: 'info' },
  ],
  auditor: [
    { id: 'a1', title: 'Новые ссылки на аудит', message: 'Клиент «Сидоров» отправил 10 ссылок проекта «Audi»', time: '10 мин назад', link: '/auditor', read: false, type: 'info' },
    { id: 'a2', title: 'Вернули на коррекцию', message: 'Управление вернуло аудит проекта «BMW» на доработку', time: '1 ч назад', link: '/auditor/active', read: false, type: 'warning' },
    { id: 'a3', title: 'Аудит согласован', message: 'Проект «Nike» — аудит согласован, отправлен в работу', time: '3 ч назад', link: '/auditor/history', read: true, type: 'success' },
    { id: 'a4', title: 'Напоминание', message: '3 ссылки в проекте «Reebok» ожидают аудита более 24 часов', time: '5 ч назад', link: '/auditor', read: true, type: 'danger' },
  ],
  management: [
    { id: 'm1', title: 'Аудит на согласовании', message: 'Проект «Audi» — аудитор отправил результаты на согласование', time: '3 мин назад', link: '/management/audits', read: false, type: 'info' },
    { id: 'm2', title: 'Новый клиент', message: 'ООО «Ромашка» зарегистрирована в системе', time: '20 мин назад', link: '/management/clients', read: false, type: 'success' },
    { id: 'm3', title: 'Просрочен дедлайн', message: '12 ссылок по 4 проектам просрочены', time: '1 ч назад', link: '/management/overdue', read: false, type: 'danger' },
    { id: 'm4', title: 'Выплата исполнителю', message: 'Иванов А. запросил выплату 67 000 ₽', time: '2 ч назад', link: '/management/finance', read: false, type: 'warning' },
    { id: 'm5', title: 'Ссылка на карантине', message: 'Проект «BMW» — 3 ссылки помещены на карантин', time: '4 ч назад', link: '/management/kanban', read: true, type: 'warning' },
    { id: 'm6', title: 'Новый пользователь', message: 'Администратор создал пользователя «Петрова Е.»', time: '6 ч назад', link: '/management/users', read: true, type: 'info' },
  ],
  admin: [],
  manager: [],
  main_admin: [],
};

const typeIcon: Record<NotificationItem['type'], string> = {
  info: 'ri-information-line',
  success: 'ri-check-double-line',
  warning: 'ri-alert-line',
  danger: 'ri-close-circle-line',
};

const typeColor: Record<NotificationItem['type'], string> = {
  info: 'bg-blue-50 text-blue-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
};

interface NotificationsPopoverProps {
  role: Role;
}

export default function NotificationsPopover({ role }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(roleNotifications[role] || []);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((i) => !i.read).length;

  useEffect(() => {
    // Update items when role changes
    setItems(roleNotifications[role] || []);
  }, [role]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markRead = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const handleClick = (item: NotificationItem) => {
    markRead(item.id);
    setOpen(false);
    navigate(item.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
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
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-900 hover:text-blue-800 font-medium cursor-pointer whitespace-nowrap"
              >
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 mx-auto mb-2">
                  <i className="ri-notification-off-line text-gray-300 text-lg" />
                </div>
                Нет уведомлений
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50/60 transition-colors border-b border-gray-50 last:border-0 cursor-pointer flex gap-3 ${
                    !item.read ? 'bg-slate-50/30' : ''
                  }`}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${typeColor[item.type]}`}>
                    <i className={`${typeIcon[item.type]} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">{item.title}</span>
                      {!item.read && <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.message}</p>
                    <span className="text-[11px] text-gray-400 mt-1 block">{item.time}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(
                    role === 'client'
                      ? '/client/projects'
                      : role === 'executor'
                        ? '/executor'
                        : role === 'auditor'
                          ? '/auditor'
                          : '/management/overview'
                  );
                }}
                className="w-full text-center text-xs text-blue-900 hover:text-blue-800 font-medium cursor-pointer"
              >
                Показать все
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}