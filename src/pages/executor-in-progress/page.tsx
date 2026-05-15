import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import type { CRMLink, LinkStatus } from '@/mocks/crm';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId } from '@/hooks/useCurrentExecutor';

const workStatuses: LinkStatus[] = [
  'в работе',
  'повторно в работе',
  'в карантине',
  'вернулось',
  'готово',
  'сдано',
];

export default function ExecutorInProgressPage() {
  const crm = useCRM();
  const navigate = useNavigate();
  const executorId = useCurrentExecutorId(crm.users);

  // Column filters
  const [colProject, setColProject] = useState<string>('all');
  const [colUrl, setColUrl] = useState('');
  const [colType, setColType] = useState<string>('all');
  const [colStatus, setColStatus] = useState<string>('all');
  const [colGeo, setColGeo] = useState<string>('all');
  const [colStartDate, setColStartDate] = useState('');
  const [colDeadline, setColDeadline] = useState('');
  const [colExecutorPaid, setColExecutorPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  const allMyLinks = executorId ? crm.links.filter((l) => l.executorId === executorId) : [];
  const inWorkLinks = allMyLinks.filter((l) => workStatuses.includes(l.status));

  const geoOptions = useMemo(() => {
    const geos = [...new Set(inWorkLinks.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))] as string[];
    return geos;
  }, [inWorkLinks]);

  const typeOptions = useMemo(() => [...new Set(inWorkLinks.map((l) => l.type))], [inWorkLinks]);

  const projectOptions = useMemo(() => {
    const ids = [...new Set(inWorkLinks.map((l) => l.projectId))];
    return ids.map((id) => crm.projects.find((p) => p.id === id)).filter(Boolean) as typeof crm.projects;
  }, [inWorkLinks]);

  const filtered = useMemo(() => {
    return inWorkLinks.filter((l) => {
      const matchProject = colProject === 'all' || String(l.projectId) === colProject;
      const matchUrl = !colUrl || l.url.toLowerCase().includes(colUrl.toLowerCase());
      const matchType = colType === 'all' || l.type === colType;
      const matchStatus = colStatus === 'all' || l.status === colStatus;
      const country = l.geo ? l.geo.split(',')[0] : null;
      const matchGeo = colGeo === 'all' || country === colGeo;
      const matchStart = !colStartDate || (l.startDate && l.startDate >= colStartDate);
      const matchDeadline = !colDeadline || (l.deadline && l.deadline <= colDeadline);
      const matchPayment = colExecutorPaid === 'all' || (colExecutorPaid === 'paid' ? l.executorPaid : !l.executorPaid);
      return matchProject && matchUrl && matchType && matchStatus && matchGeo && matchStart && matchDeadline && matchPayment;
    });
  }, [inWorkLinks, colProject, colUrl, colType, colStatus, colGeo, colStartDate, colDeadline, colExecutorPaid]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    workStatuses.forEach((s) => { counts[s] = inWorkLinks.filter((l) => l.status === s).length; });
    return counts;
  }, [inWorkLinks]);

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">В работе</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {inWorkLinks.length} ссылок по всем проектам
            </p>
          </div>
        </div>

        {!executorId && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            Не удалось определить текущего исполнителя. Выйдите и войдите снова.
          </div>
        )}

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {workStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setColStatus(colStatus === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                colStatus === s
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {s}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                colStatus === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {statusCounts[s] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Table with inline filters */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60 text-left">
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">№</div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Проект</div>
                    <div className="relative">
                      <select
                        value={colProject}
                        onChange={(e) => setColProject(e.target.value)}
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {projectOptions.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">URL</div>
                    <div className="relative">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none">
                        <i className="ri-search-line text-gray-400 text-xs" />
                      </div>
                      <input
                        type="text"
                        value={colUrl}
                        onChange={(e) => setColUrl(e.target.value)}
                        className="w-full min-w-[140px] bg-white border border-gray-200 rounded-md pl-6 pr-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Тип</div>
                    <div className="relative">
                      <select
                        value={colType}
                        onChange={(e) => setColType(e.target.value)}
                        className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {typeOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Статус</div>
                    <div className="relative">
                      <select
                        value={colStatus}
                        onChange={(e) => setColStatus(e.target.value)}
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {workStatuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Гео</div>
                    <div className="relative">
                      <select
                        value={colGeo}
                        onChange={(e) => setColGeo(e.target.value)}
                        className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {geoOptions.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Начало</div>
                    <input
                      type="date"
                      value={colStartDate}
                      onChange={(e) => setColStartDate(e.target.value)}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Дедлайн</div>
                    <input
                      type="date"
                      value={colDeadline}
                      onChange={(e) => setColDeadline(e.target.value)}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата</div>
                    <div className="relative">
                      <select
                        value={colExecutorPaid}
                        onChange={(e) => setColExecutorPaid(e.target.value as any)}
                        className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        <option value="paid">Да</option>
                        <option value="unpaid">Нет</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Действие</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((link, i) => {
                  const project = crm.projects.find((p) => p.id === link.projectId);
                  const isOverdue = link.deadline && new Date(link.deadline) < new Date('2026-05-01') && !['удалено', 'сдано', 'принято'].includes(link.status);
                  return (
                    <tr key={link.id} className={`hover:bg-gray-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{link.id}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{project?.name || '—'}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-gray-600 text-xs block hover:text-gray-900 hover:underline" title={link.url}>
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-gray-100 text-gray-700">
                          {link.type === 'удаление+деиндексация' ? 'удаление\деиндексация' : link.type}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={link.status} type="link" /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{(link.geo ? link.geo.split(',')[0] : '—')}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{link.startDate || '—'}</td>
                      <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {link.deadline || '—'}
                        {isOverdue && <i className="ri-alarm-warning-line ml-1" />}
                      </td>
                      <td className="px-4 py-3">
                        {link.executorPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <i className="ri-checkbox-circle-fill" /> Да
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            <i className="ri-close-circle-line" /> Нет
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/executor/project/${link.projectId}`)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет ссылок в работе по выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}