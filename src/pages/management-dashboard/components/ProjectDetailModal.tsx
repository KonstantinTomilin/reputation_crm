import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import StatusBadge from '@/components/base/StatusBadge';
import { formatMoney } from '@/lib/currency';
import type { CRMProject, ProjectStatus, CRMLink } from '@/mocks/crm';

interface Props {
  project: CRMProject;
  onClose: () => void;
  onSave: (updated: CRMProject) => void;
  onExportPdf?: (projectId: number) => void;
}

export default function ProjectDetailModal({ project, onClose, onSave, onExportPdf }: Props) {
  const crm = useCRM();
  const [tab, setTab] = useState<'info' | 'links'>('info');
  const [form, setForm] = useState({
    status: project.status as ProjectStatus,
    totalLinks: project.totalLinks,
    source: project.source || '',
    description: project.description,
  });

  const projectLinks: CRMLink[] = useMemo(
    () => crm.links.filter((l) => l.projectId === project.id),
    [crm.links, project.id]
  );

  const getExecutorName = (executorId: number | null) => {
    if (!executorId) return '—';
    const exec = crm.users.find((u) => u.id === executorId);
    return exec?.fullName || '—';
  };

  const handleSave = () => {
    onSave({ ...project, status: form.status, totalLinks: form.totalLinks, description: form.description, source: form.source });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{project.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{project.domain || '—'} · {project.currency}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onExportPdf && (
              <button
                type="button"
                onClick={() => onExportPdf(project.id)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg cursor-pointer whitespace-nowrap"
              >
                <i className="ri-file-pdf-line mr-1" />
                PDF отчёт
              </button>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
              <i className="ri-close-line text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab('info')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${tab === 'info' ? 'bg-slate-50 text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="ri-information-line mr-1" />
              Информация
            </button>
            <button
              onClick={() => setTab('links')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${tab === 'links' ? 'bg-slate-50 text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="ri-links-line mr-1" />
              Ссылки
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-blue-800 text-[10px] font-bold">
                {projectLinks.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'info' ? (
            <div className="flex flex-col gap-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Всего ссылок', value: projectLinks.length, color: 'bg-gray-100 text-gray-700' },
                  { label: 'В работе', value: projectLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе').length, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Удалено / Деинд.', value: projectLinks.filter((l) => ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'принято'].includes(l.status)).length, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Ожидают аудита', value: projectLinks.filter((l) => ['новый', 'ожидает аудита', 'в аудите', 'аудит выполнен'].includes(l.status)).length, color: 'bg-amber-50 text-amber-700' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-[10px] font-semibold mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Статус проекта</label>
                <div className="flex flex-wrap gap-2">
                  {(['новый', 'в работе', 'на паузе', 'завершён'] as ProjectStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                        form.status === s ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Количество ссылок (план)</label>
                <input
                  type="number"
                  value={form.totalLinks}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalLinks: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Описание / Заметки</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Источник</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                  placeholder="Telegram, сайт, рекомендация..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
                <p className="text-xs text-gray-400 mt-1">Откуда пришёл проект</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="whitespace-nowrap">Дата старта: <strong className="text-gray-700">{project.startDate || '—'}</strong></span>
                  <span className="whitespace-nowrap">Дедлайн: <strong className="text-gray-700">{project.deadline || '—'}</strong></span>
                  <span className="whitespace-nowrap">Менеджер: <strong className="text-gray-700">{project.manager || '—'}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="whitespace-nowrap">Успех: <strong className="text-gray-700">{project.successRate}%</strong></span>
                  <span className="whitespace-nowrap">В работе: <strong className="text-blue-600">{project.inProgress}</strong></span>
                  <span className="whitespace-nowrap">Удалено: <strong className="text-emerald-600">{project.removed}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {projectLinks.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                  В этом проекте пока нет ссылок
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">№</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">URL</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Тип</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Гео</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Исполнитель</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Стоимость</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Оплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {projectLinks.map((link) => (
                        <tr key={link.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{link.id}</td>
                          <td className="px-4 py-3">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-xs text-blue-900 hover:text-blue-800 hover:underline truncate max-w-[220px] block"
                              title={link.url}
                            >
                              {link.url}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                              link.type === 'удаление'
                                ? 'bg-red-100 text-red-700'
                                : link.type === 'деиндексация'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-slate-100 text-blue-800'
                            }`}>
                              {link.type === 'удаление+деиндексация' ? 'Удал+деинд' : link.type}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={link.status} type="link" /></td>
                          <td className="px-4 py-3 text-xs text-gray-500">{link.geo ? link.geo.split(',')[0] : '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{getExecutorName(link.executorId)}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">{formatMoney(link.clientCost, project.currency)}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const p = link.clientPaymentStatus ?? (link.clientPaid ? 'paid' : 'unpaid');
                              if (p === 'paid') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                                    <i className="ri-checkbox-circle-line" /> Опл.
                                  </span>
                                );
                              }
                              if (p === 'partially_paid') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                                    <i className="ri-time-line" /> Частично
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium">
                                  <i className="ri-close-circle-line" /> Нет
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {tab === 'info' && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-save-line mr-1" />
              Сохранить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}