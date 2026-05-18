import { useState, useMemo } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatMoney, normalizeCurrency } from '@/lib/currency';
import type { CRMAudit, CRMLink } from '@/mocks/crm';

export type AuditReviewStatus = 'на согласовании' | 'согласовано' | 'отправлено клиенту' | 'отклонён';

interface AuditWithMeta {
  audit: CRMAudit;
  link?: CRMLink;
  reviewStatus: AuditReviewStatus;
  source: 'аудитор' | 'исполнитель';
}

interface Props {
  linksList: CRMLink[];
  onUpdateLink: (link: CRMLink) => void;
  onAddComment: (linkId: number, text: string) => void;
  onGenerateReport: () => void;
}

export default function AuditsTab({ linksList, onUpdateLink, onAddComment, onGenerateReport }: Props) {
  const crm = useCRM();
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    audit?: AuditWithMeta;
    action: 'approve' | 'reject';
    comment: string;
  }>({ open: false, action: 'approve', comment: '' });

  const [auditFilter, setAuditFilter] = useState<AuditReviewStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'аудитор' | 'исполнитель'>('all');
  const [search, setSearch] = useState('');

  // Client report modal
  const [clientReportModal, setClientReportModal] = useState<{ open: boolean; audit?: AuditWithMeta }>({ open: false });

  const enrichedAudits = useMemo(() => {
    return crm.audits.map((audit) => {
      const link = linksList.find((l) => l.id === audit.linkId);
      let reviewStatus: AuditReviewStatus = 'на согласовании';
      let source: 'аудитор' | 'исполнитель' = 'аудитор';

      if (link) {
        const auditorUser = crm.users.find((u) => u.id === audit.auditorId);
        if (auditorUser?.role === 'executor') {
          source = 'исполнитель';
        }

        if (link.status === 'согласовано') {
          reviewStatus = 'согласовано';
        } else if (link.status === 'отправлено клиенту') {
          reviewStatus = 'отправлено клиенту';
        } else if (link.status === 'отклонено') {
          reviewStatus = 'отклонён';
        } else if (link.status === 'просчёт выполнен') {
          reviewStatus = 'на согласовании';
        } else if (link.status === 'на просчёт') {
          reviewStatus = 'на согласовании';
        }
      }
      return { audit, link, reviewStatus, source };
    });
  }, [crm.audits, crm.users, linksList]);

  const filtered = enrichedAudits.filter((item) => {
    const matchStatus = auditFilter === 'all' || item.reviewStatus === auditFilter;
    const matchProject = projectFilter === 'all' || String(item.link?.projectId) === projectFilter;
    const matchSource = sourceFilter === 'all' || item.source === sourceFilter;
    const matchSearch = !search || item.link?.url.toLowerCase().includes(search.toLowerCase()) || false;
    return matchStatus && matchProject && matchSource && matchSearch;
  });

  const stats = {
    total: enrichedAudits.length,
    pending: enrichedAudits.filter((a) => a.reviewStatus === 'на согласовании').length,
    approved: enrichedAudits.filter((a) => a.reviewStatus === 'согласовано').length,
    sentToClient: enrichedAudits.filter((a) => a.reviewStatus === 'отправлено клиенту').length,
    rejected: enrichedAudits.filter((a) => a.reviewStatus === 'отклонён').length,
    fromExecutor: enrichedAudits.filter((a) => a.source === 'исполнитель').length,
    fromAuditor: enrichedAudits.filter((a) => a.source === 'аудитор').length,
  };

  const handleApprove = (meta: AuditWithMeta) => {
    if (meta.link) {
      onUpdateLink({ ...meta.link, status: 'согласовано' });
      if (meta.audit) {
        crm.updateAudit(meta.audit);
      }
    }
    setReviewModal({ open: false, action: 'approve', comment: '' });
  };

  const handleReject = (meta: AuditWithMeta, comment: string) => {
    if (meta.link) {
      onUpdateLink({ ...meta.link, status: 'отклонено' });
      if (comment.trim()) {
        onAddComment(meta.link.id, `[Просчёт отклонён]: ${comment.trim()}`);
      }
    }
    setReviewModal({ open: false, action: 'reject', comment: '' });
  };

  const handleSendToClient = (meta: AuditWithMeta) => {
    if (meta.link) {
      onUpdateLink({ ...meta.link, status: 'отправлено клиенту' });
    }
    setClientReportModal({ open: false });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'критичный': return 'bg-red-100 text-red-700';
      case 'высокий': return 'bg-orange-100 text-orange-700';
      case 'средний': return 'bg-amber-100 text-amber-700';
      case 'низкий': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Всего аудитов', count: stats.total, color: 'bg-slate-100 text-slate-700' },
          { label: 'На согласовании', count: stats.pending, color: 'bg-amber-100 text-amber-700' },
          { label: 'Согласовано', count: stats.approved, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Отправлено клиенту', count: stats.sentToClient, color: 'bg-slate-100 text-blue-800' },
          { label: 'Отклонено', count: stats.rejected, color: 'bg-rose-100 text-rose-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Source summary */}
      <div className="flex gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-50 text-blue-800">
          <i className="ri-user-voice-line" /> От аудитора: {stats.fromAuditor}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
          <i className="ri-user-star-line" /> От исполнителя: {stats.fromExecutor}
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск по URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={auditFilter}
          onChange={(e) => setAuditFilter(e.target.value as AuditReviewStatus | 'all')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все статусы аудита</option>
          <option value="на согласовании">На согласовании</option>
          <option value="согласовано">Согласовано</option>
          <option value="отправлено клиенту">Отправлено клиенту</option>
          <option value="отклонён">Отклонён</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as 'all' | 'аудитор' | 'исполнитель')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все источники</option>
          <option value="аудитор">Аудитор</option>
          <option value="исполнитель">Исполнитель</option>
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все проекты</option>
          {crm.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={onGenerateReport}
          className="px-3 py-2 bg-slate-50 text-blue-800 text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ml-auto"
        >
          <i className="ri-file-chart-line" />
          Отчёт по аудитам
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Аудиты</h2>
          <span className="text-xs text-gray-400">{filtered.length} записей</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Источник</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Приоритет</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Удал.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Деинд.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Срок</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Стоимость</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Автор</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ audit, link, reviewStatus, source }) => {
                const project = crm.projects.find((p) => p.id === link?.projectId);
                const client = crm.users.find((u) => u.id === link?.clientId && u.role === 'client');
                const author = crm.users.find((u) => u.id === audit.auditorId);
                const totalCost = Object.values(audit.costPerSE).reduce((a, b) => a + b, 0);
                return (
                  <tr key={audit.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">#{audit.id}</td>
                    <td className="px-4 py-3 text-sm text-blue-900 truncate max-w-[200px]">{link?.url || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{project?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                        source === 'исполнитель'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-blue-800'
                      }`}>
                        {source === 'исполнитель' ? 'Исполнитель' : 'Аудитор'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={reviewStatus} type="link" />
                    </td>
                    <td className="px-4 py-3">
                      {audit.priority ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${getPriorityColor(audit.priority)}`}>
                          {audit.priority}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${audit.removalProbability >= 60 ? 'bg-emerald-500' : audit.removalProbability >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${audit.removalProbability}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{audit.removalProbability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${audit.deindexProbability >= 60 ? 'bg-emerald-500' : audit.deindexProbability >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${audit.deindexProbability}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{audit.deindexProbability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{audit.removalDaysEstimate || audit.deindexDaysEstimate} дн</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatMoney(totalCost, normalizeCurrency(audit.currency || undefined))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{author?.fullName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {reviewStatus === 'на согласовании' && (
                          <>
                            <button
                              onClick={() => handleApprove({ audit, link, reviewStatus, source })}
                              className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-semibold rounded hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Принять
                            </button>
                            <button
                              onClick={() => setReviewModal({ open: true, audit: { audit, link, reviewStatus, source }, action: 'reject', comment: '' })}
                              className="px-2 py-1 bg-red-600 text-white text-[10px] font-semibold rounded hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Отклонить
                            </button>
                          </>
                        )}
                        {reviewStatus === 'согласовано' && (
                          <button
                            onClick={() => setClientReportModal({ open: true, audit: { audit, link, reviewStatus, source } })}
                            className="px-2 py-1 bg-blue-900 text-white text-[10px] font-semibold rounded hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Отчёт для клиента
                          </button>
                        )}
                        {reviewStatus === 'отправлено клиенту' && (
                          <span className="text-xs text-blue-900"><i className="ri-send-plane-line" /> Отправлено</span>
                        )}
                        {reviewStatus === 'отклонён' && (
                          <span className="text-xs text-red-500"><i className="ri-close-line" /> Возвращено</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      {reviewModal.open && reviewModal.audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReviewModal({ open: false, action: 'reject', comment: '' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Отклонить просчёт</h3>
              <button onClick={() => setReviewModal({ open: false, action: 'reject', comment: '' })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-600">URL: <span className="font-semibold text-gray-800">{reviewModal.audit.link?.url || '—'}</span></p>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Комментарий <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Укажите причину отклонения..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">{reviewModal.comment.length}/500</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewModal({ open: false, action: 'reject', comment: '' })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleReject(reviewModal.audit, reviewModal.comment)}
                  disabled={!reviewModal.comment.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
                >
                  <i className="ri-close-line mr-1" />
                  Отклонить и отправить комментарий
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client report modal */}
      {clientReportModal.open && clientReportModal.audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setClientReportModal({ open: false })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Отчёт для клиента</h3>
              <button onClick={() => setClientReportModal({ open: false })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {clientReportModal.audit.link && (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
                    <div className="text-sm font-semibold text-gray-800">{clientReportModal.audit.link.url}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="text-gray-400">Тип работы:</span> {clientReportModal.audit.audit.workType || clientReportModal.audit.link.type}</div>
                      <div><span className="text-gray-400">Приоритет:</span> {clientReportModal.audit.audit.priority || '—'}</div>
                      <div><span className="text-gray-400">Вероятность удаления:</span> {clientReportModal.audit.audit.removalProbability}%</div>
                      <div><span className="text-gray-400">Вероятность деиндексации:</span> {clientReportModal.audit.audit.deindexProbability}%</div>
                      <div><span className="text-gray-400">Срок:</span> {clientReportModal.audit.audit.removalDaysEstimate} дн</div>
                      <div><span className="text-gray-400">Стоимость:</span> {formatMoney(Object.values(clientReportModal.audit.audit.costPerSE).reduce((a, b) => a + b, 0), normalizeCurrency(clientReportModal.audit.audit.currency || undefined))}</div>
                    </div>
                  </div>

                  {/* SE breakdown */}
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Стоимость по поисковым системам</div>
                    <div className="flex flex-col gap-1 text-sm text-gray-700">
                      {[
                        { label: 'Google', value: clientReportModal.audit.audit.costPerSE.google },
                        { label: 'Яндекс', value: clientReportModal.audit.audit.costPerSE.yandex },
                        { label: 'Bing', value: clientReportModal.audit.audit.costPerSE.bing },
                      ].filter((se) => se.value > 0).map((se) => (
                        <div key={se.label} className="flex justify-between py-1 border-b border-gray-100">
                          <span>{se.label}</span>
                          <span className="font-semibold">{formatMoney(se.value, normalizeCurrency(clientReportModal.audit.audit.currency || undefined))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {clientReportModal.audit.audit.notes && (
                    <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <span className="font-semibold text-amber-700">Комментарий исполнителя:</span> {clientReportModal.audit.audit.notes}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setClientReportModal({ open: false })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Закрыть
                </button>
                <button
                  onClick={() => handleSendToClient(clientReportModal.audit)}
                  className="flex-1 px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-send-plane-line mr-1" />
                  Отправить клиенту
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}