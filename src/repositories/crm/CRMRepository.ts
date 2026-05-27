import type { CRMSnapshot, SessionUser, CRMStorageKeys } from './types';

export interface CRMRepository {
  readonly storageKeys: CRMStorageKeys;
  getDataMode?(): 'localStorage' | 'supabase' | 'backend';
  loadSnapshot(): CRMSnapshot;
  saveSnapshot(snapshot: CRMSnapshot): void;
  loadSnapshotAsync?(): Promise<CRMSnapshot>;
  saveSnapshotAsync?(snapshot: CRMSnapshot): Promise<void>;
  clearEntityData(): void;
  getSessionUser(): SessionUser | null;
  setSessionUser(user: SessionUser | null): void;
  clearSession(): void;
}

// Stage 2.4+: async-first contract used by Supabase primary mode.
export interface AsyncSnapshotRepository extends CRMRepository {
  loadSnapshotAsync(): Promise<CRMSnapshot>;
  saveSnapshotAsync(snapshot: CRMSnapshot): Promise<void>;
}
