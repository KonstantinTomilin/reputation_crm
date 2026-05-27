import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/mocks/crm';
import { useCRM } from '@/context/CRMContext';
import { signOut } from '@/services/authService';

const managementNav = [
  { label: 'Обзор', icon: 'ri-dashboard-line', path: '/management/overview' },
  { label: 'Пользователи', icon: 'ri-user-settings-line', path: '/management/users' },
  { label: 'Проекты', icon: 'ri-folder-line', path: '/management/projects' },
  { label: 'Ссылки', icon: 'ri-links-line', path: '/management/links' },
  { label: 'Аудит', icon: 'ri-file-search-line', path: '/management/audits' },
  { label: 'Исполнители', icon: 'ri-team-line', path: '/management/executors' },
  { label: 'Финансы', icon: 'ri-coins-line', path: '/management/finance' },
  { label: 'Отчёты', icon: 'ri-bar-chart-line', path: '/management/reports' },
  { label: 'Просрочено', icon: 'ri-alarm-warning-line', path: '/management/overdue' },
  { label: 'Kanban', icon: 'ri-kanban-view', path: '/management/kanban' },
  { label: 'Настройки', icon: 'ri-settings-line', path: '/management/settings' },
] as const;

const clientNav = [
  { label: 'Мой проект', icon: 'ri-folder-line', path: '/client' },
  { label: 'Проекты', icon: 'ri-stack-line', path: '/client/projects' },
  { label: 'Ссылки', icon: 'ri-links-line', path: '/client/links' },
  { label: 'Отчёты', icon: 'ri-bar-chart-line', path: '/client/reports' },
  { label: 'Биллинг', icon: 'ri-bill-line', path: '/client/billing' },
] as const;

const executorNav = [
  { label: 'Задачи', icon: 'ri-task-line', path: '/executor/tasks' },
  { label: 'В работе', icon: 'ri-loader-4-line', path: '/executor/in-progress' },
  { label: 'Аудиты', icon: 'ri-file-search-line', path: '/executor/audits' },
  { label: 'История', icon: 'ri-history-line', path: '/executor/history' },
  { label: 'Отчёты', icon: 'ri-bar-chart-line', path: '/executor/reports' },
] as const;

const auditorNav = [
  { label: 'Задачи', icon: 'ri-task-line', path: '/auditor/tasks' },
  { label: 'Активные', icon: 'ri-loader-4-line', path: '/auditor/active' },
  { label: 'История', icon: 'ri-history-line', path: '/auditor/history' },
] as const;

const adminNav = [
  { label: 'Обзор', icon: 'ri-dashboard-line', path: '/admin/dashboard' },
  { label: 'Ссылки', icon: 'ri-links-line', path: '/admin/links' },
  { label: 'Отчёты', icon: 'ri-bar-chart-line', path: '/admin/reports' },
] as const;

const managerNav = [
  { label: 'Обзор', icon: 'ri-dashboard-line', path: '/manager/dashboard' },
  { label: 'Проекты', icon: 'ri-folder-line', path: '/manager/projects' },
  { label: 'Отчёты', icon: 'ri-bar-chart-line', path: '/manager/reports' },
] as const;

const mainAdminNav = [
  { label: 'Обзор', icon: 'ri-dashboard-line', path: '/main-admin/dashboard' },
] as const;

export default function CRMLayout({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const crm = useCRM();

  const roleNavs: Record<string, typeof managementNav> = {
    main_admin: mainAdminNav,
    admin: adminNav,
    manager: managerNav,
    leader: managementNav,
    client: clientNav,
    executor: executorNav,
    auditor: auditorNav,
  };

  const currentNav = roleNavs[role] || managementNav;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-40 md:z-auto bg-white border-r border-gray-200 w-64 h-screen flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-900">
              <i className="ri-shield-line text-white text-lg" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">deindex.ru</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {currentNav.map((item) => {
            const isActive =
              item.path === '/client'
                ? location.pathname === '/client'
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-50 text-blue-900 border-r-2 border-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-blue-900' : 'text-gray-400'}`}>
                  <i className={item.icon} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-logout-box-r-line" />
            </span>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-900">
              <i className="ri-shield-line text-white text-sm" />
            </div>
            <span className="text-sm font-bold text-gray-800">deindex.ru</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-menu-line text-gray-600" />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}