import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { CRMTaskLegacy as CRMTask, TaskStatus } from '@/mocks/crm';

interface Props {
  tasks: CRMTask[];
}

const statusColors: Record<TaskStatus, string> = {
  new: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  paused: 'bg-yellow-50 text-yellow-700',
  done: 'bg-green-50 text-green-700',
};

const statusLabels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  paused: 'На паузе',
  done: 'Выполнена',
};

export default function ExecutorTasksTable({ tasks }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-gray-50/60 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Проект</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">URL</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Тип</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Статус</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Прогресс</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Дедлайн</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{task.project}</td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono max-w-[200px] truncate">{task.url}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                    task.type === 'удаление' ? 'bg-red-50 text-red-700' :
                    task.type === 'деиндексация' ? 'bg-blue-50 text-blue-700' :
                    'bg-purple-50 text-purple-700'
                  }`}>
                    {task.type === 'удаление+деиндексация' ? 'Удал+деинд' : task.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[task.status]}`}>
                    {statusLabels[task.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-slate-500 h-1.5 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{task.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{task.deadline}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  Нет задач
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}