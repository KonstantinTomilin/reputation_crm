import { useState, useMemo } from 'react';
import type { CRMLink, LinkStatus, WorkType } from '@/mocks/crm';
import StatusBadge from '@/components/base/StatusBadge';
import LinkComments from './LinkComments';
import { useCRM } from '@/context/CRMContext';
import { formatMoney } from '@/lib/currency';

interface Props {
  links: CRMLink[];
  onUpdateLink: (link: CRMLink) => void;
  onAddComment: (linkId: number, text: string) => void;
  statusFilter: LinkStatus | 'all';
  onStatusFilterChange: (status: LinkStatus | 'all') => void;
}

const allStatuses: LinkStatus[] = [
  'в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено',
  'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'деиндексировано yahoo',
  'на паузе', 'вернулось', 'не взято в работу', 'ожидает аудита', 'в аудите',
  'аудит выполнен', 'сдано клиенту', 'принято', 'не принято', 'повторно в работе',
];

const workTypes: WorkType[] = ['удаление', 'деиндексация', 'удаление+деиндексация'];

const typeColors: Record<string, string> = {
  'удаление':              'bg-red-50 text-red-600',
  'деиндексация':          'bg-blue-50 text-blue-600',
  'удаление+деиндексация': 'bg-purple-50 text-purple-600',
};

const statusCounts = (links: CRMLink[]) => {
  const counts: Record<string, number> = {};
  allStatuses.forEach((s) => { counts[s] = 0; });
  links.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
  return counts;
};

export default function ExecutorAllLinksTable({
  links,
  onUpdateLink,
  onAddComment,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const crm = useCRM();
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<number | null>(null);
  const [executorPaid, setExecutorPaid] = useState<Record<number, boolean>>(
    Object.fromEntries(links.map((l) => [l.id, l.executorPaid]))
  );

  // Inline column filters
  const [colUrl, setColUrl] = useState('');
  const [colType, setColType] = useState<string>('all');
  const [colGeo, setColGeo] = useState<string>('all');
  const [colStart, setColStart] = useState('');
  const [colEnd, setColEnd] = useState('');
  const [colDeadline, setColDeadline] = useState('');
  const [colCost, setColCost] = useState('');
  const [colPaid, setColPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  const geoOptions = useMemo(() => {
    const geos = [...new Set(links.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))] as string[];
    return geos;
  }, [links]);

  const displayLinks = useMemo(() => {
    return links.filter((l) => {
      const matchUrl = !colUrl || l.url.toLowerCase().includes(colUrl.toLowerCase());
      const matchType = colType === 'all' || l.type === colType;
      const country = l.geo ? l.geo.split(',')[0] : null;
      const matchGeo = colGeo === 'all' || country === colGeo;
      const matchStart = !colStart || (l.startDate && l.startDate >= colStart);
      const matchEnd = !colEnd || (l.endDate && l.endDate <= colEnd);
      const matchDeadline = !colDeadline || (l.deadline && l.deadline <= colDeadline);
      const matchCost = !colCost || l.executorCost >= Number(colCost);
      const matchPaid = colPaid === 'all' || (colPaid === 'paid' ? l.executorPaid : !l.executorPaid);
      return matchUrl && matchType && matchGeo && matchStart && matchEnd && matchDeadline && matchCost && matchPaid;
    });
  }, [links, colUrl, colType, colGeo, colStart, colEnd, colDeadline, colCost, colPaid]);

  const counts = statusCounts(links);
  const today = new Date('2026-05-01');

  const updateStatus = (linkId: number, newStatus: LinkStatus) => {
    const link = crm.links.find((l) => l.id === linkId);
    if (!link) return;
    const updated: CRMLink = { ...link, status: newStatus };
    if (newStatus === 'в работе' || newStatus === 'повторно в работе') {
      updated.startDate = updated.startDate || new Date().toISOString().split('T')[0];
    }
    if (['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'деиндексировано yahoo', 'сдано', 'принято'].includes(newStatus)) {
      updated.endDate = new Date().toISOString().split('T')[0];
    }
    onUpdateLink(updated);
    setEditingStatus(null);
  };

  const updateType = (linkId: number, newType: WorkType) => {
    const link = crm.links.find((l) => l.id === linkId);
    if (!link) return;
    onUpdateLink({ ...link, type: newType });
    setEditingType(null);
  };

  const togglePaid = (linkId: number) => {
    setExecutorPaid((prev) => {
      const newVal = !prev[linkId];
      const link = crm.links.find((l) => l.id === linkId);
      if (link) {
        onUpdateLink({
          ...link,
          executorPaid: newVal,
          executorPaidDate: newVal ? new Date().toISOString().split('T')[0] : null,
          executorPaidAmount: newVal ? link.executorCost : null,
        });
      }
      return { ...prev, [linkId]: newVal };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusFilterChange('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === 'all'
              ? 'bg-blue-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-slate-300 hover:text-blue-900'
          }`}
        >
          Все
          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {links.length}
          </span>
        </button>
        {allStatuses
          .filter((s) => counts[s] > 0)
          .map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilterChange(statusFilter === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-blue-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-slate-300 hover:text-blue-900'
              }`}
            >
              {s}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[s]}
              </span>
            </button>
          ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Тип</div>
                  <div className="relative">
                    <select
                      value={colType}
                      onChange={(e) => setColType(e.target.value)}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                    >
                      <option value="all">Все</option>
                      {workTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
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
                    value={colStart}
                    onChange={(e) => setColStart(e.target.value)}
                    className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                  />
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Конец</div>
                  <input
                    type="date"
                    value={colEnd}
                    onChange={(e) => setColEnd(e.target.value)}
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Статус</div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => onStatusFilterChange(e.target.value as LinkStatus | 'all')}
                      className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors appearance-none cursor-pointer pr-6"
                    >
                      <option value="all">Все</option>
                      {allStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                      <i className="ri-arrow-down-s-line text-xs" />
                    </div>
                  </div>
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Комм.</div>
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Стоим. клиент</div>
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Стоим. исп.</div>
                  <input
                    type="number"
                    value={colCost}
                    onChange={(e) => setColCost(e.target.value)}
                    placeholder="от"
                    className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                  />
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Выплата</div>
                  <div className="relative">
                    <select
                      value={colPaid}
                      onChange={(e) => setColPaid(e.target.value as any)}
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата</div>
                </th>
                <th className="px-3 py-2 align-bottom">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Пруфы</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayLinks.map((link, i) => {
                const isOverdue = link.deadline && new Date(link.deadline) < today && !['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing'].includes(link.status);
                return (
                  <tr key={link.id} className={`hover:bg-gray-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                    <td className="px-3 py-3 text-xs text-gray-400 font-mono">{link.id}</td>
                    <td className="px-3 py-3 max-w-xs">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs text-gray-600 hover:text-gray-900 hover:underline font-mono block truncate"
                        title={link.url}
                      >
                        {link.url}
                      </a>
                    </td>

                    {/* Editable type */}
                    <td className="px-3 py-3 relative">
                      {editingType === link.id ? (
                        <select
                          autoFocus
                          value={link.type}
                          onBlur={() => setEditingType(null)}
                          onChange={(e) => updateType(link.id, e.target.value as WorkType)}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none cursor-pointer"
                        >
                          {workTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingType(link.id)}
                          className="flex items-center gap-1 group cursor-pointer"
                          title="Нажмите для изменения типа"
                        >
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${typeColors[link.type] || ''}`}>
                            {link.type === 'удаление+деиндексация' ? 'удаление\деиндексация' : link.type}
                          </span>
                          <i className="ri-pencil-line text-gray-300 group-hover:text-slate-500 text-xs transition-colors" />
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{(link.geo ? link.geo.split(',')[0] : '—')}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{link.startDate || '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{link.endDate || '—'}</td>
                    <td className={`px-3 py-3 text-xs font-semibold whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      {link.deadline || '—'}
                      {isOverdue && <i className="ri-alarm-warning-line ml-1" />}
                    </td>

                    {/* Editable status */}
                    <td className="px-3 py-3 relative">
                      {editingStatus === link.id ? (
                        <select
                          autoFocus
                          value={link.status}
                          onBlur={() => setEditingStatus(null)}
                          onChange={(e) => updateStatus(link.id, e.target.value as LinkStatus)}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none cursor-pointer"
                        >
                          {allStatuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingStatus(link.id)}
                          className="flex items-center gap-1 group cursor-pointer"
                          title="Нажмите для изменения статуса"
                        >
                          <StatusBadge status={link.status} type="link" />
                          <i className="ri-pencil-line text-gray-300 group-hover:text-slate-500 text-xs transition-colors" />
                        </button>
                      )}
                    </td>

                    {/* Comments */}
                    <td className="px-3 py-3">
                      <LinkComments
                        comments={link.comments}
                        onAddComment={(text) => onAddComment(link.id, text)}
                      />
                    </td>

                    <td className="px-3 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {formatMoney(link.clientCost, crm.projects.find((p) => p.id === link.projectId)?.currency)}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-blue-800 whitespace-nowrap">
                      {formatMoney(link.executorCost, crm.projects.find((p) => p.id === link.projectId)?.currency)}
                    </td>

                    {/* Executor paid toggle */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => togglePaid(link.id)}
                        className="cursor-pointer"
                        title={executorPaid[link.id] ? 'Выплачено' : 'Не выплачено'}
                      >
                        <i className={`text-base ${executorPaid[link.id] ? 'ri-checkbox-circle-fill text-green-500' : 'ri-close-circle-line text-red-400'}`} />
                      </button>
                    </td>

                    {/* Client payment */}
                    <td className="px-3 py-3">
                      <i className={`text-base ${link.clientPaid ? 'ri-checkbox-circle-fill text-green-500' : 'ri-close-circle-line text-red-400'}`} />
                    </td>

                    {/* Proof - Google Drive */}
                    <td className="px-3 py-3">
                      <a
                        href={`https://drive.google.com/drive/folders/${link.projectId === 1 ? '1RomashkaProofs' : link.projectId === 3 ? '1BankDoverieProofs' : '1DefaultProofs'}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-xs text-blue-900 hover:text-blue-800 font-semibold cursor-pointer"
                        title="Открыть папку с пруфами на Google Drive"
                      >
                        <i className="ri-drive-line text-base" />
                        Drive
                      </a>
                    </td>
                  </tr>
                );
              })}
              {displayLinks.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-gray-400">
                    Нет ссылок по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}