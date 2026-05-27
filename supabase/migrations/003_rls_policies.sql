-- Stage 2.7: Controlled RLS/RBAC rollout preparation for crm_* tables.
-- IMPORTANT:
-- 1) Apply this migration first (functions + policies).
-- 2) Enable RLS step-by-step using 004_enable_rls_stepwise.sql.
-- 3) Validate role smoke tests after each step.

-- ---------------------------------------------------------------------------
-- Helper functions (auth.uid() -> crm_users mapping)
-- ---------------------------------------------------------------------------

create or replace function crm_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select coalesce(crm_current_role() = 'main_admin', false)
$$;

create or replace function crm_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select crm_current_user_id() is not null
$$;

grant execute on function crm_current_user_id() to anon, authenticated;
grant execute on function crm_current_role() to anon, authenticated;
grant execute on function crm_is_main_admin() to anon, authenticated;
grant execute on function crm_is_active() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- crm_users
-- ---------------------------------------------------------------------------

drop policy if exists crm_users_select_self_or_admin on crm_users;
create policy crm_users_select_self_or_admin
on crm_users
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or id = crm_current_user_id()
  )
);

drop policy if exists crm_users_insert_admin_only on crm_users;
create policy crm_users_insert_admin_only
on crm_users
for insert
with check (crm_is_main_admin());

drop policy if exists crm_users_update_admin_only on crm_users;
create policy crm_users_update_admin_only
on crm_users
for update
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_clients
-- ---------------------------------------------------------------------------

drop policy if exists crm_clients_select_scoped on crm_clients;
create policy crm_clients_select_scoped
on crm_clients
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or user_id = crm_current_user_id()
    or exists (
      select 1
      from crm_links l
      where l.client_id = crm_clients.id
        and (
          l.executor_id = crm_current_user_id()
          or l.auditor_id = crm_current_user_id()
        )
        and l.deleted_at is null
    )
  )
);

drop policy if exists crm_clients_write_admin_only on crm_clients;
create policy crm_clients_write_admin_only
on crm_clients
for all
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_projects
-- ---------------------------------------------------------------------------

drop policy if exists crm_projects_select_scoped on crm_projects;
create policy crm_projects_select_scoped
on crm_projects
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or exists (
      select 1
      from crm_clients c
      where c.id = crm_projects.client_id
        and c.user_id = crm_current_user_id()
    )
    or exists (
      select 1
      from crm_links l
      where l.project_id = crm_projects.id
        and (
          l.executor_id = crm_current_user_id()
          or l.auditor_id = crm_current_user_id()
        )
        and l.deleted_at is null
    )
    or exists (
      select 1
      from crm_audits a
      where a.project_id = crm_projects.id
        and a.auditor_id = crm_current_user_id()
        and a.deleted_at is null
    )
  )
);

drop policy if exists crm_projects_write_admin_only on crm_projects;
create policy crm_projects_write_admin_only
on crm_projects
for all
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_links
-- ---------------------------------------------------------------------------

drop policy if exists crm_links_select_scoped on crm_links;
create policy crm_links_select_scoped
on crm_links
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or executor_id = crm_current_user_id()
    or auditor_id = crm_current_user_id()
    or exists (
      select 1
      from crm_projects p
      join crm_clients c on c.id = p.client_id
      where p.id = crm_links.project_id
        and c.user_id = crm_current_user_id()
    )
  )
);

drop policy if exists crm_links_insert_admin_only on crm_links;
create policy crm_links_insert_admin_only
on crm_links
for insert
with check (crm_is_main_admin());

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

drop policy if exists crm_links_delete_admin_only on crm_links;
create policy crm_links_delete_admin_only
on crm_links
for delete
using (crm_is_main_admin());

-- NOTE:
-- Row-level policies cannot reliably enforce field-level restrictions on UPDATE
-- (e.g. executor may update work_status but not price/currency).
-- Stage 2.8 should add SECURITY DEFINER RPC/update functions and revoke direct update for non-admin.

-- ---------------------------------------------------------------------------
-- crm_audits
-- ---------------------------------------------------------------------------

drop policy if exists crm_audits_select_scoped on crm_audits;
create policy crm_audits_select_scoped
on crm_audits
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or auditor_id = crm_current_user_id()
  )
);

drop policy if exists crm_audits_insert_admin_only on crm_audits;
create policy crm_audits_insert_admin_only
on crm_audits
for insert
with check (crm_is_main_admin());

drop policy if exists crm_audits_update_scoped on crm_audits;
create policy crm_audits_update_scoped
on crm_audits
for update
using (
  crm_is_main_admin()
  or (
    crm_current_role() = 'auditor'
    and auditor_id = crm_current_user_id()
  )
)
with check (
  crm_is_main_admin()
  or (
    crm_current_role() = 'auditor'
    and auditor_id = crm_current_user_id()
  )
);

drop policy if exists crm_audits_delete_admin_only on crm_audits;
create policy crm_audits_delete_admin_only
on crm_audits
for delete
using (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_notifications
-- ---------------------------------------------------------------------------

drop policy if exists crm_notifications_select_owner_or_admin on crm_notifications;
create policy crm_notifications_select_owner_or_admin
on crm_notifications
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or user_id = crm_current_user_id()
  )
);

drop policy if exists crm_notifications_insert_admin_or_owner on crm_notifications;
create policy crm_notifications_insert_admin_or_owner
on crm_notifications
for insert
with check (
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

drop policy if exists crm_notifications_delete_admin_only on crm_notifications;
create policy crm_notifications_delete_admin_only
on crm_notifications
for delete
using (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_financial_operations
-- ---------------------------------------------------------------------------

drop policy if exists crm_finops_select_scoped on crm_financial_operations;
create policy crm_finops_select_scoped
on crm_financial_operations
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or executor_id = crm_current_user_id()
    or exists (
      select 1
      from crm_clients c
      where c.id = crm_financial_operations.client_id
        and c.user_id = crm_current_user_id()
    )
  )
);

drop policy if exists crm_finops_write_admin_only on crm_financial_operations;
create policy crm_finops_write_admin_only
on crm_financial_operations
for all
using (crm_is_main_admin())
with check (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_settings
-- ---------------------------------------------------------------------------

drop policy if exists crm_settings_select_scoped on crm_settings;
create policy crm_settings_select_scoped
on crm_settings
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or user_id = crm_current_user_id()
  )
);

drop policy if exists crm_settings_insert_scoped on crm_settings;
create policy crm_settings_insert_scoped
on crm_settings
for insert
with check (
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

drop policy if exists crm_settings_delete_admin_only on crm_settings;
create policy crm_settings_delete_admin_only
on crm_settings
for delete
using (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_audit_log
-- ---------------------------------------------------------------------------

drop policy if exists crm_audit_log_select_admin on crm_audit_log;
create policy crm_audit_log_select_admin
on crm_audit_log
for select
using (crm_is_main_admin());

drop policy if exists crm_audit_log_insert_admin_only on crm_audit_log;
create policy crm_audit_log_insert_admin_only
on crm_audit_log
for insert
with check (crm_is_main_admin());

-- ---------------------------------------------------------------------------
-- crm_reports / crm_integrity_issues
-- ---------------------------------------------------------------------------

drop policy if exists crm_reports_select_scoped on crm_reports;
create policy crm_reports_select_scoped
on crm_reports
for select
using (
  crm_is_active()
  and (
    crm_is_main_admin()
    or generated_by = crm_current_user_id()
  )
);

drop policy if exists crm_reports_write_admin_only on crm_reports;
create policy crm_reports_write_admin_only
on crm_reports
for all
using (crm_is_main_admin())
with check (crm_is_main_admin());

drop policy if exists crm_integrity_issues_select_admin on crm_integrity_issues;
create policy crm_integrity_issues_select_admin
on crm_integrity_issues
for select
using (crm_is_main_admin());

drop policy if exists crm_integrity_issues_write_admin_only on crm_integrity_issues;
create policy crm_integrity_issues_write_admin_only
on crm_integrity_issues
for all
using (crm_is_main_admin())
with check (crm_is_main_admin());

