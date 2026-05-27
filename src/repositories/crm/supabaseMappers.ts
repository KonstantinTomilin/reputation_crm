import { normalizeCurrency } from '@/lib/currency';
import { defaultProjectDeadline } from '@/lib/dateUtils';
import {
  syncLegacyPaymentFlags,
  clientPaymentFromLegacy,
  executorPaymentFromLegacy,
} from '@/lib/linkFinance';
import type {
  CRMAudit,
  CRMClient,
  CRMLink,
  CRMNotification,
  CRMPayment,
  CRMProject,
  CRMSettings,
  CRMUser,
  CurrencyCode,
} from '@/mocks/crm';

type DbUserRole = 'main_admin' | 'client' | 'executor' | 'auditor';
type DbUserStatus = 'active' | 'blocked' | 'deleted';

const ROLE_FALLBACK: DbUserRole = 'client';

export const VALID_WORK_STATUSES = new Set<string>([
  // Stage 1 canonical statuses (RU)
  'новый',
  'в работе',
  'ожидает аудита',
  'в аудите',
  'в карантине',
  'согласовано',
  'отправлено клиенту',
  'удалено',
  'частично деиндексировано',
  // Legacy statuses from existing mock model
  'на просчёт',
  'просчёт выполнен',
  'аудит выполнен',
  'не взято в работу',
  'на паузе',
  'деиндексировано google',
  'деиндексировано yandex',
  'деиндексировано bing',
  'деиндексировано yahoo',
  'вернулось',
  'повторно в работе',
  'сдано клиенту',
  'принято',
  'не принято',
  'сдано',
  'готово',
  'отклонено',
  // Target transition statuses (EN) for future server-side alignment
  'new',
  'in_work',
  'waiting_audit',
  'on_audit',
  'removed',
  'deindexed',
  'partially_deindexed',
  'quarantine',
  'ready_for_admin_review',
  'admin_approved',
  'sent_to_client',
  'rejected',
]);

export interface DbUserRow {
  id: string;
  login: string;
  password_hash: string | null;
  role: DbUserRole;
  display_name: string;
  status: DbUserStatus;
  telegram: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbUserInsert {
  id?: string;
  login: string;
  password_hash?: string | null;
  role: DbUserRole;
  display_name: string;
  status?: DbUserStatus;
  telegram?: string | null;
  phone?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface DbClientRow {
  id: string;
  user_id: string | null;
  name: string;
  contact_name: string | null;
  telegram: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbClientInsert {
  id?: string;
  user_id?: string | null;
  name: string;
  contact_name?: string | null;
  telegram?: string | null;
  phone?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface DbProjectRow {
  id: string;
  client_id: string;
  title: string;
  source: string | null;
  currency: string;
  status: string;
  deadline_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbProjectInsert {
  id?: string;
  client_id: string;
  title: string;
  source?: string | null;
  currency?: string;
  status?: string;
  deadline_at?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface DbLinkRow {
  id: string;
  project_id: string;
  client_id: string | null;
  executor_id: string | null;
  auditor_id: string | null;
  url: string;
  work_type: string;
  work_status: string;
  client_payment_status: 'unpaid' | 'partially_paid' | 'paid';
  executor_payment_status: 'not_accrued' | 'accrued' | 'paid_to_executor';
  price: number;
  executor_price: number;
  currency: string;
  deadline_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbLinkInsert {
  id?: string;
  project_id: string;
  client_id?: string | null;
  executor_id?: string | null;
  auditor_id?: string | null;
  url: string;
  work_type: string;
  work_status: string;
  client_payment_status: 'unpaid' | 'partially_paid' | 'paid';
  executor_payment_status: 'not_accrued' | 'accrued' | 'paid_to_executor';
  price: number;
  executor_price: number;
  currency?: string;
  deadline_at?: string | null;
  notes?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface DbAuditRow {
  id: string;
  project_id: string | null;
  link_id: string | null;
  auditor_id: string | null;
  requested_by: string | null;
  audit_type: string;
  status: string;
  comment: string | null;
  result: string | null;
  probability: number | null;
  estimated_price: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

export interface DbAuditInsert {
  id?: string;
  project_id?: string | null;
  link_id?: string | null;
  auditor_id?: string | null;
  requested_by?: string | null;
  audit_type: string;
  status?: string;
  comment?: string | null;
  result?: string | null;
  probability?: number | null;
  estimated_price?: number | null;
  currency?: string;
  created_at?: string;
  completed_at?: string | null;
  deleted_at?: string | null;
}

export interface DbNotificationRow {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'danger' | string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbNotificationInsert {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export interface DbFinancialOperationRow {
  id: string;
  project_id: string | null;
  link_id: string | null;
  client_id: string | null;
  executor_id: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DbFinancialOperationInsert {
  id?: string;
  project_id?: string | null;
  link_id?: string | null;
  client_id?: string | null;
  executor_id?: string | null;
  type: string;
  amount: number;
  currency?: string;
  status?: string;
  notes?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface DbSettingRow {
  id: string;
  scope: string;
  user_id: string | null;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSettingInsert {
  id?: string;
  scope: string;
  user_id?: string | null;
  key: string;
  value: Record<string, unknown>;
}

function normalizeToIsoDateTime(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.includes('T')) return input;
  return `${input}T00:00:00.000Z`;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function omitInvalidUuidId<T extends { id?: string }>(row: T): T {
  if (!row.id || isUuid(row.id)) return row;
  const { id: _invalidId, ...rest } = row;
  return rest as T;
}

export function legacyIdToUuid(entity: string, id: number): string {
  const entityHex = Array.from(entity)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12)
    .padEnd(12, '0');
  const idHex = Math.max(0, id).toString(16).padStart(8, '0').slice(-8);
  const raw = `${idHex}${entityHex}`.padEnd(32, '0').slice(0, 32);
  const v4variant = `${raw.slice(0, 12)}4${raw.slice(13, 16)}8${raw.slice(17)}`.slice(0, 32);
  return `${v4variant.slice(0, 8)}-${v4variant.slice(8, 12)}-${v4variant.slice(12, 16)}-${v4variant.slice(16, 20)}-${v4variant.slice(20, 32)}`;
}

export function uuidToLegacyNumericId(uuid: string): number {
  const compact = uuid.replace(/-/g, '').slice(0, 8);
  const parsed = Number.parseInt(compact, 16);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function resolveDbRole(role: string): DbUserRole {
  if (role === 'main_admin' || role === 'client' || role === 'executor' || role === 'auditor') {
    return role;
  }
  return ROLE_FALLBACK;
}

export function mapDbUserToUser(row: DbUserRow): CRMUser {
  const status = row.status === 'active' ? 'активен' : 'заблокирован';
  return {
    id: uuidToLegacyNumericId(row.id),
    role: row.role,
    login: row.login,
    email: `${row.login}@supabase.local`,
    fullName: row.display_name,
    language: 'ru',
    status,
    alias: row.telegram ?? null,
    isDeleted: row.status === 'deleted' || Boolean(row.deleted_at),
  };
}

export function mapUserToDbInsert(input: Omit<CRMUser, 'id'>, legacyId?: number): DbUserInsert {
  const deleted = Boolean(input.isDeleted);
  const blocked = input.status === 'заблокирован';
  const status: DbUserStatus = deleted ? 'deleted' : blocked ? 'blocked' : 'active';
  return omitInvalidUuidId({
    id: typeof legacyId === 'number' ? legacyIdToUuid('users', legacyId) : undefined,
    login: input.login,
    password_hash: null,
    role: resolveDbRole(input.role),
    display_name: input.fullName,
    status,
    telegram: input.alias ?? null,
    phone: null,
    notes: null,
    deleted_at: deleted ? new Date().toISOString() : null,
  });
}

export function mapDbClientToClient(row: DbClientRow): CRMClient {
  return {
    id: uuidToLegacyNumericId(row.id),
    companyName: row.name,
    contacts: row.contact_name || row.telegram || row.phone || row.notes || '—',
    status: row.deleted_at ? 'на паузе' : 'активен',
    totalDebt: 0,
    currency: 'RUB',
    isDeleted: Boolean(row.deleted_at),
  };
}

export function mapClientToDbInsert(input: Omit<CRMClient, 'id'>, legacyId?: number): DbClientInsert {
  return omitInvalidUuidId({
    id: typeof legacyId === 'number' ? legacyIdToUuid('clients', legacyId) : undefined,
    user_id: null,
    name: input.companyName,
    contact_name: input.contacts || null,
    telegram: null,
    phone: null,
    notes: null,
    deleted_at: input.isDeleted ? new Date().toISOString() : null,
  });
}

export function mapDbProjectToProject(row: DbProjectRow): CRMProject {
  const startDate = (row.created_at || new Date().toISOString()).slice(0, 10);
  const deadline = row.deadline_at ? row.deadline_at.slice(0, 10) : null;
  return {
    id: uuidToLegacyNumericId(row.id),
    clientId: uuidToLegacyNumericId(row.client_id),
    executorId: null,
    name: row.title,
    domain: '',
    description: row.source ?? '',
    totalLinks: 0,
    inProgress: 0,
    removed: 0,
    successRate: 0,
    status: (row.status as CRMProject['status']) ?? 'в работе',
    startDate,
    deadline: deadline ?? defaultProjectDeadline(startDate),
    manager: '',
    currency: normalizeCurrency(row.currency) as CurrencyCode,
    source: row.source ?? '',
    isDeleted: Boolean(row.deleted_at),
  };
}

export function mapProjectToDbInsert(
  project: CRMProject,
  refs: { clientUuid: string | null }
): DbProjectInsert {
  const createdAt = normalizeToIsoDateTime(project.startDate) ?? new Date().toISOString();
  return omitInvalidUuidId({
    id: legacyIdToUuid('projects', project.id),
    client_id: refs.clientUuid ?? legacyIdToUuid('clients', project.clientId),
    title: project.name,
    source: project.source || project.description || null,
    currency: normalizeCurrency(project.currency),
    status: project.status,
    deadline_at: normalizeToIsoDateTime(project.deadline ?? defaultProjectDeadline(project.startDate)),
    created_at: createdAt,
    deleted_at: project.isDeleted ? new Date().toISOString() : null,
  });
}

export function mapDbLinkToLink(
  row: DbLinkRow,
  context?: { projectCurrency?: string | null }
): CRMLink {
  const link = {
    id: uuidToLegacyNumericId(row.id),
    url: row.url,
    clientId: row.client_id ? uuidToLegacyNumericId(row.client_id) : 0,
    projectId: uuidToLegacyNumericId(row.project_id),
    type: (row.work_type as CRMLink['type']) ?? 'удаление+деиндексация',
    targetSE: { google: true, yandex: true, bing: false, yahoo: false },
    status: row.work_status as CRMLink['status'],
    addedDate: (row.created_at || new Date().toISOString()).slice(0, 10),
    startDate: null,
    endDate: null,
    deadline: row.deadline_at ? row.deadline_at.slice(0, 10) : null,
    quarantineDays: 0,
    quarantineEndDate: null,
    executorId: row.executor_id ? uuidToLegacyNumericId(row.executor_id) : null,
    auditorId: row.auditor_id ? uuidToLegacyNumericId(row.auditor_id) : null,
    clientCost: Number(row.price ?? 0),
    executorCost: Number(row.executor_price ?? 0),
    clientPaid: row.client_payment_status === 'paid' || row.client_payment_status === 'partially_paid',
    clientPaidDate: null,
    clientPaidAmount: null,
    clientPaymentStatus: row.client_payment_status,
    executorPaid: row.executor_payment_status === 'paid_to_executor',
    executorPaidDate: null,
    executorPaidAmount: null,
    executorPaymentStatus: row.executor_payment_status,
    isDeleted: Boolean(row.deleted_at),
    comments: [],
    proofsFolder: null,
    proofFiles: [],
    geo: context?.projectCurrency
      ? normalizeCurrency(context.projectCurrency)
      : normalizeCurrency(row.currency),
  } satisfies CRMLink;
  return syncLegacyPaymentFlags(link);
}

export function mapLinkToDbInsert(
  link: CRMLink,
  refs: {
    projectUuid: string;
    clientUuid: string | null;
    executorUuid: string | null;
    auditorUuid: string | null;
    projectCurrency: string | null;
  }
): DbLinkInsert {
  const clientPaymentStatus = clientPaymentFromLegacy(link);
  const executorPaymentStatus = executorPaymentFromLegacy(link);
  const currency = normalizeCurrency(link.geo ?? refs.projectCurrency ?? 'RUB');
  return omitInvalidUuidId({
    id: legacyIdToUuid('links', link.id),
    project_id: refs.projectUuid,
    client_id: refs.clientUuid,
    executor_id: refs.executorUuid,
    auditor_id: refs.auditorUuid,
    url: link.url,
    work_type: link.type,
    work_status: link.status,
    client_payment_status: clientPaymentStatus,
    executor_payment_status: executorPaymentStatus,
    price: Number(link.clientCost ?? 0),
    executor_price: Number(link.executorCost ?? 0),
    currency,
    deadline_at: normalizeToIsoDateTime(link.deadline),
    notes: link.comments.map((c) => `${c.author}: ${c.text}`).join('\n').slice(0, 2000) || null,
    created_at: normalizeToIsoDateTime(link.addedDate) ?? new Date().toISOString(),
    deleted_at: link.isDeleted ? new Date().toISOString() : null,
  });
}

export function mapDbAuditToAudit(row: DbAuditRow): CRMAudit {
  const probability = Number(row.probability ?? 0);
  return {
    id: uuidToLegacyNumericId(row.id),
    linkId: row.link_id ? uuidToLegacyNumericId(row.link_id) : 0,
    removalProbability: probability,
    deindexProbability: probability,
    probability,
    removalDaysEstimate: 0,
    deindexDaysEstimate: 0,
    costPerSE: { google: 0, yandex: 0, bing: 0, yahoo: 0 },
    totalCost: Number(row.estimated_price ?? 0),
    costMode: 'total',
    riskLevel: 'средний',
    auditDate: (row.created_at || new Date().toISOString()).slice(0, 10),
    auditorId: row.auditor_id ? uuidToLegacyNumericId(row.auditor_id) : 0,
    notes: row.comment ?? row.result ?? '',
    currency: normalizeCurrency(row.currency) as CurrencyCode,
    auditType: (row.audit_type as CRMAudit['auditType']) ?? 'проверка ссылки',
    auditStatus: (row.status as CRMAudit['auditStatus']) ?? 'новый',
  };
}

export function mapAuditToDbInsert(
  audit: CRMAudit,
  refs: {
    linkUuid: string | null;
    projectUuid: string | null;
    auditorUuid: string | null;
  }
): DbAuditInsert {
  return omitInvalidUuidId({
    id: legacyIdToUuid('audits', audit.id),
    project_id: refs.projectUuid,
    link_id: refs.linkUuid,
    auditor_id: refs.auditorUuid,
    requested_by: null,
    audit_type: audit.auditType ?? 'проверка ссылки',
    status: audit.auditStatus ?? 'новый',
    comment: audit.notes || null,
    result: null,
    probability: Number(audit.probability ?? audit.removalProbability ?? 0),
    estimated_price: Number(audit.totalCost ?? 0),
    currency: normalizeCurrency(audit.currency),
    created_at: normalizeToIsoDateTime(audit.auditDate) ?? new Date().toISOString(),
    completed_at: null,
    deleted_at: null,
  });
}

export function mapDbNotificationToNotification(row: DbNotificationRow): CRMNotification {
  return {
    id: row.id,
    userId: uuidToLegacyNumericId(row.user_id),
    role: 'management',
    title: row.title,
    message: row.body ?? '',
    link: row.entity_id ? `/${row.entity_type ?? 'entity'}/${row.entity_id}` : '/',
    read: row.is_read,
    type: (row.type as CRMNotification['type']) ?? 'info',
    createdAt: row.created_at,
  };
}

export function mapNotificationToDbInsert(
  notification: CRMNotification,
  refs: { userUuid: string | null }
): DbNotificationInsert {
  return omitInvalidUuidId({
    id: notification.id || undefined,
    user_id: refs.userUuid ?? legacyIdToUuid('users', notification.userId),
    type: notification.type,
    title: notification.title,
    body: notification.message || null,
    entity_type: notification.link ? 'link' : null,
    entity_id: null,
    is_read: notification.read,
    created_at: normalizeToIsoDateTime(notification.createdAt) ?? new Date().toISOString(),
  });
}

export function mapDbFinancialOperationToPayment(row: DbFinancialOperationRow): CRMPayment {
  return {
    id: uuidToLegacyNumericId(row.id),
    clientId: row.client_id ? uuidToLegacyNumericId(row.client_id) : null,
    projectId: row.project_id ? uuidToLegacyNumericId(row.project_id) : null,
    linkId: row.link_id ? uuidToLegacyNumericId(row.link_id) : null,
    amount: Number(row.amount ?? 0),
    currency: normalizeCurrency(row.currency) as CurrencyCode,
    date: (row.created_at || new Date().toISOString()).slice(0, 10),
    type: row.type === 'executor_payout' ? 'выплата исполнителю' : 'оплата клиента',
    status: (row.status as CRMPayment['status']) ?? 'запланирован',
    description: row.notes ?? '',
  };
}

export function mapPaymentToDbFinancialOperationInsert(payment: CRMPayment): DbFinancialOperationInsert {
  const type =
    payment.type === 'выплата исполнителю'
      ? 'executor_payout'
      : payment.status === 'оплачен'
        ? 'client_payment'
        : 'client_invoice';
  return omitInvalidUuidId({
    id: legacyIdToUuid('payments', payment.id),
    project_id: payment.projectId ? legacyIdToUuid('projects', payment.projectId) : null,
    link_id: payment.linkId ? legacyIdToUuid('links', payment.linkId) : null,
    client_id: payment.clientId ? legacyIdToUuid('clients', payment.clientId) : null,
    executor_id: null,
    type,
    amount: Number(payment.amount ?? 0),
    currency: normalizeCurrency(payment.currency),
    status: payment.status,
    notes: payment.description || null,
    created_at: normalizeToIsoDateTime(payment.date) ?? new Date().toISOString(),
    deleted_at: null,
  });
}

export function mapDbSettingsToSettings(rows: DbSettingRow[]): CRMSettings {
  const settings = rows.reduce<Record<string, unknown>>((acc, row) => {
    acc[row.key] = row.value?.value ?? row.value;
    return acc;
  }, {});
  return {
    notificationsEnabled: Boolean(settings.notificationsEnabled ?? true),
    soundNotificationsEnabled: Boolean(settings.soundNotificationsEnabled ?? false),
    anonymizeExecutors: Boolean(settings.anonymizeExecutors ?? false),
    autoAuditNewLinks: Boolean(settings.autoAuditNewLinks ?? false),
  };
}

export function mapSettingsToDbInsert(settings: CRMSettings): DbSettingInsert[] {
  return [
    { scope: 'global', key: 'notificationsEnabled', value: { value: settings.notificationsEnabled } },
    { scope: 'global', key: 'soundNotificationsEnabled', value: { value: settings.soundNotificationsEnabled } },
    { scope: 'global', key: 'anonymizeExecutors', value: { value: settings.anonymizeExecutors } },
    { scope: 'global', key: 'autoAuditNewLinks', value: { value: settings.autoAuditNewLinks } },
  ];
}

