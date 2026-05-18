import { useState, useMemo } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId } from '@/hooks/useCurrentExecutor';
import { formatMoney } from '@/lib/currency';
import type { CRMLink, LinkStatus } from '@/mocks/crm';

const linkStatusOptions: { value: LinkStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'ожидает аудита', label: 'Ожидает аудита' },
  { value: 'новый', label: 'Новые' },
  { value: 'в работе', label: 'В работе' },
  { value: 'повторно в работе', label: 'Повторно в работе' },
  { value: 'на паузе', label: 'На паузе' },
  { value: 'готово', label: 'Готово' },
  { value: 'сдано', label: 'Сдано' },
  { value: 'вернулось', label: 'Вернувшиеся' },
  { value: 'в карантине', label: 'На карантине' },
  { value: 'удалено', label: 'Удалено' },
  { value: 'деиндексировано google', label: 'Деиндексировано Google' },
  { value: 'деиндексировано yandex', label: 'Деиндексировано Яндекс' },
  { value: 'принято', label: 'Принято' },
];

export default function ExecutorTasksPage() {
  const crm = useCRM();
  const executorId = useCurrentExecutorId(crm.users);
  const [search, setSearch] = useState('');

  const linksData = crm.links;
  const projectsData = crm.projects;

  const myLinks = useMemo(() => {
    if (!executorId) return [];
    return linksData.filter((l) => l.executorId === executorId && ['на просчёт', 'просчёт выполнен'].indexOf(l.status) === -1);
  }, [linksData, executorId]);

  const geoOptions = useMemo(() => {
    const geos = [...new Set(myLinks.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))] as string[];
    return geos;
  }, [myLinks]);

  const typeOptions = useMemo(() => [...new Set(myLinks.map((l) => l.type))], [myLinks]);

  // Column filters (in-table header filters)
  const [colUrl, setColUrl] = useState('');
  const [colProject, setColProject] = useState<string>('all');
  const [colType, setColType] = useState<string>('all');
  const [colStatus, setColStatus] = useState<string>('all');
  const [colGeo, setColGeo] = useState<string>('all');
  const [colCost, setColCost] = useState('');
  const [colPayment, setColPayment] = useState<'all' | 'paid' | 'unpaid'>('all');

  const filtered = useMemo(() => {
    return myLinks.filter((l) => {
      const matchSearch = !search || l.url.toLowerCase().includes(search.toLowerCase());
      const matchColUrl = !colUrl || l.url.toLowerCase().includes(colUrl.toLowerCase());
      const matchColProject = colProject === 'all' || String(l.projectId) === colProject;
      const matchColType = colType === 'all' || l.type === colType;
      const matchColStatus = colStatus === 'all' || l.status === colStatus;
      const country = l.geo ? l.geo.split(',')[0] : null;
      const matchColGeo = colGeo === 'all' || country === colGeo;
      const matchColCost = !colCost || l.executorCost >= Number(colCost);
      const matchColPayment = colPayment === 'all' || (colPayment === 'paid' ? l.executorPaid : !l.executorPaid);
      return matchSearch && matchColUrl && matchColProject && matchColType && matchColStatus && matchColGeo && matchColCost && matchColPayment;
    });
  }, [myLinks, search, colUrl, colProject, colType, colStatus, colGeo, colCost, colPayment]);

  const projectOptions = useMemo(() => {
    const ids = [...new Set(myLinks.map((l) => l.projectId))];
    return ids.map((id) => projectsData.find((p) => p.id === id)).filter(Boolean) as typeof projectsData;
  }, [myLinks, projectsData]);

  const counts = useMemo(() => ({
    total: myLinks.length,
    new: myLinks.filter((l) => l.status === 'новый').length,
    inProgress: myLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе').length,
    paused: myLinks.filter((l) => l.status === 'на паузе').length,
    returned: myLinks.filter((l) => l.status === 'вернулось').length,
    quarantine: myLinks.filter((l) => l.status === 'в карантине').length,
    done: myLinks.filter((l) => ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'принято', 'сдано'].includes(l.status)).length,
  }), [myLinks]);

  const badgeData = [
    { label: 'Всего', count: counts.total, color: 'bg-gray-100 text-gray-600' },
    { label: 'Новых', count: counts.new, color: 'bg-gray-100 text-gray-600' },
    { label: 'В работе', count: counts.inProgress, color: 'bg-gray-100 text-gray-600' },
    { label: 'На паузе', count: counts.paused, color: 'bg-gray-100 text-gray-600' },
    { label: 'Вернувшиеся', count: counts.returned, color: 'bg-gray-100 text-gray-600' },
    { label: 'На карантине', count: counts.quarantine, color: 'bg-gray-100 text-gray-600' },
    { label: 'Выполнено', count: counts.done, color: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Мои задачи</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ссылок</p>
          </div>
        </div>

        {!executorId && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            Не удалось определить текущего исполнителя. Выйдите и войдите снова.
          </div>
        )}

        {/* Audit links widget */}
        <a
          href="/executor/audits"
          className="inline-flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer group max-w-sm"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-200 group-hover:bg-amber-300 transition-colors">
            <i className="ri-calculator-line text-amber-700 text-lg" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">Ссылки на просчёт</div>
            <div className="text-xs text-amber-700 mt-0.5">
              {executorId ? linksData.filter((l) => l.executorId === executorId && (l.status === 'на просчёт' || l.status === 'просчёт выполнен')).length : 0} ссылок в работе
            </div>
          </div>
          <div className="ml-auto w-6 h-6 flex items-center justify-center">
            <i className="ri-arrow-right-line text-amber-600" />
          </div>
        </a>

        {/* Global search */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по URL..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          {badgeData.map((s) => (
            <span key={s.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.color}`}>
              {s.label}: <strong>{s.count}</strong>
            </span>
          ))}
        </div>

        {/* Table with inline header filters */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60 text-left">
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">№</div>
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
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md pl-6 pr-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                      />
                    </div>
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
                        {linkStatusOptions.filter((o) => o.value !== 'all').map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
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
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Стоимость</div>
                    <input
                      type="number"
                      value={colCost}
                      onChange={(e) => setColCost(e.target.value)}
                      placeholder="от"
                      className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата</div>
                    <div className="relative">
                      <select
                        value={colPayment}
                        onChange={(e) => setColPayment(e.target.value as any)}
                        className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        <option value="paid">Оплачено</option>
                        <option value="unpaid">Не оплачено</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((link) => {
                  const project = projectsData.find((p) => p.id === link.projectId);
                  return (
                    <tr key={link.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{String(link.id).padStart(3, '0')}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-gray-600 text-xs block hover:text-gray-900 hover:underline" title={link.url}>
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{project?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap bg-gray-100 text-gray-700">
                          {link.type === 'удаление+деиндексация' ? 'удаление\деиндексация' : link.type}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={link.status} type="link" /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{(link.geo ? link.geo.split(',')[0] : '—')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap text-sm">{formatMoney(link.executorCost, project?.currency)}</td>
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
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет ссылок по выбранным фильтрам
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