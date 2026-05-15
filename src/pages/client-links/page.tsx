import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import type { LinkStatus, CRMLink } from '@/mocks/crm';

const statusOptions: LinkStatus[] = [
  'в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено',
  'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing',
  'вернулось', 'на паузе', 'не взято в работу', 'ожидает аудита',
  'новый', 'в аудите', 'аудит выполнен', 'повторно в работе',
  'сдано клиенту', 'принято', 'не принято',
];

type PaymentStatusDisplay = 'оплачено' | 'не оплачено' | 'предоплата';

function getPaymentDisplay(link: CRMLink): PaymentStatusDisplay {
  if (link.clientPaid && link.clientPaidAmount && link.clientPaidAmount < link.clientCost) return 'предоплата';
  if (link.clientPaid) return 'оплачено';
  return 'не оплачено';
}

export default function ClientLinksPage() {
  const crm = useCRM();
  const navigate = useNavigate();
  const [links, setLinks] = useState<CRMLink[]>(crm.links);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LinkStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [costFilter, setCostFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const allTypes = [...new Set(links.map((l) => l.type))];

  const filtered = links.filter((l) => {
    const matchSearch = !search.trim() || l.url.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchProject = projectFilter === 'all' || String(l.projectId) === projectFilter;
    const matchType = !typeFilter || l.type === typeFilter;

    let matchPayment = true;
    if (paymentFilter === 'paid') matchPayment = l.clientPaid === true;
    else if (paymentFilter === 'unpaid') matchPayment = l.clientPaid === false;
    else if (paymentFilter === 'partial') matchPayment = l.clientPaidAmount !== null && l.clientPaidAmount > 0 && l.clientPaidAmount < l.clientCost;

    const matchStartDate = (() => {
      if (!startDateFilter) return true;
      if (!l.startDate) return false;
      const d = new Date(l.startDate);
      if (isNaN(d.getTime())) return true;
      const from = new Date(startDateFilter);
      return d >= from;
    })();

    const matchEndDate = (() => {
      if (!endDateFilter) return true;
      if (!l.endDate) return false;
      const d = new Date(l.endDate);
      if (isNaN(d.getTime())) return true;
      const to = new Date(endDateFilter);
      to.setHours(23, 59, 59);
      return d <= to;
    })();

    const matchCost = (() => {
      if (!costFilter) return true;
      const value = parseFloat(costFilter);
      if (isNaN(value)) return true;
      return l.clientCost >= value;
    })();

    return matchSearch && matchStatus && matchProject && matchType && matchPayment && matchStartDate && matchEndDate && matchCost;
  });

  const hasActiveFilters = search || statusFilter !== 'all' || projectFilter !== 'all' || typeFilter || startDateFilter || endDateFilter || costFilter || paymentFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setProjectFilter('all');
    setTypeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCostFilter('');
    setPaymentFilter('all');
    setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const getProjectName = (projectId: number) => crm.projects.find((p) => p.id === projectId)?.name || '—';

  const updatePaymentStatus = (linkId: number, status: PaymentStatusDisplay) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== linkId) return l;
        if (status === 'оплачено') {
          return { ...l, clientPaid: true, clientPaidDate: formatDate(new Date()), clientPaidAmount: l.clientCost };
        } else if (status === 'не оплачено') {
          return { ...l, clientPaid: false, clientPaidDate: null, clientPaidAmount: null };
        } else {
          return { ...l, clientPaid: true, clientPaidDate: formatDate(new Date()), clientPaidAmount: Math.round(l.clientCost * 0.5) };
        }
      })
    );
  };

  return (
    <CRMLayout role="client">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Ссылки</h1>
            <p className="text-sm text-gray-500 mt-0.5">Все ссылки по вашим проектам</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-checkbox-circle-line" />
              </div>
              {links.filter((l) => l.status === 'удалено' || l.status.startsWith('деиндексировано')).length} обработано
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-loader-4-line" />
              </div>
              {links.filter((l) => l.status === 'в работе').length} в работе
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Title + result count + reset */}
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-gray-800">Ссылки</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Найдено <span className="font-semibold text-gray-600">{filtered.length}</span> из {links.length}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap border border-gray-200"
                >
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className="ri-refresh-line text-xs" />
                  </div>
                  Сбросить
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/60 text-left">
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
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md pl-6 pr-2 py-1 text-[11px] text-gray-700 outline-none focus:border-blue-900 transition-colors"
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Проект</div>
                    <div className="relative">
                      <select
                        value={projectFilter}
                        onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {crm.projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Тип работы</div>
                    <div className="relative">
                      <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="">Все</option>
                        {allTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 flex items-center justify-center pointer-events-none text-gray-400">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </div>
                    </div>
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Дата начала</div>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => { setStartDateFilter(e.target.value); setPage(1); }}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Дата оконч.</div>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => { setEndDateFilter(e.target.value); setPage(1); }}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Статус</div>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as LinkStatus | 'all'); setPage(1); }}
                        className="w-full min-w-[120px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
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
                      value={costFilter}
                      onChange={(e) => { setCostFilter(e.target.value); setPage(1); }}
                      className="w-full min-w-[100px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-blue-900 transition-colors"
                    />
                  </th>
                  <th className="px-3 py-2 align-bottom">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата</div>
                    <div className="relative">
                      <select
                        value={paymentFilter}
                        onChange={(e) => { setPaymentFilter(e.target.value as any); setPage(1); }}
                        className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-400 outline-none focus:border-blue-900 transition-colors appearance-none cursor-pointer pr-6"
                      >
                        <option value="all">Все</option>
                        <option value="paid">Оплачено</option>
                        <option value="unpaid">Не оплачено</option>
                        <option value="partial">Предоплата</option>
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
                {paged.map((link) => {
                  const payDisplay = getPaymentDisplay(link);
                  return (
                    <tr key={link.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{String(link.id).padStart(3, '0')}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="truncate text-blue-900 font-medium text-xs block"
                          title={link.url}
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/client/project/${link.projectId}`)}
                          className="hover:text-blue-900 hover:underline cursor-pointer text-left"
                        >
                          {getProjectName(link.projectId)}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{link.startDate || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{link.endDate ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={link.status} type="link" />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                        {link.clientCost.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-4 py-3 text-center">
                        {payDisplay === 'оплачено' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">Оплачено</span>
                            {link.clientPaidDate && <span className="text-xs text-gray-400 mt-0.5">{link.clientPaidDate}</span>}
                          </div>
                        ) : payDisplay === 'предоплата' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Предоплата {(link.clientPaidAmount || 0).toLocaleString('ru')} ₽
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">Не оплачено</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={payDisplay}
                          onChange={(e) => updatePaymentStatus(link.id, e.target.value as PaymentStatusDisplay)}
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-slate-400 cursor-pointer bg-white"
                        >
                          <option value="оплачено">Оплачено</option>
                          <option value="предоплата">Предоплата</option>
                          <option value="не оплачено">Не оплачено</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Нет ссылок по заданным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between text-xs text-gray-400">
            <span>Показано {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} из {filtered.length}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-semibold cursor-pointer ${
                    p === page ? 'bg-blue-900 text-white border-blue-900' : 'border-gray-200 hover:bg-white text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 hover:bg-white disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
