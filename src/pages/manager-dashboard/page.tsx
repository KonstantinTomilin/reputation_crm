import CRMLayout from '@/components/feature/CRMLayout';
import KPICard from '@/components/base/KPICard';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatMoney } from '@/lib/currency';
import { useState } from 'react';

export default function ManagerDashboardPage() {
  const crm = useCRM();
  const mockProjects = crm.projects;
  const mockLinks = crm.links;
  const mockPayments = crm.payments;
  const mockAdminStats = {
    totalClients: crm.clients.length,
    activeClients: crm.clients.filter((c) => c.status === 'активен').length,
    projectsInWork: crm.projects.filter((p) => p.status === 'в работе').length,
    successRate: crm.projects.length > 0 ? Math.round(crm.projects.reduce((s, p) => s + p.successRate, 0) / crm.projects.length) : 0,
    avgRemovalDays: 0,
  };
  const mockTopClients = crm.clients.map((c) => ({
    id: c.id, name: c.companyName,
    projects: crm.projects.filter((p) => p.clientId === c.id).length,
    links: crm.links.filter((l) => l.clientId === c.id).length,
    successRate: 0, hasOverdue: false,
  }));
  const mockChartData: { date: string; removed: number; deindexed: number }[] = [];
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const periodLabels = { month: 'месяц', quarter: 'квартал', year: 'год' };

  // Финансовая сводка
  const totalRevenue = mockPayments
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPayouts = mockPayments
    .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
    .reduce((sum, p) => sum + p.amount, 0);
  const overduePayments = mockPayments.filter((p) => p.status === 'просрочен').length;
  const avgProjectSuccess = Math.round(
    mockProjects.reduce((sum, p) => sum + p.successRate, 0) / mockProjects.length
  );

  return (
    <CRMLayout role="manager">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Обзор аналитики</h1>
            <p className="text-sm text-gray-500 mt-0.5">Режим просмотра — редактирование недоступно</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  period === p ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Read-only badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <i className="ri-eye-line text-amber-500 text-xl flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-amber-700">Режим просмотра</span>
            <span className="text-sm text-amber-600 ml-1">— доступна только аналитика, без возможности редактирования данных.</span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Клиентов всего"
            value={mockAdminStats.totalClients}
            icon="ri-user-line"
            accent="text-blue-900"
            sub={`${mockAdminStats.activeClients} активных`}
          />
          <KPICard
            label="Проектов в работе"
            value={mockAdminStats.projectsInWork}
            icon="ri-folder-open-line"
            accent="text-blue-600"
          />
          <KPICard
            label="Успех удаления"
            value={`${mockAdminStats.successRate}%`}
            icon="ri-checkbox-circle-line"
            accent="text-green-600"
          />
          <KPICard
            label="Средний срок"
            value={`${mockAdminStats.avgRemovalDays} дн.`}
            icon="ri-time-line"
            accent="text-blue-900"
          />
        </div>

        {/* Finance row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Выручка"
            value={formatMoney(totalRevenue, 'RUB')}
            icon="ri-coins-line"
            accent="text-green-600"
          />
          <KPICard
            label="Выплаты исполн."
            value={formatMoney(totalPayouts, 'RUB')}
            icon="ri-hand-coin-line"
            accent="text-orange-600"
          />
          <KPICard
            label="Просроченные платежи"
            value={overduePayments}
            icon="ri-alarm-warning-line"
            accent="text-red-600"
          />
          <KPICard
            label="Средний успех проектов"
            value={`${avgProjectSuccess}%`}
            icon="ri-bar-chart-line"
            accent="text-blue-600"
          />
        </div>

        {/* Projects table (read-only) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-gray-800">Проекты</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Домен</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ссылок</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">В работе</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Удалено</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Успех %</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                {mockProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{project.name}</td>
                    <td className="px-4 py-3 text-sm text-blue-900">{project.domain}</td>
                    <td className="px-4 py-3"><StatusBadge status={project.status} type="project" /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{project.totalLinks}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{project.inProgress}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">{project.removed}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${project.successRate}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{project.successRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{project.deadline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Links status distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Распределение по статусам ссылок</h3>
            <div className="flex flex-col gap-2.5">
              {['в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено'].map((status) => {
                const count = mockLinks.filter((l) => l.status === status).length;
                const pct = Math.round((count / mockLinks.length) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-28 flex-shrink-0"><StatusBadge status={status} /></div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-slate-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-10 text-right text-sm font-semibold text-gray-700">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overdue alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Просроченные дедлайны</h3>
            <div className="flex flex-col gap-3">
              {mockLinks
                .filter((l) => l.deadline && new Date(l.deadline) < new Date('2024-12-01') && l.status !== 'удалено')
                .map((link) => (
                  <div key={link.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <i className="ri-alarm-warning-line text-red-500 text-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{link.url}</div>
                      <div className="text-xs text-gray-500">Дедлайн: {link.deadline} · Статус: <StatusBadge status={link.status} /></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}