import { useState, useMemo } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import type { CRMLink } from '@/mocks/crm';

const kanbanColumns = [
  { status: 'ожидает аудита', title: 'Ожидает аудита', color: 'border-t-4 border-gray-400' },
  { status: 'в работе', title: 'В работе', color: 'border-t-4 border-blue-400' },
  { status: 'в карантине', title: 'В карантине', color: 'border-t-4 border-orange-400' },
  { status: 'вернулось', title: 'Вернувшиеся', color: 'border-t-4 border-red-400' },
  { status: 'готово', title: 'Готово', color: 'border-t-4 border-cyan-400' },
  { status: 'сдано', title: 'Сдано', color: 'border-t-4 border-indigo-400' },
  { status: 'удалено', title: 'Удалено', color: 'border-t-4 border-green-400' },
];

export default function KanbanView() {
  const crm = useCRM();
  const mockLinks = crm.links;
  const mockProjects = crm.projects;
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedLink, setSelectedLink] = useState<CRMLink | null>(null);

  const filteredLinks = useMemo(() => {
    if (projectFilter === 'all') return mockLinks;
    return mockLinks.filter((l) => String(l.projectId) === projectFilter);
  }, [projectFilter, mockLinks]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Фильтр по проекту:</label>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все проекты</option>
          {mockProjects.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filteredLinks.length} ссылок</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-[1300px] h-full">
          {kanbanColumns.map((col) => {
            const colLinks = filteredLinks.filter((l) => l.status === col.status);
            return (
              <div key={col.status} className={`flex-1 flex flex-col bg-white rounded-xl border border-slate-200 ${col.color} min-w-[220px]`}>
                <div className="px-3 py-2.5 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">{col.title}</span>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{colLinks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
                  {colLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => setSelectedLink(link)}
                      className="text-left bg-gray-50 hover:bg-slate-50 border border-gray-100 hover:border-slate-200 rounded-lg p-2.5 transition-all cursor-pointer"
                    >
                      <div className="text-[11px] text-blue-900 font-mono truncate">{link.url}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${link.type === 'удаление' ? 'bg-red-50 text-red-600' : link.type === 'деиндексация' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
                        </span>
                        {link.deadline && (
                          <span className={`text-[10px] ${new Date(link.deadline) < new Date('2024-12-01') ? 'text-red-500' : 'text-gray-400'}`}>
                            <i className="ri-time-line" /> {link.deadline}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {mockProjects.find((p) => p.id === link.projectId)?.name || '—'}
                      </div>
                    </button>
                  ))}
                  {colLinks.length === 0 && <div className="text-center py-4 text-xs text-gray-300">Нет ссылок</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link detail modal */}
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedLink(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Детали ссылки</h3>
              <button onClick={() => setSelectedLink(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-400" />
              </button>
            </div>
            <div className="text-sm text-blue-900 font-mono break-all">{selectedLink.url}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Проект</div>
                <div className="font-semibold text-gray-700">{mockProjects.find((p) => p.id === selectedLink.projectId)?.name || '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Тип</div>
                <div className="font-semibold text-gray-700">{selectedLink.type}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Статус</div>
                <StatusBadge status={selectedLink.status} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">Стоимость</div>
                <div className="font-semibold text-gray-700">{selectedLink.clientCost.toLocaleString('ru')} ₽</div>
              </div>
            </div>
            {selectedLink.deadline && (
              <div className={`text-sm ${new Date(selectedLink.deadline) < new Date('2024-12-01') ? 'text-red-500' : 'text-gray-500'}`}>
                <i className="ri-time-line" /> Дедлайн: {selectedLink.deadline}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}