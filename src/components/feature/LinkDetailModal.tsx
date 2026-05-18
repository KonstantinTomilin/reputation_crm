import { useState } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatMoney } from '@/lib/currency';
import type { CRMLink } from '@/mocks/crm';

interface Props {
  link: CRMLink;
  onClose: () => void;
}

const typeColors: Record<string, string> = {
  'удаление': 'bg-red-50 text-red-600',
  'деиндексация': 'bg-blue-50 text-blue-600',
  'удаление+деиндексация': 'bg-purple-50 text-purple-600',
};

const SEBadge = ({ flags }: { flags: { google: boolean; yandex: boolean; bing: boolean; yahoo: boolean } }) => (
  <div className="flex gap-1">
    {flags.google && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-bold">G</span>}
    {flags.yandex && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-bold">Y</span>}
    {flags.bing && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-bold">B</span>}
    {flags.yahoo && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-bold">H</span>}
  </div>
);

export default function LinkDetailModal({ link, onClose }: Props) {
  const crm = useCRM();
  const [comment, setComment] = useState('');
  const [showProofs, setShowProofs] = useState(false);
  const [showComments, setShowComments] = useState(true);

  const project = crm.projects.find((p) => p.id === link.projectId);
  const client = crm.users.find((u) => u.id === link.clientId && u.role === 'client');
  const executor = crm.users.find((u) => u.id === link.executorId);
  const auditor = crm.users.find((u) => u.id === link.auditorId);
  const audit = crm.audits.find((a) => a.linkId === link.id);

  const isOverdue = link.deadline && new Date(link.deadline) < new Date('2024-12-01') && link.status !== 'удалено';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Карточка ссылки #{link.id}</h2>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-900 hover:underline font-mono break-all"
            >
              {link.url}
            </a>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer flex-shrink-0">
            <i className="ri-close-line text-gray-500 text-lg" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Top row: status + type + SE */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={link.status} type="link" size="md" />
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[link.type] || 'bg-gray-100 text-gray-600'}`}>
              {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
            </span>
            <SEBadge flags={link.targetSE} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                <i className="ri-alarm-warning-line" /> Просрочено
              </span>
            )}
          </div>

          {/* Main info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label="Клиент" value={client?.fullName || '—'} icon="ri-briefcase-line" />
            <InfoCard label="Проект" value={project?.name || '—'} icon="ri-folder-line" />
            <InfoCard label="Исполнитель" value={executor?.fullName || 'Не назначен'} icon="ri-user-line" />
            <InfoCard label="Аудитор" value={auditor?.fullName || '—'} icon="ri-search-line" />
            <InfoCard label="Дата добавления" value={link.addedDate} icon="ri-calendar-line" />
            <InfoCard label="Дата начала работы" value={link.startDate || '—'} icon="ri-play-circle-line" />
            <InfoCard label="Дата окончания" value={link.endDate || '—'} icon="ri-flag-line" />
            <InfoCard label="Дедлайн" value={link.deadline || '—'} icon="ri-time-line" accent={isOverdue ? 'text-red-600' : 'text-gray-700'} />
            <InfoCard label="Карантин" value={link.quarantineEndDate ? `до ${link.quarantineEndDate}` : link.quarantineDays > 0 ? `${link.quarantineDays} дн.` : '—'} icon="ri-hospital-line" />
          </div>

          {/* Cost row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Стоимость для клиента</div>
              <div className="text-xl font-bold text-gray-800">{formatMoney(link.clientCost, project?.currency)}</div>
              <div className="flex items-center gap-2 mt-2">
                {link.clientPaid ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-white px-2 py-0.5 rounded-full">
                    <i className="ri-checkbox-circle-fill" /> Оплачено {link.clientPaidDate}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-white px-2 py-0.5 rounded-full">
                    <i className="ri-close-circle-line" /> Не оплачено
                  </span>
                )}
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Стоимость для исполнителя</div>
              <div className="text-xl font-bold text-gray-800">{formatMoney(link.executorCost, project?.currency)}</div>
              <div className="flex items-center gap-2 mt-2">
                {link.executorPaid ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-white px-2 py-0.5 rounded-full">
                    <i className="ri-checkbox-circle-fill" /> Выплачено {link.executorPaidDate}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-white px-2 py-0.5 rounded-full">
                    <i className="ri-close-circle-line" /> Не выплачено
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Audit info */}
          {audit && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Результат аудита</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] text-gray-500">Вероятность</div>
                  <div className="text-sm font-semibold text-gray-800">{audit.probability}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Срок удаления</div>
                  <div className="text-sm font-semibold text-gray-800">{audit.removalDaysEstimate > 0 ? `${audit.removalDaysEstimate} дн.` : '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Срок деиндексации</div>
                  <div className="text-sm font-semibold text-gray-800">{audit.deindexDaysEstimate > 0 ? `${audit.deindexDaysEstimate} дн.` : '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Риск</div>
                  <div className="text-sm font-semibold text-gray-800">{audit.riskLevel}</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">{audit.notes}</div>
            </div>
          )}

          {/* Proofs section */}
          <div>
            <button
              onClick={() => setShowProofs(!showProofs)}
              className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 cursor-pointer"
            >
              <i className={`ri-folder-line text-slate-500 ${showProofs ? 'ri-folder-open-line' : 'ri-folder-line'}`} />
              Пруфы и файлы
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showProofs ? 'rotate-180' : ''}`} />
            </button>
            {showProofs && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                {link.proofsFolder ? (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Папка проекта:</div>
                    <a
                      href={link.proofsFolder}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-900 hover:underline font-mono break-all inline-flex items-center gap-1.5"
                    >
                      <i className="ri-external-link-line" />
                      {link.proofsFolder}
                    </a>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mb-3">Папка не указана</div>
                )}
                {link.proofFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {link.proofFiles.map((file, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-xs text-gray-700 border border-gray-200">
                        <i className="ri-file-line text-slate-500" />
                        {file}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Файлы не загружены</div>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 cursor-pointer"
            >
              <i className="ri-chat-3-line text-slate-500" />
              Комментарии ({link.comments.length})
              <i className={`ri-arrow-down-s-line text-gray-400 transition-transform ${showComments ? 'rotate-180' : ''}`} />
            </button>
            {showComments && (
              <div className="flex flex-col gap-3">
                {link.comments.length > 0 ? (
                  link.comments.map((c) => (
                    <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                          <i className="ri-user-line text-blue-900 text-xs" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-800">{c.author}</span>
                          <span className="text-xs text-gray-400 ml-2">{c.createdAt}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 pl-9">{c.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400">Комментариев пока нет</div>
                )}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={() => { setComment(''); }}
                    className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon, accent = 'text-gray-700' }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${icon} text-gray-400 text-xs`} />
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}