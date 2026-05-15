import type { TopClient } from '@/mocks/crm';

interface Props {
  clients: TopClient[];
}

export default function TopClientsTable({ clients }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50">
        <h2 className="font-semibold text-gray-800">Топ клиентов</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-slate-50/60 text-left">
              {['Клиент', 'Проектов', 'Ссылок', 'Успех %', 'Просрочки'].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.id} className={`border-t border-gray-50 hover:bg-slate-50/30 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                <td className="px-4 py-3.5 font-semibold text-gray-800 text-sm whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3.5 text-sm text-center font-semibold text-gray-600">{c.projects}</td>
                <td className="px-4 py-3.5 text-sm text-center font-semibold text-gray-600">{c.links}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${c.successRate >= 90 ? 'bg-green-500' : c.successRate >= 75 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${c.successRate}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${c.successRate >= 90 ? 'text-green-600' : c.successRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {c.successRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {c.hasOverdue ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full whitespace-nowrap">
                      <i className="ri-alarm-warning-line" /> Есть
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
                      <i className="ri-checkbox-circle-line" /> Нет
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
