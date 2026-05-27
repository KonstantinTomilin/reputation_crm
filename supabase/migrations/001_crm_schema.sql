-- Stage 2.2 Supabase Backend Foundation (CRM)
-- NOTE: This migration prepares schema only. Full auth + strict RLS arrives in Stage 2.4.

create extension if not exists pgcrypto;

create or replace function crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists crm_users (
  id uuid primary key default gen_random_uuid(),
  login text unique not null,
  password_hash text null,
  role text not null check (role in ('main_admin', 'client', 'executor', 'auditor')),
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  telegram text null,
  phone text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists crm_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references crm_users(id),
  name text not null,
  contact_name text null,
  telegram text null,
  phone text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists crm_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm_clients(id),
  title text not null,
  source text null,
  currency text not null default 'RUB',
  status text not null default 'active',
  deadline_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists crm_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references crm_projects(id),
  client_id uuid null references crm_clients(id),
  executor_id uuid null references crm_users(id),
  auditor_id uuid null references crm_users(id),
  url text not null,
  work_type text not null default 'removal_and_deindex',
  work_status text not null default 'new',
  client_payment_status text not null default 'unpaid',
  executor_payment_status text not null default 'not_accrued',
  price numeric(12,2) not null default 0,
  executor_price numeric(12,2) not null default 0,
  currency text not null default 'RUB',
  deadline_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists crm_audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null references crm_projects(id),
  link_id uuid null references crm_links(id),
  auditor_id uuid null references crm_users(id),
  requested_by uuid null references crm_users(id),
  audit_type text not null,
  status text not null default 'new',
  comment text null,
  result text null,
  probability numeric(5,2) null,
  estimated_price numeric(12,2) null,
  currency text not null default 'RUB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  deleted_at timestamptz null
);

create table if not exists crm_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references crm_users(id),
  type text not null,
  title text not null,
  body text null,
  entity_type text null,
  entity_id uuid null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists crm_reports (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  entity_type text null,
  entity_id uuid null,
  generated_by uuid null references crm_users(id),
  period_from timestamptz null,
  period_to timestamptz null,
  payload jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists crm_financial_operations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null references crm_projects(id),
  link_id uuid null references crm_links(id),
  client_id uuid null references crm_clients(id),
  executor_id uuid null references crm_users(id),
  type text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'RUB',
  status text not null default 'draft',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists crm_settings (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global',
  user_id uuid null references crm_users(id),
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope, user_id, key)
);

create table if not exists crm_integrity_issues (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null default 'warning',
  entity_type text null,
  entity_id uuid null,
  message text not null,
  payload jsonb null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create table if not exists crm_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references crm_users(id),
  entity_type text not null,
  entity_id uuid null,
  action text not null,
  old_value jsonb null,
  new_value jsonb null,
  created_at timestamptz not null default now()
);

drop trigger if exists crm_users_set_updated_at on crm_users;
create trigger crm_users_set_updated_at
before update on crm_users
for each row execute function crm_set_updated_at();

drop trigger if exists crm_clients_set_updated_at on crm_clients;
create trigger crm_clients_set_updated_at
before update on crm_clients
for each row execute function crm_set_updated_at();

drop trigger if exists crm_projects_set_updated_at on crm_projects;
create trigger crm_projects_set_updated_at
before update on crm_projects
for each row execute function crm_set_updated_at();

drop trigger if exists crm_links_set_updated_at on crm_links;
create trigger crm_links_set_updated_at
before update on crm_links
for each row execute function crm_set_updated_at();

drop trigger if exists crm_audits_set_updated_at on crm_audits;
create trigger crm_audits_set_updated_at
before update on crm_audits
for each row execute function crm_set_updated_at();

drop trigger if exists crm_finops_set_updated_at on crm_financial_operations;
create trigger crm_finops_set_updated_at
before update on crm_financial_operations
for each row execute function crm_set_updated_at();

drop trigger if exists crm_settings_set_updated_at on crm_settings;
create trigger crm_settings_set_updated_at
before update on crm_settings
for each row execute function crm_set_updated_at();

create index if not exists idx_crm_users_role on crm_users(role);
create index if not exists idx_crm_users_status on crm_users(status);
create index if not exists idx_crm_clients_user_id on crm_clients(user_id);
create index if not exists idx_crm_projects_client_id on crm_projects(client_id);
create index if not exists idx_crm_projects_deadline_at on crm_projects(deadline_at);
create index if not exists idx_crm_projects_deleted_at on crm_projects(deleted_at);
create index if not exists idx_crm_links_project_id on crm_links(project_id);
create index if not exists idx_crm_links_client_id on crm_links(client_id);
create index if not exists idx_crm_links_executor_id on crm_links(executor_id);
create index if not exists idx_crm_links_auditor_id on crm_links(auditor_id);
create index if not exists idx_crm_links_work_status on crm_links(work_status);
create index if not exists idx_crm_links_client_payment_status on crm_links(client_payment_status);
create index if not exists idx_crm_links_executor_payment_status on crm_links(executor_payment_status);
create index if not exists idx_crm_links_deadline_at on crm_links(deadline_at);
create index if not exists idx_crm_links_deleted_at on crm_links(deleted_at);
create index if not exists idx_crm_audits_auditor_id on crm_audits(auditor_id);
create index if not exists idx_crm_audits_status on crm_audits(status);
create index if not exists idx_crm_notifications_user_read on crm_notifications(user_id, is_read);
create index if not exists idx_crm_finops_project_id on crm_financial_operations(project_id);
create index if not exists idx_crm_finops_client_id on crm_financial_operations(client_id);
create index if not exists idx_crm_finops_executor_id on crm_financial_operations(executor_id);
create index if not exists idx_crm_finops_currency on crm_financial_operations(currency);

-- Stage 2.4 TODO (RLS hardening):
-- You can enable RLS and add strict role/tenant policies once server-side auth mapping is implemented.
-- Example (not enabled in Stage 2.2):
-- alter table crm_users enable row level security;
-- alter table crm_clients enable row level security;
-- alter table crm_projects enable row level security;
-- alter table crm_links enable row level security;
-- alter table crm_audits enable row level security;
-- alter table crm_notifications enable row level security;
-- alter table crm_financial_operations enable row level security;
