import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import StatusBadge from '@/components/base/StatusBadge';
import type { CRMClient, CRMProject, CRMLink } from '@/mocks/crm';

interface Props {
  client: CRMClient;
  onClose: () => void;
  onProjectClick: (projectId: number) => void;
}

export default function ClientProjectsModal({ client, onClose, onProjectClick }: Props) {
  const crm = useCRM();
  const [tab, setTab] = useState<'info' | 'projects'>('projects');

  const clientProjects: CRMProject[] = useMemo(
    () => crm.projects.filter((p) => p.clientId === client.id),
    [crm.projects, client.id]
  );

  const clientLinks: CRMLink[] = useMemo(
    () => crm.links.filter((l) => l.clientId === client.id),
    [crm.links, client.id]
  );

  const getProjectLinksCount = (projectId: number) =>
    clientLinks.filter((l) => l.projectId === projectId).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 truncate">{client.companyName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {clientProjects.length} проектов · {clientLinks.length} ссылок · Валюта: {client.currency || 'RUB'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer shrink-0 ml-3"
          >
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab('info')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                tab === 'info'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="ri-information-line mr-1" />
              Информация
            </button>
            <button
              onClick={() => setTab('projects')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                tab === 'projects'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className="ri-folder-line mr-1" />
              Проекты
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-500 text-white text-[10px] font-bold">
                {clientProjects.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'info' ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Проектов', value: clientProjects.length, color: 'bg-gray-100 text-gray-700' },
                  { label: 'Всего ссылок', value: clientLinks.length, color: 'bg-slate-50 text-blue-800' },
                  { label: 'В работе', value: clientLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе').length, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Задолженность', value: `${client.totalDebt.toLocaleString('ru')} ${client.currency || 'RUB'}`, color: client.totalDebt > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-[10px] font-semibold mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Компания</label>
                <div className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-800">{client.companyName}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Контакты</label>
                <div className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-800">{client.contacts}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Статус</label>
                <StatusBadge status={client.status} type="project" />
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="whitespace-nowrap">
                  Валюта: <strong className="text-gray-700">{client.currency || 'RUB'}</strong>
                </span>
                <span className="whitespace-nowrap">
                  Задолженность: <strong className={client.totalDebt > 0 ? 'text-red-600' : 'text-emerald-600'}>{client.totalDebt.toLocaleString('ru')} {client.currency || 'RUB'}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {clientProjects.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                  У этого клиента пока нет проектов
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Проект</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ссылок</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">В работе</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Удалено</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Успех %</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Валюта</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Дедлайн</th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {clientProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{project.name}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={project.status} type="project" />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">
                            {getProjectLinksCount(project.id)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 font-semibold text-center">
                            {project.inProgress}
                          </td>
                          <td className="px-4 py-3 text-sm text-emerald-600 font-semibold text-center">
                            {project.removed}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-slate-500 h-1.5 rounded-full"
                                  style={{ width: `${project.successRate}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700">{project.successRate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{project.currency}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{project.deadline || '—'}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onProjectClick(project.id)}
                              className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-links-line mr-1" />
                              Ссылки
                            </button>
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
      </div>
    </div>
  );
}