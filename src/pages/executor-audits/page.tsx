import { useState, useMemo } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId } from '@/hooks/useCurrentExecutor';
import type { CRMLink, CRMAudit } from '@/mocks/crm';

const probOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const currencyOptions: ('RUB' | 'USD' | 'EUR' | 'AED')[] = ['RUB', 'USD', 'EUR', 'AED'];
const priorityOptions: ('низкий' | 'средний' | 'высокий' | 'критичный')[] = ['низкий', 'средний', 'высокий', 'критичный'];

export default function ExecutorAuditsPage() {
  const crm = useCRM();
  const executorId = useCurrentExecutorId(crm.users);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

  // Force re-render after taking a link
  const linksData = useMemo(() => crm.links, [crm.links, tick]);

  const projectsData = crm.projects;

  // Available: на просчёт + executorId === null
  const availableLinks = useMemo(
    () => linksData.filter((l) => l.status === 'на просчёт' && l.executorId === null),
    [linksData]
  );

  // Mine: на просчёт or просчёт выполнен + executorId === me
  const myAuditLinks = useMemo(
    () => (executorId ? linksData.filter((l) => l.executorId === executorId && (l.status === 'на просчёт' || l.status === 'просчёт выполнен')) : []),
    [linksData, executorId]
  );

  // Group available links by project
  const availableByProject = useMemo(() => {
    const map = new Map<number, CRMLink[]>();
    availableLinks.forEach((l) => {
      const arr = map.get(l.projectId) || [];
      arr.push(l);
      map.set(l.projectId, arr);
    });
    return map;
  }, [availableLinks]);

  // Group my audit links by project
  const myByProject = useMemo(() => {
    const map = new Map<number, CRMLink[]>();
    myAuditLinks.forEach((l) => {
      const arr = map.get(l.projectId) || [];
      arr.push(l);
      map.set(l.projectId, arr);
    });
    return map;
  }, [myAuditLinks]);

  const [activeTab, setActiveTab] = useState<'available' | 'mine'>('available');

  // Calc modal state
  const [calcModal, setCalcModal] = useState<{ open: boolean; link: CRMLink | null; isAvailable: boolean }>({ open: false, link: null, isAvailable: false });
  const [probability, setProbability] = useState(50);
  const [daysMin, setDaysMin] = useState(14);
  const [daysMax, setDaysMax] = useState(30);
  const [costMode, setCostMode] = useState<'separate' | 'total'>('separate');
  const [totalCost, setTotalCost] = useState(0);
  const [costGoogle, setCostGoogle] = useState(0);
  const [costYandex, setCostYandex] = useState(0);
  const [costBing, setCostBing] = useState(0);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'низкий' | 'средний' | 'высокий' | 'критичный'>('средний');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'AED'>('RUB');
  const [workType, setWorkType] = useState<'удаление' | 'деиндексация' | 'удаление+деиндексация'>('удаление');

  const getProjectName = (id: number) => projectsData.find((p) => p.id === id)?.name || '—';
  const getClientName = (id: number) => crm.users.find((u) => u.id === id && u.role === 'client')?.fullName || '—';

  const handleTakeLink = (link: CRMLink) => {
    if (!executorId) return;
    const executorName = crm.users.find((u) => u.id === executorId)?.fullName || 'Исполнитель';
    crm.setLinks((prev) =>
      prev.map((l) =>
        l.id === link.id
          ? {
              ...l,
              executorId,
              comments: [
                ...l.comments,
                {
                  id: l.comments.length + 1,
                  author: executorName,
                  authorRole: 'executor' as const,
                  text: 'Взял ссылку в работу для просчёта',
                  createdAt: new Date().toISOString().split('T')[0],
                },
              ],
            }
          : l
      )
    );
    setTick((t) => t + 1);
  };

  const openCalc = (link: CRMLink, isAvailable = false) => {
    setCalcModal({ open: true, link, isAvailable });
    setProbability(50);
    setDaysMin(14);
    setDaysMax(30);
    setCostMode('separate');
    setTotalCost(Math.round(link.clientCost * 0.6));
    setCostGoogle(Math.round(link.clientCost * 0.6));
    setCostYandex(Math.round(link.clientCost * 0.55));
    setCostBing(Math.round(link.clientCost * 0.5));
    setNotes('');
    setPriority('средний');
    setCurrency('RUB');
    setWorkType(link.type);
  };

  const handleSubmitCalc = () => {
    if (!calcModal.link || !executorId) return;
    const linkId = calcModal.link.id;
    const executorName = crm.users.find((u) => u.id === executorId)?.fullName || 'Исполнитель';

    // First, assign to self if from available tab
    if (calcModal.isAvailable) {
      crm.setLinks((prev) =>
        prev.map((l) =>
          l.id === linkId
            ? {
                ...l,
                executorId,
                comments: [
                  ...l.comments,
                  {
                    id: l.comments.length + 1,
                    author: executorName,
                    authorRole: 'executor' as const,
                    text: 'Взял ссылку и сразу выполнил просчёт',
                    createdAt: new Date().toISOString().split('T')[0],
                  },
                ],
              }
            : l
        )
      );
    }

    // Update link status
    crm.setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? {
              ...l,
              status: 'просчёт выполнен',
              comments: [
                ...l.comments,
                {
                  id: l.comments.length + 1,
                  author: executorName,
                  authorRole: 'executor' as const,
                  text: `Просчёт: вероятность ${probability}%, срок ${daysMin}-${daysMax} дн. Стоимость ${costMode === 'total' ? `${totalCost} ${currency} (общая)` : `Google ${costGoogle} ${currency}, Яндекс ${costYandex} ${currency}, Bing ${costBing} ${currency}`}. Приоритет: ${priority}. Тип работы: ${workType}. ${notes || ''}`,
                  createdAt: new Date().toISOString().split('T')[0],
                },
              ],
            }
          : l
      )
    );

    const existingAuditIdx = crm.audits.findIndex((a) => a.linkId === linkId);
    const newAudit: CRMAudit = {
      id: existingAuditIdx >= 0 ? crm.audits[existingAuditIdx].id : crm.audits.length + 1,
      linkId,
      removalProbability: probability,
      deindexProbability: probability,
      probability,
      removalDaysEstimate: daysMax,
      deindexDaysEstimate: daysMax,
      costPerSE: { google: costGoogle, yandex: costYandex, bing: costBing, yahoo: 0 },
      totalCost: costMode === 'total' ? totalCost : undefined,
      costMode,
      riskLevel: probability >= 60 ? ('низкий' as const) : probability >= 40 ? ('средний' as const) : ('высокий' as const),
      auditDate: new Date().toISOString().split('T')[0],
      auditorId: executorId,
      notes,
      priority,
      currency,
      workType,
    };

    if (existingAuditIdx >= 0) {
      crm.setAudits((prev) => prev.map((a, i) => (i === existingAuditIdx ? newAudit : a)));
    } else {
      crm.setAudits((prev) => [...prev, newAudit]);
    }

    setCalcModal({ open: false, link: null, isAvailable: false });
    setTick((t) => t + 1);
  };

  const filteredAvailable = useMemo(() => {
    return availableLinks.filter((l) => {
      const matchSearch = !search || l.url.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [availableLinks, search]);

  const filteredMy = useMemo(() => {
    return myAuditLinks.filter((l) => {
      const matchSearch = !search || l.url.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [myAuditLinks, search]);

  const renderProjectCard = (projectId: number, links: CRMLink[], isAvailable = false) => {
    const project = projectsData.find((p) => p.id === projectId);
    if (!project) return null;
    const client = crm.users.find((u) => u.id === project.clientId && u.role === 'client');
    const isExpanded = expandedProjectId === projectId;

    const counts = {
      removal: links.filter((l) => l.type === 'удаление').length,
      deindex: links.filter((l) => l.type === 'деиндексация').length,
      both: links.filter((l) => l.type === 'удаление+деиндексация').length,
    };

    return (
      <div key={projectId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Project header / card */}
        <button
          onClick={() => setExpandedProjectId(isExpanded ? null : projectId)}
          className="w-full text-left p-5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
            <i className="ri-folder-line text-amber-600 text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">{project.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{client?.fullName || '—'} · {links.length} ссылок</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {counts.removal > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium whitespace-nowrap">Удал: {counts.removal}</span>
            )}
            {counts.deindex > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium whitespace-nowrap">Деинд: {counts.deindex}</span>
            )}
            {counts.both > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-blue-900 font-medium whitespace-nowrap">Компл: {counts.both}</span>
            )}
            <div className="w-6 h-6 flex items-center justify-center">
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {/* Expanded links list */}
        {isExpanded && (
          <div className="border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/40">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">№</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">URL</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Тип</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Гео</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{link.id}</td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-xs text-blue-900 hover:underline truncate max-w-[220px] block"
                          title={link.url}
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                          link.type === 'удаление'
                            ? 'bg-red-100 text-red-700'
                            : link.type === 'деиндексация'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-100 text-blue-800'
                        }`}>
                          {link.type === 'удаление+деиндексация' ? 'Удал+деинд' : link.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{link.geo ? link.geo.split(',')[0] : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={link.status} type="link" /></td>
                      <td className="px-4 py-3">
                        {isAvailable ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); openCalc(link, true); }}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-hand-coin-line mr-1" />
                            Взять и просчитать
                          </button>
                        ) : link.status === 'на просчёт' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); openCalc(link, false); }}
                            className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-calculator-line mr-1" />
                            Просчитать
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <i className="ri-check-double-line" /> Готово
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Аудиты на просчёт</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeTab === 'available'
                ? `${filteredAvailable.length} доступно`
                : `${filteredMy.length} в работе`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setActiveTab('available'); setExpandedProjectId(null); }}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'available'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="ri-inbox-unarchive-line mr-1.5" />
              Доступные
              {availableLinks.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {availableLinks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('mine'); setExpandedProjectId(null); }}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'mine'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="ri-calculator-line mr-1.5" />
              Мои просчёты
              {myAuditLinks.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                  {myAuditLinks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {!executorId && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            Не удалось определить текущего исполнителя. Выйдите и войдите снова.
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-xs">
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Всего', count: activeTab === 'available' ? filteredAvailable.length : filteredMy.length, color: 'bg-gray-100 text-gray-600' },
            { label: 'Удаление', count: (activeTab === 'available' ? filteredAvailable : filteredMy).filter((l) => l.type === 'удаление').length, color: 'bg-red-50 text-red-600' },
            { label: 'Деиндексация', count: (activeTab === 'available' ? filteredAvailable : filteredMy).filter((l) => l.type === 'деиндексация').length, color: 'bg-sky-50 text-sky-600' },
            { label: 'Комплекс', count: (activeTab === 'available' ? filteredAvailable : filteredMy).filter((l) => l.type === 'удаление+деиндексация').length, color: 'bg-slate-50 text-blue-900' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Info block */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-5 h-5 flex items-center justify-center mt-0.5 shrink-0">
            <i className="ri-information-line text-amber-500" />
          </div>
          <div className="text-sm text-amber-700">
            Нажмите на проект, чтобы увидеть ссылки. Кликните «Взять и просчитать» — сразу назначает ссылку на вас и открывает форму просчёта. После отправки данные уходят управлению на согласование.
          </div>
        </div>

        {/* Project cards */}
        <div className="flex flex-col gap-3">
          {activeTab === 'available' ? (
            availableByProject.size === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
                Нет доступных ссылок на просчёт
              </div>
            ) : (
              Array.from(availableByProject.entries()).map(([projectId, links]) =>
                renderProjectCard(projectId, links, true)
              )
            )
          ) : (
            myByProject.size === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
                Нет ссылок в работе
              </div>
            ) : (
              Array.from(myByProject.entries()).map(([projectId, links]) =>
                renderProjectCard(projectId, links, false)
              )
            )
          )}
        </div>
      </div>

      {/* Calc Modal */}
      {calcModal.open && calcModal.link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCalcModal({ open: false, link: null, isAvailable: false })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {calcModal.isAvailable ? 'Взять и просчитать' : 'Просчёт ссылки'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]" title={calcModal.link.url}>
                  {calcModal.link.url}
                </p>
              </div>
              <button
                onClick={() => setCalcModal({ open: false, link: null, isAvailable: false })}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Клиент', value: getClientName(calcModal.link.clientId) },
                  { label: 'Проект', value: getProjectName(calcModal.link.projectId) },
                  { label: 'Гео', value: calcModal.link.geo ? calcModal.link.geo.split(',')[0] : '—' },
                  { label: 'Тип', value: calcModal.link.type === 'удаление+деиндексация' ? 'Удал+деинд' : calcModal.link.type },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Work type */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Тип работы</label>
                <div className="flex gap-2 flex-wrap">
                  {(['удаление', 'деиндексация', 'удаление+деиндексация'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setWorkType(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                        workType === t
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'удаление+деиндексация' ? 'Удаление + Деиндексация' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Probability */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Вероятность успеха</h4>
                <div className="relative">
                  <select
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                  >
                    {probOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Единая вероятность для выбранного типа работы</p>
              </div>

              {/* Cost */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-800">Стоимость</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setCostMode('separate')}
                        className={`px-3 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${costMode === 'separate' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        По ПС
                      </button>
                      <button
                        onClick={() => setCostMode('total')}
                        className={`px-3 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${costMode === 'total' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        Общая
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                      >
                        {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {costMode === 'separate' ? (
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Google', value: costGoogle, setter: setCostGoogle },
                      { label: 'Яндекс', value: costYandex, setter: setCostYandex },
                      { label: 'Bing', value: costBing, setter: setCostBing },
                    ].map((se) => (
                      <div key={se.label} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-gray-600 w-16">{se.label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            value={se.value}
                            onChange={(e) => se.setter(Number(e.target.value))}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                            min={0}
                          />
                          <span className="text-xs text-gray-400 whitespace-nowrap">{currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Общая сумма</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={totalCost}
                        onChange={(e) => setTotalCost(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                        min={0}
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{currency}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Срок + приоритет */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Сроки (дней)</h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">От</div>
                        <input
                          type="number"
                          value={daysMin}
                          onChange={(e) => setDaysMin(Number(e.target.value))}
                          min={1}
                          max={365}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">До</div>
                        <input
                          type="number"
                          value={daysMax}
                          onChange={(e) => setDaysMax(Number(e.target.value))}
                          min={1}
                          max={365}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Приоритет важности</h4>
                    <div className="relative">
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                      >
                        {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Определяет очерёдность выполнения</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Комментарий для управления
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация, уточнения по ссылке..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">{notes.length}/500</div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCalcModal({ open: false, link: null, isAvailable: false })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmitCalc}
                  className="flex-1 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-check-double-line mr-1.5" />
                  {calcModal.isAvailable ? 'Взять и отправить просчёт' : 'Отправить просчёт'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}