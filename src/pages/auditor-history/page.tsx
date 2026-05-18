import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useRoleScope } from '@/hooks/useRoleScope';
import type { CRMLink } from '@/mocks/crm';

export default function AuditorHistoryPage() {
  const crm = useCRM();
  const scope = useRoleScope();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const historyLinks = scope.links.filter((l) => l.auditorId !== null && l.auditorId !== undefined);

  const filtered = historyLinks.filter((l) => {
    const matchSearch =
      searchQuery === '' ||
      l.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProjectName(l.projectId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchProject = projectFilter === 'all' || String(l.projectId) === projectFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchProject && matchStatus;
  });

  const getProjectName = (projectId: number) => crm.projects.find((p) => p.id === projectId)?.name || '—';
  const getClientName = (clientId: number) => crm.users.find((u) => u.id === clientId && u.role === 'client')?.fullName || '—';
  const getAudit = (linkId: number) => crm.audits.find((a) => a.linkId === linkId);

  const getStatusCount = (status: string) =>
    historyLinks.filter((l) => l.status === status).length;

  return (
    <CRMLayout role="auditor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">История аудитов</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ссылок в истории аудитов</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по URL или проекту"
                className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400 w-56"
              />
            </div>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                <option value="all">Все проекты</option>
                {scope.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
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
                <option value="аудит выполнен">Аудит выполнен</option>
                <option value="в работе">В работе</option>
                <option value="удалено">Удалено</option>
                <option value="готово">Готово</option>
                <option value="сдано">Сдано</option>
                <option value="сдано клиенту">Сдано клиенту</option>
                <option value="принято">Принято</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Аудит выполнен', count: getStatusCount('аудит выполнен') },
            { label: 'В работе', count: getStatusCount('в работе') },
            { label: 'Удалено', count: getStatusCount('удалено') },
            { label: 'Готово', count: getStatusCount('готово') },
            { label: 'Сдано', count: getStatusCount('сдано') },
            { label: 'Принято', count: getStatusCount('принято') },
          ].filter((s) => s.count > 0).map((s) => (
            <button
              key={s.label}
              onClick={() => setStatusFilter(s.label === statusFilter ? 'all' : s.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === s.label
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-50 text-blue-800 hover:bg-slate-100'
              }`}
            >
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип работы</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Вероятность удаления</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Срок (дн)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Аудит завершён</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((link: CRMLink) => {
                  const audit = getAudit(link.id);
                  return (
                    <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">#{link.id}</td>
                      <td className="px-4 py-3">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-900 hover:text-blue-800 truncate max-w-[200px] block" title={link.url}>
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getClientName(link.clientId)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getProjectName(link.projectId)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          link.type === 'удаление' ? 'bg-red-100 text-red-700' :
                          link.type === 'деиндексация' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {audit ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  audit.removalProbability >= 60 ? 'bg-emerald-500' :
                                  audit.removalProbability >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${audit.removalProbability}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${
                              audit.removalProbability >= 60 ? 'text-emerald-700' :
                              audit.removalProbability >= 40 ? 'text-amber-700' : 'text-red-700'
                            }`}>
                              {audit.removalProbability}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Нет данных</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {audit ? (
                          <span className="font-mono">{audit.removalDaysEstimate || audit.deindexDaysEstimate} дн</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={link.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {audit ? (
                          <span className="flex items-center gap-1.5 text-emerald-700">
                            <i className="ri-checkbox-circle-line" />
                            {audit.auditDate}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}