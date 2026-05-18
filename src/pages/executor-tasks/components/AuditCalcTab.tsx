import { useState, useMemo } from 'react';
import type { CRMLink } from '@/mocks/crm';
import StatusBadge from '@/components/base/StatusBadge';

interface Props {
  executorId: number;
  linksList: CRMLink[];
  projects: { id: number; name: string }[];
  clients: { id: number; fullName: string }[];
  onSubmitCalc: (linkId: number, data: CalcData) => void;
}

export interface CalcData {
  removalProbability: number;
  deindexProbability: number;
  daysMin: number;
  daysMax: number;
  costGoogle: number;
  costYandex: number;
  costBing: number;
  notes: string;
}

const probOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

export default function AuditCalcTab({ executorId, linksList, projects, clients, onSubmitCalc }: Props) {
  const auditLinks = useMemo(
    () => linksList.filter((l) => l.executorId === executorId && (l.status === 'на просчёт' || l.status === 'просчёт выполнен')),
    [linksList, executorId]
  );

  const [calcModal, setCalcModal] = useState<{ open: boolean; link: CRMLink | null }>({ open: false, link: null });

  const [probRemoval, setProbRemoval] = useState(50);
  const [probDeindex, setProbDeindex] = useState(50);
  const [daysMin, setDaysMin] = useState(14);
  const [daysMax, setDaysMax] = useState(30);
  const [costGoogle, setCostGoogle] = useState(0);
  const [costYandex, setCostYandex] = useState(0);
  const [costBing, setCostBing] = useState(0);
  const [notes, setNotes] = useState('');

  const openCalc = (link: CRMLink) => {
    setCalcModal({ open: true, link });
    setProbRemoval(50);
    setProbDeindex(50);
    setDaysMin(14);
    setDaysMax(30);
    setCostGoogle(Math.round(link.clientCost * 0.6));
    setCostYandex(Math.round(link.clientCost * 0.55));
    setCostBing(Math.round(link.clientCost * 0.5));
    setNotes('');
  };

  const handleSubmit = () => {
    if (!calcModal.link) return;
    onSubmitCalc(calcModal.link.id, {
      removalProbability: probRemoval,
      deindexProbability: probDeindex,
      daysMin,
      daysMax,
      costGoogle,
      costYandex,
      costBing,
      notes,
    });
    setCalcModal({ open: false, link: null });
  };

  const getProjectName = (id: number) => projects.find((p) => p.id === id)?.name || '—';
  const getClientName = (id: number) => clients.find((c) => c.id === id)?.fullName || '—';

  const stats = {
    pending: auditLinks.filter((l) => l.status === 'на просчёт').length,
    done: auditLinks.filter((l) => l.status === 'просчёт выполнен').length,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-sky-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-sky-700">{stats.pending}</div>
          <div className="text-xs font-semibold text-sky-600 mt-0.5">Ожидают просчёта</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-700">{stats.done}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-0.5">Просчёт выполнен</div>
        </div>
      </div>

      {/* Info block */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-5 h-5 flex items-center justify-center mt-0.5 shrink-0">
          <i className="ri-information-line text-amber-500" />
        </div>
        <div className="text-sm text-amber-700">
          Здесь находятся ссылки, которые аудитор собрал и передал вам на просчёт. Вы указываете вероятности, стоимость и сроки. После этого данные уходят на согласование управлению.
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">Аудиты на просчёт</h3>
          <span className="text-xs text-gray-400">{auditLinks.length} позиций</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Гео</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLinks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    Нет ссылок на просчёт
                  </td>
                </tr>
              )}
              {auditLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{link.id}</td>
                  <td className="px-4 py-3">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-xs text-blue-900 hover:underline truncate max-w-[180px] block"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getClientName(link.clientId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{getProjectName(link.projectId)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                      link.type === 'удаление' ? 'bg-red-100 text-red-700' :
                      link.type === 'деиндексация' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-blue-800'
                    }`}>
                      {link.type === 'удаление+деиндексация' ? 'Удал+деинд' : link.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{link.geo ? link.geo.split(',')[0] : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={link.status} type="link" /></td>
                  <td className="px-4 py-3">
                    {link.status === 'на просчёт' ? (
                      <button
                        onClick={() => openCalc(link)}
                        className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-calculator-line mr-1" />
                        Просчитать
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <i className="ri-check-double-line" /> Готово
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calc Modal */}
      {calcModal.open && calcModal.link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCalcModal({ open: false, link: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">Просчёт ссылки</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]" title={calcModal.link.url}>
                  {calcModal.link.url}
                </p>
              </div>
              <button
                onClick={() => setCalcModal({ open: false, link: null })}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Клиент', value: getClientName(calcModal.link.clientId) },
                  { label: 'Проект', value: getProjectName(calcModal.link.projectId) },
                  { label: 'Тип работы', value: calcModal.link.type === 'удаление+деиндексация' ? 'Удал+деинд' : calcModal.link.type },
                  { label: 'Гео', value: calcModal.link.geo ? calcModal.link.geo.split(',')[0] : '—' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Probabilities */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Вероятности</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Вероятность удаления</div>
                    <div className="relative">
                      <select
                        value={probRemoval}
                        onChange={(e) => setProbRemoval(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                      >
                        {probOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Вероятность деиндексации</div>
                    <div className="relative">
                      <select
                        value={probDeindex}
                        onChange={(e) => setProbDeindex(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                      >
                        {probOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Стоимость по поисковым системам</h4>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Google', value: costGoogle, setter: setCostGoogle },
                    { label: 'Яндекс', value: costYandex, setter: setCostYandex },
                    { label: 'Bing', value: costBing, setter: setCostBing },
                  ].map((se) => (
                    <div key={se.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 w-16">{se.label}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          value={se.value}
                          onChange={(e) => se.setter(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                          min={0}
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">валюта проекта</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Срок */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Сроки (дней)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">От</div>
                    <input
                      type="number"
                      value={daysMin}
                      onChange={(e) => setDaysMin(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">До</div>
                    <input
                      type="number"
                      value={daysMax}
                      onChange={(e) => setDaysMax(Number(e.target.value))}
                      min={1}
                      max={365}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Примечания
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Дополнительная информация по ссылке..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="text-xs text-gray-400 mt-1">{notes.length}/500</div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCalcModal({ open: false, link: null })}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-check-double-line mr-1.5" />
                  Отправить просчёт
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}