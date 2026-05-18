import { createCRMRepository } from '@/repositories/crm';
import type { SessionUser } from '@/repositories/crm/types';

export type { SessionUser };

const MANAGEMENT_ROLES = ['main_admin', 'admin', 'manager', 'leader'];
const CLIENT_PREFIX = '/client';
const EXECUTOR_PREFIX = '/executor';
const AUDITOR_PREFIX = '/auditor';
const MANAGEMENT_PREFIX = '/management';

export function getSessionUser(): SessionUser | null {
  const repository = createCRMRepository();
  return repository.getSessionUser();
}

export function setSessionUser(user: SessionUser): void {
  const repository = createCRMRepository();
  repository.setSessionUser(user);
}

export function clearSession(): void {
  const repository = createCRMRepository();
  repository.clearSession();
}

export function isManagementRole(role: string): boolean {
  return MANAGEMENT_ROLES.includes(role);
}

export function getHomeRoute(role: string): string {
  if (role === 'client') return CLIENT_PREFIX;
  if (role === 'executor') return EXECUTOR_PREFIX;
  if (role === 'auditor') return AUDITOR_PREFIX;
  if (isManagementRole(role)) return `${MANAGEMENT_PREFIX}/overview`;
  return '/';
}

export function canAccessPath(role: string, pathname: string): boolean {
  if (pathname === '/' || pathname === '/crm-login') return true;
  if (role === 'client') return pathname.startsWith(CLIENT_PREFIX);
  if (role === 'executor') return pathname.startsWith(EXECUTOR_PREFIX);
  if (role === 'auditor') return pathname.startsWith(AUDITOR_PREFIX);
  if (isManagementRole(role)) return pathname.startsWith(MANAGEMENT_PREFIX);
  return false;
}

export function getLayoutRole(role: string): 'client' | 'executor' | 'auditor' | 'management' {
  if (role === 'client') return 'client';
  if (role === 'executor') return 'executor';
  if (role === 'auditor') return 'auditor';
  return 'management';
}
