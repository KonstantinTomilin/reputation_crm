import { useState, useMemo } from 'react';
import type { CRMLink } from '@/mocks/crm';
import StatusBadge from '@/components/base/StatusBadge';

interface Props {
  links: CRMLink[];
}

const typeColors: Record<string, string> = {
  'удаление':              'bg-red-50/80 text-red-600 ring-1 ring-red-100/60',
  'деиндексация':          'bg-sky-50/80 text-sky-600 ring-1 ring-sky-100/60',
  'удаление+деиндексация': 'bg-slate-50/80 text-blue-900 ring-1 ring-slate-100/60',
};

const allStatuses = [
  'новая', 'в работе', 'ожидает аудита', 'в аудите', 'на согласовании',
  'согласовано', 'выполнено', 'завершено', 'в карантине', 'вернулось', 'отменена',
];

export default function ClientLinksTable({ links }: Props) {
  const [urlSearch, setUrlSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [costFilter, setCostFilter] = useState('');
  const [quarantineFilter, setQuarantineFilter] = useState('');

  const types = useMemo(() => [...new Set(links.map((l) => l.type))], [links]);

  const filtered = useMemo(() => {
    return links.filter((link) => {
      const matchesUrl = !urlSearch.trim() || link.url.toLowerCase().includes(urlSearch.toLowerCase());
      const matchesType = !typeFilter || link.type === typeFilter;
      const matchesStatus = !statusFilter || link.status === statusFilter;
      const matchesPaid =
        paidFilter === 'all' ||
        (paidFilter === 'paid' && link.clientPaid) ||
        (paidFilter === 'unpaid' && !link.clientPaid);

      const matchesStartDate = (() => {
        if (!startDateFilter) return true;
        if (!link.startDate) return false;
        const d = new Date(link.startDate);
        if (isNaN(d.getTime())) return true;
        const from = new Date(startDateFilter);
        return d >= from;
      })();

      const matchesEndDate = (() => {
        if (!endDateFilter) return true;
        if (!link.endDate) return false;
        const d = new Date(link.endDate);
        if (isNaN(d.getTime())) return true;
        const to = new Date(endDateFilter);
        to.setHours(23, 59, 59);
        return d <= to;
      })();

      const matchesCost = (() => {
        if (!costFilter) return true;
        const value = parseFloat(costFilter);
        if (isNaN(value)) return true;
        return link.clientCost >= value;
      })();

      const matchesQuarantine = (() => {
        if (!quarantineFilter) return true;
        if (!link.quarantineEndDate) return false;
        const q = new Date(link.quarantineEndDate);
        if (isNaN(q.getTime())) return true;
        const filter = new Date(quarantineFilter);
        filter.setHours(23, 59, 59);
        return q <= filter;
      })();

      return matchesUrl && matchesType && matchesStatus && matchesPaid && matchesStartDate && matchesEndDate && matchesCost && matchesQuarantine;
    });
  }, [links, urlSearch, typeFilter, startDateFilter, endDateFilter, statusFilter, paidFilter, costFilter, quarantineFilter]);

  const resetFilters = () => {
    setUrlSearch('');
    setTypeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setStatusFilter('');
    setPaidFilter('all');
    setCostFilter('');
    setQuarantineFilter('');
  };

  const hasActiveFilters =
    urlSearch ||
    typeFilter ||
    startDateFilter ||
    endDateFilter ||
    statusFilter ||
    paidFilter !== 'all' ||
    costFilter ||
    quarantineFilter;

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-gray-400 tracking-wide uppercase">
          Найдено <span className="text-gray-700 font-semibold tabular-nums">{filtered.length}</span>{' '}
          <span className="text-gray-300">/</span>{' '}
          <span className="text-gray-500 tabular-nums">{links.length}</span>
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer whitespace-nowrap border border-gray-200/80"
          >
            <div className="w-3 h-3 flex items-center justify-center">
              <i className="ri-refresh-line text-xs" />
            </div>
            Сбросить
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/80">
              {/* № */}
              <th className="px-4 py-3 align-bottom w-12">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">№</div>
              </th>

              {/* URL */}
              <th className="px-4 py-3 align-bottom min-w-[220px]">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">URL</div>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center text-gray-300 pointer-events-none">
                    <i className="ri-search-line text-xs" />
                  </div>
                  <input
                    type="text"
                    value={urlSearch}
                    onChange={(e) => setUrlSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-gray-600 placeholder:text-gray-300 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200"
                  />
                </div>
              </th>

              {/* Тип работы */}
              <th className="px-4 py-3 align-bottom w-40">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Тип работы</div>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200 appearance-none cursor-pointer pr-7"
                  >
                    <option value="">Все</option>
                    {types.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center pointer-events-none text-gray-300">
                    <i className="ri-arrow-down-s-line text-xs" />
                  </div>
                </div>
              </th>

              {/* Дата начала */}
              <th className="px-4 py-3 align-bottom w-36">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Начало</div>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200"
                />
              </th>

              {/* Дата оконч. */}
              <th className="px-4 py-3 align-bottom w-36">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Окончание</div>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200"
                />
              </th>

              {/* Статус */}
              <th className="px-4 py-3 align-bottom w-40">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Статус</div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200 appearance-none cursor-pointer pr-7"
                  >
                    <option value="">Все</option>
                    {allStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center pointer-events-none text-gray-300">
                    <i className="ri-arrow-down-s-line text-xs" />
                  </div>
                </div>
              </th>

              {/* Стоимость */}
              <th className="px-4 py-3 align-bottom w-32">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Стоимость</div>
                <input
                  type="number"
                  value={costFilter}
                  onChange={(e) => setCostFilter(e.target.value)}
                  placeholder="от..."
                  className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 placeholder:text-gray-300 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200"
                />
              </th>

              {/* Оплата */}
              <th className="px-4 py-3 align-bottom w-36">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Оплата</div>
                <div className="relative">
                  <select
                    value={paidFilter}
                    onChange={(e) => setPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
                    className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200 appearance-none cursor-pointer pr-7"
                  >
                    <option value="all">Все</option>
                    <option value="paid">Оплачено</option>
                    <option value="unpaid">Не оплачено</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center pointer-events-none text-gray-300">
                    <i className="ri-arrow-down-s-line text-xs" />
                  </div>
                </div>
              </th>

              {/* Карантин */}
              <th className="px-4 py-3 align-bottom w-36">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mb-2">Карантин</div>
                <input
                  type="date"
                  value={quarantineFilter}
                  onChange={(e) => setQuarantineFilter(e.target.value)}
                  className="w-full bg-gray-50/80 border border-gray-200/80 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 transition-all duration-200"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link, i) => (
              <tr
                key={link.id}
                className={`border-t border-gray-100/80 hover:bg-slate-50/30 transition-colors duration-150 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}
              >
                <td className="px-4 py-3.5">
                  <span className="text-[11px] text-gray-400 font-mono tabular-nums">{link.id}</span>
                </td>
                <td className="px-4 py-3.5">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[12px] text-blue-900/90 hover:text-blue-800 font-mono block max-w-[240px] truncate transition-colors"
                    title={link.url}
                  >
                    {link.url}
                  </a>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-md font-medium whitespace-nowrap ${typeColors[link.type] || 'bg-gray-50 text-gray-500 ring-1 ring-gray-100/60'}`}>
                    {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-gray-500 whitespace-nowrap">{link.startDate || '—'}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-gray-500 whitespace-nowrap">{link.endDate || '—'}</span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={link.status} type="link" />
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-semibold text-gray-700 tabular-nums whitespace-nowrap">
                    {link.clientCost.toLocaleString('ru-RU')} ₽
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {link.clientPaid ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold whitespace-nowrap">
                        <i className="ri-checkbox-circle-fill text-emerald-500" /> Оплачено
                      </span>
                      {link.clientPaidDate && (
                        <span className="text-[11px] text-gray-400">{link.clientPaidDate}</span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-semibold whitespace-nowrap">
                      <i className="ri-close-circle-line text-rose-400" /> Не оплачено
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {link.status === 'выполнено' || link.status === 'готово' || link.status === 'завершено' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 whitespace-nowrap">
                      <div className="w-3.5 h-3.5 flex items-center justify-center">
                        <i className="ri-check-double-line text-emerald-500" />
                      </div>
                      Готово
                    </span>
                  ) : link.quarantineEndDate ? (
                    <span className="text-[12px] text-amber-600 font-medium whitespace-nowrap">
                      до {link.quarantineEndDate}
                    </span>
                  ) : link.quarantineDays > 0 ? (
                    <span className="text-[13px] text-gray-500">{link.quarantineDays} дн.</span>
                  ) : (
                    <span className="text-[13px] text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}