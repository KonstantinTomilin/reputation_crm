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
import { clientPaymentFromLegacy, executorPaymentFromLegacy, syncLegacyPaymentFlags } from '@/lib/linkFinance';
import type { AsyncSnapshotRepository } from './CRMRepository';
import { LocalStorageCRMRepository } from './LocalStorageCRMRepository';
import type { AuthUser, CRMSnapshot, SessionUser } from './types';
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
  uuidToLegacyNumericId,
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
  login(login: string, password: string): Promise<SessionUser>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<SessionUser | null>;
  healthCheck(): Promise<{ ok: boolean; message?: string }>;
  listUsers(): Promise<CRMUser[]>;
  getUserByLogin(login: string): Promise<CRMUser | null>;
  ensureUserByLogin(
    input: Omit<CRMUser, 'id'>,
    options?: { legacyId?: number; password?: string }
  ): Promise<CRMUser>;
  createUser(input: Omit<CRMUser, 'id'>): Promise<CRMUser>;
  updateUser(input: CRMUser): Promise<CRMUser>;
  softDeleteUser(userId: number): Promise<void>;
  blockUser(userId: number): Promise<void>;
  unblockUser(userId: number): Promise<void>;
  listClients(): Promise<CRMClient[]>;
  createClient(input: Omit<CRMClient, 'id'>): Promise<CRMClient>;
  updateClient(input: CRMClient): Promise<CRMClient>;
  softDeleteClient(clientId: number): Promise<void>;
  listProjects(): Promise<CRMProject[]>;
  createProject(input: CRMProject): Promise<CRMProject>;
  updateProject(input: CRMProject): Promise<CRMProject>;
  softDeleteProject(projectId: number): Promise<void>;
  listLinks(): Promise<CRMLink[]>;
  createLink(input: CRMLink): Promise<CRMLink>;
  createLinksBulk(inputs: CRMLink[]): Promise<CRMLink[]>;
  updateLink(input: CRMLink): Promise<CRMLink>;
  updateLinkStatus(linkId: number, status: string): Promise<CRMLink>;
  softDeleteLink(linkId: number): Promise<void>;
  listAudits(): Promise<CRMAudit[]>;
  createAudit(input: CRMAudit): Promise<CRMAudit>;
  updateAudit(input: CRMAudit): Promise<CRMAudit>;
  updateAuditStatus(auditId: number, status: string): Promise<CRMAudit>;
  listNotifications(): Promise<CRMNotification[]>;
  createNotification(input: CRMNotification): Promise<CRMNotification>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: number): Promise<void>;
  listFinancialOperations(): Promise<CRMPayment[]>;
  createFinancialOperation(input: CRMPayment): Promise<CRMPayment>;
  updateFinancialOperation(input: CRMPayment): Promise<CRMPayment>;
  listSettings(): Promise<CRMSettings>;
  getSetting(key: keyof CRMSettings): Promise<CRMSettings[keyof CRMSettings]>;
  upsertSetting(input: CRMSettings): Promise<CRMSettings>;
  runIntegrityChecks(): Promise<{ warnings: string[]; errors: string[] }>;
}

export class DuplicateLoginError extends Error {
  constructor() {
    super('Пользователь с таким логином уже существует');
    this.name = 'DuplicateLoginError';
  }
}

/**
 * Stage 2.3:
 * - keeps sync CRMRepository behavior via localStorage fallback
 * - extends async Supabase methods for migration bootstrap and smoke CRUD
 */
export class SupabaseCRMRepository implements AsyncSnapshotRepository, AsyncCRMRepository {
  private readonly localFallback = new LocalStorageCRMRepository();

  readonly storageKeys = this.localFallback.storageKeys;

  getDataMode(): 'supabase' {
    return 'supabase';
  }

  loadSnapshot(): CRMSnapshot {
    return this.localFallback.loadSnapshot();
  }

  saveSnapshot(snapshot: CRMSnapshot): void {
    this.localFallback.saveSnapshot(snapshot); // keep local cache for emergency fallback
    void this.saveSnapshotAsync(snapshot);
  }

  async loadSnapshotAsync(): Promise<CRMSnapshot> {
    const [users, clients, projects, links, audits, payments, notifications, settings] =
      await Promise.all([
        this.listUsers(),
        this.listClients(),
        this.listProjects(),
        this.listLinks(),
        this.listAudits(),
        this.listFinancialOperations(),
        this.listNotifications(),
        this.listSettings(),
      ]);

    const authUsers: AuthUser[] = await this.listAuthUsersFromSupabase(users);

    const snapshot: CRMSnapshot = {
      users,
      clients,
      projects,
      links: links.map((link) => syncLegacyPaymentFlags(link)),
      audits,
      payments,
      notifications,
      settings,
      authUsers,
    };

    this.localFallback.saveSnapshot(snapshot);
    return snapshot;
  }

  async saveSnapshotAsync(snapshot: CRMSnapshot): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');

    // Keep auth snapshot in local storage for legacy login fallback.
    this.localFallback.saveSnapshot(snapshot);

    const authMap = new Map(snapshot.authUsers.map((user) => [user.id, user]));
    const userUuidByLegacyId = new Map<number, string>();

    await Promise.all(snapshot.users.map(async (user) => {
      const authUser = authMap.get(user.id);
      try {
        const row = await this.ensureUserRowByLogin(user, {
          legacyId: user.id,
          password: authUser?.password ?? 'password',
        });
        userUuidByLegacyId.set(user.id, row.id);
      } catch (error) {
        throw new Error(
          `Failed to save user ${user.id} (${user.login}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }));

    await Promise.all(
      snapshot.clients.map(async (entity) => {
        const payload = mapClientToDbInsert(entity, entity.id);
        const { error } = await client.from('crm_clients').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save client ${entity.id}: ${error.message}`);
      })
    );

    await Promise.all(
      snapshot.projects.map(async (entity) => {
        const payload = mapProjectToDbInsert(entity, {
          clientUuid: legacyIdToUuid('clients', entity.clientId),
        });
        const { error } = await client.from('crm_projects').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save project ${entity.id}: ${error.message}`);
      })
    );

    const projectCurrencyMap = new Map(snapshot.projects.map((project) => [project.id, project.currency]));
    await Promise.all(
      snapshot.links.map(async (entity) => {
        const payload = mapLinkToDbInsert(entity, {
          projectUuid: legacyIdToUuid('projects', entity.projectId),
          clientUuid: entity.clientId ? legacyIdToUuid('clients', entity.clientId) : null,
          executorUuid: entity.executorId
            ? (userUuidByLegacyId.get(entity.executorId) ?? legacyIdToUuid('users', entity.executorId))
            : null,
          auditorUuid: entity.auditorId
            ? (userUuidByLegacyId.get(entity.auditorId) ?? legacyIdToUuid('users', entity.auditorId))
            : null,
          projectCurrency: projectCurrencyMap.get(entity.projectId) ?? null,
        });
        const { error } = await client.from('crm_links').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save link ${entity.id}: ${error.message}`);
      })
    );

    await Promise.all(
      snapshot.audits.map(async (entity) => {
        const link = snapshot.links.find((item) => item.id === entity.linkId);
        const payload = mapAuditToDbInsert(entity, {
          linkUuid: entity.linkId ? legacyIdToUuid('links', entity.linkId) : null,
          projectUuid: link ? legacyIdToUuid('projects', link.projectId) : null,
          auditorUuid: entity.auditorId
            ? (userUuidByLegacyId.get(entity.auditorId) ?? legacyIdToUuid('users', entity.auditorId))
            : null,
        });
        const { error } = await client.from('crm_audits').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save audit ${entity.id}: ${error.message}`);
      })
    );

    await Promise.all(
      snapshot.payments.map(async (entity) => {
        const payload = mapPaymentToDbFinancialOperationInsert(entity);
        const { error } = await client.from('crm_financial_operations').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save payment ${entity.id}: ${error.message}`);
      })
    );

    await Promise.all(
      snapshot.notifications.map(async (entity) => {
        const payload = mapNotificationToDbInsert(entity, {
          userUuid: userUuidByLegacyId.get(entity.userId) ?? legacyIdToUuid('users', entity.userId),
        });
        const { error } = await client.from('crm_notifications').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`Failed to save notification ${entity.id}: ${error.message}`);
      })
    );

    await this.upsertSetting(snapshot.settings);
  }

  clearEntityData(): void {
    this.localFallback.clearEntityData();
    const client = getSupabaseClientOrNull();
    if (!client) return;
    const now = new Date().toISOString();
    // Soft delete in Supabase mode to preserve history.
    void Promise.all([
      client.from('crm_links').update({ deleted_at: now }).is('deleted_at', null),
      client.from('crm_projects').update({ deleted_at: now }).is('deleted_at', null),
      client.from('crm_audits').update({ deleted_at: now }).is('deleted_at', null),
      client.from('crm_financial_operations').update({ deleted_at: now }).is('deleted_at', null),
      client.from('crm_clients').update({ deleted_at: now }).is('deleted_at', null),
    ]);
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

  async login(login: string, password: string): Promise<SessionUser> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const normalizedLogin = login.trim().toLowerCase();
    const { data, error } = await client
      .from('crm_users')
      .select('*')
      .ilike('login', normalizedLogin)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`Login failed: ${error.message}`);
    if (!data) throw new Error('Неверный логин или пароль');
    if (data.status === 'blocked' || data.status === 'deleted') {
      throw new Error('Учётная запись заблокирована.');
    }

    // Temporary bridge for Stage 2.4.
    // TODO(Stage 2.5): replace with proper secure password hashing + auth provider.
    const passwordHash = data.password_hash ?? 'password';
    const accepted =
      password === passwordHash ||
      (passwordHash === 'dev_placeholder_hash' && password === 'password');
    if (!accepted) throw new Error('Неверный логин или пароль');

    const sessionUser: SessionUser = {
      id: uuidToLegacyNumericId(data.id),
      email: `${data.login}@supabase.local`,
      login: data.login,
      role: data.role,
      name: data.display_name,
    };
    this.setSessionUser(sessionUser);
    return sessionUser;
  }

  async logout(): Promise<void> {
    this.clearSession();
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    return this.getSessionUser();
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

  async getUserByLogin(login: string): Promise<CRMUser | null> {
    const row = await this.getUserRowByLogin(login);
    if (!row) return null;
    return mapDbUserToUser(row);
  }

  async ensureUserByLogin(
    input: Omit<CRMUser, 'id'>,
    options?: { legacyId?: number; password?: string }
  ): Promise<CRMUser> {
    const row = await this.ensureUserRowByLogin(input, options);
    return mapDbUserToUser(row);
  }

  async createUser(input: Omit<CRMUser, 'id'>): Promise<CRMUser> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const existing = await this.getUserByLogin(input.login);
    if (existing) throw new DuplicateLoginError();
    const payload = mapUserToDbInsert(input);
    const { data, error } = await client.from('crm_users').insert(payload).select('*').single();
    if (error) {
      if (this.isDuplicateLoginError(error.message)) throw new DuplicateLoginError();
      throw new Error(error.message);
    }
    return mapDbUserToUser(data as DbUserRow);
  }

  async updateUser(input: CRMUser): Promise<CRMUser> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapUserToDbInsert(input, input.id);
    const { data, error } = await client
      .from('crm_users')
      .update(payload)
      .eq('id', legacyIdToUuid('users', input.id))
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return mapDbUserToUser(data as DbUserRow);
  }

  async softDeleteUser(userId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_users')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', legacyIdToUuid('users', userId));
    if (error) throw new Error(`Failed to soft-delete user: ${error.message}`);
  }

  async blockUser(userId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_users')
      .update({ status: 'blocked' })
      .eq('id', legacyIdToUuid('users', userId));
    if (error) throw new Error(`Failed to block user: ${error.message}`);
  }

  async unblockUser(userId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_users')
      .update({ status: 'active' })
      .eq('id', legacyIdToUuid('users', userId));
    if (error) throw new Error(`Failed to unblock user: ${error.message}`);
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

  async updateClient(input: CRMClient): Promise<CRMClient> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapClientToDbInsert(input, input.id);
    const { data, error } = await client
      .from('crm_clients')
      .update(payload)
      .eq('id', legacyIdToUuid('clients', input.id))
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update client: ${error.message}`);
    return mapDbClientToClient(data as DbClientRow);
  }

  async softDeleteClient(clientId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', legacyIdToUuid('clients', clientId));
    if (error) throw new Error(`Failed to soft-delete client: ${error.message}`);
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

  async softDeleteProject(projectId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const now = new Date().toISOString();
    const projectUuid = legacyIdToUuid('projects', projectId);
    const [projectResult, linksResult] = await Promise.all([
      client.from('crm_projects').update({ deleted_at: now }).eq('id', projectUuid),
      client.from('crm_links').update({ deleted_at: now }).eq('project_id', projectUuid),
    ]);
    if (projectResult.error) throw new Error(`Failed to soft-delete project: ${projectResult.error.message}`);
    if (linksResult.error) throw new Error(`Failed to soft-delete project links: ${linksResult.error.message}`);
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

  async createLinksBulk(inputs: CRMLink[]): Promise<CRMLink[]> {
    const created: CRMLink[] = [];
    for (const link of inputs) {
      created.push(await this.createLink(link));
    }
    return created;
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

  async updateLinkStatus(linkId: number, status: string): Promise<CRMLink> {
    const current = (await this.listLinks()).find((link) => link.id === linkId);
    if (!current) throw new Error(`Link #${linkId} not found`);
    const next = syncLegacyPaymentFlags({
      ...current,
      status: status as CRMLink['status'],
      clientPaymentStatus: clientPaymentFromLegacy(current),
      executorPaymentStatus: executorPaymentFromLegacy(current),
    });
    return this.updateLink(next);
  }

  async softDeleteLink(linkId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_links')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', legacyIdToUuid('links', linkId));
    if (error) throw new Error(`Failed to soft-delete link: ${error.message}`);
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

  async updateAuditStatus(auditId: number, status: string): Promise<CRMAudit> {
    const existing = (await this.listAudits()).find((audit) => audit.id === auditId);
    if (!existing) throw new Error(`Audit #${auditId} not found`);
    return this.updateAudit({
      ...existing,
      auditStatus: status as CRMAudit['auditStatus'],
    });
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

  async markAllNotificationsRead(userId: number): Promise<void> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const { error } = await client
      .from('crm_notifications')
      .update({ is_read: true })
      .eq('user_id', legacyIdToUuid('users', userId));
    if (error) throw new Error(`Failed to mark notifications read: ${error.message}`);
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

  async updateFinancialOperation(input: CRMPayment): Promise<CRMPayment> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const payload = mapPaymentToDbFinancialOperationInsert(input);
    const { data, error } = await client
      .from('crm_financial_operations')
      .update(payload)
      .eq('id', legacyIdToUuid('payments', input.id))
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update financial operation: ${error.message}`);
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

  async getSetting(key: keyof CRMSettings): Promise<CRMSettings[keyof CRMSettings]> {
    const settings = await this.listSettings();
    return settings[key];
  }

  async runIntegrityChecks(): Promise<{ warnings: string[]; errors: string[] }> {
    const [projects, links, notifications, financialOperations] = await Promise.all([
      this.listProjects(),
      this.listLinks(),
      this.listNotifications(),
      this.listFinancialOperations(),
    ]);
    const warnings: string[] = [];
    const errors: string[] = [];

    const clientIds = new Set((await this.listClients()).map((client) => client.id));
    projects.forEach((project) => {
      if (!clientIds.has(project.clientId)) {
        errors.push(`Project ${project.id} has missing client ${project.clientId}`);
      }
    });
    const projectIds = new Set(projects.map((project) => project.id));
    links.forEach((link) => {
      if (!projectIds.has(link.projectId)) errors.push(`Link ${link.id} has missing project ${link.projectId}`);
      if (!link.geo) warnings.push(`Link ${link.id} has empty currency marker`);
    });
    notifications.forEach((item) => {
      if (!item.userId) warnings.push(`Notification ${item.id} has empty user id`);
    });
    financialOperations.forEach((operation) => {
      if (!operation.currency) errors.push(`Financial operation ${operation.id} has empty currency`);
    });

    return { warnings, errors };
  }

  private async listAuthUsersFromSupabase(users: CRMUser[]): Promise<AuthUser[]> {
    const client = getSupabaseClientOrNull();
    if (!client) return [];
    const { data, error } = await client
      .from('crm_users')
      .select('id, login, password_hash, role, display_name')
      .is('deleted_at', null);
    if (error) throw new Error(`Failed to load auth users: ${error.message}`);

    if (!data || data.length === 0) {
      return users.map((user) => ({
        id: user.id,
        email: user.email,
        login: user.login,
        password: 'password',
        role: user.role,
        name: user.fullName,
      }));
    }

    return data.map((item) => ({
      id: uuidToLegacyNumericId(item.id as string),
      email: `${item.login as string}@supabase.local`,
      login: item.login as string,
      password: (item.password_hash as string | null) ?? 'password',
      role: item.role as string,
      name: (item.display_name as string) ?? (item.login as string),
    }));
  }

  private normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
  }

  private isDuplicateLoginError(message: string | undefined): boolean {
    return (message ?? '').includes('crm_users_login_key');
  }

  private async getUserRowByLogin(login: string): Promise<DbUserRow | null> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const normalizedLogin = this.normalizeLogin(login);
    const { data, error } = await client
      .from('crm_users')
      .select('*')
      .eq('login', normalizedLogin)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`Failed to get user by login: ${error.message}`);
    return (data as DbUserRow | null) ?? null;
  }

  private async ensureUserRowByLogin(
    input: Omit<CRMUser, 'id'>,
    options?: { legacyId?: number; password?: string }
  ): Promise<DbUserRow> {
    const client = getSupabaseClientOrNull();
    if (!client) throw new Error('Supabase env is not configured.');
    const normalizedLogin = this.normalizeLogin(input.login);
    const existing = await this.getUserRowByLogin(normalizedLogin);
    if (existing) return existing;

    const payload = mapUserToDbInsert(
      { ...input, login: normalizedLogin },
      options?.legacyId
    );
    const data = {
      ...payload,
      login: normalizedLogin,
      password_hash: options?.password ?? payload.password_hash ?? 'password',
    };

    const { data: inserted, error } = await client
      .from('crm_users')
      .insert(data)
      .select('*')
      .single();

    if (error) {
      if (this.isDuplicateLoginError(error.message)) {
        const conflictUser = await this.getUserRowByLogin(normalizedLogin);
        if (conflictUser) return conflictUser;
        throw new DuplicateLoginError();
      }
      throw new Error(`Failed to ensure user by login: ${error.message}`);
    }

    return inserted as DbUserRow;
  }
}

