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

// TODO(Stage 2.3): move repository contract to async-first API for backend mode.
