import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CRMLayout from '@/components/feature/CRMLayout';
import ExecutorAllLinksTable from './components/ExecutorAllLinksTable';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId } from '@/hooks/useCurrentExecutor';
import type { CRMLink, LinkStatus } from '@/mocks/crm';

const tabs = ['Все ссылки', 'Ссылки в работе'];

export default function ExecutorProjectPage() {
  const crm = useCRM();
  const executorId = useCurrentExecutorId(crm.users);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Все ссылки');
  const [links, setLinks] = useState<CRMLink[]>(crm.links);
  const [statusFilter, setStatusFilter] = useState<LinkStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const project = crm.projects.find((p) => p.id === Number(id)) || crm.projects[0];
  const projectLinks = links.filter((l) => l.projectId === project.id);

  const filteredLinks = useMemo(() => {
    const base = activeTab === 'Ссылки в работе'
      ? projectLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе' || l.status === 'на карантине')
      : projectLinks;
    return base.filter((l) => {
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchSearch = !search || l.url.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [projectLinks, activeTab, statusFilter, search]);

  const linksInWork = projectLinks.filter(
    (l) => l.status === 'в работе' || l.status === 'повторно в работе' || l.status === 'на карантине'
  );

  const handleAddComment = (linkId: number, text: string) => {
    const executorName = executorId ? crm.users.find((u) => u.id === executorId)?.fullName || 'Исполнитель' : 'Исполнитель';
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== linkId) return l;
        const newComment = {
          id: Math.max(0, ...l.comments.map((c) => c.id)) + 1,
          author: executorName,
          authorRole: 'executor' as const,
          text,
          createdAt: new Date().toISOString().split('T')[0],
        };
        return { ...l, comments: [...l.comments, newComment] };
      })
    );
  };

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <button onClick={() => navigate('/executor')} className="hover:text-blue-900 cursor-pointer">
            Мои задачи
          </button>
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-arrow-right-s-line" />
          </div>
          <span className="text-gray-700 font-semibold">{project.name}</span>
        </div>

        {/* Project header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <i className="ri-calendar-line text-slate-500" />
                  {project.startDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="ri-flag-line text-slate-500" />
                  Дедлайн: {project.deadline}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="ri-user-line text-slate-500" />
                  {project.manager}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                project.status === 'в работе' ? 'bg-green-100 text-green-700' :
                project.status === 'завершён'  ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
              }`}>
                {project.status === 'в работе' ? 'В работе' : project.status}
              </span>
              <a
                href={`https://drive.google.com/drive/folders/${project.id === 1 ? '1RomashkaProofs' : project.id === 3 ? '1BankDoverieProofs' : '1DefaultProofs'}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-blue-900 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-drive-line" />
                Пруфы
              </a>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 self-start">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'Ссылки в работе' && (
                  <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{linksInWork.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по URL..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Table */}
        <ExecutorAllLinksTable
          links={filteredLinks}
          onUpdateLink={(updated) => setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))}
          onAddComment={handleAddComment}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>
    </CRMLayout>
  );
}
