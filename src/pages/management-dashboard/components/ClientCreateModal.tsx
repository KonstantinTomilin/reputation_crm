import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSave: (client: { companyName: string; contacts: string; currency: 'RUB' | 'USD' | 'EUR' | 'AED' }) => void;
}

export default function ClientCreateModal({ onClose, onSave }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [contacts, setContacts] = useState('');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'AED'>('RUB');

  const canSave = companyName.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      companyName: companyName.trim(),
      contacts: contacts.trim(),
      currency,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">Добавить клиента</h3>
            <p className="text-xs text-gray-500 mt-0.5">Заполните данные компании</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Название компании</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ООО Ромашка"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Контакты</label>
            <input
              type="text"
              value={contacts}
              onChange={(e) => setContacts(e.target.value)}
              placeholder="email@company.ru, +7 (495) 123-45-67"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Валюта проектов</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'RUB' | 'USD' | 'EUR' | 'AED')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="RUB">₽ Российский рубль</option>
              <option value="USD">$ Доллар США</option>
              <option value="EUR">€ Евро</option>
              <option value="AED">د.إ Дирхам ОАЭ</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-default"
          >
            Добавить клиента
          </button>
        </div>
      </div>
    </div>
  );
}