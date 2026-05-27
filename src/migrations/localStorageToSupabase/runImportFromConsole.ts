import {
  dryRunImportLocalStorageToSupabase,
  importLocalStorageToSupabase,
  validateSupabaseDataIntegrity,
  validateSupabaseImportResult,
} from '@/repositories/crm/importLocalStorageToSupabase';
import { exportLocalStorageSnapshot } from '@/repositories/crm/localStorageExport';

declare global {
  interface Window {
    __CRM_MIGRATION__?: {
      exportSnapshot: typeof exportLocalStorageSnapshot;
      dryRun: typeof runCrmMigrationDryRun;
      import: typeof runCrmMigrationImport;
      validate: typeof validateSupabaseDataIntegrity;
    };
  }
}

export async function runCrmMigrationDryRun() {
  const report = await dryRunImportLocalStorageToSupabase();
  const verdict = validateSupabaseImportResult(report);
  return { report, verdict };
}

export async function runCrmMigrationImport(options?: {
  confirm: string;
  overwriteExisting?: boolean;
  skipExisting?: boolean;
}) {
  if (options?.confirm !== 'IMPORT_LOCALSTORAGE_TO_SUPABASE') {
    throw new Error('Import is blocked. Pass confirm: "IMPORT_LOCALSTORAGE_TO_SUPABASE".');
  }

  const report = await importLocalStorageToSupabase({
    dryRun: false,
    overwriteExisting: options.overwriteExisting ?? false,
    skipExisting: options.skipExisting ?? true,
    importDeleted: true,
    importNotifications: true,
    importSettings: true,
  });
  const verdict = validateSupabaseImportResult(report);
  const integrity = await validateSupabaseDataIntegrity();
  return { report, verdict, integrity };
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__CRM_MIGRATION__ = {
    exportSnapshot: exportLocalStorageSnapshot,
    dryRun: runCrmMigrationDryRun,
    import: runCrmMigrationImport,
    validate: validateSupabaseDataIntegrity,
  };
}

