import { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import CRMLayout from '@/components/feature/CRMLayout';
import StatusBadge from '@/components/base/StatusBadge';
import type { LinkStatus } from '@/mocks/crm';
import { useCRM } from '@/context/CRMContext';
import { useCurrentExecutorId, getCurrentAuthUser } from '@/hooks/useCurrentExecutor';
import { formatGroupedAmounts, formatMoney, groupAmountsByCurrency } from '@/lib/currency';

export default function ExecutorReportsPage() {
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-05-01');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<LinkStatus | 'all'>('all');
  const [clientDeliveryFilter, setClientDeliveryFilter] = useState<
    'all' | 'delivered_to_admin' | 'delivered_to_client' | 'accepted' | 'rejected' | 'returned' | 'in_progress'
  >('all');
  const [reportGenerated, setReportGenerated] = useState(false);

  const crm = useCRM();
  const executorId = useCurrentExecutorId(crm.users);
  const authUser = getCurrentAuthUser();
  const executor = crm.users.find((u) => u.id === executorId) || crm.users.find((u) => u.email === authUser?.email);
  const allMyLinks = executorId ? crm.links.filter((l) => l.executorId === executorId) : [];

  // Статус сдачи клиенту
  const getClientDeliveryStatus = (status: LinkStatus) => {
    if (status === 'сдано') return { label: 'Сдано админу', code: 'delivered_to_admin', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (status === 'сдано клиенту') return { label: 'Сдано клиенту', code: 'delivered_to_client', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (status === 'принято') return { label: 'Принято клиентом', code: 'accepted', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (status === 'не принято') return { label: 'Не принято', code: 'rejected', color: 'text-rose-600', bg: 'bg-rose-50' };
    if (status === 'вернулось') return { label: 'Вернулось', code: 'returned', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'В работе', code: 'in_progress', color: 'text-gray-500', bg: 'bg-gray-50' };
  };

  const filtered = useMemo(() => {
    return allMyLinks.filter((l) => {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      const added = new Date(l.addedDate);
      const matchDate = added >= from && added <= to;
      const matchProject = projectFilter === 'all' || String(l.projectId) === projectFilter;
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const delivery = getClientDeliveryStatus(l.status);
      const matchDelivery = clientDeliveryFilter === 'all' || delivery.code === clientDeliveryFilter;

      return matchDate && matchProject && matchStatus && matchDelivery;
    });
  }, [allMyLinks, dateFrom, dateTo, projectFilter, statusFilter, clientDeliveryFilter]);

  // KPI
  const completedLinks = filtered.filter((l) =>
    ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing', 'деиндексировано yahoo'].includes(l.status)
  );
  const deliveredToAdmin = filtered.filter((l) => l.status === 'сдано');
  const deliveredToClient = filtered.filter((l) => l.status === 'сдано клиенту');
  const acceptedByClient = filtered.filter((l) => l.status === 'принято');
  const rejectedByClient = filtered.filter((l) => l.status === 'не принято');
  const returnedLinks = filtered.filter((l) => l.status === 'вернулось');
  const inProgressLinks = filtered.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе');

  const totalEarnings = completedLinks.reduce((s, l) => s + l.executorCost, 0);
  const paidEarnings = completedLinks.filter((l) => l.executorPaid).reduce((s, l) => s + l.executorCost, 0);
  const pendingEarnings = totalEarnings - paidEarnings;
  const totalByCurrency = groupAmountsByCurrency(
    completedLinks.map((l) => ({ amount: l.executorCost, currency: crm.projects.find((p) => p.id === l.projectId)?.currency }))
  );
  const paidByCurrency = groupAmountsByCurrency(
    completedLinks.filter((l) => l.executorPaid).map((l) => ({ amount: l.executorCost, currency: crm.projects.find((p) => p.id === l.projectId)?.currency }))
  );

  const projectOptions = useMemo(() => {
    const ids = [...new Set(allMyLinks.map((l) => l.projectId))];
    return ids.map((id) => crm.projects.find((p) => p.id === id)).filter(Boolean) as typeof crm.projects;
  }, [allMyLinks]);

  const generatePDF = () => {
    const projectName = projectFilter === 'all' ? 'Все проекты' : crm.projects.find((p) => String(p.id) === projectFilter)?.name || '';

    const PRIMARY = '#1e3a8a';
    const DARK = '#1f2937';
    const BODY = '#374151';
    const MUTED = '#6b7280';
    const BORDER = '#e5e7eb';
    const WHITE = '#ffffff';
    const RED = '#dc2626';
    const GREEN = '#059669';
    const AMBER = '#d97706';
    const BLUE = '#2563eb';
    const ROSE = '#e11d48';

    const makeRows = (links: typeof filtered) => links.map((l, i) => {
      const project = crm.projects.find((p) => p.id === l.projectId);
      const delivery = getClientDeliveryStatus(l.status);
      const payStatus = l.executorPaid ? 'Оплачено' : 'Не оплачено';
      const payColor = l.executorPaid ? GREEN : RED;
      return `
        <tr style="background:${i % 2 === 0 ? WHITE : '#f8fafc'}">
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${BODY};font-family:Arial,sans-serif">${i + 1}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:11px;color:${MUTED};max-width:260px;word-break:break-all;font-family:Arial,sans-serif">${l.url}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${BODY};font-family:Arial,sans-serif">${project?.name || '—'}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${BODY};font-family:Arial,sans-serif">${l.status}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${BODY};font-family:Arial,sans-serif">${l.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : l.type}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${MUTED};font-family:Arial,sans-serif">${delivery.label}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${MUTED};font-family:Arial,sans-serif">${l.endDate || '—'}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${BODY};text-align:right;font-weight:700;font-family:Arial,sans-serif">${formatMoney(l.executorCost, project?.currency)}</td>
          <td style="border-bottom:1px solid ${BORDER};padding:7px 10px;font-size:12px;color:${payColor};font-weight:700;font-family:Arial,sans-serif">${payStatus}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="9" style="border-bottom:1px solid ${BORDER};padding:14px;font-size:13px;text-align:center;color:${MUTED};font-family:Arial,sans-serif">Нет данных</td></tr>`;

    const makeSectionHTML = (title: string, links: typeof filtered, accent: string) => {
      if (links.length === 0) return '';
      return `
        <div style="margin-bottom:22px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="width:3px;height:18px;background:${accent};border-radius:2px"></div>
            <h2 style="font-size:14px;color:${DARK};margin:0;font-weight:700;font-family:Arial,sans-serif">${title} <span style="color:${accent}">(${links.length})</span></h2>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:${PRIMARY}">
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">№</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Ссылка</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Проект</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Статус</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Тип</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Сдача клиенту</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Оконч.</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:right;font-weight:600;font-family:Arial,sans-serif">Стоимость</th>
                <th style="padding:7px 10px;font-size:11px;color:#ffffff;text-align:left;font-weight:600;font-family:Arial,sans-serif">Выплата</th>
              </tr>
            </thead>
            <tbody>${makeRows(links)}</tbody>
          </table>
        </div>
      `;
    };

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 22px 26px; color: ${BODY}; background: #ffffff; }
      </style>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h1 style="font-size:20px;margin:0;font-weight:800;color:${DARK};font-family:Arial,sans-serif;letter-spacing:-0.3px">Отчёт исполнителя · ${executor?.fullName || ''}</h1>
        <div style="font-size:11px;color:${MUTED};font-family:Arial,sans-serif">${new Date().toISOString().split('T')[0]}</div>
      </div>
      <div style="width:100%;height:3px;background:${PRIMARY};border-radius:2px;margin-bottom:14px"></div>

      <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:18px;display:flex;gap:20px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Проект</div>
          <div style="font-size:12px;color:${DARK};font-weight:700;font-family:Arial,sans-serif">${projectName}</div>
        </div>
        <div>
          <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Период</div>
          <div style="font-size:12px;color:${DARK};font-weight:600;font-family:Arial,sans-serif">${dateFrom} — ${dateTo}</div>
        </div>
        <div>
          <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Всего ссылок</div>
          <div style="font-size:12px;color:${DARK};font-weight:700;font-family:Arial,sans-serif">${filtered.length}</div>
        </div>
        <div>
          <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Заработок</div>
          <div style="font-size:12px;color:${GREEN};font-weight:700;font-family:Arial,sans-serif">${formatGroupedAmounts(totalByCurrency)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:1px;font-family:Arial,sans-serif">Выплачено</div>
          <div style="font-size:12px;color:${BLUE};font-weight:700;font-family:Arial,sans-serif">${formatGroupedAmounts(paidByCurrency)}</div>
        </div>
      </div>

      ${makeSectionHTML('Принято клиентом', acceptedByClient, GREEN)}
      ${makeSectionHTML('Сдано клиенту', deliveredToClient, BLUE)}
      ${makeSectionHTML('Сдано админу', deliveredToAdmin, AMBER)}
      ${makeSectionHTML('Не принято', rejectedByClient, ROSE)}
      ${makeSectionHTML('Вернулось', returnedLinks, RED)}
      ${makeSectionHTML('В работе', inProgressLinks, MUTED)}

      <div style="margin-top:28px;padding-top:10px;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:${MUTED};font-family:Arial,sans-serif">deindex.ru CRM · Автоматический отчёт</div>
        <div style="font-size:10px;color:${MUTED};font-family:Arial,sans-serif">deindex.ru</div>
      </div>
    `;

    const opt = {
      margin: [8, 8],
      filename: `deindex.ru_executor_report_${dateFrom}_${dateTo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  const SectionHeader = ({
    icon,
    iconColor,
    iconBg,
    title,
    count,
    countColor,
    countBg,
  }: {
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    count: number;
    countColor: string;
    countBg: string;
  }) => (
    <div className="px-5 py-3.5 flex items-center justify-between bg-gray-50/50">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${iconBg} flex-shrink-0`}>
          <i className={`${icon} ${iconColor} text-base`} />
        </div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
      </div>
      <span className={`text-sm font-bold ${countColor} ${countBg} px-3 py-1 rounded-full whitespace-nowrap`}>
        {count} шт.
      </span>
    </div>
  );

  const LinkTable = ({ children }: { children: React.ReactNode }) => (
    <table className="w-full text-sm min-w-[900px]">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">URL</th>
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Тип</th>
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Статус работы</th>
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Сдача клиенту</th>
          <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Дата сдачи</th>
          <th className="text-right px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Стоимость</th>
          <th className="text-center px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Выплата</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {children}
      </tbody>
    </table>
  );

  const LinkRow = ({ link }: { link: typeof filtered[0] }) => {
    const project = crm.projects.find((p) => p.id === link.projectId);
    const delivery = getClientDeliveryStatus(link.status);
    return (
      <tr className="hover:bg-gray-50/50 transition-colors">
        <td className="px-4 py-3 max-w-xs">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="truncate text-blue-900 font-medium text-sm block"
            title={link.url}
          >
            {link.url}
          </a>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{project?.name || '—'}</td>
        <td className="px-4 py-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
              link.type === 'удаление'
                ? 'bg-red-100 text-red-700'
                : link.type === 'деиндексация'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}
          </span>
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={link.status} type="link" />
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${delivery.bg} ${delivery.color}`}>
            {delivery.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{link.endDate || '—'}</td>
        <td className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap text-sm">
          {formatMoney(link.executorCost, crm.projects.find((p) => p.id === link.projectId)?.currency)}
        </td>
        <td className="px-4 py-3 text-center">
          {link.executorPaid ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
              <i className="ri-checkbox-circle-fill" /> Да
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
              <i className="ri-close-circle-line" /> Нет
            </span>
          )}
        </td>
      </tr>
    );
  };

  const makeSection = (
    title: string,
    links: typeof filtered,
    icon: string,
    iconColor: string,
    iconBg: string,
    countColor: string,
    countBg: string,
    accentBorder: string
  ) => {
    if (links.length === 0) return null;
    return (
      <div className={`bg-white rounded-xl border-l-4 ${accentBorder} border-y border-r border-gray-100 overflow-hidden shadow-sm`}>
        <SectionHeader
          icon={icon}
          iconColor={iconColor}
          iconBg={iconBg}
          title={title}
          count={links.length}
          countColor={countColor}
          countBg={countBg}
        />
        <div className="overflow-x-auto">
          <LinkTable>
            {links.map((l) => (
              <LinkRow key={l.id} link={l} />
            ))}
          </LinkTable>
        </div>
      </div>
    );
  };

  return (
    <CRMLayout role="executor">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Отчёты</h1>
            <p className="text-sm text-gray-500 mt-0.5">Статистика выполненных задач, сдачи клиенту и выплат</p>
          </div>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-download-2-line" />
            </div>
            Скачать PDF
          </button>
        </div>

        {!executorId && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            Не удалось определить текущего исполнителя. Выйдите и войдите снова.
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col lg:flex-row gap-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">С</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setReportGenerated(false); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">По</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setReportGenerated(false); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</label>
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setReportGenerated(false); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все проекты</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Статус работы</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as LinkStatus | 'all'); setReportGenerated(false); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все статусы</option>
              <option value="удалено">Удалено</option>
              <option value="деиндексировано google">Деиндексировано Google</option>
              <option value="деиндексировано yandex">Деиндексировано Яндекс</option>
              <option value="в работе">В работе</option>
              <option value="сдано">Сдано</option>
              <option value="сдано клиенту">Сдано клиенту</option>
              <option value="принято">Принято</option>
              <option value="не принято">Не принято</option>
              <option value="вернулось">Вернулось</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Сдача клиенту</label>
            <select
              value={clientDeliveryFilter}
              onChange={(e) => { setClientDeliveryFilter(e.target.value as any); setReportGenerated(false); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="accepted">Принято клиентом</option>
              <option value="delivered_to_client">Сдано клиенту</option>
              <option value="delivered_to_admin">Сдано админу</option>
              <option value="rejected">Не принято</option>
              <option value="returned">Вернулось</option>
              <option value="in_progress">В работе</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 justify-end">
            <button
              onClick={() => setReportGenerated(true)}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-file-search-line" />
              </div>
              Сформировать
            </button>
          </div>
        </div>

        {/* KPI - only after generated */}
        {reportGenerated && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Всего задач', value: filtered.length, icon: 'ri-task-line', color: 'text-blue-900', bg: 'bg-slate-50' },
                { label: 'Принято клиентом', value: acceptedByClient.length, icon: 'ri-check-double-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Сдано клиенту', value: deliveredToClient.length, icon: 'ri-send-plane-line', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'В работе', value: inProgressLinks.length, icon: 'ri-loader-4-line', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Вернулось', value: returnedLinks.length, icon: 'ri-arrow-go-back-line', color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
                    <i className={`${s.icon} ${s.color} text-lg`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Общий заработок</div>
                <div className="text-2xl font-bold text-gray-800">{formatGroupedAmounts(totalByCurrency)}</div>
                <div className="text-xs text-gray-500 mt-1">за выполненные ссылки</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Выплачено</div>
                <div className="text-2xl font-bold text-gray-800">{formatGroupedAmounts(paidByCurrency)}</div>
                <div className="text-xs text-gray-500 mt-1">переведено на счёт</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                <div className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Ожидает выплаты</div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatGroupedAmounts(
                    groupAmountsByCurrency(
                      completedLinks
                        .filter((l) => !l.executorPaid)
                        .map((l) => ({ amount: l.executorCost, currency: crm.projects.find((p) => p.id === l.projectId)?.currency }))
                    )
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">запланировано к выплате</div>
              </div>
            </div>

            {/* Sections by client delivery status */}
            <div className="flex flex-col gap-5">
              {makeSection(
                'Принято клиентом',
                acceptedByClient,
                'ri-check-double-line',
                'text-emerald-600',
                'bg-emerald-50',
                'text-emerald-600',
                'bg-emerald-50',
                'border-emerald-500'
              )}
              {makeSection(
                'Сдано клиенту',
                deliveredToClient,
                'ri-send-plane-line',
                'text-blue-600',
                'bg-blue-50',
                'text-blue-600',
                'bg-blue-50',
                'border-blue-500'
              )}
              {makeSection(
                'Сдано админу',
                deliveredToAdmin,
                'ri-upload-cloud-line',
                'text-amber-600',
                'bg-amber-50',
                'text-amber-600',
                'bg-amber-50',
                'border-amber-500'
              )}
              {makeSection(
                'Не принято',
                rejectedByClient,
                'ri-close-circle-line',
                'text-rose-600',
                'bg-rose-50',
                'text-rose-600',
                'bg-rose-50',
                'border-rose-500'
              )}
              {makeSection(
                'Вернулось',
                returnedLinks,
                'ri-arrow-go-back-line',
                'text-orange-600',
                'bg-orange-50',
                'text-orange-600',
                'bg-orange-50',
                'border-orange-500'
              )}
              {makeSection(
                'В работе',
                inProgressLinks,
                'ri-loader-4-line',
                'text-gray-500',
                'bg-gray-50',
                'text-gray-500',
                'bg-gray-50',
                'border-gray-400'
              )}

              {filtered.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
                  Нет данных за выбранный период
                </div>
              )}
            </div>
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