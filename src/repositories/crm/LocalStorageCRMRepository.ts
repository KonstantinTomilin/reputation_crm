import {
  mockAudits as initialAudits,
  mockClients as initialClients,
  mockLinks as initialLinks,
  mockPayments as initialPayments,
  mockProjects as initialProjects,
  mockUsers as initialUsers,
  defaultCRMSettings,
} from '@/mocks/crm';
import type { CRMUser, CRMLink } from '@/mocks/crm';
import { syncLegacyPaymentFlags } from '@/lib/linkFinance';
import type { CRMRepository } from './CRMRepository';
import type { AuthUser, CRMSnapshot, SessionUser } from './types';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Keep legacy behavior: corrupted JSON falls back silently.
  }
  return fallback;
}

function migrateLink(link: CRMLink): CRMLink {
  return syncLegacyPaymentFlags({ ...link, isDeleted: link.isDeleted ?? false });
}

function migrateLinks(links: CRMLink[]): CRMLink[] {
  return links.map(migrateLink);
}

function ensureDefaultExecutors(users: CRMUser[]): CRMUser[] {
  const merged = [...users];
  let nextId = Math.max(...merged.map((u) => u.id), 0) + 1;
  const defaults: Omit<CRMUser, 'id'>[] = [
    { role: 'executor', login: 'rf_executor', email: 'rf@deindex.ru', fullName: 'РФ Исполнитель 1', language: 'ru', status: 'активен', alias: null },
    { role: 'executor', login: 'foreign_executor', email: 'foreign@deindex.ru', fullName: 'Зарубеж Исполнитель 2', language: 'ru', status: 'активен', alias: null },
  ];
  defaults.forEach((def) => {
    const exists = merged.some((u) => u.role === 'executor' && u.fullName === def.fullName);
    if (!exists) merged.push({ ...def, id: nextId++ });
  });
  return merged;
}

export class LocalStorageCRMRepository implements CRMRepository {
  readonly storageKeys = {
    links: 'crm_links',
    projects: 'crm_projects',
    clients: 'crm_clients',
    payments: 'crm_payments',
    audits: 'crm_audits',
    users: 'crm_users',
    authUsers: 'crm_auth_users',
    notifications: 'crm_notifications',
    settings: 'crm_settings',
    sessionUser: 'crm_user',
  } as const;

  getDataMode(): 'localStorage' {
    return 'localStorage';
  }

  loadSnapshot(): CRMSnapshot {
    const users = ensureDefaultExecutors(loadFromStorage(this.storageKeys.users, initialUsers));
    const authFromUsers: AuthUser[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      login: u.login,
      password: 'password',
      role: u.role,
      name: u.fullName,
    }));

    const initialAuthUsers: AuthUser[] = initialUsers.map((u) => ({
      id: u.id,
      email: u.email,
      login: u.login,
      password: 'password',
      role: u.role,
      name: u.fullName,
    }));
    const storedAuth = loadFromStorage(this.storageKeys.authUsers, initialAuthUsers);
    const authMap = new Map<number, AuthUser>();
    storedAuth.forEach((a) => authMap.set(a.id, a));
    authFromUsers.forEach((a) => {
      if (!authMap.has(a.id)) authMap.set(a.id, a);
    });

    return {
      links: migrateLinks(loadFromStorage(this.storageKeys.links, initialLinks)),
      projects: loadFromStorage(this.storageKeys.projects, initialProjects),
      clients: loadFromStorage(this.storageKeys.clients, initialClients),
      payments: loadFromStorage(this.storageKeys.payments, initialPayments),
      audits: loadFromStorage(this.storageKeys.audits, initialAudits),
      users,
      authUsers: Array.from(authMap.values()),
      notifications: loadFromStorage(this.storageKeys.notifications, []),
      settings: loadFromStorage(this.storageKeys.settings, defaultCRMSettings),
    };
  }

  saveSnapshot(snapshot: CRMSnapshot): void {
    localStorage.setItem(this.storageKeys.links, JSON.stringify(snapshot.links));
    localStorage.setItem(this.storageKeys.projects, JSON.stringify(snapshot.projects));
    localStorage.setItem(this.storageKeys.clients, JSON.stringify(snapshot.clients));
    localStorage.setItem(this.storageKeys.payments, JSON.stringify(snapshot.payments));
    localStorage.setItem(this.storageKeys.audits, JSON.stringify(snapshot.audits));
    localStorage.setItem(this.storageKeys.users, JSON.stringify(snapshot.users));
    localStorage.setItem(this.storageKeys.authUsers, JSON.stringify(snapshot.authUsers));
    localStorage.setItem(this.storageKeys.notifications, JSON.stringify(snapshot.notifications));
    localStorage.setItem(this.storageKeys.settings, JSON.stringify(snapshot.settings));
  }

  async loadSnapshotAsync(): Promise<CRMSnapshot> {
    return this.loadSnapshot();
  }

  async saveSnapshotAsync(snapshot: CRMSnapshot): Promise<void> {
    this.saveSnapshot(snapshot);
  }

  clearEntityData(): void {
    localStorage.removeItem(this.storageKeys.links);
    localStorage.removeItem(this.storageKeys.projects);
    localStorage.removeItem(this.storageKeys.audits);
    localStorage.removeItem(this.storageKeys.payments);
    localStorage.removeItem(this.storageKeys.clients);
  }

  getSessionUser(): SessionUser | null {
    return loadFromStorage<SessionUser | null>(this.storageKeys.sessionUser, null);
  }

  setSessionUser(user: SessionUser | null): void {
    if (!user) {
      localStorage.removeItem(this.storageKeys.sessionUser);
      return;
    }
    localStorage.setItem(this.storageKeys.sessionUser, JSON.stringify(user));
  }

  clearSession(): void {
    localStorage.removeItem(this.storageKeys.sessionUser);
  }
}

