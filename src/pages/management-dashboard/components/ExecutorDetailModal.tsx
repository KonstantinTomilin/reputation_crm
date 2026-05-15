import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';

interface ExecutorDetailModalProps {
  executorId: number;
  onClose: () => void;
}

export default function ExecutorDetailModal({ executorId, onClose }: ExecutorDetailModalProps) {
  const crm = useCRM();
  const mockLinks = crm.links;
  const mockProjects = crm.projects;
  const mockUsers = crm.users;
  const executor = mockUsers.find((u) => u.id === executorId);
  if (!executor) return null;

  const execLinks = mockLinks.filter((l) => l.executorId === executorId);
  const doneLinks = execLinks.filter((l) =>
    ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'принято'].includes(l.status)
  );
  const totalEarned = doneLinks.reduce((sum, l) => sum + l.executorCost, 0);
  const paid = doneLinks.filter((l) => l.executorPaid).reduce((sum, l) => sum + l.executorCost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">Отчёт: {executor.fullName}</h3>
            <p className="text-xs text-gray-500">Все ссылки исполнителя</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-900">{execLinks.length}</div>
            <div className="text-xs text-gray-500">Всего ссылок</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{doneLinks.length}</div>
            <div className="text-xs text-gray-500">Выполнено</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{totalEarned.toLocaleString('ru')} ₽</div>
            <div className="text-xs text-gray-500">Заработок</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-orange-600">{(totalEarned - paid).toLocaleString('ru')} ₽</div>
            <div className="text-xs text-gray-500">Остаток</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">URL</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Проект</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Стоимость</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Выплачено</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Клиент оплатил</th>
              </tr>
            </thead>
            <tbody>
              {execLinks.map((l) => (
                <tr key={l.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 text-xs text-blue-900 truncate max-w-[200px]">{l.url}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{mockProjects.find((p) => p.id === l.projectId)?.name || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={l.status} type="link" /></td>
                  <td className="px-3 py-2 text-xs font-semibold">{l.executorCost.toLocaleString('ru')} ₽</td>
                  <td className="px-3 py-2">
                    {l.executorPaid ? (
                      <span className="text-xs text-green-600"><i className="ri-checkbox-circle-line" /> Да</span>
                    ) : (
                      <span className="text-xs text-red-500"><i className="ri-close-circle-line" /> Нет</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {l.clientPaid ? (
                      <span className="text-xs text-green-600"><i className="ri-checkbox-circle-line" /> Да</span>
                    ) : (
                      <span className="text-xs text-red-500"><i className="ri-close-circle-line" /> Нет</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}