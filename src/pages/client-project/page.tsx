import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import ClientLinksTable from './components/ClientLinksTable';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { useRoleScope } from '@/hooks/useRoleScope';
import { defaultProjectDeadline } from '@/lib/dateUtils';
import { formatMoney } from '@/lib/currency';

const tabs = ['Ссылки', 'Аудит', 'Отчёты'];

export default function ClientProjectPage() {
  const crm = useCRM();
  const scope = useRoleScope();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Ссылки');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditInput, setAuditInput] = useState('');
  const [auditSubmitted, setAuditSubmitted] = useState(false);

  const project = scope.projects.find((p) => p.id === Number(id)) || scope.projects[0];
  if (!project) {
    return (
      <CRMLayout role="client">
        <div className="p-6 text-sm text-gray-500">Проект не найден или недоступен.</div>
      </CRMLayout>
    );
  }
  const progress = Math.round(((project.removed) / project.totalLinks) * 100);
  const projectLinks = scope.links.filter((l) => l.projectId === project.id);
  const projectAudits = crm.audits.filter((a) => projectLinks.some((l) => l.id === a.linkId));

  const parseLinksFromText = (text: string): string[] => {
    const lines = text.split(/\n|\r/).map((l) => l.trim()).filter(Boolean);
    const urlRegex = /https?:\/\/[^\s]+/i;
    return lines.filter((line) => urlRegex.test(line));
  };

  const sendToAudit = () => {
    const urls = parseLinksFromText(auditInput);
    if (urls.length === 0) return;

    crm.setLinks((prev) => {
      const updated = [...prev];
      let nextId = Math.max(...updated.map((l) => l.id), 0) + 1;
      urls.forEach((url) => {
        const existing = updated.find((l) => l.url === url && l.projectId === project.id);
        if (existing) {
          const idx = updated.findIndex((l) => l.id === existing.id);
          updated[idx] = { ...existing, status: 'ожидает аудита' };
        } else {
          const newLink: CRMLink = {
            id: nextId++,
            url,
            clientId: project.clientId,
            projectId: project.id,
            type: 'удаление',
            targetSE: { google: true, yandex: false, bing: false, yahoo: false },
            status: 'ожидает аудита',
            addedDate: new Date().toISOString().split('T')[0],
            startDate: null,
            endDate: null,
            deadline: project.deadline || defaultProjectDeadline(),
            quarantineDays: 0,
            quarantineEndDate: null,
            executorId: null,
            auditorId: null,
            clientCost: 0,
            executorCost: 0,
            clientPaid: false,
            clientPaidDate: null,
            clientPaidAmount: null,
            executorPaid: false,
            executorPaidDate: null,
            executorPaidAmount: null,
            comments: [],
            proofsFolder: null,
            proofFiles: [],
          };
          updated.push(newLink);
        }
      });
      return updated;
    });

    crm.users
      .filter((u) => ['main_admin', 'admin', 'manager', 'leader'].includes(u.role))
      .forEach((u) => {
        crm.pushNotification({
          userId: u.id,
          role: 'management',
          title: 'Ссылки отправлены на аудит',
          message: `Клиент отправил ${urls.length} ссылок на аудит по проекту «${project.name}»`,
          link: '/management/audits',
          type: 'info',
        });
      });

    setAuditInput('');
    setShowAuditModal(false);
    setAuditSubmitted(true);
    setTimeout(() => setAuditSubmitted(false), 4000);
  };

  return (
    <CRMLayout role="client">
      <div className="p-5 md:p-7 flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-gray-400 font-medium">
          <button onClick={() => navigate('/client')} className="hover:text-blue-900 transition-colors cursor-pointer">
            Обзор
          </button>
          <div className="w-3.5 h-3.5 flex items-center justify-center text-gray-300">
            <i className="ri-arrow-right-s-line" />
          </div>
          <button onClick={() => navigate('/client/projects')} className="hover:text-blue-900 transition-colors cursor-pointer">
            Проекты
          </button>
          <div className="w-3.5 h-3.5 flex items-center justify-center text-gray-300">
            <i className="ri-arrow-right-s-line" />
          </div>
          <span className="text-gray-600 font-semibold">{project.name}</span>
        </div>

        {/* Success toast */}
        {auditSubmitted && (
          <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 flex-shrink-0">
              <i className="ri-checkbox-circle-line text-emerald-600 text-sm" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-800">Ссылки отправлены на аудит</div>
              <div className="text-xs text-emerald-600/80 mt-0.5">Аудитор получит уведомление и приступит к работе</div>
            </div>
          </div>
        )}

        {/* Project header card */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-6 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-800 tracking-tight">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 text-[12px] text-gray-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className="ri-calendar-line text-slate-500/80 text-xs" />
                  </div>
                  Начало: {project.startDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <i className="ri-flag-line text-slate-500/80 text-xs" />
                  </div>
                  Дедлайн: {project.deadline || '—'}
                </span>
              </div>
            </div>
            <StatusBadge status={project.status} type="project" size="md" />
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Прогресс по ссылкам</span>
              <span className="text-[11px] font-bold text-blue-900 tabular-nums">
                {project.removed} / {project.totalLinks} <span className="text-gray-300 font-normal">({progress}%)</span>
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-slate-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-5 mt-3 text-[12px] text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="font-bold text-blue-500">{project.inProgress}</span>
                <span className="text-gray-400">в работе</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-emerald-500">{project.removed}</span>
                <span className="text-gray-400">удалено</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <span className="font-bold text-gray-500">{project.totalLinks - project.inProgress - project.removed}</span>
                <span className="text-gray-400">не начато</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200/60 shadow-sm p-1 self-start">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'Ссылки' && <ClientLinksTable links={projectLinks} />}

        {activeTab === 'Аудит' && (
          <div className="flex flex-col gap-5">
            {/* Send to audit button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Аудит ссылок</h2>
                <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Проверка вероятности удаления и деиндексации</p>
              </div>
              <button
                onClick={() => setShowAuditModal(true)}
                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap shadow-sm hover:shadow-md"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-send-plane-line text-sm" />
                </div>
                Отправить на аудит
              </button>
            </div>

            {/* Completed audits table */}
            <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
              {projectAudits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left">URL</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Вероятность</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Срок удаления</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Срок деиндексации</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Стоимость Google</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Стоимость Яндекс</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Уровень риска</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left whitespace-nowrap">Дата аудита</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectAudits.map((audit) => {
                        const link = projectLinks.find((l) => l.id === audit.linkId);
                        return (
                          <tr key={audit.id} className="border-t border-gray-100/80 hover:bg-slate-50/30 transition-colors duration-150">
                            <td className="px-4 py-3 text-[11px] text-blue-900/90 font-mono truncate max-w-[200px]">
                              {link?.url || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={audit.probability === 'высокая' ? 'в работе' : audit.probability === 'средняя' ? 'на паузе' : 'не взято в работу'} />
                            </td>
                            <td className="px-4 py-3 text-[13px] text-gray-600">{audit.removalDaysEstimate > 0 ? `${audit.removalDaysEstimate} дн.` : '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600">{audit.deindexDaysEstimate > 0 ? `${audit.deindexDaysEstimate} дн.` : '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600 tabular-nums">{audit.costPerSE.google > 0 ? formatMoney(audit.costPerSE.google, project.currency) : '—'}</td>
                            <td className="px-4 py-3 text-[13px] text-gray-600 tabular-nums">{audit.costPerSE.yandex > 0 ? formatMoney(audit.costPerSE.yandex, project.currency) : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${
                                audit.riskLevel === 'низкий' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/60' :
                                audit.riskLevel === 'средний' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100/60' :
                                'bg-rose-50 text-rose-700 ring-1 ring-rose-100/60'
                              }`}>
                                {audit.riskLevel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-400">{audit.auditDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-file-search-line text-4xl text-slate-200" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Аудит будет доступен после завершения первичного анализа</p>
                </div>
              )}
            </div>

            {/* Links awaiting audit */}
            {projectLinks.filter((l) => ['ожидает аудита', 'в аудите', 'аудит выполнен'].includes(l.status)).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">Ссылки в процессе аудита</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80">
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">URL</th>
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Статус</th>
                        <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Дата отправки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectLinks
                        .filter((l) => ['ожидает аудита', 'в аудите', 'аудит выполнен'].includes(l.status))
                        .map((l) => (
                          <tr key={l.id} className="border-t border-gray-100/80 hover:bg-slate-50/30 transition-colors duration-150">
                            <td className="px-4 py-3 text-[11px] text-blue-900/90 font-mono truncate max-w-[300px]">{l.url}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={l.status} type="link" />
                            </td>
                            <td className="px-4 py-3 text-[11px] text-gray-400">{l.addedDate}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Отчёты' && (
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-12 text-center">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-chart-line text-5xl text-slate-200" />
            </div>
            <p className="text-sm text-gray-400 font-medium max-w-md mx-auto leading-relaxed">
              Отчёты формируются ежемесячно. Перейдите в раздел{' '}
              <button onClick={() => navigate('/client/reports')} className="text-blue-900 font-semibold hover:underline cursor-pointer transition-colors">
                Отчёты
              </button>{' '}
              для подробной аналитики.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Send to Audit */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Отправить ссылки на аудит</h3>
                <p className="text-[12px] text-gray-400 mt-0.5 font-medium">Вставьте список ссылок, каждую с новой строки</p>
              </div>
              <button
                onClick={() => { setShowAuditModal(false); setAuditInput(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={auditInput}
                onChange={(e) => setAuditInput(e.target.value)}
                placeholder="https://example.com/bad-review-1&#10;https://forum.ru/topic/negative-2&#10;https://reviews.com/complaint-3&#10;..."
                rows={12}
                className="w-full px-4 py-3 text-[12px] border border-gray-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-300/60 focus:border-slate-300/60 resize-none font-mono text-gray-600 placeholder:text-gray-300 transition-all duration-200"
              />
              <div className="flex items-center justify-between mt-3 text-[11px] text-gray-400 font-medium">
                <span>
                  Найдено ссылок: <span className="font-bold text-gray-700 tabular-nums">{parseLinksFromText(auditInput).length}</span>
                </span>
                <span className="text-gray-300">Каждая ссылка с новой строки</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[13px] text-gray-400 font-medium">
                Будет отправлено: <span className="font-bold text-gray-800 tabular-nums">{parseLinksFromText(auditInput).length}</span> ссылок
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAuditModal(false); setAuditInput(''); }}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200 cursor-pointer whitespace-nowrap"
                >
                  Отмена
                </button>
                <button
                  onClick={sendToAudit}
                  disabled={parseLinksFromText(auditInput).length === 0}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-900 hover:bg-blue-800 text-white transition-all duration-200 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default shadow-sm"
                >
                  Отправить на аудит
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}