import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatGroupedAmounts, formatMoney, groupAmountsByCurrency, normalizeCurrency } from '@/lib/currency';

export default function AdminReportsPage() {
  const crm = useCRM();
  const mockLinks = crm.links;
  const mockPayments = crm.payments;
  const mockProjects = crm.projects;
  const mockUsers = crm.users;
  const mockChartData: { date: string; removed: number; deindexed: number }[] = [];
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Stats
  const totalLinks = mockLinks.length;
  const inWork = mockLinks.filter((l) => l.status === 'в работе').length;
  const removed = mockLinks.filter((l) => l.status === 'удалено' || l.status.startsWith('деиндексировано')).length;
  const returned = mockLinks.filter((l) => l.status === 'вернулось').length;
  const overdue = mockLinks.filter((l) => l.deadline && new Date(l.deadline) < new Date('2024-12-01') && l.status !== 'удалено').length;
  const quarantine = mockLinks.filter((l) => l.status === 'в карантине').length;

  const totalRevenue = mockPayments
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = mockPayments
    .filter((p) => p.type === 'оплата клиента' && p.status === 'запланирован')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPayouts = mockPayments
    .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
    .reduce((sum, p) => sum + p.amount, 0);
  const profit = totalRevenue - totalPayouts;
  const overduePayments = mockPayments.filter((p) => p.status === 'просрочен').length;
  const billedByCurrency = groupAmountsByCurrency(
    mockPayments
      .filter((p) => p.type === 'оплата клиента' && (p.status === 'оплачен' || p.status === 'запланирован'))
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const paidByCurrency = groupAmountsByCurrency(
    mockPayments
      .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const pendingByCurrency = groupAmountsByCurrency(
    mockPayments
      .filter((p) => p.type === 'оплата клиента' && p.status === 'запланирован')
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const payoutsByCurrency = groupAmountsByCurrency(
    mockPayments
      .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const profitByCurrency = Object.keys({ ...paidByCurrency, ...payoutsByCurrency }).reduce<Record<string, number>>((acc, currency) => {
    const code = normalizeCurrency(currency);
    acc[code] = (paidByCurrency[code] ?? 0) - (payoutsByCurrency[code] ?? 0);
    return acc;
  }, {});

  // Links accepted by clients
  const acceptedByClient = mockLinks.filter((l) => l.status === 'принято').length;
  const submittedToClient = mockLinks.filter((l) => l.status === 'сдано клиенту').length;

  return (
    <CRMLayout role="admin">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Отчёты администратора</h1>
            <p className="text-sm text-gray-500 mt-0.5">Сводная аналитика за период</p>
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
                {p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : 'Год'}
              </button>
            ))}
          </div>
        </div>

        {/* Links stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ссылок поступило', value: totalLinks, icon: 'ri-links-line', color: 'text-blue-900', bg: 'bg-slate-50' },
            { label: 'В работе', value: inWork, icon: 'ri-loader-4-line', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Удалено / деиндекс.', value: removed, icon: 'ri-checkbox-circle-line', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Вернулось', value: returned, icon: 'ri-arrow-go-back-line', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'В карантине', value: quarantine, icon: 'ri-hospital-line', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Просрочено', value: overdue, icon: 'ri-alarm-warning-line', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Сдано клиенту', value: submittedToClient, icon: 'ri-send-plane-line', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Принято клиентом', value: acceptedByClient, icon: 'ri-hand-heart-line', color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2`}>
                <i className={`${s.icon} ${s.color} text-lg`} />
              </div>
              <div className="text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Finance stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Финансовая сводка</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Выставлено клиентам', value: formatGroupedAmounts(billedByCurrency), color: 'text-gray-800' },
              { label: 'Оплачено клиентами', value: formatGroupedAmounts(paidByCurrency), color: 'text-green-600' },
              { label: 'Осталось к оплате', value: formatGroupedAmounts(pendingByCurrency), color: 'text-orange-600' },
              { label: 'Выплачено исполнителям', value: formatGroupedAmounts(payoutsByCurrency), color: 'text-blue-600' },
              { label: 'Прибыль (маржа)', value: formatGroupedAmounts(profitByCurrency), color: profit > 0 ? 'text-green-600' : 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{s.label}</div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {overduePayments > 0 && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <i className="ri-alarm-warning-line text-red-500" />
              <span className="text-sm text-red-600 font-semibold">{overduePayments} просроченных платежа</span>
            </div>
          )}
        </div>

        {/* Projects breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-gray-800">Разбивка по проектам</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Проект', 'Клиент', 'Ссылок всего', 'В работе', 'Удалено', 'Успех %', 'Выручка', 'Выплаты', 'Прибыль'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockProjects.map((project) => {
                  const projectLinks = mockLinks.filter((l) => l.projectId === project.id);
                  const revenue = projectLinks.reduce((sum, l) => sum + (l.clientPaid ? l.clientCost : 0), 0);
                  const payouts = projectLinks.reduce((sum, l) => sum + (l.executorPaid ? l.executorCost : 0), 0);
                  const client = mockUsers.find((u) => u.id === project.clientId && u.role === 'client');
                  return (
                    <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{client?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{project.totalLinks}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold text-center">{project.inProgress}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold text-center">{project.removed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${project.successRate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{project.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(revenue, project.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(payouts, project.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(revenue - payouts, project.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executor report */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-gray-800">Отчёт по исполнителям</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Исполнитель', 'Выполнено ссылок', 'Сумма к выплате', 'Выплачено', 'Остаток'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockUsers
                  .filter((u) => u.role === 'executor')
                  .map((executor) => {
                    const execLinks = mockLinks.filter((l) => l.executorId === executor.id && l.status === 'удалено');
                    const totalCost = execLinks.reduce((sum, l) => sum + l.executorCost, 0);
                    const paid = execLinks.filter((l) => l.executorPaid).reduce((sum, l) => sum + l.executorCost, 0);
                    return (
                      <tr key={executor.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{executor.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-center">{execLinks.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.map((l) => ({ amount: l.executorCost, currency: mockProjects.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.filter((l) => l.executorPaid).map((l) => ({ amount: l.executorCost, currency: mockProjects.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.filter((l) => !l.executorPaid).map((l) => ({ amount: l.executorCost, currency: mockProjects.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Распределение по статусам</h3>
            <div className="flex flex-col gap-2.5">
              {['в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено', 'вернулось', 'на паузе'].map((status) => {
                const count = mockLinks.filter((l) => l.status === status).length;
                const pct = totalLinks > 0 ? Math.round((count / totalLinks) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-28 flex-shrink-0"><StatusBadge status={status} /></div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-slate-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-right text-sm font-semibold text-gray-700">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Динамика по месяцам</h3>
            <div className="flex flex-col gap-3">
              {mockChartData.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <div className="w-12 text-xs text-gray-500 flex-shrink-0">{d.date}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-slate-500 h-full" style={{ width: `${(d.removed / (d.removed + d.deindexed + 5)) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-xs font-semibold text-gray-700">
                    {d.removed + d.deindexed}
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