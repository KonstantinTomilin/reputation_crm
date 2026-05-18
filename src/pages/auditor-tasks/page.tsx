import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useRoleScope } from '@/hooks/useRoleScope';
import type { CRMLink } from '@/mocks/crm';
import BulkAddLinksModal from './components/BulkAddLinksModal';
import StartAuditModal from './components/StartAuditModal';

export default function AuditorTasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [geoFilter, setGeoFilter] = useState<string>('all');
  const [activeLink, setActiveLink] = useState<CRMLink | null>(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const crm = useCRM();
  const scope = useRoleScope();
  const linksList = scope.links;

  // Комментарии для модалки просмотра
  const [newComment, setNewComment] = useState('');

  const uniqueGeos = Array.from(
    new Set(linksList.map((l) => (l.geo ? l.geo.split(',')[0] : null)).filter(Boolean))
  ) as string[];

  const filtered = linksList.filter((l) => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchClient = clientFilter === 'all' || String(l.clientId) === clientFilter;
    const matchGeo = geoFilter === 'all' || (l.geo ? l.geo.split(',')[0] === geoFilter : false);
    return matchStatus && matchClient && matchGeo;
  });

  const getProjectName = (projectId: number) => crm.projects.find((p) => p.id === projectId)?.name || '—';
  const getClientName = (clientId: number) => crm.users.find((u) => u.id === clientId && u.role === 'client')?.fullName || '—';

  const openViewModal = (link: CRMLink) => {
    setActiveLink(link);
    setNewComment('');
    setViewModalOpen(true);
  };

  const openStartModal = (link: CRMLink) => {
    setActiveLink(link);
    setStartModalOpen(true);
  };

  const handleStartAudit = (comment: string) => {
    if (activeLink) {
      const isRetake = activeLink.status === 'отклонено';
      const prefix = isRetake ? '[Аудитор повторно взял в работу]' : '[Аудитор начал работу]';
      crm.updateLink({
        ...activeLink,
        status: 'в аудите',
        startDate: new Date().toISOString().split('T')[0],
        comments: comment.trim()
          ? [
              ...activeLink.comments,
              {
                id: activeLink.comments.length + 1,
                author: 'Козлов Д.',
                authorRole: 'auditor',
                text: `${prefix}: ${comment.trim()}`,
                createdAt: new Date().toISOString().split('T')[0],
              },
            ]
          : [
              ...activeLink.comments,
              {
                id: activeLink.comments.length + 1,
                author: 'Козлов Д.',
                authorRole: 'auditor',
                text: prefix,
                createdAt: new Date().toISOString().split('T')[0],
              },
            ],
      });
      setStartModalOpen(false);
      setActiveLink(null);
    }
  };

  const handleSendToExecutor = () => {
    if (activeLink) {
      crm.updateLink({
        ...activeLink,
        status: 'на просчёт',
        endDate: new Date().toISOString().split('T')[0],
        comments: [
          ...activeLink.comments,
          {
            id: activeLink.comments.length + 1,
            author: 'Козлов Д.',
            authorRole: 'auditor',
            text: 'Аудитор собрал данные. Ссылка передана исполнителю на просчёт.',
            createdAt: new Date().toISOString().split('T')[0],
          },
        ],
      });
      setViewModalOpen(false);
      setActiveLink(null);
    }
  };

  const handleAddComment = () => {
    if (activeLink && newComment.trim()) {
      crm.updateLink({
        ...activeLink,
        comments: [
          ...activeLink.comments,
          {
            id: activeLink.comments.length + 1,
            author: 'Козлов Д.',
            authorRole: 'auditor',
            text: newComment.trim(),
            createdAt: new Date().toISOString().split('T')[0],
          },
        ],
      });
      setNewComment('');
    }
  };

  const statusOptions = [
    { value: 'all', label: 'Все статусы' },
    { value: 'новый', label: 'Новый' },
    { value: 'на просчёт', label: 'На просчёт' },
    { value: 'в аудите', label: 'В аудите' },
    { value: 'аудит выполнен', label: 'Аудит выполнен' },
    { value: 'отклонено', label: 'Отклонено' },
    { value: 'в работе', label: 'В работе' },
    { value: 'выполнено', label: 'Выполнено' },
    { value: 'отменено', label: 'Отменено' },
  ];

  return (
    <CRMLayout role="auditor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Задачи на аудит</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} ссылок</p>
          </div>

          {/* Filters + Bulk add */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-stack-line" />
              Массовое добавление
            </button>

            <div className="relative">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                <option value="all">Все клиенты</option>
                {crm.users.filter((u) => u.role === 'client').map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
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
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Всего ссылок', count: linksList.length, color: 'bg-slate-100 text-slate-600' },
            { label: 'В аудите', count: linksList.filter((l) => l.status === 'в аудите').length, color: 'bg-amber-100 text-amber-700' },
            { label: 'На просчёт', count: linksList.filter((l) => l.status === 'на просчёт').length, color: 'bg-sky-100 text-sky-700' },
            { label: 'Аудит выполнен', count: linksList.filter((l) => l.status === 'аудит выполнен').length, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Отклонено', count: linksList.filter((l) => l.status === 'отклонено').length, color: 'bg-rose-100 text-rose-700' },
            { label: 'Повторно взято', count: linksList.filter((l) => l.status === 'в аудите' && l.comments.some((c) => c.text.includes('повторно') || c.text.includes('Повторный'))).length, color: 'bg-amber-100 text-amber-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
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
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-sm text-blue-900 hover:text-blue-800 truncate max-w-[200px] block"
                        title={link.url}
                      >
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
                          onClick={() => openViewModal(link)}
                          className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Открыть
                        </button>
                        {link.status !== 'в аудите' && (
                          <button
                            onClick={() => openStartModal(link)}
                            className="px-2.5 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {link.status === 'новый' ? 'Начать' : link.status === 'отклонено' ? 'Повторно взять' : 'Повторно начать'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {viewModalOpen && activeLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">Детали ссылки</h3>
                <p className="text-xs text-gray-500 mt-0.5">{activeLink.url}</p>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
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

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Текущий статус:</span>
                <StatusBadge status={activeLink.status} />
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Комментарии</h4>
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto">
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
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    <i className="ri-add-line" />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                {activeLink.status === 'в аудите' ? (
                  <button
                    onClick={handleSendToExecutor}
                    className="flex-1 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-send-plane-line mr-1.5" />
                    Передать на просчёт
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      setTimeout(() => openStartModal(activeLink), 50);
                    }}
                    className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line mr-1.5" />
                    Повторно начать аудит
                  </button>
                )}
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Audit Modal */}
      {startModalOpen && activeLink && (
        <StartAuditModal
          link={activeLink}
          clientName={getClientName(activeLink.clientId)}
          projectName={getProjectName(activeLink.projectId)}
          onClose={() => { setStartModalOpen(false); setActiveLink(null); }}
          onStart={handleStartAudit}
        />
      )}

      {/* Bulk Add Modal */}
      {bulkModalOpen && (
        <BulkAddLinksModal
          onClose={() => setBulkModalOpen(false)}
          onAdded={() => undefined}
        />
      )}
    </CRMLayout>
  );
}
