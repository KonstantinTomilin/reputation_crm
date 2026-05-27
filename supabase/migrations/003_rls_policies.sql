-- Stage 2.5: RLS/RBAC preparation for crm_* tables.
-- IMPORTANT: review and apply step-by-step. Do NOT enable strict RLS blindly in production.

-- Helper functions
create or replace function crm_current_user_id()
returns uuid
language sql
stable
as $$
  select u.id
  from crm_users u
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and u.deleted_at is null
  limit 1
$$;

create or replace function crm_current_role()
returns text
language sql
stable
as $$
  select u.role
  from crm_users u
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and u.deleted_at is null
  limit 1
$$;

create or replace function crm_is_main_admin()
returns boolean
language sql
stable
as $$
  select coalesce(crm_current_role() = 'main_admin', false)
$$;

create or replace function crm_is_active()
returns boolean
language sql
stable
as $$
  select crm_current_user_id() is not null
$$;

-- Enable RLS explicitly when ready.
-- alter table crm_users enable row level security;
-- alter table crm_clients enable row level security;
-- alter table crm_projects enable row level security;
-- alter table crm_links enable row level security;
-- alter table crm_audits enable row level security;
-- alter table crm_notifications enable row level security;
-- alter table crm_financial_operations enable row level security;
-- alter table crm_settings enable row level security;
-- alter table crm_audit_log enable row level security;

-- Example policies (apply after verification).
-- Users: main_admin all; user read self.
drop policy if exists crm_users_select_self_or_admin on crm_users;
create policy crm_users_select_self_or_admin
on crm_users
for select
using (
  crm_is_main_admin()
  or id = crm_current_user_id()
);

drop policy if exists crm_users_update_admin_only on crm_users;
create policy crm_users_update_admin_only
on crm_users
for update
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- Notifications: owner or main_admin.
drop policy if exists crm_notifications_select_owner_or_admin on crm_notifications;
create policy crm_notifications_select_owner_or_admin
on crm_notifications
for select
using (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
);

drop policy if exists crm_notifications_update_owner_or_admin on crm_notifications;
create policy crm_notifications_update_owner_or_admin
on crm_notifications
for update
using (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
)
with check (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
);

-- Projects: admin all; client sees own client projects; executor/auditor by assignment.
drop policy if exists crm_projects_select_scoped on crm_projects;
create policy crm_projects_select_scoped
on crm_projects
for select
using (
  crm_is_main_admin()
  or exists (
    select 1
    from crm_clients c
    join crm_users u on u.id = c.user_id
    where u.id = crm_current_user_id()
      and u.role = 'client'
      and c.id = crm_projects.client_id
  )
  or exists (
    select 1 from crm_links l
    where l.project_id = crm_projects.id
      and (
        l.executor_id = crm_current_user_id()
        or l.auditor_id = crm_current_user_id()
      )
      and l.deleted_at is null
  )
  or exists (
    select 1 from crm_audits a
    where a.project_id = crm_projects.id
      and a.auditor_id = crm_current_user_id()
      and a.deleted_at is null
  )
);

-- Links: admin all; client own-project links; executor assigned links; auditor assigned links.
drop policy if exists crm_links_select_scoped on crm_links;
create policy crm_links_select_scoped
on crm_links
for select
using (
  crm_is_main_admin()
  or executor_id = crm_current_user_id()
  or auditor_id = crm_current_user_id()
  or exists (
    select 1
    from crm_projects p
    join crm_clients c on c.id = p.client_id
    join crm_users u on u.id = c.user_id
    where p.id = crm_links.project_id
      and u.role = 'client'
      and u.id = crm_current_user_id()
  )
);

-- Links update restriction for executor.
drop policy if exists crm_links_update_executor_scoped on crm_links;
create policy crm_links_update_executor_scoped
on crm_links
for update
using (
  crm_is_main_admin()
  or (
    crm_current_role() = 'executor'
    and executor_id = crm_current_user_id()
  )
)
with check (
  crm_is_main_admin()
  or (
    crm_current_role() = 'executor'
    and executor_id = crm_current_user_id()
  )
);

-- Audits: admin all; auditor own.
drop policy if exists crm_audits_select_scoped on crm_audits;
create policy crm_audits_select_scoped
on crm_audits
for select
using (
  crm_is_main_admin()
  or auditor_id = crm_current_user_id()
);

drop policy if exists crm_audits_update_scoped on crm_audits;
create policy crm_audits_update_scoped
on crm_audits
for update
using (
  crm_is_main_admin()
  or auditor_id = crm_current_user_id()
)
with check (
  crm_is_main_admin()
  or auditor_id = crm_current_user_id()
);

-- Finance: admin all, optional owner scopes.
drop policy if exists crm_finops_select_scoped on crm_financial_operations;
create policy crm_finops_select_scoped
on crm_financial_operations
for select
using (
  crm_is_main_admin()
  or executor_id = crm_current_user_id()
);

drop policy if exists crm_finops_update_admin_only on crm_financial_operations;
create policy crm_finops_update_admin_only
on crm_financial_operations
for update
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- Settings: admin all global, user own scoped settings.
drop policy if exists crm_settings_select_scoped on crm_settings;
create policy crm_settings_select_scoped
on crm_settings
for select
using (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
);

drop policy if exists crm_settings_update_scoped on crm_settings;
create policy crm_settings_update_scoped
on crm_settings
for update
using (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
)
with check (
  crm_is_main_admin()
  or user_id = crm_current_user_id()
);

-- Audit log: main_admin read only, writes from trusted backend only.
drop policy if exists crm_audit_log_select_admin on crm_audit_log;
create policy crm_audit_log_select_admin
on crm_audit_log
for select
using (crm_is_main_admin());

