import type {
  CRMAudit,
  CRMClient,
  CRMLink,
  CRMNotification,
  CRMPayment,
  CRMProject,
  CRMSettings,
  CRMUser,
} from '@/mocks/crm';
import { getSupabaseClientOrNull, testSupabaseConnection } from '@/lib/supabase';
import type { CRMRepository } from './CRMRepository';
import { LocalStorageCRMRepository } from './LocalStorageCRMRepository';
import type { CRMSnapshot, SessionUser } from './types';
import {
  legacyIdToUuid,
  mapAuditToDbInsert,
  mapClientToDbInsert,
  mapDbAuditToAudit,
  mapDbClientToClient,
  mapDbFinancialOperationToPayment,
  mapDbLinkToLink,
  mapDbNotificationToNotification,
  mapDbProjectToProject,
  mapDbSettingsToSettings,
  mapDbUserToUser,
  mapLinkToDbInsert,
  mapNotificationToDbInsert,
  mapPaymentToDbFinancialOperationInsert,
  mapProjectToDbInsert,
  mapSettingsToDbInsert,
  mapUserToDbInsert,
  type DbAuditRow,
  type DbClientRow,
  type DbFinancialOperationRow,
  type DbLinkRow,
  type DbNotificationRow,
  type DbProjectRow,
  type DbSettingRow,
  type DbUserRow,
} from './supabaseMappers';

export interface AsyncCRMRepository {
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
  listUsers(): Promise<CRMUser[]>;
  createUser(input: Omit<CRMUser, 'id'>): Promise<CRMUser>;
  listClients(): Promise<CRMClient[]>;
  createClient(input: Omit<CRMClient, 'id'>): Promise<CRMClient>;
  listProjects(): Promise<CRMProject[]>;
  createProject(input: CRMProject): Promise<CRMProject>;
  updateProject(input: CRMProject): Promise<CRMProject>;
  listLinks(): Promise<CRMLink[]>;
  createLink(input: CRMLink): Promise<CRMLink>;
  updateLink(input: CRMLink): Promise<CRMLink>;
  listAudits(): Promise<CRMAudit[]>;
  createAudit(input: CRMAudit): Promise<CRMAudit>;
  updateAudit(input: CRMAudit): Promise<CRMAudit>;
  listNotifications(): Promise<CRMNotification[]>;
  createNotification(input: CRMNotification): Promise<CRMNotification>;
  markNotificationRead(notificationId: string): Promise<void>;
  listFinancialOperations(): Promise<CRMPayment[]>;
  createFinancialOperation(input: CRMPayment): Promise<CRMPayment>;
  listSettings(): Promise<CRMSettings>;
  upsertSetting(input: CRMSettings): Promise<CRMSettings>;
}

/**
 * Stage 2.3:
 * - keeps sync CRMRepository behavior via localStorage fallback
 * - extends async Supabase methods for migration bootstrap and smoke CRUD
 */
export class SupabaseCRMRepository implements CRMRepository, AsyncCRMRepository {
  private readonly localFallback = new LocalStorageCRMRepository();

  readonly storageKeys = this.localFallback.storageKeys;

  loadSnapshot(): CRMSnapshot {
    return this.localFallback.loadSnapshot();
  }

  saveSnapshot(snapshot: CRMSnapshot): void {
    this.localFallback.saveSnapshot(snapshot);
  }

  clearEntityData(): void {
    this.localFallback.clearEntityData();
  }

  getSessionUser(): SessionUser | null {
    return this.localFallback.getSessionUser();
  }

  setSessionUser(user: SessionUser | null): void {
    this.localFallback.setSessionUser(user);
  }

  clearSession(): void {
    this.localFallback.clearSession();
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    const result = await testSupabaseConnection();
    return { ok: result.ok, message: result.message };
  }

  async listUsers(): Promise<CRMUser[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbUserRow[]).map(mapDbUserToUser);
  }

  async createUser(input: Omit<CRMUser, 'id'>): Promise<CRMUser> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapUserToDbInsert(input);
    const { data, error } = await client.from('crm_users').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbUserToUser(data as DbUserRow);
  }

  async listClients(): Promise<CRMClient[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_clients')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbClientRow[]).map(mapDbClientToClient);
  }

  async createClient(input: Omit<CRMClient, 'id'>): Promise<CRMClient> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapClientToDbInsert(input);
    const { data, error } = await client.from('crm_clients').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbClientToClient(data as DbClientRow);
  }

  async listProjects(): Promise<CRMProject[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbProjectRow[]).map(mapDbProjectToProject);
  }

  async createProject(input: CRMProject): Promise<CRMProject> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapProjectToDbInsert(input, { clientUuid: legacyIdToUuid('clients', input.clientId) });
    const { data, error } = await client.from('crm_projects').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbProjectToProject(data as DbProjectRow);
  }

  async updateProject(input: CRMProject): Promise<CRMProject> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_projects')
      .update(mapProjectToDbInsert(input, { clientUuid: legacyIdToUuid('clients', input.clientId) }))
      .eq('id', legacyIdToUuid('projects', input.id))
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbProjectToProject(data as DbProjectRow);
  }

  async listLinks(): Promise<CRMLink[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_links')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbLinkRow[]).map(mapDbLinkToLink);
  }

  async createLink(input: CRMLink): Promise<CRMLink> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapLinkToDbInsert(input, {
      projectUuid: legacyIdToUuid('projects', input.projectId),
      clientUuid: input.clientId ? legacyIdToUuid('clients', input.clientId) : null,
      executorUuid: input.executorId ? legacyIdToUuid('users', input.executorId) : null,
      auditorUuid: input.auditorId ? legacyIdToUuid('users', input.auditorId) : null,
      projectCurrency: null,
    });
    const { data, error } = await client.from('crm_links').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbLinkToLink(data as DbLinkRow);
  }

  async updateLink(input: CRMLink): Promise<CRMLink> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapLinkToDbInsert(input, {
      projectUuid: legacyIdToUuid('projects', input.projectId),
      clientUuid: input.clientId ? legacyIdToUuid('clients', input.clientId) : null,
      executorUuid: input.executorId ? legacyIdToUuid('users', input.executorId) : null,
      auditorUuid: input.auditorId ? legacyIdToUuid('users', input.auditorId) : null,
      projectCurrency: null,
    });
    const { data, error } = await client
      .from('crm_links')
      .update(payload)
      .eq('id', legacyIdToUuid('links', input.id))
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbLinkToLink(data as DbLinkRow);
  }

  async listAudits(): Promise<CRMAudit[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_audits')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbAuditRow[]).map(mapDbAuditToAudit);
  }

  async createAudit(input: CRMAudit): Promise<CRMAudit> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapAuditToDbInsert(input, {
      linkUuid: input.linkId ? legacyIdToUuid('links', input.linkId) : null,
      projectUuid: null,
      auditorUuid: input.auditorId ? legacyIdToUuid('users', input.auditorId) : null,
    });
    const { data, error } = await client.from('crm_audits').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbAuditToAudit(data as DbAuditRow);
  }

  async updateAudit(input: CRMAudit): Promise<CRMAudit> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapAuditToDbInsert(input, {
      linkUuid: input.linkId ? legacyIdToUuid('links', input.linkId) : null,
      projectUuid: null,
      auditorUuid: input.auditorId ? legacyIdToUuid('users', input.auditorId) : null,
    });
    const { data, error } = await client
      .from('crm_audits')
      .update(payload)
      .eq('id', legacyIdToUuid('audits', input.id))
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbAuditToAudit(data as DbAuditRow);
  }

  async listNotifications(): Promise<CRMNotification[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbNotificationRow[]).map(mapDbNotificationToNotification);
  }

  async createNotification(input: CRMNotification): Promise<CRMNotification> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapNotificationToDbInsert(input, { userUuid: legacyIdToUuid('users', input.userId) });
    const { data, error } = await client.from('crm_notifications').insert(payload).select('*').single();
    if (error) throw new Error(error.message);
    return mapDbNotificationToNotification(data as DbNotificationRow);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw new Error(error.message);
  }

  async listFinancialOperations(): Promise<CRMPayment[]> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_financial_operations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbFinancialOperationRow[]).map(mapDbFinancialOperationToPayment);
  }

  async createFinancialOperation(input: CRMPayment): Promise<CRMPayment> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapPaymentToDbFinancialOperationInsert(input);
    const { data, error } = await client
      .from('crm_financial_operations')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapDbFinancialOperationToPayment(data as DbFinancialOperationRow);
  }

  async listSettings(): Promise<CRMSettings> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { data, error } = await client
      .from('crm_settings')
      .select('*')
      .eq('scope', 'global')
      .is('user_id', null);
    if (error) throw new Error(error.message);
    return mapDbSettingsToSettings((data ?? []) as DbSettingRow[]);
  }

  async upsertSetting(input: CRMSettings): Promise<CRMSettings> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    for (const setting of mapSettingsToDbInsert(input)) {
      const { data, error } = await client
        .from('crm_settings')
        .select('id')
        .eq('scope', setting.scope)
        .is('user_id', setting.user_id ?? null)
        .eq('key', setting.key)
        .limit(1);
      if (error) throw new Error(error.message);
      if ((data?.length ?? 0) > 0) {
        const { error: updateError } = await client
          .from('crm_settings')
          .update({ value: setting.value })
          .eq('scope', setting.scope)
          .is('user_id', setting.user_id ?? null)
          .eq('key', setting.key);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await client.from('crm_settings').insert(setting);
        if (insertError) throw new Error(insertError.message);
      }
    }
    return input;
  }
}

