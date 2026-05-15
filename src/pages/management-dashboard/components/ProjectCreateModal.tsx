import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { CRMClient, CRMUser } from '@/mocks/crm';
import ClientCreateModal from './ClientCreateModal';

interface LinkInput {
  url: string;
  type: 'удаление' | 'деиндексация' | 'удаление+деиндексация';
  clientCost: number;
  targetGoogle: boolean;
  targetYandex: boolean;
  targetBing: boolean;
}

interface Props {
  clients: CRMClient[];
  executors: CRMUser[];
  onClose: () => void;
  onSave: (payload: {
    clientId: number;
    executorId: number | null;
    name: string;
    deadline: string | null;
    currency: 'RUB' | 'USD' | 'EUR' | 'AED';
    source: string;
    links: { url: string; type: 'удаление' | 'деиндексация' | 'удаление+деиндексация'; clientCost: number; targetGoogle: boolean; targetYandex: boolean; targetBing: boolean }[];
  }) => void;
}

export default function ProjectCreateModal({ clients, executors, onClose, onSave }: Props) {
  const crm = useCRM();
  const [step, setStep] = useState<'project' | 'links'>('project');

  // Project info
  const [clientId, setClientId] = useState<number>(clients[0]?.id || 0);
  const [executorId, setExecutorId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'AED'>('RUB');
  const [source, setSource] = useState('');

  // Client search dropdown
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [executorDropdownOpen, setExecutorDropdownOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.companyName.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === clientId);

  const canNext = name.trim().length > 0 && clientId > 0;

  // Links
  const [rawLinks, setRawLinks] = useState('');
  const [parsedLinks, setParsedLinks] = useState<LinkInput[]>([]);
  const [bulkType, setBulkType] = useState<LinkInput['type']>('удаление');
  const [bulkCost, setBulkCost] = useState(5000);

  const parseLinks = () => {
    const lines = rawLinks.split(/\n|\r/).map((l) => l.trim()).filter(Boolean);
    const urlRegex = /https?:\/\/[^\s]+/i;
    const urls = lines.filter((line) => urlRegex.test(line));
    const inputs: LinkInput[] = urls.map((url) => ({
      url,
      type: bulkType,
      clientCost: bulkCost,
      targetGoogle: true,
      targetYandex: false,
      targetBing: false,
    }));
    setParsedLinks(inputs);
  };

  const updateLink = (index: number, patch: Partial<LinkInput>) => {
    setParsedLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSave = () => {
    if (!canNext) return;
    onSave({
      clientId,
      executorId,
      name: name.trim(),
      deadline: deadline || null,
      currency,
      source: source.trim(),
      links: parsedLinks,
    });
  };

  const handleAddClient = (form: { companyName: string; contacts: string; currency: 'RUB' | 'USD' | 'EUR' | 'AED' }) => {
    const newClient = crm.addClient({
      companyName: form.companyName,
      contacts: form.contacts,
      status: 'активен',
      totalDebt: 0,
      currency: form.currency,
    });
    setClientId(newClient.id);
    setClientSearch(newClient.companyName);
    setShowAddClient(false);
  };

  const totalCost = useMemo(() => parsedLinks.reduce((sum, l) => sum + l.clientCost, 0), [parsedLinks]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              {step === 'project' ? 'Создать проект' : 'Загрузить ссылки'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 'project' ? 'Укажите параметры проекта' : `Клиент: ${selectedClient?.companyName || '—'}`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'project' && (
            <div className="flex flex-col gap-4">
              {/* Client — searchable dropdown */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Клиент</label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientDropdownOpen ? clientSearch : (selectedClient?.companyName || '')}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      if (!clientDropdownOpen) setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    placeholder="Начните вводить название компании..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400">
                    <i className={`ri-arrow-down-s-line text-sm transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {clientDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setClientDropdownOpen(false)}
                      />
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {filteredClients.length === 0 && (
                          <div className="px-3 py-3 text-xs text-gray-400">Ничего не найдено</div>
                        )}
                        {filteredClients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setClientId(c.id);
                              setClientSearch(c.companyName);
                              setClientDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors ${clientId === c.id ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-gray-700'}`}
                          >
                            {c.companyName}
                          </button>
                        ))}
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setClientDropdownOpen(false);
                              setShowAddClient(true);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm text-blue-900 font-semibold hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <i className="ri-add-line" />
                            Новый клиент
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Executor — dropdown */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Ответственный исполнитель</label>
                <div className="relative">
                  <button
                    onClick={() => setExecutorDropdownOpen((v) => !v)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-left flex items-center justify-between hover:border-slate-400 transition-colors cursor-pointer"
                  >
                    <span className={executorId ? 'text-gray-800' : 'text-gray-400'}>
                      {executors.find((e) => e.id === executorId)?.fullName || 'Выберите исполнителя'}
                    </span>
                    <i className={`ri-arrow-down-s-line text-sm text-gray-400 transition-transform ${executorDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {executorDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setExecutorDropdownOpen(false)}
                      />
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {executors.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => { setExecutorId(e.id); setExecutorDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors ${executorId === e.id ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-gray-700'}`}
                          >
                            {e.fullName}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Название проекта</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Очистка репутации Q4 2025"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Дедлайн</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Валюта</label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'RUB' | 'USD' | 'EUR' | 'AED')}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer appearance-none"
                    >
                      <option value="RUB">₽ Российский рубль</option>
                      <option value="USD">$ Доллар США</option>
                      <option value="EUR">€ Евро</option>
                      <option value="AED">د.إ Дирхам ОАЭ</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none text-gray-400">
                      <i className="ri-arrow-down-s-line text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Источник</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Telegram, сайт, рекомендация..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">Откуда пришёл проект: Telegram, сайт, рекомендация, выставка и т.д.</p>
              </div>
            </div>
          )}

          {step === 'links' && (
            <div className="flex flex-col gap-5">
              {/* Bulk settings */}
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Тип работы по умолчанию</label>
                  <div className="relative">
                    <select
                      value={bulkType}
                      onChange={(e) => setBulkType(e.target.value as LinkInput['type'])}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer appearance-none"
                    >
                      <option value="удаление">Удаление</option>
                      <option value="деиндексация">Деиндексация</option>
                      <option value="удаление+деиндексация">Удаление + Деиндексация</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none text-gray-400">
                      <i className="ri-arrow-down-s-line text-sm" />
                    </div>
                  </div>
                </div>
                <div className="w-40">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Стоимость по умолчанию</label>
                  <input
                    type="number"
                    value={bulkCost}
                    onChange={(e) => setBulkCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                  />
                </div>
                <button
                  onClick={parseLinks}
                  disabled={!rawLinks.trim()}
                  className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
                >
                  Распарсить ссылки
                </button>
              </div>

              {/* Paste area */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Вставьте ссылки (каждая с новой строки)
                </label>
                <textarea
                  value={rawLinks}
                  onChange={(e) => setRawLinks(e.target.value)}
                  placeholder="https://negativereview.ru/company/bad-article&#10;https://forum.ru/topic/negative-thread&#10;https://reviews.com/complaint-page"
                  rows={6}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none font-mono"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">
                    Найдено: <span className="font-bold text-gray-700">{parsedLinks.length}</span> ссылок
                  </span>
                  <span className="text-xs text-gray-400">
                    Общая стоимость: <span className="font-bold text-gray-700">{totalCost.toLocaleString('ru')} ₽</span>
                  </span>
                </div>
              </div>

              {/* Individual link settings */}
              {parsedLinks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Редактировать поштучно
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden max-h-[320px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">URL</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-40">Тип</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-28">Стоимость</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">ПС</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedLinks.map((link, idx) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-3 py-2">
                              <span className="text-xs text-blue-900 font-mono truncate max-w-[280px] block">{link.url}</span>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={link.type}
                                onChange={(e) => updateLink(idx, { type: e.target.value as LinkInput['type'] })}
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                              >
                                <option value="удаление">Удаление</option>
                                <option value="деиндексация">Деиндексация</option>
                                <option value="удаление+деиндексация">Удаление + Деиндексация</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={link.clientCost}
                                onChange={(e) => updateLink(idx, { clientCost: Number(e.target.value) })}
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-slate-400"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {[
                                  { key: 'targetGoogle' as const, label: 'G' },
                                  { key: 'targetYandex' as const, label: 'Y' },
                                  { key: 'targetBing' as const, label: 'B' },
                                ].map((se) => (
                                  <label key={se.key} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={(link as any)[se.key]}
                                      onChange={(e) => updateLink(idx, { [se.key]: e.target.checked })}
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                                    />
                                    <span className="text-[10px] text-gray-500 font-semibold">{se.label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          {step === 'links' && (
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{parsedLinks.length}</span> ссылок ·{' '}
              <span className="font-semibold text-gray-800">{totalCost.toLocaleString('ru')} ₽</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Отмена
            </button>
            {step === 'project' ? (
              <button
                onClick={() => setStep('links')}
                disabled={!canNext}
                className="px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
              >
                Далее: ссылки
                <i className="ri-arrow-right-line ml-1.5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canNext || parsedLinks.length === 0}
                className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
              >
                <i className="ri-check-line mr-1.5" />
                Создать проект
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested client create modal */}
      {showAddClient && (
        <ClientCreateModal
          onClose={() => setShowAddClient(false)}
          onSave={handleAddClient}
        />
      )}
    </div>
  );
}