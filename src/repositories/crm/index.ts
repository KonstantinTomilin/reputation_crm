import type { CRMRepository } from './CRMRepository';
import { LocalStorageCRMRepository } from './LocalStorageCRMRepository';
export type { CRMRepository } from './CRMRepository';
export type { AuthUser, CRMSnapshot, SessionUser, CRMStorageKeys } from './types';

export type CRMDataMode = 'localStorage' | 'backend';

function resolveDataMode(): CRMDataMode {
  const mode = import.meta.env.VITE_CRM_DATA_MODE as string | undefined;
  if (mode === 'backend') return 'backend';
  return 'localStorage';
}

export function createCRMRepository(): CRMRepository {
  const mode = resolveDataMode();
  if (mode === 'backend') {
    console.warn('[CRM] Backend repository is not implemented yet. Falling back to localStorage mode.');
  }
  return new LocalStorageCRMRepository();
}

