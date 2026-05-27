# Stage 2.2 Supabase Setup

This stage prepares Supabase as backend foundation without replacing the current localStorage flow.

## 1) Required env vars

For frontend (safe to expose in browser):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional compatibility vars (already supported by code):

- `VITE_PUBLIC_SUPABASE_URL`
- `VITE_PUBLIC_SUPABASE_ANON_KEY`

Data mode flag:

- `VITE_CRM_DATA_MODE=localStorage | backend | supabase`

Default remains `localStorage`.

## 2) Apply SQL schema in Supabase

1. Open Supabase project.
2. Go to SQL Editor.
3. Run file: `supabase/migrations/001_crm_schema.sql`.

This creates CRM tables, `updated_at` trigger function, update triggers, and indexes.

## 3) Apply seed (dev only)

1. In SQL Editor run: `supabase/seed.sql`.
2. This inserts demo users/clients/projects/links/notification.
3. Password hashes are placeholders on purpose (auth migration is not in Stage 2.2).

## 4) Verify tables

In SQL Editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'crm_%'
order by table_name;
```

## 5) Verify frontend env

In browser console (on app):

```js
import('/src/lib/supabase.ts').then(async (m) => {
  console.log('isSupabaseConfigured:', m.isSupabaseConfigured);
  console.log(await m.testSupabaseConnection());
});
```

Expected: `{ ok: true, ... }` when env is configured correctly.

## 6) Why mode is still localStorage

`localStorage` is still default by design to keep existing CRM behavior stable.
Supabase repository is added as experimental foundation for incremental migration.

## 7) What comes in Stage 2.3

- Expand Supabase repository operations.
- Add safe import pipeline from localStorage snapshot to Supabase tables.
- Introduce progressive backend read paths behind feature flags.
- Prepare async repository transition for CRMContext.

## 8) What NOT to do now

- Do **not** place `service_role` key in frontend env.
- Do **not** force `backend/supabase` mode in production yet.
- Do **not** enable strict RLS policies before server auth mapping is ready.

