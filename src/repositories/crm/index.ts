import type { CRMRepository } from './CRMRepository';
import { LocalStorageCRMRepository } from './LocalStorageCRMRepository';
import { SupabaseCRMRepository } from './SupabaseCRMRepository';
export type { CRMRepository } from './CRMRepository';
export type { AuthUser, CRMSnapshot, SessionUser, CRMStorageKeys } from './types';
export type { AsyncCRMRepository } from './SupabaseCRMRepository';
export * from './supabaseMappers';
export * from './localStorageExport';
export * from './importLocalStorageToSupabase';

export type CRMDataMode = 'localStorage' | 'backend' | 'supabase';

function resolveDataMode(): CRMDataMode {
  const mode = import.meta.env.VITE_CRM_DATA_MODE as string | undefined;
  if (mode === 'backend') return 'backend';
  if (mode === 'supabase') return 'supabase';
  return 'localStorage';
}

export function createCRMRepository(): CRMRepository {
  const mode = resolveDataMode();
  if (mode === 'backend') {
    console.warn('[CRM] Backend repository is not implemented yet. Falling back to localStorage mode.');
    return new LocalStorageCRMRepository();
  }
  if (mode === 'supabase') {
    console.warn(
      '[CRM] Supabase mode is experimental in Stage 2.3. Core CRM data flow still uses localStorage-compatible snapshot methods.'
    );
    return new SupabaseCRMRepository();
  }
  return new LocalStorageCRMRepository();
}

export function createExperimentalSupabaseRepository(): SupabaseCRMRepository {
  return new SupabaseCRMRepository();
}
