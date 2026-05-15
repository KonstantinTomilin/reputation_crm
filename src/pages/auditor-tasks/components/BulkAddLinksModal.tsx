import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { CRMLink, WorkType, SearchEngineFlags } from '@/mocks/crm';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function BulkAddLinksModal({ onClose, onAdded }: Props) {
  const crm = useCRM();
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [type, setType] = useState<WorkType>('удаление');
  const [se, setSE] = useState<SearchEngineFlags>({ google: true, yandex: false, bing: false, yahoo: false });

  const parseUrls = (input: string): string[] => {
    return input.split(/\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0 && l.startsWith('http'));
  };

  const handleAdd = () => {
    const urls = parseUrls(text);
    if (urls.length === 0 || !projectId || !clientId) return;

    const pid = Number(projectId);
    const cid = Number(clientId);

    urls.forEach((url) => {
      crm.addLink({
        url,
        clientId: cid,
        projectId: pid,
        type,
        targetSE: { ...se },
        status: 'новый',
        addedDate: new Date().toISOString().split('T')[0],
        startDate: null,
        endDate: null,
        deadline: null,
        quarantineDays: 0,
        quarantineEndDate: null,
        executorId: null,
        auditorId: null,
        clientCost: 0,
        executorCost: 0,
        clientPaid: false,
        clientPaidDate: null,
        clientPaidAmount: null,
        executorPaid: false,
        executorPaidDate: null,
        executorPaidAmount: null,
        comments: [],
        proofsFolder: null,
        proofFiles: [],
        geo: 'Россия',
      });
    });

    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">Массовое добавление ссылок</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Вставьте ссылки, каждую с новой строки..."
          rows={8}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none mb-4"
        />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <select
            value={clientId}
            onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          >
            <option value="">Клиент</option>
            {crm.users.filter((u) => u.role === 'client').map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          >
            <option value="">Проект</option>
            {crm.projects.filter((p) => !clientId || p.clientId === Number(clientId)).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mb-4">
          {(['google', 'yandex', 'bing', 'yahoo'] as const).map((s) => (
            <label key={s} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={se[s]}
                onChange={(e) => setSE((prev) => ({ ...prev, [s]: e.target.checked }))}
                className="cursor-pointer"
              />
              {s === 'google' ? 'G' : s === 'yandex' ? 'Y' : s === 'bing' ? 'B' : 'H'}
            </label>
          ))}
        </div>
        <button
          onClick={handleAdd}
          disabled={parseUrls(text).length === 0 || !projectId || !clientId}
          className="w-full bg-blue-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
        >
          Добавить {parseUrls(text).length} ссылок
        </button>
      </div>
    </div>
  );
}