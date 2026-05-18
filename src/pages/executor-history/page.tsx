import { useState, useMemo } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId } from '@/hooks/useCurrentExecutor';
import { formatGroupedAmounts, formatMoney, groupAmountsByCurrency } from '@/lib/currency';
import type { LinkStatus } from '@/mocks/crm';

const doneStatuses: LinkStatus[] = ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'деиндексировано yahoo', 'принято', 'сдано'];

export default function ExecutorHistoryPage() {
  const crm = useCRM();
  const executorId = useCurrentExecutorId(crm.users);

  // Inline column filters
  const [colUrl, setColUrl] = useState('');
  const [colProject, setColProject] = useState<string>('all');
  const [colType, setColType] = useState<string>('all');
  const [colStatus, setColStatus] = useState<string>('all');
  const [colGeo, setColGeo] = useState<string>('all');
  const [colEndDate, setColEndDate] = useState('');
  const [colCost, setColCost] = useState('');
  const [colExecutorPaid, setColExecutorPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [colClientPaid, setColClientPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  const allMyLinks = executorId ? crm.links.filter((l) => l.executorId === executorId) : [];
  const doneLinks = allMyLinks.filter((l) => doneStatuses.includes(l.status));

  const geoOptions = useMemo(() => {
    const geos = [...new Set(doneLinks.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))] as string[];
    return geos;
  }, [doneLinks]);

  const typeOptions = useMemo(() => [...new Set(doneLinks.map((l) => l.type))], [doneLinks]);

  const projectOptions = useMemo(() => {
    const ids = [...new Set(doneLinks.map((l) => l.projectId))];
    return ids.map((id) => crm.projects.find((p) => p.id === id)).filter(Boolean) as typeof crm.projects;
  }, [doneLinks, crm.projects]);

  const filtered = useMemo(() => {
    return doneLinks.filter((l) => {
      const matchUrl = !colUrl || l.url.toLowerCase().includes(colUrl.toLowerCase());
      const matchProject = colProject === 'all' || String(l.projectId) === colProject;
      const matchType = colType === 'all' || l.type === colType;
      const matchStatus = colStatus === 'all' || l.status === colStatus;
      const country = l.geo ? l.geo.split(',')[0] : null;
      const matchGeo = colGeo === 'all' || country === colGeo;
      const matchEndDate = !colEndDate || (l.endDate && l.endDate <= colEndDate);
      const matchCost = !colCost || l.executorCost >= Number(colCost);
      const matchExecPaid = colExecutorPaid === 'all' || (colExecutorPaid === 'paid' ? l.executorPaid : !l.executorPaid);
      const matchClientPaid = colClientPaid === 'all' || (colClientPaid === 'paid' ? l.clientPaid : !l.clientPaid);
      return matchUrl && matchProject && matchType && matchStatus && matchGeo && matchEndDate && matchCost && matchExecPaid && matchClientPaid;
    });
  }, [doneLinks, colUrl, colProject, colType, colStatus, colGeo, colEndDate, colCost, colExecutorPaid, colClientPaid]);

  const totalEarnings = doneLinks.reduce((s, l) => s + l.executorCost, 0);
  const paidEarnings = doneLinks.filter((l) => l.executorPaid).reduce((s, l) => s + l.executorCost, 0);
  const pendingEarnings = totalEarnings - paidEarnings;
  const totalEarningsByCurrency = groupAmountsByCurrency(
    doneLinks.map((l) => ({ amount: l.executorCost, currency: projectsData.find((p) => p.id === l.projectId)?.currency }))
  );
  const paidEarningsByCurrency = groupAmountsByCurrency(
    doneLinks.filter((l) => l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsData.find((p) => p.id === l.projectId)?.currency }))
  );
  const pendingByCurrency = groupAmountsByCurrency(
    doneLinks.filter((l) => !l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsData.find((p) => p.id === l.projectId)?.currency }))
  );

  const myPayments = crm.payments.filter((p) => p.type === 'выплата исполнителю');

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">История</h1>
            <p className="text-sm text-gray-500 mt-0.5">Выполненные ссылки и выплаты</p>
          </div>
        </div>

        {!executorId && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            Не удалось определить текущего исполнителя. Выйдите и войдите снова.
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Всего выполнено', value: doneLinks.length, icon: 'ri-checkbox-circle-line', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Общий заработок', value: formatGroupedAmounts(totalEarningsByCurrency), icon: 'ri-coins-line', color: 'text-blue-900', bg: 'bg-slate-50' },
            { label: 'Выплачено', value: formatGroupedAmounts(paidEarningsByCurrency), icon: 'ri-wallet-3-line', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Ожидает выплаты', value: formatGroupedAmounts(pendingByCurrency), icon: 'ri-time-line', color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((k) => (
            <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-gray-100`}>
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
                <i className={`${k.icon} ${k.color} text-lg`} />
              </div>
              <div className="text-xl font-bold text-gray-800">{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Done links table with inline filters */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-gray-800 text-sm">Выполненные ссылки</h2>
            <span className="text-xs text-gray-400">
              Найдено <span className="font-semibold text-gray-600">{filtered.length}</span> из {doneLinks.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60 text-left">
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
                        {doneStatuses.map((s) => (
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
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Дата сдачи</div>
                    <input
                      type="date"
                      value={colEndDate}
                      onChange={(e) => setColEndDate(e.target.value)}
                      className="w-full min-w-[110px] bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-gray-400 transition-colors"
                    />
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
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата исп.</div>
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
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap mb-1">Оплата кли.</div>
                    <div className="relative">
                      <select
                        value={colClientPaid}
                        onChange={(e) => setColClientPaid(e.target.value as any)}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((link) => {
                  const project = crm.projects.find((p) => p.id === link.projectId);
                  return (
                    <tr key={link.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-gray-600 text-xs block hover:text-gray-900 hover:underline" title={link.url}>
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
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{link.endDate || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap text-sm">
                        {formatMoney(link.executorCost, projectsData.find((p) => p.id === link.projectId)?.currency)}
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
                        {link.clientPaid ? (
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
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет выполненных ссылок по выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">История выплат</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60 text-left">
                  {['Дата', 'Сумма', 'Статус', 'Описание'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{payment.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={payment.status} type="payment" /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.description}</td>
                  </tr>
                ))}
                {myPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                      История выплат пуста
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