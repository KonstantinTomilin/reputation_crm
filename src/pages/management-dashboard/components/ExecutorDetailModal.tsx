import { useMemo, useState } from 'react';
import StatusBadge from '@/components/base/StatusBadge';
import { useCRM } from '@/context/CRMContext';
import { formatMoney } from '@/lib/currency';
import { COMPLETED_WORK_STATUSES } from '@/lib/linkFinance';
// @ts-expect-error no types
import html2pdf from 'html2pdf.js';

interface ExecutorDetailModalProps {
  executorId: number;
  onClose: () => void;
}

export default function ExecutorDetailModal({ executorId, onClose }: ExecutorDetailModalProps) {
  const crm = useCRM();
  const [exporting, setExporting] = useState(false);
  const executor = crm.users.find((u) => u.id === executorId);
  const execLinks = useMemo(() => crm.links.filter((l) => l.executorId === executorId), [crm.links, executorId]);

  if (!executor) return null;

  const inWork = execLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе');
  const done = execLinks.filter((l) => COMPLETED_WORK_STATUSES.includes(l.status));
  const adminApproved = execLinks.filter((l) => ['согласовано', 'принято'].includes(l.status));
  const sentToClient = execLinks.filter((l) => ['отправлено клиенту', 'сдано клиенту'].includes(l.status));
  const clientPaid = execLinks.filter((l) => l.clientPaymentStatus === 'paid' || l.clientPaid);
  const accrued = execLinks.filter(
    (l) => l.executorPaymentStatus === 'accrued' || (adminApproved.some((a) => a.id === l.id) && !l.executorPaid)
  );
  const paidToExecutor = execLinks.filter((l) => l.executorPaymentStatus === 'paid_to_executor' || l.executorPaid);
  const totalAccrued = adminApproved.reduce((s, l) => s + l.executorCost, 0);
  const totalPaid = paidToExecutor.reduce((s, l) => s + (l.executorPaidAmount ?? l.executorCost), 0);
  const payoutByCurrency = execLinks.reduce<Record<string, number>>((acc, l) => {
    const project = crm.projects.find((p) => p.id === l.projectId);
    const cur = project?.currency ?? 'RUB';
    const delta = (l.executorPaymentStatus === 'paid_to_executor' || l.executorPaid)
      ? 0
      : (adminApproved.some((a) => a.id === l.id) ? l.executorCost : 0);
    acc[cur] = (acc[cur] ?? 0) + delta;
    return acc;
  }, {});
  const payoutSummary = Object.entries(payoutByCurrency)
    .filter(([, amount]) => amount > 0)
    .map(([cur, amount]) => formatMoney(amount, cur))
    .join(' · ') || '0';

  const downloadPdf = async () => {
    setExporting(true);
    const rows = execLinks
      .map(
        (l, i) => {
          const project = crm.projects.find((p) => p.id === l.projectId);
          const cur = project?.currency ?? 'RUB';
          return `<tr>
          <td style="padding:6px;border:1px solid #ddd">${i + 1}</td>
          <td style="padding:6px;border:1px solid #ddd;font-size:11px">${l.url}</td>
          <td style="padding:6px;border:1px solid #ddd">${project?.name ?? '—'}</td>
          <td style="padding:6px;border:1px solid #ddd">${l.status}</td>
          <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatMoney(l.executorCost, cur)}</td>
          <td style="padding:6px;border:1px solid #ddd">${l.clientPaymentStatus ?? (l.clientPaid ? 'paid' : 'unpaid')}</td>
          <td style="padding:6px;border:1px solid #ddd">${l.executorPaymentStatus ?? (l.executorPaid ? 'paid' : 'not_accrued')}</td>
        </tr>`;
        }
      )
      .join('');

    const html = `
      <div style="font-family:Arial;padding:20px">
        <h1 style="color:#1e3a8a">Отчёт по исполнителю</h1>
        <p><strong>${executor.fullName}</strong> · ${new Date().toLocaleDateString('ru-RU')}</p>
        <p>В работе: ${inWork.length} · Выполнено: ${done.length} · Подтверждено: ${adminApproved.length} · К выплате: ${payoutSummary}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px">
          <thead><tr style="background:#1e3a8a;color:#fff">
            <th style="padding:8px">№</th><th>URL</th><th>Проект</th><th>Статус</th><th>Сумма</th><th>Клиент</th><th>Исполнитель</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7">Нет данных</td></tr>'}</tbody>
        </table>
      </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    await html2pdf().set({ margin: 10, filename: `executor-${executor.login}-${Date.now()}.pdf`, html2canvas: { scale: 2 } }).from(el).save();
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">Отчёт: {executor.fullName}</h3>
            <p className="text-xs text-gray-500">Сводка по назначенным ссылкам</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting}
              className="px-3 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              <i className="ri-download-line mr-1" />
              {exporting ? 'Формирование...' : 'Скачать PDF'}
            </button>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
              <i className="ri-close-line text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center text-xs">
          {[
            { label: 'В работе', value: inWork.length },
            { label: 'Выполнено', value: done.length },
            { label: 'Подтверждено админом', value: adminApproved.length },
            { label: 'Отправлено клиенту', value: sentToClient.length },
            { label: 'Оплачено клиентом', value: clientPaid.length },
            { label: 'Начислено', value: accrued.length },
            { label: 'Выплачено', value: paidToExecutor.length },
            { label: 'Остаток к выплате', value: payoutSummary },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-900">{s.value}</div>
              <div className="text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs text-gray-500">URL</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500">Проект</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500">Статус</th>
                <th className="text-left px-3 py-2 text-xs text-gray-500">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {execLinks.map((l) => {
                const project = crm.projects.find((p) => p.id === l.projectId);
                return (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="px-3 py-2 text-xs text-blue-900 truncate max-w-[200px]">{l.url}</td>
                    <td className="px-3 py-2 text-xs">{project?.name ?? '—'}</td>
                    <td className="px-3 py-2"><StatusBadge status={l.status} /></td>
                    <td className="px-3 py-2 text-xs font-semibold">{formatMoney(l.executorCost, project?.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
