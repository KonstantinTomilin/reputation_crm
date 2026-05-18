import type { CRMSnapshot, SessionUser, CRMStorageKeys } from './types';

export interface CRMRepository {
  readonly storageKeys: CRMStorageKeys;
  loadSnapshot(): CRMSnapshot;
  saveSnapshot(snapshot: CRMSnapshot): void;
  clearEntityData(): void;
  getSessionUser(): SessionUser | null;
  setSessionUser(user: SessionUser | null): void;
  clearSession(): void;
}

