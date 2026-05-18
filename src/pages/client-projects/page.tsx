import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import type { CRMProject } from '@/mocks/crm';
import { useRoleScope } from '@/hooks/useRoleScope';

type SortField = 'name' | 'totalLinks' | 'successRate' | 'deadline';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'активный' | 'тестирование' | 'завершён' | 'остановлен';

export default function ClientProjectsPage() {
  const scope = useRoleScope();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const projectsData = scope.projects;
  const filtered = projectsData
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'totalLinks') cmp = a.totalLinks - b.totalLinks;
      else if (sortField === 'successRate') cmp = a.successRate - b.successRate;
      else if (sortField === 'deadline') cmp = (a.deadline || '').localeCompare(b.deadline || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(f); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === 'asc'
        ? <i className="ri-arrow-up-s-line ml-0.5 text-slate-500" />
        : <i className="ri-arrow-down-s-line ml-0.5 text-slate-500" />
    ) : (
      <i className="ri-arrow-up-down-line ml-0.5 text-gray-300" />
    );

  const statusMap: Record<CRMProject['status'], string> = {
    'в работе': 'в работе',
    'на паузе': 'на паузе',
    'завершён': 'завершён',
    'просрочен': 'просрочен',
    'новый': 'новый',
  };

  const statusDisplayMap: Record<string, string> = {
    'в работе': 'Активный',
    'на паузе': 'Остановлен',
    'завершён': 'Завершён',
    'просрочен': 'Просрочен',
    'новый': 'Тестирование',
  };

  return (
    <CRMLayout role="client">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Проекты</h1>
            <p className="text-sm text-gray-500 mt-0.5">Все ваши активные и завершённые проекты</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900 bg-slate-50 px-4 py-2 rounded-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-folder-line" />
            </div>
            {projectsData.filter((p) => p.status === 'в работе').length} активных
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
              <i className="ri-search-line text-gray-400 text-sm" />
            </div>
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['all', 'активный', 'тестирование', 'завершён', 'остановлен'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === s ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? 'Все' :
                 s === 'активный' ? 'Активный' :
                 s === 'тестирование' ? 'Тестирование' :
                 s === 'завершён' ? 'Завершён' : 'Остановлен'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/60">
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-900 whitespace-nowrap"
                    onClick={() => toggleSort('name')}
                  >
                    Проект <SortIcon field="name" />
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-900 whitespace-nowrap"
                    onClick={() => toggleSort('totalLinks')}
                  >
                    Всего <SortIcon field="totalLinks" />
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">В работе</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Удалено</th>
                  <th
                    className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-900 whitespace-nowrap"
                    onClick={() => toggleSort('successRate')}
                  >
                    Успех % <SortIcon field="successRate" />
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-900 whitespace-nowrap"
                    onClick={() => toggleSort('deadline')}
                  >
                    Дедлайн <SortIcon field="deadline" />
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Статус</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((project) => {
                  const progress = Math.round((project.removed / project.totalLinks) * 100);
                  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status === 'в работе';
                  const displayStatus = statusDisplayMap[project.status] || project.status;
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-800">{project.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{project.manager}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-gray-700">{project.totalLinks}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{project.inProgress}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{project.removed}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${project.successRate >= 80 ? 'text-green-600' : project.successRate >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                            {project.successRate}%
                          </span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${project.successRate >= 80 ? 'bg-green-500' : project.successRate >= 60 ? 'bg-orange-400' : 'bg-red-400'}`}
                              style={{ width: `${project.successRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                          {isOverdue && (
                            <div className="w-4 h-4 flex items-center justify-center inline-flex mr-1">
                              <i className="ri-alarm-warning-line" />
                            </div>
                          )}
                          {project.deadline || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap px-2.5 py-1 text-xs ${
                          project.status === 'в работе' ? 'bg-blue-100 text-blue-700' :
                          project.status === 'завершён' ? 'bg-green-100 text-green-700' :
                          project.status === 'на паузе' ? 'bg-yellow-100 text-yellow-700' :
                          project.status === 'просрочен' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => navigate(`/client/project/${project.id}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-900 hover:bg-blue-800 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30 text-xs text-gray-400">
            Показано {filtered.length} из {projectsData.length} проектов
          </div>
        </div>

        {/* Progress summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-slate-300 transition-all" onClick={() => navigate(`/client/project/${project.id}`)}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800 text-sm truncate pr-2">{project.name}</div>
                <span className="text-xs text-blue-900 font-semibold whitespace-nowrap">
                  {Math.round((project.removed / project.totalLinks) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-slate-500 rounded-full transition-all"
                  style={{ width: `${Math.round((project.removed / project.totalLinks) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs font-bold text-blue-600">{project.inProgress}</div>
                  <div className="text-[10px] text-gray-400">в работе</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-green-600">{project.removed}</div>
                  <div className="text-[10px] text-gray-400">удалено</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-700">{project.totalLinks - project.inProgress - project.removed}</div>
                  <div className="text-[10px] text-gray-400">осталось</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CRMLayout>
  );
}
