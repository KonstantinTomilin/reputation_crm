import { useState, useMemo } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import type { CRMLink, WorkType, SearchEngineFlags } from '@/mocks/crm';

const COUNTRIES = [
  'Россия','Украина','Казахстан','Беларусь','Азербайджан',
  'Грузия','Армения','Молдова','Турция','Киргизия'
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'в аудите', label: 'В аудите' },
  { value: 'новый', label: 'Новые' },
  { value: 'аудит выполнен', label: 'Аудит выполнен' },
  { value: 'отклонено', label: 'Отклонено' },
];

export default function AuditorActivePage() {
  const crm = useCRM();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [geoFilter, setGeoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeLink, setActiveLink] = useState<CRMLink | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'finish' | 'retake'>('view');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Retake form state
  const [retakeUrl, setRetakeUrl] = useState('');
  const [retakeType, setRetakeType] = useState<WorkType>('удаление');
  const [retakeGeo, setRetakeGeo] = useState('Россия');
  const [retakeSE, setRetakeSE] = useState<SearchEngineFlags>({ google: true, yandex: false, bing: false, yahoo: false });
  const [retakeComment, setRetakeComment] = useState('');

  // Form state
  const [newUrl, setNewUrl] = useState('');
  const [newClientId, setNewClientId] = useState<number>(crm.users.find((u) => u.role === 'client')?.id ?? 0);
  const [newProjectId, setNewProjectId] = useState<number>(crm.projects[0]?.id ?? 0);
  const [newType, setNewType] = useState<WorkType>('удаление');
  const [newGeo, setNewGeo] = useState('Россия');
  const [newSE, setNewSE] = useState<SearchEngineFlags>({ google: true, yandex: false, bing: false, yahoo: false });
  const [newComment, setNewComment] = useState('');
  const [newRecipient, setNewRecipient] = useState<'management' | 'executor'>('management');

  const clients = useMemo(() => crm.users.filter((u) => u.role === 'client'), [crm.users]);
  const clientProjects = useMemo(
    () => crm.projects.filter((p) => p.clientId === Number(newClientId)),
    [crm.projects, newClientId]
  );

  // Все ссылки аудитора: в аудите, новые, аудит выполнен, или отклонённые для повторной работы
  const auditorLinks = useMemo(() => {
    return crm.links.filter(
      (l) =>
        l.status === 'в аудите' ||
        l.status === 'новый' ||
        l.status === 'аудит выполнен' ||
        l.status === 'отклонено'
    );
  }, [crm.links, tick]);

  const uniqueGeos = Array.from(
    new Set(auditorLinks.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))
  ) as string[];

  const filtered = auditorLinks.filter((l) => {
    const matchSearch =
      searchQuery === '' ||
      l.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProjectName(l.projectId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchProject = projectFilter === 'all' || String(l.projectId) === projectFilter;
    const matchGeo = geoFilter === 'all' || (l.geo ? l.geo.split(',')[0] === geoFilter : false);
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchProject && matchGeo && matchStatus;
  });

  const getProjectName = (projectId: number) =>
    crm.projects.find((p) => p.id === projectId)?.name || '—';
  const getClientName = (clientId: number) =>
    crm.users.find((u) => u.id === clientId && u.role === 'client')?.fullName || '—';
  const getAudit = (linkId: number) => crm.audits.find((a) => a.linkId === linkId);

  const openAuditModal = (link: CRMLink, mode: 'view' | 'finish' | 'retake') => {
    setActiveLink(link);
    setModalMode(mode);
    if (mode === 'retake') {
      setRetakeUrl(link.url);
      setRetakeType(link.type);
      setRetakeGeo(link.geo ? link.geo.split(',')[0] : 'Россия');
      setRetakeSE({ ...link.targetSE });
      setRetakeComment('');
    }
    setModalOpen(true);
  };

  const handleFinishAudit = () => {
    if (activeLink) {
      crm.changeLinkStatus(activeLink.id, 'аудит выполнен');
      setModalOpen(false);
      setActiveLink(null);
    }
  };

  const handleRetakeAudit = () => {
    if (!activeLink) return;
    const today = new Date().toISOString().split('T')[0];
    crm.setLinks((prev) =>
      prev.map((l) =>
        l.id === activeLink.id
          ? {
              ...l,
              url: retakeUrl,
              type: retakeType,
              geo: retakeGeo,
              targetSE: { ...retakeSE },
              status: 'новый',
              startDate: null,
              endDate: null,
              comments: [
                ...l.comments,
                {
                  id: l.comments.length + 1,
                  author: 'Козлов Д.',
                  authorRole: 'auditor' as const,
                  text: retakeComment.trim()
                    ? `[Повторный аудит]: ${retakeComment.trim()}`
                    : '[Повторный аудит]: аудитор повторно взял ссылку в работу',
                  createdAt: today,
                },
              ],
            }
          : l
      )
    );
    setTick((t) => t + 1);
    setModalOpen(false);
    setActiveLink(null);
  };

  const handleAddLink = () => {
    const recipientLabel = newRecipient === 'management' ? 'В управление' : 'Исполнителю';
    crm.addLink({
      url: newUrl,
      clientId: Number(newClientId),
      projectId: Number(newProjectId),
      type: newType,
      targetSE: { ...newSE },
      status: 'новый',
      addedDate: new Date().toISOString().split('T')[0],
      startDate: null,
      endDate: null,
      deadline: null,
      quarantineDays: 0,
      quarantineEndDate: null,
      executorId: null,
      auditorId: 9,
      clientCost: 0,
      executorCost: 0,
      clientPaid: false,
      clientPaidDate: null,
      clientPaidAmount: null,
      executorPaid: false,
      executorPaidDate: null,
      executorPaidAmount: null,
      comments: [
        {
          id: Date.now(),
          author: 'Козлов Д.',
          authorRole: 'auditor',
          text: `Аудитор добавил ссылку и направил на просчет: ${recipientLabel}. ${newComment}`,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ],
      proofsFolder: null,
      proofFiles: [],
      geo: newGeo,
    });
    setTick((t) => t + 1);
    setAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewUrl('');
    setNewClientId(crm.users.find((u) => u.role === 'client')?.id ?? 0);
    setNewProjectId(crm.projects[0]?.id ?? 0);
    setNewType('удаление');
    setNewGeo('Россия');
    setNewSE({ google: true, yandex: false, bing: false, yahoo: false });
    setNewComment('');
    setNewRecipient('management');
  };

  const isAddFormValid = newUrl.trim().length > 0;

  return (
    <CRMLayout role="auditor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Ссылки в аудите</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ссылок</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-add-line" />
              Добавить ссылку
            </button>
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                <option value="all">Все проекты</option>
                {crm.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input
                list="geo-list"
                value={geoFilter === 'all' ? '' : geoFilter}
                onChange={(e) => setGeoFilter(e.target.value || 'all')}
                placeholder="Все страны"
                className="bg-white border border-slate-200 rounded-lg pl-3 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 w-40"
              />
              <datalist id="geo-list">
                {uniqueGeos.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          </div>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Гео</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дедлайн</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действие</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((link: CRMLink) => (
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
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                        link.type === 'удаление' ? 'bg-red-100 text-red-700' :
                        link.type === 'деиндексация' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {link.type === 'удаление+деиндексация' ? 'Удал+деинд' : link.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{(link.geo ? link.geo.split(',')[0] : '—')}</td>
                    <td className="px-4 py-3"><StatusBadge status={link.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{link.deadline || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openAuditModal(link, 'view')}
                          className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Открыть
                        </button>
                        {link.status === 'в аудите' && (
                          <button
                            onClick={() => openAuditModal(link, 'finish')}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Закончить аудит
                          </button>
                        )}
                        {link.status === 'отклонено' && (
                          <button
                            onClick={() => openAuditModal(link, 'retake')}
                            className="px-2.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Повторно начать
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-sm text-gray-400 text-center">
                      Ссылки не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View / Finish / Retake Modal */}
      {modalOpen && activeLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {modalMode === 'retake' ? 'Повторный аудит' : modalMode === 'finish' ? 'Завершить аудит' : 'Аудит ссылки'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{activeLink.url}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Info cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Клиент', value: getClientName(activeLink.clientId) },
                  { label: 'Проект', value: getProjectName(activeLink.projectId) },
                  { label: 'Тип работы', value: activeLink.type === 'удаление+деиндексация' ? 'Удал+деинд' : activeLink.type },
                  { label: 'Гео', value: (activeLink.geo ? activeLink.geo.split(',')[0] : '—') },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3 min-w-0">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Retake form */}
              {modalMode === 'retake' && (
                <div className="flex flex-col gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                  <h4 className="text-sm font-bold text-gray-800">Изменить параметры</h4>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">URL</label>
                    <input
                      type="url"
                      value={retakeUrl}
                      onChange={(e) => setRetakeUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Тип работы</label>
                      <div className="relative">
                        <select
                          value={retakeType}
                          onChange={(e) => setRetakeType(e.target.value as WorkType)}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                        >
                          <option value="удаление">Удаление</option>
                          <option value="деиндексация">Деиндексация</option>
                          <option value="удаление+деиндексация">Удаление + Деиндексация</option>
                        </select>
                        <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Гео</label>
                      <input
                        list="geo-list-retake"
                        value={retakeGeo}
                        onChange={(e) => setRetakeGeo(e.target.value)}
                        placeholder="Введите страну"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                      />
                      <datalist id="geo-list-retake">
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-2 block">Целевые поисковые системы</label>
                    <div className="flex flex-wrap gap-4">
                      {(['google','yandex','bing','yahoo'] as const).map((se) => (
                        <label key={se} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retakeSE[se]}
                            onChange={(e) => setRetakeSE((prev) => ({ ...prev, [se]: e.target.checked }))}
                            className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-900 cursor-pointer"
                          />
                          <span className="text-sm text-gray-700 capitalize">{se === 'google' ? 'Google' : se === 'yandex' ? 'Яндекс' : se === 'bing' ? 'Bing' : 'Yahoo'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Комментарий к повторному аудиту</label>
                    <textarea
                      value={retakeComment}
                      onChange={(e) => setRetakeComment(e.target.value)}
                      placeholder="Причина повторного аудита, что изменилось..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400 resize-none"
                    />
                    <div className="text-[10px] text-gray-400 text-right mt-0.5">{retakeComment.length}/500</div>
                  </div>
                </div>
              )}

              {/* Probabilities - hidden in retake */}
              {modalMode !== 'retake' && (
                <div className="bg-slate-50 rounded-xl p-5">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Вероятности и стоимость</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Вероятность удаления</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white rounded-full h-2.5">
                          <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${getAudit(activeLink.id)?.removalProbability || 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-emerald-700">{getAudit(activeLink.id)?.removalProbability || 0}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Вероятность деиндексации</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white rounded-full h-2.5">
                          <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${getAudit(activeLink.id)?.deindexProbability || 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-amber-700">{getAudit(activeLink.id)?.deindexProbability || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost & Timeline - hidden in retake */}
              {modalMode !== 'retake' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Стоимость по ПС</h4>
                    <div className="flex flex-col gap-2">
                      {[
                        { ps: 'Google', cost: activeLink.clientCost },
                        { ps: 'Яндекс', cost: Math.round(activeLink.clientCost * 0.9) },
                        { ps: 'Bing', cost: Math.round(activeLink.clientCost * 0.8) },
                      ].map((s) => (
                        <div key={s.ps} className="flex justify-between text-sm">
                          <span className="text-gray-600">{s.ps}</span>
                          <span className="font-semibold text-gray-800">{s.cost.toLocaleString('ru')} ₽ <span className="text-gray-400 font-normal">(~{Math.round(s.cost / 85).toLocaleString('ru')} $)</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Сроки (дней)</h4>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Удаление', min: 14, max: 30 },
                        { label: 'Деиндексация', min: 21, max: 60 },
                        { label: 'Удаление + Деиндексация', min: 30, max: 90 },
                      ].map((t) => (
                        <div key={t.label} className="flex justify-between text-sm">
                          <span className="text-gray-600">{t.label}</span>
                          <span className="font-semibold text-gray-800">{t.min} — {t.max}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Комментарии</h4>
                <div className="flex flex-col gap-2.5">
                  {activeLink.comments.length > 0 ? activeLink.comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                        <span className="text-[10px] text-gray-400">{c.createdAt}</span>
                      </div>
                      <div className="text-sm text-gray-600">{c.text}</div>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-400 text-center py-4">Комментариев пока нет</div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                {modalMode === 'finish' ? (
                  <>
                    <button
                      onClick={handleFinishAudit}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-check-line mr-1.5" />
                      Завершить аудит
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 border border-slate-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Отмена
                    </button>
                  </>
                ) : modalMode === 'retake' ? (
                  <>
                    <button
                      onClick={handleRetakeAudit}
                      className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-refresh-line mr-1.5" />
                      Повторно начать аудит
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 border border-slate-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Закрыть
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Добавить найденную ссылку</h3>
              <button onClick={() => setAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* URL */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">URL ссылки</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/negative-page"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Client & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Клиент</label>
                  <div className="relative">
                    <select
                      value={newClientId}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setNewClientId(cid);
                        const firstProject = crm.projects.find((p) => p.clientId === cid);
                        setNewProjectId(firstProject?.id ?? 0);
                      }}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Проект</label>
                  <div className="relative">
                    <select
                      value={newProjectId}
                      onChange={(e) => setNewProjectId(Number(e.target.value))}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      {clientProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Type & Geo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Тип работы</label>
                  <div className="relative">
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as WorkType)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      <option value="удаление">Удаление</option>
                      <option value="деиндексация">Деиндексация</option>
                      <option value="удаление+деиндексация">Удаление + Деиндексация</option>
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Гео</label>
                  <input
                    list="geo-list-add"
                    value={newGeo}
                    onChange={(e) => setNewGeo(e.target.value)}
                    placeholder="Введите страну"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                  />
                  <datalist id="geo-list-add">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Target SE */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Целевые поисковые системы</label>
                <div className="flex flex-wrap gap-4">
                  {(['google','yandex','bing','yahoo'] as const).map((se) => (
                    <label key={se} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSE[se]}
                        onChange={(e) => setNewSE((prev) => ({ ...prev, [se]: e.target.checked }))}
                        className="w-4 h-4 text-blue-900 border-gray-300 rounded focus:ring-blue-900 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 capitalize">{se === 'google' ? 'Google' : se === 'yandex' ? 'Яндекс' : se === 'bing' ? 'Bing' : 'Yahoo'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Комментарий аудитора</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Описание ссылки, сложность, особенности площадки..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="text-[10px] text-gray-400 text-right mt-0.5">{newComment.length}/500</div>
              </div>

              {/* Recipient */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Направить на просчет</label>
                <div className="relative">
                  <select
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value as 'management' | 'executor')}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    <option value="management">В управление (просчет)</option>
                    <option value="executor">Исполнителю (просчет)</option>
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddLink}
                  disabled={!isAddFormValid}
                  className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    isAddFormValid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <i className="ri-send-plane-line mr-1.5" />
                  Направить на просчет
                </button>
                <button
                  onClick={() => { setAddModalOpen(false); resetForm(); }}
                  className="px-4 py-2.5 border border-slate-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}