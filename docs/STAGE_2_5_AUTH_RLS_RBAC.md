# Stage 2.5: Supabase Auth Mapping + RLS/RBAC Preparation

## 1) Auth model chosen

Hybrid bridge model:

- UI login stays `login + password`.
- In Supabase auth mode, login maps to technical email:
  - `login -> ${login}@crm.local`
- Supabase Auth is used for session/token.
- `crm_users` remains business profile table:
  - `login`, `role`, `display_name`, `status`, `auth_user_id`, `technical_email`.

Fallback:

- Legacy password fallback is temporarily supported for users that are not yet linked to `auth_user_id`.
- TODO Stage 2.6: remove legacy fallback after full auth migration.

## 2) Technical email mapping

Helper file: `src/lib/auth/loginToEmail.ts`

- `normalizeLogin(login)`
- `loginToTechnicalEmail(login)`
- `isTechnicalCrmEmail(email)`

Rules:

- login normalized to lowercase.
- spaces/special dangerous chars are rejected.
- technical email is internal and not shown as main UX identity.

## 3) SQL migrations

Added:

- `supabase/migrations/002_auth_mapping.sql`
- `supabase/migrations/003_rls_policies.sql`

`002_auth_mapping.sql`:

- adds `auth_user_id`, `technical_email`, `last_login_at` to `crm_users`
- adds indexes and partial unique constraints for auth mapping
- optional backfill for `technical_email`

`003_rls_policies.sql`:

- helper functions:
  - `crm_current_user_id()`
  - `crm_current_role()`
  - `crm_is_main_admin()`
  - `crm_is_active()`
- prepared policies for `crm_*` tables
- RLS enable statements are intentionally commented for step-by-step rollout

## 4) First main_admin bootstrap (safe option A)

Use Supabase dashboard/manual SQL:

1. Create Auth user in Supabase Auth users using technical email:
   - `main_admin@crm.local`
2. Insert or update `crm_users` row with:
   - `login='main_admin'`
   - `technical_email='main_admin@crm.local'`
   - `auth_user_id=<auth user uuid>`
   - `role='main_admin'`
   - `status='active'`

Example:

```sql
update crm_users
set auth_user_id = '<AUTH_USER_UUID>',
    technical_email = 'main_admin@crm.local',
    status = 'active'
where login = 'main_admin';
```

If row does not exist:

```sql
insert into crm_users (login, technical_email, auth_user_id, role, display_name, status)
values ('main_admin', 'main_admin@crm.local', '<AUTH_USER_UUID>', 'main_admin', 'Main Admin', 'active');
```

## 5) How to enable Supabase auth mode

Set env:

- `VITE_CRM_AUTH_MODE=supabase`
- `VITE_CRM_DATA_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Legacy mode is still available:

- `VITE_CRM_AUTH_MODE=legacy`

## 6) How to enable RLS safely

Recommended rollout:

1. Apply migration `003_rls_policies.sql`.
2. Enable RLS table-by-table in staging.
3. Test each role (main_admin/client/executor/auditor).
4. Roll to production only after role tests pass.

Do not enable all strict policies at once without verification.

## 7) Role test checklist

- **main_admin**: full read/write in management scope.
- **client**: only own profile/projects/links (scoped).
- **executor**: only assigned links; restricted update fields.
- **auditor**: only assigned audits.

## 8) Why no service_role in frontend

`service_role` bypasses RLS and is privileged.
It must only exist in secure backend runtime (e.g. Edge Function env), never in browser-exposed env.

## 9) Frontend RBAC vs RLS

- Frontend RBAC = UX convenience.
- RLS = real security boundary.

Both should coexist; RLS remains authoritative.

## 10) What is not auto-enabled yet

- Strict RLS is prepared but not auto-enabled.
- Full edge-function admin user provisioning is prepared as integration point (`admin-create-user`) but not forced.
- Legacy auth fallback remains until Stage 2.6 hardening.

