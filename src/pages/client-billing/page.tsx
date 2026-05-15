import { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import CRMLayout from '@/components/feature/CRMLayout';
import type { CRMLink } from '@/mocks/crm';
import { useCRM } from '@/context/CRMContext';

const plans = [
  {
    id: 'starter',
    name: 'Стартер',
    price: 9900,
    period: 'мес',
    features: ['До 20 ссылок в работе', '1 проект', 'Email поддержка', 'Базовая аналитика'],
    badge: null,
  },
  {
    id: 'business',
    name: 'Бизнес',
    price: 29900,
    period: 'мес',
    features: ['До 100 ссылок в работе', '5 проектов', 'Приоритетная поддержка', 'Расширенная аналитика', 'PDF-отчёты'],
    badge: 'Популярный',
    current: true,
  },
  {
    id: 'enterprise',
    name: 'Корпоративный',
    price: 79900,
    period: 'мес',
    features: ['Неограниченные ссылки', 'Неограниченные проекты', 'Персональный менеджер', 'API-доступ', 'White-label отчёты', 'SLA 99.9%'],
    badge: null,
  },
];

const mockInvoices = [
  { id: 'INV-2024-048', date: '2024-12-01', amount: 29900, status: 'оплачен', period: 'Декабрь 2024' },
  { id: 'INV-2024-039', date: '2024-11-01', amount: 29900, status: 'оплачен', period: 'Ноябрь 2024' },
  { id: 'INV-2024-031', date: '2024-10-01', amount: 29900, status: 'оплачен', period: 'Октябрь 2024' },
  { id: 'INV-2024-022', date: '2024-09-01', amount: 14900, status: 'оплачен', period: 'Сентябрь 2024' },
  { id: 'INV-2024-014', date: '2024-08-01', amount: 14900, status: 'оплачен', period: 'Август 2024' },
];

type ReceiptFilter = 'all' | 'paid' | 'unpaid';

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function ClientBillingPage() {
  const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'receipts' | 'plans'>('overview');
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('all');
  const [receiptProject, setReceiptProject] = useState<string>('all');

  const crm = useCRM();
  const receipts = useMemo(() => {
    return crm.links
      .filter((l) => {
        if (receiptProject !== 'all' && String(l.projectId) !== receiptProject) return false;
        if (receiptFilter === 'paid') return l.clientPaid === true;
        if (receiptFilter === 'unpaid') return l.clientPaid === false;
        return true;
      })
      .map((l) => ({
        id: l.id,
        url: l.url,
        projectName: crm.projects.find((p) => p.id === l.projectId)?.name || '—',
        status: l.status,
        type: l.type,
        cost: l.clientCost,
        paid: l.clientPaid,
        paidAmount: l.clientPaidAmount || 0,
        paidDate: l.clientPaidDate,
        debt: l.clientPaid ? 0 : l.clientCost,
      }));
  }, [crm, receiptFilter, receiptProject]);

  const totalDebt = receipts.reduce((s, r) => s + r.debt, 0);
  const totalPaid = receipts.filter((r) => r.paid).reduce((s, r) => s + r.paidAmount, 0);
  const totalCost = receipts.reduce((s, r) => s + r.cost, 0);

  const downloadReceiptPDF = (linkId: number) => {
    const link = crm.links.find((l) => l.id === linkId);
    if (!link) return;
    const project = crm.projects.find((p) => p.id === link.projectId);
    const isPaid = link.clientPaid;
    const amount = link.clientPaidAmount || link.clientCost;

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin: 0; color: #0f172a; }
        .header p { font-size: 12px; color: #666; margin: 5px 0 0; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 15px 0; }
        .badge-paid { background: #dcfce7; color: #16a34a; }
        .badge-unpaid { background: #fee2e2; color: #dc2626; }
        .stamp { width: 80px; height: 80px; border: 3px solid #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 11px; font-weight: bold; text-align: center; margin: 20px auto; transform: rotate(-12deg); opacity: ${isPaid ? '0.7' : '0'}; }
        .field { margin-bottom: 15px; }
        .field-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
        .field-value { font-size: 14px; font-weight: 600; }
        .url { font-size: 12px; word-break: break-all; color: #1e3a8a; }
        .total { background: #f1f5f9; padding: 20px; border-radius: 12px; margin-top: 25px; text-align: center; }
        .total-amount { font-size: 28px; font-weight: bold; color: #0f172a; }
        .total-label { font-size: 12px; color: #666; margin-top: 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
      </style>
      <div class="header">
        <h1>Квитанция deindex.ru</h1>
        <p>CRM-система управления репутацией</p>
      </div>
      <div style="text-align:center">
        <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
          ${isPaid ? 'ОПЛАЧЕНО' : 'НЕ ОПЛАЧЕНО'}
        </span>
      </div>
      <div class="stamp">${isPaid ? 'ОПЛАЧЕНО' : ''}</div>
      <div class="field">
        <div class="field-label">Номер квитанции</div>
        <div class="field-value">DPC-${String(link.id).padStart(5, '0')}</div>
      </div>
      <div class="field">
        <div class="field-label">Проект</div>
        <div class="field-value">${project?.name || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Ссылка</div>
        <div class="field-value url">${link.url}</div>
      </div>
      <div class="field">
        <div class="field-label">Тип работы</div>
        <div class="field-value">${link.type}</div>
      </div>
      <div class="field">
        <div class="field-label">Статус ссылки</div>
        <div class="field-value">${link.status}</div>
      </div>
      <div class="field">
        <div class="field-label">Дата</div>
        <div class="field-value">${link.clientPaidDate || formatDate(new Date())}</div>
      </div>
      <div class="total">
        <div class="total-amount">${amount.toLocaleString('ru')} ₽</div>
        <div class="total-label">${isPaid ? 'Сумма оплаты' : 'Сумма к оплате'}</div>
      </div>
      <div class="footer">
        deindex.ru CRM · Квитанция сформирована автоматически<br>
        По всем вопросам: billing@deindex.ru
      </div>
    `;

    const opt = {
      margin: [10, 10],
      filename: `deindex.ru_receipt_${String(link.id).padStart(5, '0')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  const downloadInvoicePDF = (invoice: typeof mockInvoices[0]) => {
    const company = {
      name: 'ООО "ДениПро"',
      inn: '7701234567',
      kpp: '770101001',
      address: 'г. Москва, ул. Примерная, д. 10, офис 42',
      phone: '+7 (495) 123-45-67',
      email: 'billing@denypro.ru',
    };

    const client = {
      name: 'ООО "Клиент"',
      inn: '7709876543',
      kpp: '770102002',
      address: 'г. Москва, ул. Клиентская, д. 5',
    };

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #222; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; }
        .header-left h1 { font-size: 22px; margin: 0 0 5px; color: #0f172a; }
        .header-left p { font-size: 11px; color: #666; margin: 2px 0; }
        .header-right { text-align: right; }
        .invoice-num { font-size: 18px; font-weight: bold; color: #1e3a8a; }
        .invoice-date { font-size: 12px; color: #666; margin-top: 4px; }
        .parties { display: flex; gap: 40px; margin-bottom: 30px; }
        .party { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; }
        .party-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 8px; font-weight: bold; }
        .party-name { font-size: 14px; font-weight: bold; color: #334155; margin-bottom: 6px; }
        .party-field { font-size: 11px; color: #475569; margin-bottom: 3px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .table th { background: #f1f5f9; color: #1e3a8a; font-size: 11px; text-transform: uppercase; padding: 10px 8px; text-align: left; border-bottom: 2px solid #1e3a8a; }
        .table td { padding: 10px 8px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
        .table td.num { text-align: right; font-family: monospace; }
        .totals { width: 300px; margin-left: auto; margin-bottom: 30px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
        .totals-row.grand { font-size: 16px; font-weight: bold; color: #0f172a; border-top: 2px solid #1e3a8a; margin-top: 6px; padding-top: 10px; }
        .stamp { width: 100px; height: 100px; border: 3px solid #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #16a34a; font-size: 12px; font-weight: bold; text-align: center; transform: rotate(-12deg); opacity: ${invoice.status === 'оплачен' ? '0.6' : '0'}; margin: 20px auto; }
        .footer { text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; }
        .bank-details { background: #fafafa; border: 1px solid #eee; border-radius: 10px; padding: 15px; margin-bottom: 25px; }
        .bank-details h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #666; }
        .bank-row { font-size: 11px; color: #555; margin-bottom: 3px; }
      </style>
      <div class="header">
        <div class="header-left">
          <h1>Счёт на оплату</h1>
          <p>${company.name}</p>
          <p>ИНН ${company.inn} / КПП ${company.kpp}</p>
          <p>${company.address}</p>
          <p>Тел: ${company.phone} · ${company.email}</p>
        </div>
        <div class="header-right">
          <div class="invoice-num">${invoice.id}</div>
          <div class="invoice-date">Дата: ${invoice.date}</div>
          <div style="margin-top:8px">
            <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${invoice.status === 'оплачен' ? '#dcfce7' : '#fee2e2'};color:${invoice.status === 'оплачен' ? '#16a34a' : '#dc2626'}">
              ${invoice.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <div class="party-label">Поставщик</div>
          <div class="party-name">${company.name}</div>
          <div class="party-field">ИНН: ${company.inn}</div>
          <div class="party-field">КПП: ${company.kpp}</div>
          <div class="party-field">${company.address}</div>
        </div>
        <div class="party">
          <div class="party-label">Покупатель</div>
          <div class="party-name">${client.name}</div>
          <div class="party-field">ИНН: ${client.inn}</div>
          <div class="party-field">КПП: ${client.kpp}</div>
          <div class="party-field">${client.address}</div>
        </div>
      </div>
      <div class="bank-details">
        <h4>Банковские реквизиты</h4>
        <div class="bank-row">Р/с: 40702810100000004512 в ПАО СБЕРБАНК РОССИИ, г. Москва</div>
        <div class="bank-row">К/с: 30101810400000000225</div>
        <div class="bank-row">БИК: 044525225</div>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th class="num">Кол-во</th>
            <th class="num">Цена</th>
            <th class="num">Сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Услуги по управлению репутацией — период ${invoice.period}</td>
            <td class="num">1</td>
            <td class="num">${invoice.amount.toLocaleString('ru')} ₽</td>
            <td class="num">${invoice.amount.toLocaleString('ru')} ₽</td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Итого:</span><span>${invoice.amount.toLocaleString('ru')} ₽</span></div>
        <div class="totals-row"><span>Без налога (НДС):</span><span>0 ₽</span></div>
        <div class="totals-row grand"><span>Всего к оплате:</span><span>${invoice.amount.toLocaleString('ru')} ₽</span></div>
      </div>
      <div class="stamp">${invoice.status === 'оплачен' ? 'ОПЛАЧЕНО' : ''}</div>
      <div style="font-size:12px;color:#444;margin-bottom:20px">
        <strong>Всего к оплате:</strong> ${invoice.amount.toLocaleString('ru')} рублей 00 копеек
      </div>
      <div class="footer">
        Счёт сформирован автоматически в deindex.ru CRM<br>
        По вопросам: ${company.email} · ${company.phone}
      </div>
    `;

    const opt = {
      margin: [10, 10],
      filename: `${invoice.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: 'ri-home-3-line' },
    { id: 'invoices', label: 'Счета', icon: 'ri-receipt-line' },
    { id: 'receipts', label: 'Квитанции', icon: 'ri-file-list-3-line' },
    { id: 'plans', label: 'Тарифы', icon: 'ri-price-tag-3-line' },
  ];

  return (
    <CRMLayout role="client">
      <div className="p-6 flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Счёт и тариф</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление подпиской, счетами и квитанциями</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setBillingTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                billingTab === t.id ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-blue-900 hover:bg-slate-50'
              }`}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className={t.icon} />
              </div>
              {t.label}
            </button>
          ))}
        </div>

        {billingTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current plan */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-slate-200 text-xs font-semibold uppercase tracking-widest mb-1">Текущий тариф</div>
                    <div className="text-2xl font-bold">Бизнес</div>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Активен</div>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-bold">29 900 ₽</span>
                  <span className="text-slate-200 text-sm">/ месяц</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-slate-200 text-xs mb-1">Следующее списание</div>
                    <div className="font-semibold">01.06.2026</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <div className="text-slate-200 text-xs mb-1">Дата подключения</div>
                    <div className="font-semibold">01.08.2024</div>
                  </div>
                </div>
              </div>

              {/* Usage */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Использование</h3>
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Ссылок в работе', current: 43, max: 100, color: 'bg-slate-500' },
                    { label: 'Активных проектов', current: 4, max: 5, color: 'bg-blue-500' },
                    { label: 'Отчётов скачано', current: 12, max: 50, color: 'bg-green-500' },
                  ].map((u) => (
                    <div key={u.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-600">{u.label}</span>
                        <span className="font-semibold text-gray-800">{u.current} / {u.max}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${u.color} rounded-full transition-all`} style={{ width: `${(u.current / u.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial summary + last invoice */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Финансовая сводка</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Оплачено за ссылки</span>
                    <span className="text-sm font-bold text-green-600">{totalPaid.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Задолженность</span>
                    <span className="text-sm font-bold text-red-500">{totalDebt.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Всего на счету</span>
                    <span className="text-sm font-bold text-gray-800">{totalCost.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="h-px bg-gray-100 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Тариф</span>
                    <span className="text-sm font-bold text-gray-800">29 900 ₽/мес</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Последний счёт</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-700">{mockInvoices[0].id}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{mockInvoices[0].period}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{mockInvoices[0].amount.toLocaleString('ru')} ₽</div>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{mockInvoices[0].status}</span>
                  </div>
                </div>
                <button
                  onClick={() => downloadInvoicePDF(mockInvoices[0])}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-blue-900 border border-slate-200 rounded-lg py-2 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-download-2-line" />
                  </div>
                  Скачать PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {billingTab === 'invoices' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <h2 className="font-semibold text-gray-800">История счетов</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Номер</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Период</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Скачать</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{inv.id}</td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium">{inv.period}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{inv.date}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-800">{inv.amount.toLocaleString('ru-RU')} ₽</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{inv.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => downloadInvoicePDF(inv)}
                          className="flex items-center gap-1.5 text-xs text-blue-900 hover:text-blue-800 font-medium bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap mx-auto"
                        >
                          <div className="w-3.5 h-3.5 flex items-center justify-center">
                            <i className="ri-download-2-line" />
                          </div>
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {billingTab === 'receipts' && (
          <div className="flex flex-col gap-5">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-2xl font-bold text-gray-800">{receipts.length}</div>
                <div className="text-xs text-gray-400 mt-0.5">Всего квитанций</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-2xl font-bold text-green-600">{receipts.filter((r) => r.paid).length}</div>
                <div className="text-xs text-gray-400 mt-0.5">Оплачено</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-2xl font-bold text-red-500">{receipts.filter((r) => !r.paid).length}</div>
                <div className="text-xs text-gray-400 mt-0.5">Не оплачено</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-2xl font-bold text-blue-900">{totalDebt.toLocaleString('ru')} ₽</div>
                <div className="text-xs text-gray-400 mt-0.5">Задолженность</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'paid', 'unpaid'] as ReceiptFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setReceiptFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      receiptFilter === f ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'Все' : f === 'paid' ? 'Оплачено' : 'Не оплачено'}
                  </button>
                ))}
              </div>
              <select
                value={receiptProject}
                onChange={(e) => setReceiptProject(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
              >
                <option value="all">Все проекты</option>
                {crm.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Receipts table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">№</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Проект</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">URL</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Сумма</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Квитанция</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {receipts.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{r.projectName}</td>
                        <td className="px-5 py-3.5 max-w-xs">
                          <span className="truncate text-blue-900 text-xs block" title={r.url}>{r.url}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600">{r.type}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-gray-800">{r.cost.toLocaleString('ru')} ₽</td>
                        <td className="px-5 py-3.5 text-center">
                          {r.paid ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">Оплачено</span>
                              {r.paidDate && <span className="text-xs text-gray-400 mt-0.5">{r.paidDate}</span>}
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">Не оплачено</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => downloadReceiptPDF(r.id)}
                            className="flex items-center gap-1.5 text-xs text-blue-900 hover:text-blue-800 font-medium bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap mx-auto"
                          >
                            <div className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className="ri-download-2-line" />
                            </div>
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                    {receipts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                          Нет квитанций по заданным фильтрам
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {billingTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative transition-all ${
                  plan.current ? 'border-slate-500' : 'border-slate-200 hover:border-slate-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                {plan.current && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Текущий
                  </div>
                )}
                <div className="mb-4">
                  <div className="text-lg font-bold text-gray-800">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-gray-800">{plan.price.toLocaleString('ru-RU')} ₽</span>
                    <span className="text-gray-400 text-sm">/ {plan.period}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <i className="ri-check-line text-slate-500 font-bold" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    plan.current
                      ? 'bg-slate-50 text-blue-900 cursor-default'
                      : 'bg-blue-900 hover:bg-blue-800 text-white'
                  }`}
                >
                  {plan.current ? 'Активный тариф' : 'Перейти'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
