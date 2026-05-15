import { useNavigate } from 'react-router-dom';
import type { CRMProject } from '@/mocks/crm';
import StatusBadge from '@/components/base/StatusBadge';

interface Props {
  projects: CRMProject[];
}

export default function ClientProjectsTable({ projects }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Проекты</h2>
        <span className="text-xs text-gray-400">{projects.length} проектов</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="bg-slate-50/60 text-left">
              {['Проект', 'Домен', 'Ссылок', 'В работе', 'Удалено', 'Успех %', 'Статус', 'Дедлайн'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/client/project/${p.id}`)}
                className={`border-t border-gray-50 hover:bg-slate-50/40 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
              >
                <td className="px-4 py-3.5 font-semibold text-gray-800 text-sm whitespace-nowrap">{p.name}</td>
                <td className="px-4 py-3.5 text-sm text-blue-900 font-mono whitespace-nowrap">{p.domain}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700 font-semibold text-center">{p.totalLinks}</td>
                <td className="px-4 py-3.5 text-sm text-blue-600 font-semibold text-center">{p.inProgress}</td>
                <td className="px-4 py-3.5 text-sm text-green-600 font-semibold text-center">{p.removed}</td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                      <div
                        className="bg-slate-500 h-1.5 rounded-full"
                        style={{ width: `${p.successRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${p.successRate >= 90 ? 'text-green-600' : p.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.successRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={p.status} type="project" />
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{p.deadline || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
