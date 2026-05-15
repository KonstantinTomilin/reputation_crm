import { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import type { LinkStatus } from '@/mocks/crm';

type ReportType = 'summary' | 'links' | 'project';
type PaymentFilter = 'all' | 'paid' | 'unpaid' | 'partial';

const allStatuses: LinkStatus[] = [
  'в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено',
  'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing',
  'вернулось', 'на паузе', 'не взято в работу', 'ожидает аудита',
  'новый', 'в аудите', 'аудит выполнен', 'повторно в работе',
  'сдано клиенту', 'принято', 'не принято',
];

const today = new Date('2026-05-01');
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function ClientReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateFrom, setDateFrom] = useState(formatDate(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(formatDate(today));
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<LinkStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [reportGenerated, setReportGenerated] = useState(false);

  const crm = useCRM();
  const mockLinks = crm.links;
  const mockProjects = crm.projects;

  const filteredLinks = useMemo(() => {
    return mockLinks.filter((l) => {
      const matchProject = projectFilter === 'all' || String(l.projectId) === projectFilter;
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      let matchPayment = true;
      if (paymentFilter === 'paid') matchPayment = l.clientPaid === true;
      else if (paymentFilter === 'unpaid') matchPayment = l.clientPaid === false;
      else if (paymentFilter === 'partial') matchPayment = l.clientPaidAmount !== null && l.clientPaidAmount > 0 && l.clientPaidAmount < l.clientCost;
      return matchProject && matchStatus && matchPayment;
    });
  }, [projectFilter, statusFilter, paymentFilter]);

  const handleFilterChange = (setter: (v: any) => void) => (value: any) => {
    setter(value);
    setReportGenerated(false);
  };

  const projectStats = useMemo(() => {
    const stats: Record<number, { name: string; total: number; removed: number; deindexed: number; inWork: number; returned: number; overdue: number; paid: number; unpaid: number; totalCost: number; paidAmount: number }> = {};
    filteredLinks.forEach((l) => {
      const p = mockProjects.find((pr) => pr.id === l.projectId);
      if (!p) return;
      if (!stats[p.id]) {
        stats[p.id] = { name: p.name, total: 0, removed: 0, deindexed: 0, inWork: 0, returned: 0, overdue: 0, paid: 0, unpaid: 0, totalCost: 0, paidAmount: 0 };
      }
      stats[p.id].total++;
      if (l.status === 'удалено') stats[p.id].removed++;
      if (l.status.startsWith('деиндексировано')) stats[p.id].deindexed++;
      if (l.status === 'в работе' || l.status === 'повторно в работе') stats[p.id].inWork++;
      if (l.status === 'вернулось') stats[p.id].returned++;
      if (l.deadline && new Date(l.deadline) < today && !['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing'].includes(l.status)) {
        stats[p.id].overdue++;
      }
      if (l.clientPaid) { stats[p.id].paid++; stats[p.id].paidAmount += l.clientPaidAmount || l.clientCost; }
      else { stats[p.id].unpaid++; }
      stats[p.id].totalCost += l.clientCost;
    });
    return Object.values(stats);
  }, [filteredLinks]);

  const summaryKPI = useMemo(() => {
    const total = filteredLinks.length;
    const removed = filteredLinks.filter((l) => l.status === 'удалено').length;
    const deindexed = filteredLinks.filter((l) => l.status.startsWith('деиндексировано')).length;
    const inWork = filteredLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе').length;
    const returned = filteredLinks.filter((l) => l.status === 'вернулось').length;
    const overdue = filteredLinks.filter((l) => l.deadline && new Date(l.deadline) < today && !['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing'].includes(l.status)).length;
    const quarantine = filteredLinks.filter((l) => l.status === 'в карантине').length;
    const totalCost = filteredLinks.reduce((s, l) => s + l.clientCost, 0);
    const paidAmount = filteredLinks.filter((l) => l.clientPaid).reduce((s, l) => s + (l.clientPaidAmount || l.clientCost), 0);
    return { total, removed, deindexed, inWork, returned, overdue, quarantine, totalCost, paidAmount };
  }, [filteredLinks]);

  const removedLinks = useMemo(() => filteredLinks.filter((l) => l.status === 'удалено'), [filteredLinks]);
  const deindexedLinks = useMemo(() => filteredLinks.filter((l) => l.status.startsWith('деиндексировано')), [filteredLinks]);
  const paidLinks = useMemo(() => filteredLinks.filter((l) => l.clientPaid === true), [filteredLinks]);
  const unpaidLinks = useMemo(() => filteredLinks.filter((l) => l.clientPaid === false), [filteredLinks]);

  const generatePDF = () => {
    const projectName = projectFilter === 'all' ? 'Все проекты' : mockProjects.find((p) => String(p.id) === projectFilter)?.name || '';

    const PRIMARY = '#1e3a8a';
    const PRIMARY_LIGHT = '#e8f1fe';
    const DARK = '#1f2937';
    const BODY = '#374151';
    const MUTED = '#6b7280';
    const LIGHT = '#9ca3af';
    const BORDER = '#e5e7eb';
    const BG = '#f8fafc';
    const WHITE = '#ffffff';
    const RED = '#dc2626';
    const GREEN = '#059669';
    const BLUE = '#2563eb';

    const makeLinkRows = (links: typeof mockLinks) => links.map((l, i) => {
      const payStatus = l.clientPaid ? 'Оплачено' : 'Не оплачено';
      const payAmount = l.clientPaid ? (l.clientPaidAmount || l.clientCost).toLocaleString('ru') + ' ₽' : l.clientCost.toLocaleString('ru') + ' ₽';
      const project = mockProjects.find(p => p.id === l.projectId)?.name || '—';
      return `
        <tr style="background:${i % 2 === 0 ? WHITE : '#f8fafc'}">
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#374151;font-family:Arial,sans-serif">${i + 1}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:11px;color:#6b7280;max-width:260px;word-break:break-all;font-family:Arial,sans-serif">${l.url}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#374151;font-family:Arial,sans-serif">${project}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#374151;font-family:Arial,sans-serif">${l.status}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#374151;font-family:Arial,sans-serif">${l.type}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">${l.startDate || '—'}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">${l.endDate || '—'}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">${l.deadline || '—'}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:${l.clientPaid ? '#059669' : '#dc2626'};font-weight:700;font-family:Arial,sans-serif">${payStatus}</td>
          <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;color:#374151;text-align:right;font-weight:700;font-family:Arial,sans-serif">${payAmount}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="10" style="border-bottom:1px solid #e5e7eb;padding:14px;font-size:13px;text-align:center;color:#9ca3af;font-family:Arial,sans-serif">Нет данных</td></tr>`;

    const makeSectionHTML = (title: string, links: typeof mockLinks, accent: string) => {
      if (links.length === 0) return '';
      return `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="width:3px;height:18px;background:${accent};border-radius:2px"></div>
            <h2 style="font-size:14px;color:#1f2937;margin:0;font-weight:700;font-family:Arial,sans-serif">${title} <span style="color:${accent}">(${links.length})</span></h2>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:${PRIMARY}">
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">№</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Ссылка</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Проект</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Статус</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Тип</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Начало</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Оконч.</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Дедлайн</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Оплата</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:right;font-weight:600;font-family:Arial,sans-serif">Сумма</th>
              </tr>
            </thead>
            <tbody>${makeLinkRows(links)}</tbody>
          </table>
        </div>
      `;
    };

    const makeProjectRows = () => projectStats.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;font-weight:700;color:#1f2937;font-family:Arial,sans-serif">${s.name}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#374151;font-weight:700;font-family:Arial,sans-serif">${s.total}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#059669;font-weight:700;font-family:Arial,sans-serif">${s.removed}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#2563eb;font-weight:700;font-family:Arial,sans-serif">${s.deindexed}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#374151;font-weight:600;font-family:Arial,sans-serif">${s.inWork}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#dc2626;font-weight:700;font-family:Arial,sans-serif">${s.returned}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:center;color:#dc2626;font-weight:700;font-family:Arial,sans-serif">${s.overdue}</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:right;color:#dc2626;font-weight:700;font-family:Arial,sans-serif">${(s.totalCost - s.paidAmount).toLocaleString('ru')} ₽</td>
        <td style="border-bottom:1px solid #e5e7eb;padding:7px 10px;font-size:12px;text-align:right;color:#059669;font-weight:700;font-family:Arial,sans-serif">${s.paidAmount.toLocaleString('ru')} ₽</td>
      </tr>
    `).join('');

    const makeStatusBars = () => {
      const activeStatuses = allStatuses.filter((s) => filteredLinks.some((l) => l.status === s));
      if (activeStatuses.length === 0) return '';
      return `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <div style="width:3px;height:18px;background:${PRIMARY};border-radius:2px"></div>
            <h2 style="font-size:14px;color:#1f2937;margin:0;font-weight:700;font-family:Arial,sans-serif">Распределение по статусам</h2>
          </div>
          <table style="width:100%;border-collapse:collapse">
            ${activeStatuses.map((s) => {
              const count = filteredLinks.filter((l) => l.status === s).length;
              const pct = Math.round((count / (filteredLinks.length || 1)) * 100);
              return `
                <tr>
                  <td style="padding:5px 0;font-size:11px;color:#6b7280;white-space:nowrap;font-family:Arial,sans-serif;width:140px">${s}</td>
                  <td style="padding:5px 10px;font-family:Arial,sans-serif">
                    <div style="width:100%;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden">
                      <div style="height:100%;background:${PRIMARY};border-radius:5px;width:${pct}%"></div>
                    </div>
                  </td>
                  <td style="padding:5px 0;font-size:11px;font-weight:700;color:#374151;text-align:right;font-family:Arial,sans-serif;width:70px;white-space:nowrap">${count} <span style="color:#9ca3af;font-weight:400">(${pct}%)</span></td>
                </tr>
              `;
            }).join('')}
          </table>
        </div>
      `;
    };

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 22px 26px; color: #374151; background: #ffffff; }
      </style>

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h1 style="font-size:20px;margin:0;font-weight:800;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.3px">Отчёт deindex.ru</h1>
        <div style="font-size:11px;color:#9ca3af;font-family:Arial,sans-serif">${formatDate(today)}</div>
      </div>
      <div style="width:100%;height:3px;background:${PRIMARY};border-radius:2px;margin-bottom:14px"></div>

      <!-- Meta block -->
      <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:18px;display:flex;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Проект</div>
          <div style="font-size:12px;color:#1f2937;font-weight:700;font-family:Arial,sans-serif">${projectName}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Период</div>
          <div style="font-size:12px;color:#1f2937;font-weight:600;font-family:Arial,sans-serif">${dateFrom} — ${dateTo}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Всего ссылок</div>
          <div style="font-size:12px;color:#1f2937;font-weight:700;font-family:Arial,sans-serif">${filteredLinks.length}</div>
        </div>
      </div>

      <!-- Project breakdown -->
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:3px;height:18px;background:${PRIMARY};border-radius:2px"></div>
          <h2 style="font-size:14px;color:#1f2937;margin:0;font-weight:700;font-family:Arial,sans-serif">Распределение по проектам</h2>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:${PRIMARY}">
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Проект</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">Всего</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">Удалено</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">Деиндекс.</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">В работе</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">Вернулось</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:center;font-weight:600;font-family:Arial,sans-serif">Просрочено</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:right;font-weight:600;font-family:Arial,sans-serif">К оплате</th>
              <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:right;font-weight:600;font-family:Arial,sans-serif">Оплачено</th>
            </tr>
          </thead>
          <tbody>${makeProjectRows()}</tbody>
        </table>
      </div>

      ${makeSectionHTML('Удалённые ссылки', removedLinks, '#059669')}
      ${makeSectionHTML('Деиндексированные ссылки', deindexedLinks, '#2563eb')}
      ${makeSectionHTML('Оплаченные ссылки', paidLinks, '#059669')}
      ${makeSectionHTML('Неоплаченные ссылки', unpaidLinks, '#dc2626')}
      ${makeStatusBars()}

      <!-- Footer -->
      <div style="margin-top:28px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:#9ca3af;font-family:Arial,sans-serif">deindex.ru CRM · Автоматический отчёт</div>
        <div style="font-size:10px;color:#9ca3af;font-family:Arial,sans-serif">deindex.ru</div>
      </div>
    `;

    const opt = {
      margin: [8, 8],
      filename: `deindex.ru_report_${dateFrom}_${dateTo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  const reportTypeOptions = [
    { id: 'summary', label: 'Сводный отчёт', icon: 'ri-file-chart-2-line' },
    { id: 'links', label: 'По ссылкам', icon: 'ri-links-line' },
    { id: 'project', label: 'По проекту', icon: 'ri-folder-chart-line' },
  ];

  // ─── reusable section header ───
  const SectionHeader = ({ icon, iconColor, iconBg, title, count, countColor, countBg }: {
    icon: string; iconColor: string; iconBg: string; title: string; count: number; countColor: string; countBg: string;
  }) => (
    <div className="px-5 py-3.5 flex items-center justify-between bg-gray-50/50">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${iconBg} flex-shrink-0`}>
          <i className={`${icon} ${iconColor} text-base`} />
        </div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
      </div>
      <span className={`text-sm font-bold ${countColor} ${countBg} px-3 py-1 rounded-full`}>
        {count} шт.
      </span>
    </div>
  );

  // ─── reusable table wrapper ───
  const LinkTable = ({ children }: { children: React.ReactNode }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Тип</th>
          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дата оконч.</th>
          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Оплата</th>
          <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Сумма</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {children}
      </tbody>
    </table>
  );

  return (
    <CRMLayout role="client">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Отчёты</h1>
            <p className="text-sm text-gray-500 mt-0.5">Аналитика и статистика по вашим проектам</p>
          </div>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-download-2-line" />
            </div>
            Скачать PDF
          </button>
        </div>

        {/* Report type + Generate */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl flex-1 shadow-sm">
            {reportTypeOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => { setReportType(t.id as ReportType); setReportGenerated(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all cursor-pointer whitespace-nowrap ${
                  reportType === t.id ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-500 hover:text-blue-900 hover:bg-slate-50'
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={t.icon} />
                </div>
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setReportGenerated(true)}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-file-search-line" />
            </div>
            Сформировать отчёт
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col lg:flex-row gap-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">С</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">По</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</label>
            <select
              value={projectFilter}
              onChange={(e) => handleFilterChange(setProjectFilter)(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white cursor-pointer"
            >
              <option value="all">Все проекты</option>
              {mockProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value as LinkStatus | 'all')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white cursor-pointer"
            >
              <option value="all">Все статусы</option>
              {allStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Оплата</label>
            <select
              value={paymentFilter}
              onChange={(e) => handleFilterChange(setPaymentFilter)(e.target.value as PaymentFilter)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 bg-white cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="paid">Оплачено</option>
              <option value="unpaid">Не оплачено</option>
              <option value="partial">Предоплата</option>
            </select>
          </div>
        </div>

        {/* Results area */}
        {reportGenerated && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Всего ссылок', value: summaryKPI.total, icon: 'ri-links-line', color: 'text-blue-900', bg: 'bg-slate-50', border: 'border-slate-200' },
                { label: 'Удалено', value: summaryKPI.removed, icon: 'ri-delete-bin-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Деиндексировано', value: summaryKPI.deindexed, icon: 'ri-eye-off-line', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'В работе', value: summaryKPI.inWork, icon: 'ri-loader-4-line', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                { label: 'Вернулось', value: summaryKPI.returned, icon: 'ri-arrow-go-back-line', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                { label: 'Просрочено', value: summaryKPI.overdue, icon: 'ri-alarm-warning-line', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
                { label: 'В карантине', value: summaryKPI.quarantine, icon: 'ri-shield-cross-line', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
                { label: 'К оплате', value: `${(summaryKPI.totalCost - summaryKPI.paidAmount).toLocaleString('ru')} ₽`, icon: 'ri-coins-line', color: 'text-blue-900', bg: 'bg-slate-50', border: 'border-slate-200' },
              ].map((kpi) => (
                <div key={kpi.label} className={`bg-white rounded-xl border ${kpi.border} p-4 flex items-center gap-3`}>
                  <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${kpi.bg} flex-shrink-0`}>
                    <i className={`${kpi.icon} ${kpi.color} text-lg`} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                    <div className="text-xs font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SUMMARY REPORT */}
            {reportType === 'summary' && (
              <div className="flex flex-col gap-5">
                {/* Section: Removed Links */}
                {removedLinks.length > 0 && (
                  <div className="bg-white rounded-xl border-l-4 border-emerald-500 border-y border-r border-gray-100 overflow-hidden shadow-sm">
                    <SectionHeader
                      icon="ri-delete-bin-line"
                      iconColor="text-emerald-600"
                      iconBg="bg-emerald-50"
                      title="Удалённые ссылки"
                      count={removedLinks.length}
                      countColor="text-emerald-600"
                      countBg="bg-emerald-50"
                    />
                    <div className="overflow-x-auto">
                      <LinkTable>
                        {removedLinks.map((l) => (
                          <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 max-w-xs">
                              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-blue-900 font-medium text-sm block" title={l.url}>
                                {l.url}
                              </a>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{mockProjects.find(p => p.id === l.projectId)?.name || '—'}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{l.type}</td>
                            <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{l.endDate || '—'}</td>
                            <td className="px-5 py-3">
                              {l.clientPaid ? (
                                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">Оплачено</span>
                              ) : (
                                <span className="text-sm font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full whitespace-nowrap">Не оплачено</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-gray-700 whitespace-nowrap text-sm">{l.clientCost.toLocaleString('ru')} ₽</td>
                          </tr>
                        ))}
                      </LinkTable>
                    </div>
                  </div>
                )}

                {/* Section: Deindexed Links */}
                {deindexedLinks.length > 0 && (
                  <div className="bg-white rounded-xl border-l-4 border-blue-500 border-y border-r border-gray-100 overflow-hidden shadow-sm">
                    <SectionHeader
                      icon="ri-eye-off-line"
                      iconColor="text-blue-600"
                      iconBg="bg-blue-50"
                      title="Деиндексированные ссылки"
                      count={deindexedLinks.length}
                      countColor="text-blue-600"
                      countBg="bg-blue-50"
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дата оконч.</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Оплата</th>
                            <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Сумма</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {deindexedLinks.map((l) => (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 max-w-xs">
                                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-blue-900 font-medium text-sm block" title={l.url}>
                                  {l.url}
                                </a>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">{mockProjects.find(p => p.id === l.projectId)?.name || '—'}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={l.status} type="link" />
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{l.endDate || '—'}</td>
                              <td className="px-5 py-3">
                                {l.clientPaid ? (
                                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">Оплачено</span>
                                ) : (
                                  <span className="text-sm font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full whitespace-nowrap">Не оплачено</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-gray-700 whitespace-nowrap text-sm">{l.clientCost.toLocaleString('ru')} ₽</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Paid Links */}
                {paidLinks.length > 0 && (
                  <div className="bg-white rounded-xl border-l-4 border-emerald-500 border-y border-r border-gray-100 overflow-hidden shadow-sm">
                    <SectionHeader
                      icon="ri-check-double-line"
                      iconColor="text-emerald-600"
                      iconBg="bg-emerald-50"
                      title="Оплаченные ссылки"
                      count={paidLinks.length}
                      countColor="text-emerald-600"
                      countBg="bg-emerald-50"
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дата оплаты</th>
                            <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Сумма оплаты</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {paidLinks.map((l) => (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 max-w-xs">
                                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-blue-900 font-medium text-sm block" title={l.url}>
                                  {l.url}
                                </a>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">{mockProjects.find(p => p.id === l.projectId)?.name || '—'}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={l.status} type="link" />
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{l.clientPaidDate || '—'}</td>
                              <td className="px-5 py-3 text-right font-bold text-emerald-600 whitespace-nowrap text-sm">{(l.clientPaidAmount || l.clientCost).toLocaleString('ru')} ₽</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Unpaid Links */}
                {unpaidLinks.length > 0 && (
                  <div className="bg-white rounded-xl border-l-4 border-rose-500 border-y border-r border-gray-100 overflow-hidden shadow-sm">
                    <SectionHeader
                      icon="ri-coins-line"
                      iconColor="text-rose-500"
                      iconBg="bg-rose-50"
                      title="Неоплаченные ссылки"
                      count={unpaidLinks.length}
                      countColor="text-rose-500"
                      countBg="bg-rose-50"
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дедлайн</th>
                            <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">К оплате</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {unpaidLinks.map((l) => (
                            <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-3 max-w-xs">
                                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-blue-900 font-medium text-sm block" title={l.url}>
                                  {l.url}
                                </a>
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-600">{mockProjects.find(p => p.id === l.projectId)?.name || '—'}</td>
                              <td className="px-5 py-3">
                                <StatusBadge status={l.status} type="link" />
                              </td>
                              <td className="px-5 py-3 text-sm whitespace-nowrap">
                                {l.deadline && new Date(l.deadline) < today ? (
                                  <span className="text-rose-500 font-bold">{l.deadline} <i className="ri-alarm-warning-line" /></span>
                                ) : (
                                  <span className="text-gray-500">{l.deadline || '—'}</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-rose-500 whitespace-nowrap text-sm">{l.clientCost.toLocaleString('ru')} ₽</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Project breakdown */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
                    <h2 className="text-base font-bold text-gray-800">Распределение по проектам</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Всего</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Удалено</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Деиндекс.</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">В работе</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Вернулось</th>
                          <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Просрочено</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">К оплате</th>
                          <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Оплачено</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {projectStats.map((s) => (
                          <tr key={s.name} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-gray-900 text-sm">{s.name}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-gray-700 text-sm">{s.total}</td>
                            <td className="px-5 py-3.5 text-center text-emerald-600 font-bold text-sm">{s.removed}</td>
                            <td className="px-5 py-3.5 text-center text-blue-600 font-bold text-sm">{s.deindexed}</td>
                            <td className="px-5 py-3.5 text-center text-amber-600 font-bold text-sm">{s.inWork}</td>
                            <td className="px-5 py-3.5 text-center text-rose-600 font-bold text-sm">{s.returned}</td>
                            <td className="px-5 py-3.5 text-center text-rose-500 font-bold text-sm">{s.overdue}</td>
                            <td className="px-5 py-3.5 text-right font-bold text-rose-500 text-sm">{(s.totalCost - s.paidAmount).toLocaleString('ru')} ₽</td>
                            <td className="px-5 py-3.5 text-right font-bold text-emerald-600 text-sm">{s.paidAmount.toLocaleString('ru')} ₽</td>
                          </tr>
                        ))}
                        {projectStats.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-5 py-8 text-center text-gray-400 text-sm">
                              Нет данных за выбранный период
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status distribution chart */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-800 mb-5">Распределение по статусам</h2>
                  <div className="flex flex-col gap-3.5">
                    {allStatuses
                      .filter((s) => filteredLinks.some((l) => l.status === s))
                      .map((s) => {
                        const count = filteredLinks.filter((l) => l.status === s).length;
                        const pct = Math.round((count / (filteredLinks.length || 1)) * 100);
                        return (
                          <div key={s} className="flex items-center gap-4">
                            <div className="w-36 text-sm text-gray-600 truncate font-medium">{s}</div>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="w-20 text-right text-sm font-bold text-gray-700">{count} <span className="text-gray-400 font-normal">({pct}%)</span></div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* LINKS REPORT */}
            {reportType === 'links' && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800">Отчёт по ссылкам</h2>
                  <span className="text-sm font-medium text-gray-400">{filteredLinks.length} ссылок</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">№</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Тип</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Начало</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Оконч.</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дедлайн</th>
                        <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Оплата</th>
                        <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLinks.map((l, i) => (
                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-400 font-mono">{i + 1}</td>
                          <td className="px-5 py-3 max-w-xs">
                            <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-blue-900 font-medium text-sm block" title={l.url}>
                              {l.url}
                            </a>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={l.status} type="link" />
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600">{l.type}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{l.startDate || '—'}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{l.endDate || '—'}</td>
                          <td className="px-5 py-3 text-sm whitespace-nowrap">
                            {l.deadline && new Date(l.deadline) < today ? (
                              <span className="text-rose-500 font-bold">{l.deadline} <i className="ri-alarm-warning-line" /></span>
                            ) : (
                              <span className="text-gray-500">{l.deadline || '—'}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {l.clientPaid ? (
                              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full whitespace-nowrap">Оплачено</span>
                            ) : (
                              <span className="text-sm font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full whitespace-nowrap">Не оплачено</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-gray-700 whitespace-nowrap text-sm">
                            {l.clientCost.toLocaleString('ru')} ₽
                          </td>
                        </tr>
                      ))}
                      {filteredLinks.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-8 text-center text-gray-400 text-sm">
                            Нет ссылок по заданным фильтрам
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PROJECT REPORT */}
            {reportType === 'project' && (
              <div className="flex flex-col gap-5">
                {projectStats.map((s) => (
                  <div key={s.name} className="bg-white rounded-xl border-l-4 border-slate-500 border-y border-r border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900">{s.name}</h3>
                      <span className="text-sm font-medium text-gray-400">{s.total} ссылок</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                        <div className="text-xl font-bold text-emerald-600">{s.removed}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">Удалено</div>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                        <div className="text-xl font-bold text-blue-600">{s.deindexed}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">Деиндекс.</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                        <div className="text-xl font-bold text-amber-600">{s.inWork}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">В работе</div>
                      </div>
                      <div className="bg-rose-50 rounded-xl p-4 text-center border border-rose-100">
                        <div className="text-xl font-bold text-rose-600">{s.returned}</div>
                        <div className="text-xs font-medium text-gray-500 mt-1">Вернулось</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-5 text-sm pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">Оплачено:</span>
                        <span className="font-bold text-emerald-600">{s.paidAmount.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">К оплате:</span>
                        <span className="font-bold text-rose-500">{(s.totalCost - s.paidAmount).toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">Просрочено:</span>
                        <span className="font-bold text-rose-500">{s.overdue} шт.</span>
                      </div>
                    </div>
                  </div>
                ))}
                {projectStats.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
                    <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <i className="ri-file-chart-line text-4xl text-slate-200" />
                    </div>
                    Нет данных за выбранный период
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!reportGenerated && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <i className="ri-file-search-line text-4xl text-slate-200" />
            </div>
            Настройте фильтры и нажмите «Сформировать отчёт»
          </div>
        )}
      </div>
    </CRMLayout>
  );
}