import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import type { CRMUser, UserRole } from '@/mocks/crm';

const roleDisplayNames: Record<UserRole, string> = {
  main_admin: 'Гл. администратор',
  admin: 'Администратор',
  manager: 'Руководитель',
  client: 'Клиент',
  executor: 'Исполнитель',
  auditor: 'Аудитор',
};

const roleColors: Record<UserRole, string> = {
  main_admin: 'bg-red-100 text-red-700',
  admin: 'bg-orange-100 text-orange-700',
  manager: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  executor: 'bg-slate-100 text-blue-800',
  auditor: 'bg-pink-100 text-pink-700',
};

export default function MainAdminDashboardPage() {
  const crm = useCRM();
  const mockUsers = crm.users;
  const mockClients = crm.clients;
  const mockProjects = crm.projects;
  const mockPayments = crm.payments;
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = mockUsers.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchSearch =
      searchQuery === '' ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchStatus && matchSearch;
  });

  // Stats
  const totalUsers = mockUsers.length;
  const activeUsers = mockUsers.filter((u) => u.status === 'активен').length;
  const blockedUsers = mockUsers.filter((u) => u.status === 'заблокирован').length;

  const totalRevenue = mockPayments
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDebt = mockClients.reduce((sum, c) => sum + c.totalDebt, 0);

  return (
    <CRMLayout role="main_admin">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Панель главного администратора</h1>
            <p className="text-sm text-gray-500 mt-0.5">Управление пользователями, финансами и системой</p>
          </div>
          <button className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2">
            <i className="ri-user-add-line" />
            Создать пользователя
          </button>
        </div>

        {/* System stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 mb-2">
              <i className="ri-user-line text-blue-900 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{totalUsers}</div>
            <div className="text-xs text-gray-500 mt-0.5">{activeUsers} активных</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 mb-2">
              <i className="ri-briefcase-line text-green-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{mockClients.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mockClients.filter((c) => c.status === 'активен').length} активных</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 mb-2">
              <i className="ri-folder-line text-blue-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{mockProjects.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">{mockProjects.filter((p) => p.status === 'в работе').length} в работе</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 mb-2">
              <i className="ri-money-cny-circle-line text-emerald-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{`${totalRevenue.toLocaleString('ru')} ₽`}</div>
            <div className="text-xs text-gray-500 mt-0.5">за всё время</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 mb-2">
              <i className="ri-alert-line text-red-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{`${totalDebt.toLocaleString('ru')} ₽`}</div>
            <div className="text-xs text-gray-500 mt-0.5">по клиентам</div>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-800">Пользователи системы</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, логину, email"
                  className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400 w-56"
                />
              </div>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="all">Все роли</option>
                  <option value="client">Клиент</option>
                  <option value="executor">Исполнитель</option>
                  <option value="auditor">Аудитор</option>
                  <option value="admin">Администратор</option>
                  <option value="manager">Руководитель</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                >
                  <option value="all">Все статусы</option>
                  <option value="активен">Активен</option>
                  <option value="заблокирован">Заблокирован</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ФИО / Компания</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Логин</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Псевдоним</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: CRMUser) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{user.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                          <i className="ri-user-line text-blue-900 text-sm" />
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.login}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>
                        {roleDisplayNames[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} type="payment" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.alias || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-gray-400 hover:text-blue-900 cursor-pointer" title="Редактировать">
                          <i className="ri-pencil-line text-sm" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer" title="Блокировать">
                          <i className="ri-lock-line text-sm" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer" title="Удалить">
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anonymization settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Настройки обезличивания</h3>
              <p className="text-xs text-gray-500 mt-0.5">Скрывать реальные имена исполнителей во внутренних отчётах</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockUsers.filter((u) => u.role === 'executor').map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                  <i className="ri-user-line text-blue-900 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{user.fullName}</div>
                  <div className="text-xs text-gray-500">Псевдоним: {user.alias || '—'}</div>
                </div>
                <button className="text-xs text-blue-900 hover:text-blue-800 font-medium cursor-pointer whitespace-nowrap">
                  Изменить
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}