import { useState, useMemo } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatMoney } from '@/lib/currency';
import { todayISO, isOverdue } from '@/lib/dateUtils';
import { COMPLETED_WORK_STATUSES } from '@/lib/linkFinance';
import type { CRMLink, LinkStatus } from '@/mocks/crm';

type KanbanColumn =
  | { kind: 'status'; status: LinkStatus | LinkStatus[]; title: string; color: string }
  | { kind: 'overdue'; title: string; color: string };

const kanbanColumns: KanbanColumn[] = [
  { kind: 'status', status: 'новый', title: 'Новые', color: 'border-t-4 border-slate-400' },
  { kind: 'status', status: 'ожидает аудита', title: 'Ожидает аудита', color: 'border-t-4 border-pink-400' },
  { kind: 'status', status: 'в аудите', title: 'На аудите', color: 'border-t-4 border-amber-400' },
  { kind: 'status', status: 'в работе', title: 'В работе', color: 'border-t-4 border-blue-400' },
  { kind: 'status', status: 'готово', title: 'Готово к проверке', color: 'border-t-4 border-cyan-400' },
  { kind: 'status', status: ['согласовано', 'принято'], title: 'Подтверждено админом', color: 'border-t-4 border-emerald-400' },
  { kind: 'status', status: ['отправлено клиенту', 'сдано клиенту'], title: 'Отправлено клиенту', color: 'border-t-4 border-indigo-400' },
  { kind: 'status', status: 'в карантине', title: 'Карантин', color: 'border-t-4 border-orange-400' },
  { kind: 'overdue', title: 'Просрочено', color: 'border-t-4 border-red-500' },
];

function matchColumn(link: CRMLink, col: KanbanColumn): boolean {
  const overdue = isOverdue(link.deadline, COMPLETED_WORK_STATUSES, link.status);
  if (col.kind === 'overdue') {
    return overdue;
  }
  // Avoid duplicate cards in status columns and "Просрочено".
  if (overdue) return false;
  const statuses = Array.isArray(col.status) ? col.status : [col.status];
  return statuses.includes(link.status);
}

export default function KanbanView() {
  const crm = useCRM();
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedLink, setSelectedLink] = useState<CRMLink | null>(null);

  const activeLinks = useMemo(() => crm.links.filter((l) => !l.isDeleted), [crm.links]);

  const filteredLinks = useMemo(() => {
    if (projectFilter === 'all') return activeLinks;
    return activeLinks.filter((l) => String(l.projectId) === projectFilter);
  }, [projectFilter, activeLinks]);

  const getProject = (id: number) => crm.projects.find((p) => p.id === id);
  const getClientName = (clientId: number) =>
    crm.clients.find((c) => c.id === clientId)?.companyName ?? '—';
  const getExecutorName = (executorId: number | null) =>
    executorId ? crm.users.find((u) => u.id === executorId)?.fullName ?? '—' : '—';

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-600">Проект:</label>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer"
        >
          <option value="all">Все проекты</option>
          {crm.projects.filter((p) => !p.isDeleted).map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filteredLinks.length} ссылок · {todayISO()}</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-[1600px] h-full pb-2">
          {kanbanColumns.map((col) => {
            const colLinks = filteredLinks.filter((l) => matchColumn(l, col));
            return (
              <div
                key={col.title}
                className={`flex-1 flex flex-col bg-white rounded-xl border border-slate-200 ${col.color} min-w-[200px]`}
              >
                <div className="px-3 py-2.5 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">{col.title}</span>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{colLinks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2 max-h-[70vh]">
                  {colLinks.map((link) => {
                    const project = getProject(link.projectId);
                    const currency = project?.currency ?? 'RUB';
                    const overdue = isOverdue(link.deadline, COMPLETED_WORK_STATUSES, link.status);
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => setSelectedLink(link)}
                        className={`text-left bg-gray-50 hover:bg-slate-50 border rounded-lg p-2.5 transition-all cursor-pointer ${
                          overdue ? 'border-red-200' : 'border-gray-100'
                        }`}
                      >
                        <div className="text-[11px] text-blue-900 font-mono truncate">{link.url}</div>
                        <div className="text-[10px] text-gray-500 mt-1 truncate">{project?.name} · {getClientName(link.clientId)}</div>
                        <div className="text-[10px] text-gray-400 truncate">Исп.: {getExecutorName(link.executorId)}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{link.type}</span>
                          <StatusBadge status={link.status} size="sm" />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px]">
                          <span className={overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}>
                            {link.deadline ? `до ${link.deadline}` : 'без дедлайна'}
                          </span>
                          <span className="font-semibold text-gray-700">{formatMoney(link.clientCost, currency)}</span>
                        </div>
                      </button>
                    );
                  })}
                  {colLinks.length === 0 && <div className="text-center py-4 text-xs text-gray-300">Нет ссылок</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedLink(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-800 mb-2">Ссылка #{selectedLink.id}</h3>
            <p className="text-sm text-blue-900 font-mono break-all mb-3">{selectedLink.url}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Проект</div>
                <div className="font-semibold">{getProject(selectedLink.projectId)?.name}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Стоимость</div>
                <div className="font-semibold">
                  {formatMoney(selectedLink.clientCost, getProject(selectedLink.projectId)?.currency)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <StatusBadge status={selectedLink.status} />
              </div>
            </div>
            <button type="button" onClick={() => setSelectedLink(null)} className="mt-4 w-full py-2 border rounded-lg text-sm cursor-pointer">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
