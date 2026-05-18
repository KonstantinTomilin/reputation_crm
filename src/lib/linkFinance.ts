import type { CRMLink, ClientPaymentStatus, ExecutorPaymentStatus } from '@/mocks/crm';

export function clientPaymentFromLegacy(link: Partial<CRMLink>): ClientPaymentStatus {
  if (link.clientPaymentStatus) return link.clientPaymentStatus;
  if (link.clientPaid) return 'paid';
  if (link.clientPaidAmount && link.clientPaidAmount > 0 && link.clientPaidAmount < (link.clientCost ?? 0)) {
    return 'partially_paid';
  }
  return 'unpaid';
}

export function executorPaymentFromLegacy(link: Partial<CRMLink>): ExecutorPaymentStatus {
  if (link.executorPaymentStatus) return link.executorPaymentStatus;
  if (link.executorPaid) return 'paid_to_executor';
  // Do NOT derive executor payment status from work status.
  // If historical row doesn't have explicit status, keep conservative default.
  return 'not_accrued';
}

export function syncLegacyPaymentFlags(link: CRMLink): CRMLink {
  const clientPaymentStatus = clientPaymentFromLegacy(link);
  const executorPaymentStatus = executorPaymentFromLegacy(link);
  return {
    ...link,
    clientPaymentStatus,
    executorPaymentStatus,
    clientPaid: clientPaymentStatus === 'paid' || clientPaymentStatus === 'partially_paid',
    executorPaid: executorPaymentStatus === 'paid_to_executor',
  };
}

export function setClientPaymentStatus(link: CRMLink, status: ClientPaymentStatus, amount?: number): CRMLink {
  const now = new Date().toISOString().split('T')[0];
  return syncLegacyPaymentFlags({
    ...link,
    clientPaymentStatus: status,
    clientPaid: status === 'paid' || status === 'partially_paid',
    clientPaidDate: status !== 'unpaid' ? now : null,
    clientPaidAmount: status === 'unpaid' ? null : (amount ?? link.clientCost),
  });
}

export function setExecutorPaymentStatus(link: CRMLink, status: ExecutorPaymentStatus, amount?: number): CRMLink {
  const now = new Date().toISOString().split('T')[0];
  return syncLegacyPaymentFlags({
    ...link,
    executorPaymentStatus: status,
    executorPaid: status === 'paid_to_executor',
    executorPaidDate: status === 'paid_to_executor' ? now : null,
    executorPaidAmount: status === 'paid_to_executor' ? (amount ?? link.executorCost) : null,
  });
}

/** Work statuses that must NOT change when payment flags update */
export const ADMIN_APPROVED_STATUSES = ['согласовано', 'принято', 'сдано', 'сдано клиенту', 'отправлено клиенту'];

export const COMPLETED_WORK_STATUSES = [
  'удалено', 'деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing',
  'деиндексировано yahoo', 'частично деиндексировано', 'принято', 'согласовано',
  'сдано', 'сдано клиенту', 'отправлено клиенту',
];
