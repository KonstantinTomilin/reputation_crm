import { useMemo } from 'react';
import { getSessionUser } from '@/lib/auth';

export interface AuthUserData {
  id: number;
  email: string;
  role: string;
  name: string;
  login?: string;
}

export function getCurrentAuthUser(): AuthUserData | null {
  return getSessionUser();
}

export function useCurrentExecutorId(users: { id: number; email: string; role: string }[]): number | null {
  return useMemo(() => {
    const auth = getSessionUser();
    if (!auth) return null;
    const found = users.find((u) => (u.email === auth.email || u.id === auth.id) && u.role === 'executor');
    return found?.id ?? (auth.role === 'executor' ? auth.id : null);
  }, [users]);
}

export function getExecutorIdFromContext(users: { id: number; email: string; role: string }[]): number | null {
  const auth = getSessionUser();
  if (!auth) return null;
  const found = users.find((u) => (u.email === auth.email || u.id === auth.id) && u.role === 'executor');
  return found?.id ?? (auth.role === 'executor' ? auth.id : null);
}
