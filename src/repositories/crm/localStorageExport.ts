import { defaultProjectDeadline } from '@/lib/dateUtils';
import { isValidCurrency, normalizeCurrency } from '@/lib/currency';
import { syncLegacyPaymentFlags } from '@/lib/linkFinance';
import type { CRMAudit, CRMLink, CRMProject } from '@/mocks/crm';
import { LocalStorageCRMRepository } from './LocalStorageCRMRepository';
import type { CRMSnapshot } from './types';
import { VALID_WORK_STATUSES } from './supabaseMappers';

export interface LocalStorageKeyInfo {
  key: string;
  exists: boolean;
  hasValue: boolean;
  parsedType: 'array' | 'object' | 'primitive' | 'invalid_json' | 'missing';
  itemCount?: number;
}

export interface LocalStorageSnapshotValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  duplicateUrlsByProject: Array<{ projectId: number; url: string; count: number }>;
}

export interface LocalStorageSnapshotExportResult {
  keys: LocalStorageKeyInfo[];
  snapshot: CRMSnapshot;
  validation: LocalStorageSnapshotValidationResult;
  warnings: string[];
}

export const KNOWN_CRM_LOCAL_STORAGE_KEYS = {
  sessionUser: 'crm_user',
  users: 'crm_users',
  authUsers: 'crm_auth_users',
  clients: 'crm_clients',
  projects: 'crm_projects',
  links: 'crm_links',
  audits: 'crm_audits',
  payments: 'crm_payments',
  notifications: 'crm_notifications',
  settings: 'crm_settings',
} as const;

const VALID_CLIENT_PAYMENT_STATUSES = new Set(['unpaid', 'partially_paid', 'paid']);
const VALID_EXECUTOR_PAYMENT_STATUSES = new Set(['not_accrued', 'accrued', 'paid_to_executor']);

function isBrowserWithStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStorageValue(raw: string | null): LocalStorageKeyInfo['parsedType'] {
  if (raw === null) return 'missing';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return 'array';
    if (parsed && typeof parsed === 'object') return 'object';
    return 'primitive';
  } catch {
    return 'invalid_json';
  }
}

function normalizeProject(project: CRMProject): CRMProject {
  const startDate = project.startDate || new Date().toISOString().slice(0, 10);
  const currency = normalizeCurrency(project.currency) as CRMProject['currency'];
  return {
    ...project,
    startDate,
    deadline: project.deadline ?? defaultProjectDeadline(startDate),
    currency,
    isDeleted: Boolean(project.isDeleted),
  };
}

function inferProjectCurrency(projects: CRMProject[], projectId: number): string {
  return normalizeCurrency(projects.find((project) => project.id === projectId)?.currency);
}

function normalizeLink(link: CRMLink, projects: CRMProject[]): CRMLink {
  const migrated = syncLegacyPaymentFlags({ ...link, isDeleted: Boolean(link.isDeleted) });
  const fallbackCurrency = inferProjectCurrency(projects, link.projectId);
  return {
    ...migrated,
    deadline: link.deadline ?? defaultProjectDeadline(link.addedDate),
    geo: normalizeCurrency(link.geo ?? fallbackCurrency),
  };
}

function normalizeAudit(audit: CRMAudit): CRMAudit {
  return {
    ...audit,
    currency: normalizeCurrency(audit.currency) as CRMAudit['currency'],
    auditStatus: audit.auditStatus ?? 'новый',
    auditType: audit.auditType ?? 'проверка ссылки',
  };
}

export function normalizeLocalStorageSnapshot(snapshot: CRMSnapshot): CRMSnapshot {
  const projects = snapshot.projects.map(normalizeProject);
  return {
    ...snapshot,
    projects,
    links: snapshot.links.map((link) => normalizeLink(link, projects)),
    audits: snapshot.audits.map(normalizeAudit),
    users: snapshot.users.map((user) => ({ ...user, isDeleted: Boolean(user.isDeleted) })),
    clients: snapshot.clients.map((client) => ({
      ...client,
      currency: normalizeCurrency(client.currency ?? 'RUB') as typeof client.currency,
      isDeleted: Boolean(client.isDeleted),
    })),
  };
}

export function validateLocalStorageSnapshot(
  snapshot: CRMSnapshot
): LocalStorageSnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const users = new Map(snapshot.users.map((u) => [u.id, u]));
  const clients = new Map(snapshot.clients.map((c) => [c.id, c]));
  const projects = new Map(snapshot.projects.map((p) => [p.id, p]));
  const links = new Map(snapshot.links.map((l) => [l.id, l]));

  snapshot.users.forEach((user) => {
    if (!user.id && user.id !== 0) errors.push(`User without id: ${user.login}`);
  });
  snapshot.clients.forEach((client) => {
    if (!client.id && client.id !== 0) errors.push(`Client without id: ${client.companyName}`);
    if (!isValidCurrency(client.currency ?? 'RUB')) warnings.push(`Client ${client.id} has invalid currency, fallback to RUB.`);
  });
  snapshot.projects.forEach((project) => {
    if (!clients.has(project.clientId)) errors.push(`Project ${project.id} references missing client ${project.clientId}.`);
    if (!isValidCurrency(project.currency)) errors.push(`Project ${project.id} has invalid currency ${project.currency}.`);
    if (!project.deadline) warnings.push(`Project ${project.id} has empty deadline; fallback +90d will be used.`);
  });
  snapshot.links.forEach((link) => {
    if (!projects.has(link.projectId)) errors.push(`Link ${link.id} references missing project ${link.projectId}.`);
    if (link.clientId && !clients.has(link.clientId)) errors.push(`Link ${link.id} references missing client ${link.clientId}.`);
    if (link.executorId && !users.has(link.executorId)) warnings.push(`Link ${link.id} has missing executor ${link.executorId}.`);
    if (link.auditorId && !users.has(link.auditorId)) warnings.push(`Link ${link.id} has missing auditor ${link.auditorId}.`);
    if (!VALID_WORK_STATUSES.has(link.status)) warnings.push(`Link ${link.id} has non-canonical work status "${link.status}".`);
    if (!VALID_CLIENT_PAYMENT_STATUSES.has(link.clientPaymentStatus ?? '')) {
      errors.push(`Link ${link.id} has invalid clientPaymentStatus "${link.clientPaymentStatus}".`);
    }
    if (!VALID_EXECUTOR_PAYMENT_STATUSES.has(link.executorPaymentStatus ?? '')) {
      errors.push(`Link ${link.id} has invalid executorPaymentStatus "${link.executorPaymentStatus}".`);
    }
    const inferredCurrency = normalizeCurrency(link.geo ?? inferProjectCurrency(snapshot.projects, link.projectId));
    if (!isValidCurrency(inferredCurrency)) errors.push(`Link ${link.id} has invalid currency ${inferredCurrency}.`);
  });
  snapshot.audits.forEach((audit) => {
    if (!audit.id && audit.id !== 0) errors.push('Audit without id.');
    if (audit.linkId && !links.has(audit.linkId)) warnings.push(`Audit ${audit.id} references missing link ${audit.linkId}.`);
    if (!isValidCurrency(audit.currency ?? 'RUB')) warnings.push(`Audit ${audit.id} has invalid currency.`);
  });
  snapshot.notifications.forEach((notification) => {
    if (!notification.userId && notification.userId !== 0) warnings.push(`Notification ${notification.id} has empty userId.`);
  });
  snapshot.payments.forEach((payment) => {
    if (!isValidCurrency(payment.currency)) errors.push(`Payment ${payment.id} has invalid currency ${payment.currency}.`);
  });

  const duplicateMap = new Map<string, number>();
  snapshot.links.forEach((link) => {
    const key = `${link.projectId}::${link.url.trim().toLowerCase()}`;
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  });
  const duplicateUrlsByProject = Array.from(duplicateMap.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [projectIdRaw, url] = key.split('::');
      return { projectId: Number(projectIdRaw), url, count };
    });
  if (duplicateUrlsByProject.length > 0) {
    warnings.push(`Duplicate URLs detected: ${duplicateUrlsByProject.length}.`);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    duplicateUrlsByProject,
  };
}

function collectLocalStorageKeys(keys: string[]): LocalStorageKeyInfo[] {
  if (!isBrowserWithStorage()) {
    return keys.map((key) => ({
      key,
      exists: false,
      hasValue: false,
      parsedType: 'missing',
    }));
  }

  return keys.map((key) => {
    const raw = window.localStorage.getItem(key);
    const parsedType = parseStorageValue(raw);
    let itemCount: number | undefined;
    if (parsedType === 'array' || parsedType === 'object') {
      try {
        const parsed = JSON.parse(raw ?? 'null') as unknown;
        itemCount = Array.isArray(parsed) ? parsed.length : Object.keys((parsed as Record<string, unknown>) ?? {}).length;
      } catch {
        itemCount = undefined;
      }
    }
    return {
      key,
      exists: raw !== null,
      hasValue: Boolean(raw),
      parsedType,
      itemCount,
    };
  });
}

export function exportLocalStorageSnapshot(): LocalStorageSnapshotExportResult {
  const repository = new LocalStorageCRMRepository();
  const normalizedSnapshot = normalizeLocalStorageSnapshot(repository.loadSnapshot());
  const validation = validateLocalStorageSnapshot(normalizedSnapshot);
  const keys = collectLocalStorageKeys(Object.values(repository.storageKeys));

  const warnings = [
    ...validation.warnings,
    ...keys.filter((keyInfo) => keyInfo.parsedType === 'invalid_json').map((keyInfo) => `Key ${keyInfo.key} contains invalid JSON.`),
  ];

  return {
    keys,
    snapshot: normalizedSnapshot,
    validation,
    warnings,
  };
}

