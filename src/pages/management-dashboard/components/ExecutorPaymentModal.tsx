import { useState } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatGroupedAmounts, formatMoney, groupAmountsByCurrency } from '@/lib/currency';
import type { CRMLink } from '@/mocks/crm';

interface ExecutorPaymentModalProps {
  executorId: number;
  executorName: string;
  linksList: CRMLink[];
  onClose: () => void;
  onUpdateLink: (link: CRMLink) => void;
}

export default function ExecutorPaymentModal({ executorId, executorName, linksList, onClose, onUpdateLink }: ExecutorPaymentModalProps) {
  const crm = useCRM();
  const mockProjects = crm.projects;
  const execLinks = linksList.filter((l) => l.executorId === executorId);
  const doneLinks = execLinks.filter((l) =>
    ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'принято'].includes(l.status)
  );

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const unpaidIds = doneLinks.filter((l) => !l.executorPaid).map((l) => l.id);
    if (selectedIds.size === unpaidIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaidIds));
    }
  };

  const handleAccept = () => {
    selectedIds.forEach((id) => {
      const link = linksList.find((l) => l.id === id);
      if (link) {
        onUpdateLink({ ...link, executorPaid: true, executorPaidDate: new Date().toISOString().split('T')[0] });
      }
    });
    onClose();
  };

  const totalSelected = doneLinks
    .filter((l) => selectedIds.has(l.id))
    .reduce((sum, l) => sum + l.executorCost, 0);
  const selectedByCurrency = groupAmountsByCurrency(
    doneLinks
      .filter((l) => selectedIds.has(l.id))
      .map((l) => ({ amount: l.executorCost, currency: mockProjects.find((p) => p.id === l.projectId)?.currency }))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">Принять ссылки к оплате — {executorName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Выберите выполненные ссылки для подтверждения выплаты</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {doneLinks.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">
              Нет выполненных ссылок для оплаты
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-xs font-semibold text-blue-900 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                >
                  {selectedIds.size > 0 ? 'Снять выделение' : 'Выбрать все неоплаченные'}
                </button>
                <span className="text-xs text-gray-500">
                  Выбрано: <span className="font-bold text-gray-800">{selectedIds.size}</span> ·{' '}
                  <span className="font-bold text-gray-800">
                    {selectedIds.size > 0 ? formatGroupedAmounts(selectedByCurrency) : formatMoney(totalSelected, 'RUB')}
                  </span>
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-10" />
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">URL</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Проект</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Статус</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Сумма</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Оплачено</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {doneLinks.map((l) => (
                      <tr key={l.id} className={`hover:bg-white transition-colors ${l.executorPaid ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(l.id)}
                            onChange={() => toggle(l.id)}
                            disabled={l.executorPaid}
                            className="w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-blue-900 font-mono truncate max-w-[200px]">{l.url}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{mockProjects.find((p) => p.id === l.projectId)?.name || '—'}</td>
                        <td className="px-3 py-2"><StatusBadge status={l.status} type="link" /></td>
                        <td className="px-3 py-2 text-xs font-semibold">
                          {formatMoney(l.executorCost, mockProjects.find((p) => p.id === l.projectId)?.currency)}
                        </td>
                        <td className="px-3 py-2">
                          {l.executorPaid ? (
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
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600">
            К оплате:{' '}
            <span className="font-bold text-gray-800">
              {selectedIds.size > 0 ? formatGroupedAmounts(selectedByCurrency) : formatMoney(totalSelected, 'RUB')}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Отмена
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedIds.size === 0}
              className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
            >
              <i className="ri-check-line mr-1" />
              Принять к оплате ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}