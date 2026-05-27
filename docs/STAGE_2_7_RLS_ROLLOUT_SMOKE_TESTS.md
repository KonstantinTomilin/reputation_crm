# Stage 2.7: Controlled RLS Rollout + Role Smoke Tests

## 1) Apply order (manual, step-by-step)

1. Apply `supabase/migrations/003_rls_policies.sql`.
2. Open `supabase/migrations/004_enable_rls_stepwise.sql`.
3. Execute only STEP 1 apply statements.
4. Run smoke tests (UI/API) for all roles.
5. Continue to STEP 2 -> STEP 3 -> STEP 4 only after each pass.

## 2) Rollback strategy

If something breaks after a step:

- run rollback statements for the current step from `004_enable_rls_stepwise.sql`
- retest login and `/management/settings`
- fix policies before re-enabling

## 3) SQL Editor caveat

`auth.uid()` in Supabase SQL Editor does not represent browser user sessions the same way.
RLS behavior must be validated from app session/JWT context (frontend/API calls).

## 4) Suggested smoke users

- `main_admin`
- `client_test_1`
- `executor_test_1`
- `auditor_test_1`

Minimal dataset:

- one client profile linked to `client_test_1`
- one project for this client
- 2-3 links in project
- one link assigned to `executor_test_1`
- one audit assigned to `auditor_test_1`

## 5) UI smoke checklist by role

### main_admin

- can login
- can open management tabs
- can view users/clients/projects/links
- can create user via `admin-create-user`
- can view notifications and finance

### client

- can login
- sees only own projects/links/reports
- cannot access management users list
- cannot view foreign clients/projects

### executor

- can login
- sees only assigned links/projects
- can update work status in own links
- cannot edit price/payment/currency fields

### auditor

- can login
- sees only assigned audits/links
- cannot access finance data
- cannot see global users list

## 6) Optional SQL sanity checks (admin context)

```sql
select id, login, role, status, auth_user_id
from crm_users
order by created_at desc;
```

```sql
select count(*) from crm_projects where deleted_at is null;
select count(*) from crm_links where deleted_at is null;
select count(*) from crm_audits where deleted_at is null;
```

## 7) Runtime error hints

If app shows access issues after RLS step:

- check browser/network response code (`401/403`)
- verify `crm_users.auth_user_id` is linked to Supabase Auth user
- verify user `status='active'` and `deleted_at is null`
- verify helper functions resolve current user/role

