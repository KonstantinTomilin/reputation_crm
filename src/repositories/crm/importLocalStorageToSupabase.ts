import { getSupabaseClientOrThrow } from '@/lib/supabase';
import { todayISO } from '@/lib/dateUtils';
import { exportLocalStorageSnapshot } from './localStorageExport';
import {
  VALID_WORK_STATUSES,
  legacyIdToUuid,
  mapAuditToDbInsert,
  mapClientToDbInsert,
  mapLinkToDbInsert,
  mapNotificationToDbInsert,
  mapPaymentToDbFinancialOperationInsert,
  mapProjectToDbInsert,
  mapSettingsToDbInsert,
  mapUserToDbInsert,
  type DbSettingInsert,
} from './supabaseMappers';

export interface LocalStorageToSupabaseImportOptions {
  confirm?: string;
  dryRun: boolean;
  overwriteExisting?: boolean;
  skipExisting?: boolean;
  importDeleted?: boolean;
  importNotifications?: boolean;
  importSettings?: boolean;
}

export interface LocalStorageToSupabaseImportReport {
  dryRun: boolean;
  found: Record<string, number>;
  imported: Record<string, number>;
  skipped: Record<string, number>;
  warnings: string[];
  errors: string[];
}

export interface SupabaseDataIntegrityReport {
  pass: boolean;
  counts: Record<string, number>;
  warnings: string[];
  errors: string[];
}

function baseReport(dryRun: boolean): LocalStorageToSupabaseImportReport {
  return {
    dryRun,
    found: {
      users: 0,
      clients: 0,
      projects: 0,
      links: 0,
      audits: 0,
      notifications: 0,
      financialOperations: 0,
      settings: 0,
    },
    imported: {
      users: 0,
      clients: 0,
      projects: 0,
      links: 0,
      audits: 0,
      notifications: 0,
      financialOperations: 0,
      settings: 0,
    },
    skipped: {
      users: 0,
      clients: 0,
      projects: 0,
      links: 0,
      audits: 0,
      notifications: 0,
      financialOperations: 0,
      settings: 0,
    },
    warnings: [],
    errors: [],
  };
}

async function existsById(table: string, id: string): Promise<boolean> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.from(table).select('id').eq('id', id).maybeSingle();
  if (error) throw new Error(`[${table}] existence check failed: ${error.message}`);
  return Boolean(data);
}

async function getUserIdByLogin(login: string): Promise<string | null> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('crm_users')
    .select('id')
    .eq('login', login.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`[crm_users] login check failed: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

async function upsertOrSkip(
  table: string,
  id: string,
  payload: Record<string, unknown>,
  options: Required<Pick<LocalStorageToSupabaseImportOptions, 'dryRun' | 'overwriteExisting' | 'skipExisting'>>,
  reportKey: keyof LocalStorageToSupabaseImportReport['imported'],
  report: LocalStorageToSupabaseImportReport
): Promise<void> {
  const exists = await existsById(table, id);

  if (exists && options.skipExisting && !options.overwriteExisting) {
    report.skipped[reportKey] += 1;
    return;
  }

  if (options.dryRun) {
    report.imported[reportKey] += 1;
    return;
  }

  const client = getSupabaseClientOrThrow();
  if (exists && options.overwriteExisting) {
    const { error } = await client.from(table).update(payload).eq('id', id);
    if (error) throw new Error(`[${table}] update failed: ${error.message}`);
  } else {
    const { error } = await client.from(table).insert(payload);
    if (error) throw new Error(`[${table}] insert failed: ${error.message}`);
  }
  report.imported[reportKey] += 1;
}

async function upsertGlobalSetting(
  setting: DbSettingInsert,
  options: Required<Pick<LocalStorageToSupabaseImportOptions, 'dryRun'>>,
  report: LocalStorageToSupabaseImportReport
): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('crm_settings')
    .select('id')
    .eq('scope', setting.scope)
    .is('user_id', setting.user_id ?? null)
    .eq('key', setting.key)
    .limit(1);
  if (error) throw new Error(`[crm_settings] existence check failed: ${error.message}`);

  const exists = (data?.length ?? 0) > 0;
  if (options.dryRun) {
    report.imported.settings += 1;
    return;
  }

  if (exists) {
    const { error: updateError } = await client
      .from('crm_settings')
      .update({ value: setting.value })
      .eq('scope', setting.scope)
      .is('user_id', setting.user_id ?? null)
      .eq('key', setting.key);
    if (updateError) throw new Error(`[crm_settings] update failed: ${updateError.message}`);
  } else {
    const { error: insertError } = await client.from('crm_settings').insert(setting);
    if (insertError) throw new Error(`[crm_settings] insert failed: ${insertError.message}`);
  }
  report.imported.settings += 1;
}

export async function dryRunImportLocalStorageToSupabase(
  options?: Omit<LocalStorageToSupabaseImportOptions, 'dryRun'>
): Promise<LocalStorageToSupabaseImportReport> {
  return importLocalStorageToSupabase({
    dryRun: true,
    overwriteExisting: options?.overwriteExisting ?? false,
    skipExisting: options?.skipExisting ?? true,
    importDeleted: options?.importDeleted ?? true,
    importNotifications: options?.importNotifications ?? true,
    importSettings: options?.importSettings ?? true,
  });
}

export async function importLocalStorageToSupabase(
  options: LocalStorageToSupabaseImportOptions
): Promise<LocalStorageToSupabaseImportReport> {
  if (!options.dryRun && options.confirm !== 'IMPORT_LOCALSTORAGE_TO_SUPABASE') {
    throw new Error('Import confirmation failed. Enter IMPORT_LOCALSTORAGE_TO_SUPABASE.');
  }

  const normalizedOptions = {
    dryRun: options.dryRun,
    overwriteExisting: options.overwriteExisting ?? false,
    skipExisting: options.skipExisting ?? true,
    importDeleted: options.importDeleted ?? true,
    importNotifications: options.importNotifications ?? true,
    importSettings: options.importSettings ?? true,
  };
  const report = baseReport(normalizedOptions.dryRun);
  const exported = exportLocalStorageSnapshot();
  report.warnings.push(...exported.validation.warnings);
  report.errors.push(...exported.validation.errors);
  if (!exported.validation.valid) {
    report.warnings.push('Snapshot has validation errors; importer continues best-effort.');
  }

  const snapshot = exported.snapshot;
  report.found.users = snapshot.users.length;
  report.found.clients = snapshot.clients.length;
  report.found.projects = snapshot.projects.length;
  report.found.links = snapshot.links.length;
  report.found.audits = snapshot.audits.length;
  report.found.notifications = snapshot.notifications.length;
  report.found.financialOperations = snapshot.payments.length;
  report.found.settings = 4;

  const projectCurrencyById = new Map(snapshot.projects.map((project) => [project.id, project.currency]));

  for (const user of snapshot.users) {
    if (!normalizedOptions.importDeleted && user.isDeleted) {
      report.skipped.users += 1;
      continue;
    }
    const payload = mapUserToDbInsert({ ...user }, user.id);
    const id = payload.id ?? legacyIdToUuid('users', user.id);
    try {
      const existingByLoginId = await getUserIdByLogin(user.login);
      if (existingByLoginId && existingByLoginId !== id) {
        report.skipped.users += 1;
        report.warnings.push(
          `User ${user.id} skipped: login "${user.login}" already exists with id ${existingByLoginId}.`
        );
        continue;
      }
      await upsertOrSkip('crm_users', id, payload as Record<string, unknown>, normalizedOptions, 'users', report);
    } catch (error) {
      report.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  for (const client of snapshot.clients) {
    if (!normalizedOptions.importDeleted && client.isDeleted) {
      report.skipped.clients += 1;
      continue;
    }
    const payload = mapClientToDbInsert({ ...client }, client.id);
    const id = payload.id ?? legacyIdToUuid('clients', client.id);
    try {
      await upsertOrSkip('crm_clients', id, payload as Record<string, unknown>, normalizedOptions, 'clients', report);
    } catch (error) {
      report.errors.push(`Client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  for (const project of snapshot.projects) {
    if (!normalizedOptions.importDeleted && project.isDeleted) {
      report.skipped.projects += 1;
      continue;
    }
    const payload = mapProjectToDbInsert(project, {
      clientUuid: legacyIdToUuid('clients', project.clientId),
    });
    const id = payload.id ?? legacyIdToUuid('projects', project.id);
    try {
      await upsertOrSkip('crm_projects', id, payload as Record<string, unknown>, normalizedOptions, 'projects', report);
    } catch (error) {
      report.errors.push(`Project ${project.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  for (const link of snapshot.links) {
    if (!normalizedOptions.importDeleted && link.isDeleted) {
      report.skipped.links += 1;
      continue;
    }
    const payload = mapLinkToDbInsert(link, {
      projectUuid: legacyIdToUuid('projects', link.projectId),
      clientUuid: link.clientId ? legacyIdToUuid('clients', link.clientId) : null,
      executorUuid: link.executorId ? legacyIdToUuid('users', link.executorId) : null,
      auditorUuid: link.auditorId ? legacyIdToUuid('users', link.auditorId) : null,
      projectCurrency: projectCurrencyById.get(link.projectId) ?? null,
    });
    const id = payload.id ?? legacyIdToUuid('links', link.id);
    try {
      await upsertOrSkip('crm_links', id, payload as Record<string, unknown>, normalizedOptions, 'links', report);
    } catch (error) {
      report.errors.push(`Link ${link.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  for (const audit of snapshot.audits) {
    const payload = mapAuditToDbInsert(audit, {
      linkUuid: audit.linkId ? legacyIdToUuid('links', audit.linkId) : null,
      projectUuid: audit.linkId
        ? legacyIdToUuid('projects', snapshot.links.find((link) => link.id === audit.linkId)?.projectId ?? 0)
        : null,
      auditorUuid: audit.auditorId ? legacyIdToUuid('users', audit.auditorId) : null,
    });
    const id = payload.id ?? legacyIdToUuid('audits', audit.id);
    try {
      await upsertOrSkip('crm_audits', id, payload as Record<string, unknown>, normalizedOptions, 'audits', report);
    } catch (error) {
      report.errors.push(`Audit ${audit.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (normalizedOptions.importNotifications) {
    for (const notification of snapshot.notifications) {
      const idNumeric = Number.parseInt(notification.id.replace(/\D/g, ''), 10) || Date.now();
      const payload = mapNotificationToDbInsert(notification, {
        userUuid: legacyIdToUuid('users', notification.userId),
      });
      const id = payload.id ?? legacyIdToUuid('notifications', idNumeric);
      try {
        await upsertOrSkip(
          'crm_notifications',
          id,
          { ...payload, id } as Record<string, unknown>,
          normalizedOptions,
          'notifications',
          report
        );
      } catch (error) {
        report.errors.push(
          `Notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  } else {
    report.skipped.notifications = snapshot.notifications.length;
  }

  for (const payment of snapshot.payments) {
    const payload = mapPaymentToDbFinancialOperationInsert(payment);
    const id = payload.id ?? legacyIdToUuid('payments', payment.id);
    try {
      await upsertOrSkip(
        'crm_financial_operations',
        id,
        payload as Record<string, unknown>,
        normalizedOptions,
        'financialOperations',
        report
      );
    } catch (error) {
      report.errors.push(`Payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (normalizedOptions.importSettings) {
    for (const setting of mapSettingsToDbInsert(snapshot.settings)) {
      try {
        await upsertGlobalSetting(setting, normalizedOptions, report);
      } catch (error) {
        report.errors.push(`Setting ${setting.key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return report;
}

export function validateSupabaseImportResult(report: LocalStorageToSupabaseImportReport): {
  pass: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings = [...report.warnings];
  const errors = [...report.errors];
  if (report.imported.users === 0 && report.found.users > 0 && !report.dryRun) {
    errors.push('No users imported.');
  }
  if (report.imported.projects === 0 && report.found.projects > 0 && !report.dryRun) {
    errors.push('No projects imported.');
  }
  if (report.skipped.users > 0 || report.skipped.projects > 0 || report.skipped.links > 0) {
    warnings.push('Some entities were skipped due to idempotency rules.');
  }
  return { pass: errors.length === 0, warnings, errors };
}

export async function validateSupabaseDataIntegrity(): Promise<SupabaseDataIntegrityReport> {
  const client = getSupabaseClientOrThrow();
  const warnings: string[] = [];
  const errors: string[] = [];

  const [
    users,
    clients,
    projects,
    links,
    audits,
    notifications,
    financialOperations,
  ] = await Promise.all([
    client.from('crm_users').select('id', { count: 'exact', head: true }),
    client.from('crm_clients').select('id', { count: 'exact', head: true }),
    client.from('crm_projects').select('id,client_id,currency,deadline_at', { count: 'exact' }),
    client
      .from('crm_links')
      .select(
        'id,project_id,url,work_status,currency,deadline_at,client_payment_status,executor_payment_status',
        { count: 'exact' }
      ),
    client.from('crm_audits').select('id', { count: 'exact', head: true }),
    client.from('crm_notifications').select('id,user_id', { count: 'exact' }),
    client.from('crm_financial_operations').select('id,currency', { count: 'exact' }),
  ]);

  if (users.error) errors.push(users.error.message);
  if (clients.error) errors.push(clients.error.message);
  if (projects.error) errors.push(projects.error.message);
  if (links.error) errors.push(links.error.message);
  if (audits.error) errors.push(audits.error.message);
  if (notifications.error) errors.push(notifications.error.message);
  if (financialOperations.error) errors.push(financialOperations.error.message);

  const projectRows = projects.data ?? [];
  const linkRows = links.data ?? [];
  const notificationRows = notifications.data ?? [];
  const finRows = financialOperations.data ?? [];

  const projectIds = new Set(projectRows.map((row) => row.id));
  const projectDuplicateUrl = new Map<string, number>();
  linkRows.forEach((row) => {
    const duplicateKey = `${row.project_id}::${String(row.url).trim().toLowerCase()}`;
    projectDuplicateUrl.set(duplicateKey, (projectDuplicateUrl.get(duplicateKey) ?? 0) + 1);
    if (!projectIds.has(row.project_id)) errors.push(`Orphan link ${row.id}: project ${row.project_id} missing.`);
    if (!row.currency) errors.push(`Link ${row.id} has empty currency.`);
    if (!VALID_WORK_STATUSES.has(row.work_status)) warnings.push(`Link ${row.id} has non-canonical work status ${row.work_status}.`);
  });

  projectRows.forEach((row) => {
    if (!row.client_id) errors.push(`Project ${row.id} without client.`);
    if (!row.currency) errors.push(`Project ${row.id} without currency.`);
    if (!row.deadline_at || row.deadline_at.slice(0, 10) < todayISO()) {
      warnings.push(`Project ${row.id} has missing/overdue deadline.`);
    }
  });

  const duplicateInsideProject = Array.from(projectDuplicateUrl.values()).filter((value) => value > 1).length;
  if (duplicateInsideProject > 0) warnings.push(`Duplicate URLs inside one project: ${duplicateInsideProject}.`);

  notificationRows.forEach((row) => {
    if (!row.user_id) errors.push(`Notification ${row.id} without user_id.`);
  });
  finRows.forEach((row) => {
    if (!row.currency) errors.push(`Financial operation ${row.id} without currency.`);
  });

  return {
    pass: errors.length === 0,
    counts: {
      users: users.count ?? 0,
      clients: clients.count ?? 0,
      projects: projects.count ?? 0,
      links: links.count ?? 0,
      audits: audits.count ?? 0,
      notifications: notifications.count ?? 0,
      financialOperations: financialOperations.count ?? 0,
    },
    warnings,
    errors,
  };
}

