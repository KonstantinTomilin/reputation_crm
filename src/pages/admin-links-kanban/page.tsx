import { useState } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import LinkDetailModal from '@/components/feature/LinkDetailModal';
import { useCRM } from '@/context/CRMContext';
import type { CRMLink, LinkStatus } from '@/mocks/crm';

const columns: { status: LinkStatus; title: string; color: string }[] = [
  { status: 'в работе', title: 'В работе', color: 'border-t-4 border-blue-400' },
  { status: 'в карантине', title: 'В карантине', color: 'border-t-4 border-orange-400' },
  { status: 'готово', title: 'Готово', color: 'border-t-4 border-cyan-400' },
  { status: 'сдано', title: 'Сдано', color: 'border-t-4 border-indigo-400' },
  { status: 'удалено', title: 'Удалено', color: 'border-t-4 border-green-400' },
];

const typeColors: Record<string, string> = {
  'удаление': 'bg-red-50 text-red-600',
  'деиндексация': 'bg-blue-50 text-blue-600',
  'удаление+деиндексация': 'bg-purple-50 text-purple-600',
};

const SEBadge = ({ flags }: { flags: { google: boolean; yandex: boolean; bing: boolean; yahoo: boolean } }) => (
  <div className="flex gap-0.5">
    {flags.google && <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-bold">G</span>}
    {flags.yandex && <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-bold">Y</span>}
    {flags.bing && <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-bold">B</span>}
    {flags.yahoo && <span className="text-[9px] px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-bold">H</span>}
  </div>
);

export default function AdminLinksKanbanPage() {
  const crm = useCRM();
  const mockProjects = crm.projects;
  const mockUsers = crm.users;
  const mockLinks = crm.links;
  const [selectedLink, setSelectedLink] = useState<CRMLink | null>(null);

  const getProjectName = (projectId: number) => mockProjects.find((p) => p.id === projectId)?.name || '—';
  const getClientName = (clientId: number) => mockUsers.find((u) => u.id === clientId && u.role === 'client')?.fullName || '—';

  return (
    <CRMLayout role="admin">
      <div className="p-6 flex flex-col gap-5 h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Канбан ссылок</h1>
            <p className="text-sm text-gray-500 mt-0.5">Визуальное управление статусами ссылок</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <i className="ri-information-line" />
            Клик по карточке — подробности
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 min-w-[1200px] h-full">
            {columns.map((col) => {
              const colLinks = mockLinks.filter((l) => l.status === col.status);
              return (
                <div key={col.status} className={`flex-1 flex flex-col bg-white rounded-xl border border-slate-200 ${col.color}`}>
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={col.status} type="link" />
                      <span className="text-xs font-bold text-gray-400">{colLinks.length}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                    {colLinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => setSelectedLink(link)}
                        className="text-left bg-gray-50 hover:bg-slate-50 border border-gray-100 hover:border-slate-200 rounded-lg p-3 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs text-blue-900 font-mono truncate block">{link.url}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${typeColors[link.type] || ''}`}>
                            {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <SEBadge flags={link.targetSE} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="truncate">{getClientName(link.clientId)}</span>
                          <span className="flex-shrink-0">{getProjectName(link.projectId)}</span>
                        </div>

                        {link.deadline && (
                          <div className={`flex items-center gap-1 mt-1.5 text-[11px] ${
                            new Date(link.deadline) < new Date('2024-12-01') && link.status !== 'удалено'
                              ? 'text-red-500 font-semibold'
                              : 'text-gray-400'
                          }`}>
                            <i className="ri-time-line" />
                            {link.deadline}
                          </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.status === 'в работе' && (
                            <span className="text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded font-semibold">→ Готово</span>
                          )}
                          {col.status === 'готово' && (
                            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold">→ Сдано</span>
                          )}
                          {col.status === 'сдано' && (
                            <>
                              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded font-semibold">→ Удалено</span>
                              <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded font-semibold">→ Отклонено</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}

                    {colLinks.length === 0 && (
                      <div className="text-center py-6 text-xs text-gray-300">Нет ссылок</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedLink && (
        <LinkDetailModal link={selectedLink} onClose={() => setSelectedLink(null)} />
      )}
    </CRMLayout>
  );
}