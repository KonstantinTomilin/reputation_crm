import { useState, useMemo, useRef, useCallback } from 'react';
// @ts-expect-error no types for html2pdf.js
import html2pdf from 'html2pdf.js';
import type { CRMLink, CRMPayment } from '@/mocks/crm';
import { formatMoney, getCurrencySymbol } from '@/lib/currency';

interface Props {
  links: CRMLink[];
  payments: CRMPayment[];
}

type ReportPeriod = 'month' | 'year' | 'range';

const months = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const years = Array.from({ length: 7 }, (_, i) => 2024 + i);

const deliveredStatuses = [
  'удалено',
  'принято',
  'сдано',
  'сдано клиенту',
  'отправлено клиенту',
  'деиндексировано google',
  'деиндексировано yandex',
  'деиндексировано bing',
  'частично деиндексировано',
];
const RUB_SYMBOL = getCurrencySymbol('RUB');

function getPeriodFilter(
  d: Date,
  periodType: ReportPeriod,
  year: number,
  month: number,
  dateFrom: string,
  dateTo: string
) {
  if (periodType === 'year') {
    return d.getFullYear() === year;
  }
  if (periodType === 'range') {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && to) return d >= from && d <= to;
    if (from) return d >= from;
    if (to) return d <= to;
    return true;
  }
  return d.getFullYear() === year && d.getMonth() === month;
}

interface Stats {
  deliveredCount: number;
  inProgressCount: number;
  clientRevenue: number;
  executorPayouts: number;
  income: number;
  expense: number;
  profit: number;
  clientPaidLinksSum: number;
  executorPaidLinksSum: number;
  payoutSharePercent: number;
}

function computeStats(
  links: CRMLink[],
  payments: CRMPayment[],
  periodType: ReportPeriod,
  year: number,
  month: number,
  dateFrom: string,
  dateTo: string
): Stats {
  const periodPayments = payments.filter((p) =>
    getPeriodFilter(new Date(p.date), periodType, year, month, dateFrom, dateTo)
  );
  const periodLinks = links.filter((l) => {
    const d = l.endDate ? new Date(l.endDate) : null;
    if (!d) return false;
    return getPeriodFilter(d, periodType, year, month, dateFrom, dateTo);
  });

  const deliveredLinks = periodLinks.filter((l) => deliveredStatuses.includes(l.status));
  const linksInProgress = periodLinks.filter((l) => l.status === 'в работе');

  const clientRevenue = periodPayments
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
    .reduce((s, p) => s + p.amount, 0);

  const executorPayouts = periodPayments
    .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
    .reduce((s, p) => s + p.amount, 0);

  const clientPaidLinksSum = deliveredLinks.reduce((s, l) => s + (l.clientPaid ? l.clientCost : 0), 0);
  const executorPaidLinksSum = deliveredLinks.reduce((s, l) => s + (l.executorPaid ? l.executorCost : 0), 0);

  return {
    deliveredCount: deliveredLinks.length,
    inProgressCount: linksInProgress.length,
    clientRevenue,
    executorPayouts,
    income: clientRevenue,
    expense: executorPayouts,
    profit: clientRevenue - executorPayouts,
    clientPaidLinksSum,
    executorPaidLinksSum,
    payoutSharePercent: clientRevenue > 0 ? Math.round((executorPayouts / clientRevenue) * 100) : 0,
  };
}

function getDeliveredLinks(
  links: CRMLink[],
  periodType: ReportPeriod,
  year: number,
  month: number,
  dateFrom: string,
  dateTo: string
) {
  return links.filter((l) => {
    const d = l.endDate ? new Date(l.endDate) : null;
    if (!d) return false;
    return getPeriodFilter(d, periodType, year, month, dateFrom, dateTo) && deliveredStatuses.includes(l.status);
  });
}

export default function FinanceReportTab({ links, payments }: Props) {
  const [periodType, setPeriodType] = useState<ReportPeriod>('month');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(4);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareYear, setCompareYear] = useState(2025);
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentStats = useMemo(
    () => computeStats(links, payments, periodType, selectedYear, selectedMonth, dateFrom, dateTo),
    [links, payments, periodType, selectedYear, selectedMonth, dateFrom, dateTo]
  );

  const compareStats = useMemo(() => {
    if (!compareEnabled) return null;
    if (periodType === 'range') {
      if (!dateFrom || !dateTo) return null;
      const yearDiff = selectedYear - compareYear;
      const shiftedFrom = new Date(dateFrom);
      const shiftedTo = new Date(dateTo);
      shiftedFrom.setFullYear(shiftedFrom.getFullYear() - yearDiff);
      shiftedTo.setFullYear(shiftedTo.getFullYear() - yearDiff);
      return computeStats(
        links,
        payments,
        'range',
        compareYear,
        selectedMonth,
        shiftedFrom.toISOString().split('T')[0],
        shiftedTo.toISOString().split('T')[0]
      );
    }
    return computeStats(links, payments, periodType, compareYear, selectedMonth, dateFrom, dateTo);
  }, [links, payments, periodType, selectedYear, selectedMonth, dateFrom, dateTo, compareEnabled, compareYear]);

  const deliveredLinks = useMemo(
    () => getDeliveredLinks(links, periodType, selectedYear, selectedMonth, dateFrom, dateTo),
    [links, periodType, selectedYear, selectedMonth, dateFrom, dateTo]
  );

  const periodLabel =
    periodType === 'year'
      ? `${selectedYear} год`
      : periodType === 'range'
        ? dateFrom && dateTo
          ? `${dateFrom} — ${dateTo}`
          : dateFrom
            ? `с ${dateFrom}`
            : dateTo
              ? `по ${dateTo}`
              : 'Все время'
        : `${months[selectedMonth]} ${selectedYear}`;

  const comparePeriodLabel =
    periodType === 'year'
      ? `${compareYear} год`
      : periodType === 'range'
        ? 'Аналогичный период'
        : `${months[selectedMonth]} ${compareYear}`;

  const diffStyle = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 'text-green-600' : 'text-gray-400';
    const pct = ((current - previous) / previous) * 100;
    if (pct > 0) return 'text-green-600';
    if (pct < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const diffText = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '↑ 100%' : '0%';
    const pct = ((current - previous) / previous) * 100;
    const sign = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
    return `${sign} ${Math.abs(pct).toFixed(1)}%`;
  };

  const diffAbs = (current: number, previous: number) => {
    const val = current - previous;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toLocaleString('ru')}`;
  };

  const handleDownloadPDF = useCallback(() => {
    const el = reportRef.current;
    if (!el) return;
    setPdfLoading(true);

    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, select, input').forEach((node) => {
      (node as HTMLElement).style.display = 'none';
    });

    const header = document.createElement('div');
    header.innerHTML = `<div style="font-family:Arial,sans-serif;padding:16px 0 8px;text-align:center;border-bottom:2px solid #eee;margin-bottom:16px;">
      <h1 style="font-size:20px;margin:0;color:#111;font-weight:bold;">Финансовый отчёт</h1>
      <p style="font-size:12px;color:#666;margin-top:4px;">${periodLabel}${compareEnabled ? ` · Сравнение: ${comparePeriodLabel}` : ''}</p>
      <p style="font-size:11px;color:#999;">Сформирован: ${new Date().toLocaleString('ru-RU')} · deindex.ru CRM</p>
    </div>`;

    const wrapper = document.createElement('div');
    wrapper.style.fontFamily = 'Arial, sans-serif';
    wrapper.style.padding = '0 16px 16px';
    wrapper.appendChild(header);
    wrapper.appendChild(clone);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `finance_report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    html2pdf()
      .set(opt)
      .from(wrapper)
      .save()
      .then(() => setPdfLoading(false))
      .catch(() => setPdfLoading(false));
  }, [periodLabel, compareEnabled, comparePeriodLabel]);

  const canCompare = periodType === 'year' || periodType === 'month' || (periodType === 'range' && !!dateFrom && !!dateTo);

  const mainCard = (
    title: string,
    value: number,
    icon: string,
    iconColor: string,
    bgClass: string,
    compareValue?: number | null
  ) => (
    <div className={`${bgClass} rounded-xl border border-opacity-20 p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/70">
          <i className={`${icon} ${iconColor} text-xl`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</div>
          <div className="text-2xl font-bold text-gray-800 truncate">{formatMoney(value, 'RUB')}</div>
        </div>
      </div>
      {compareEnabled && compareValue !== undefined && compareValue !== null && (
        <div className="mt-2 pt-2 border-t border-black/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 truncate">{comparePeriodLabel}</span>
            <span className={`text-xs font-bold whitespace-nowrap ${diffStyle(value, compareValue)}`}>
              {formatMoney(compareValue, 'RUB')} ({diffText(value, compareValue)})
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const comparisonRows = [
    { label: 'Доход', current: currentStats.income, prev: compareStats?.income ?? 0 },
    { label: 'Расход', current: currentStats.expense, prev: compareStats?.expense ?? 0 },
    { label: 'Прибыль', current: currentStats.profit, prev: compareStats?.profit ?? 0 },
    { label: 'Сдано ссылок', current: currentStats.deliveredCount, prev: compareStats?.deliveredCount ?? 0 },
    { label: 'В работе', current: currentStats.inProgressCount, prev: compareStats?.inProgressCount ?? 0 },
    { label: 'Оплачено клиентами', current: currentStats.clientRevenue, prev: compareStats?.clientRevenue ?? 0 },
    { label: 'Выплачено исполнителям', current: currentStats.executorPayouts, prev: compareStats?.executorPayouts ?? 0 },
    { label: 'Оплата по сданным ссылкам', current: currentStats.clientPaidLinksSum, prev: compareStats?.clientPaidLinksSum ?? 0 },
    { label: 'Выплаты по сданным ссылкам', current: currentStats.executorPaidLinksSum, prev: compareStats?.executorPaidLinksSum ?? 0 },
    { label: 'Доля выплат от выручки', current: currentStats.payoutSharePercent, prev: compareStats?.payoutSharePercent ?? 0, isPercent: true },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Period selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
          {(['month', 'year', 'range'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPeriodType(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                periodType === t ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'month' ? 'Месяц' : t === 'year' ? 'Год' : 'Диапазон'}
            </button>
          ))}
        </div>

        {periodType !== 'range' && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        {periodType === 'month' && (
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        )}

        {periodType === 'range' && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
            <span className="text-sm text-gray-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Сбросить
            </button>
          </>
        )}

        <span className="text-sm text-gray-500 lg:ml-auto">
          Отчётный период: <strong className="text-gray-700">{periodLabel}</strong>
        </span>

        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        >
          {pdfLoading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-file-download-line" />}
          {pdfLoading ? 'Генерация...' : 'Скачать PDF'}
        </button>
      </div>

      {/* Comparison toggle */}
      {canCompare && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
              className="w-4 h-4 accent-blue-900 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">Сравнить с другим периодом</span>
          </label>
          {compareEnabled && (
            <select
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Report content ref for PDF */}
      <div ref={reportRef} className="flex flex-col gap-5">
        {/* Main finance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mainCard(
            'Доход',
            currentStats.income,
            'ri-coins-line',
            'text-emerald-600',
            'bg-emerald-50 border-emerald-100',
            compareStats?.income
          )}
          {mainCard(
            'Расход',
            currentStats.expense,
            'ri-hand-coin-line',
            'text-red-600',
            'bg-red-50 border-red-100',
            compareStats?.expense
          )}
          {mainCard(
            'Прибыль',
            currentStats.profit,
            'ri-bar-chart-line',
            'text-blue-900',
            'bg-slate-50 border-slate-200',
            compareStats?.profit
          )}
        </div>

        {/* Comparison table */}
        {compareEnabled && compareStats && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-gray-800">
                Сравнительный анализ · <span className="text-blue-900">{periodLabel}</span> vs <span className="text-gray-500">{comparePeriodLabel}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Метрика</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{periodLabel}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{comparePeriodLabel}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Разница</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Динамика</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{row.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 text-right font-semibold">
                        {row.isPercent ? `${row.current}%` : `${row.current.toLocaleString('ru')} ${row.label.includes('Доля') ? '%' : RUB_SYMBOL}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {row.isPercent ? `${row.prev}%` : `${row.prev.toLocaleString('ru')} ${row.label.includes('Доля') ? '%' : RUB_SYMBOL}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        <span className={diffStyle(row.current, row.prev)}>
                          {diffAbs(row.current, row.prev)} {row.isPercent ? '%' : RUB_SYMBOL}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        <span className={diffStyle(row.current, row.prev)}>
                          {diffText(row.current, row.prev)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 mb-2">
              <i className="ri-links-line text-blue-900 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{currentStats.deliveredCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Сдано ссылок</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 mb-2">
              <i className="ri-loader-4-line text-orange-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{currentStats.inProgressCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">В работе</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 mb-2">
              <i className="ri-coins-line text-green-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(currentStats.clientRevenue, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Оплачено клиентами</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 mb-2">
              <i className="ri-hand-coin-line text-red-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(currentStats.executorPayouts, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Выплачено исполнителям</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 mb-2">
              <i className="ri-bar-chart-line text-blue-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(currentStats.profit, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Прибыль</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 mb-2">
              <i className="ri-file-list-3-line text-emerald-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(currentStats.clientPaidLinksSum, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Оплата по сданным ссылкам</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 mb-2">
              <i className="ri-user-received-line text-amber-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(currentStats.executorPaidLinksSum, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Выплаты по сданным ссылкам</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 mb-2">
              <i className="ri-percent-line text-gray-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{currentStats.payoutSharePercent}%</div>
            <div className="text-xs text-gray-500 mt-0.5">Доля выплат от выручки</div>
          </div>
        </div>

        {/* Links table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-gray-800">Сданные ссылки за {periodLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Стоимость</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Оплата клиента</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Выплата исполнителю</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата сдачи</th>
                </tr>
              </thead>
              <tbody>
                {deliveredLinks.map((link) => (
                  <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">#{link.id}</td>
                    <td className="px-4 py-3">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-900 hover:text-blue-800 truncate max-w-[240px] block">
                        {link.url}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${link.type === 'удаление' ? 'bg-red-100 text-red-700' : link.type === 'деиндексация' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {link.type === 'удаление+деиндексация' ? 'удаление\деиндексация' : link.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{link.status}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(link.clientCost, payments.find((p) => p.linkId === link.id)?.currency || 'RUB')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${link.clientPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <i className={link.clientPaid ? 'ri-check-line' : 'ri-close-line'} />
                        {link.clientPaid ? `Оплачено ${formatMoney(link.clientCost, payments.find((p) => p.linkId === link.id)?.currency || 'RUB')}` : 'Не оплачено'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${link.executorPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <i className={link.executorPaid ? 'ri-check-line' : 'ri-close-line'} />
                        {link.executorPaid ? `Выплачено ${formatMoney(link.executorCost, payments.find((p) => p.linkId === link.id)?.currency || 'RUB')}` : 'Не выплачено'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{link.endDate || '—'}</td>
                  </tr>
                ))}
                {deliveredLinks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет сданных ссылок за выбранный период
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}