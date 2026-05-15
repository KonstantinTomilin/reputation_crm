import { useMemo } from 'react';

export interface AuthUserData {
  id: number;
  email: string;
  password: string;
  role: string;
  name: string;
}

export function getCurrentAuthUser(): AuthUserData | null {
  try {
    const raw = localStorage.getItem('crm_user');
    if (!raw) return null;
    return JSON.parse(raw) as AuthUserData;
  } catch {
    return null;
  }
}

export function useCurrentExecutorId(users: { id: number; email: string; role: string }[]): number | null {
  return useMemo(() => {
    const auth = getCurrentAuthUser();
    if (!auth) return null;
    const found = users.find((u) => u.email === auth.email && u.role === 'executor');
    return found?.id ?? auth.id ?? null;
  }, [users]);
}

export function getExecutorIdFromContext(users: { id: number; email: string; role: string }[]): number | null {
  const auth = getCurrentAuthUser();
  if (!auth) return null;
  const found = users.find((u) => u.email === auth.email && u.role === 'executor');
  return found?.id ?? auth.id ?? null;
}