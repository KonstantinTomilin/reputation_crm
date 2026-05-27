-- DEV-ONLY seed for Stage 2.2 validation.
-- Do not use real passwords here. password_hash is a placeholder until auth migration.

with admin_user as (
  insert into crm_users (login, password_hash, role, display_name, status, notes)
  values ('main_admin_demo', 'dev_placeholder_hash', 'main_admin', 'Main Admin Demo', 'active', 'seed user')
  on conflict (login) do update set updated_at = now()
  returning id
),
client_user as (
  insert into crm_users (login, password_hash, role, display_name, status, notes)
  values ('client_demo', 'dev_placeholder_hash', 'client', 'Client Demo', 'active', 'seed user')
  on conflict (login) do update set updated_at = now()
  returning id
),
executor_user as (
  insert into crm_users (login, password_hash, role, display_name, status, notes)
  values ('executor_demo', 'dev_placeholder_hash', 'executor', 'Executor Demo', 'active', 'seed user')
  on conflict (login) do update set updated_at = now()
  returning id
),
auditor_user as (
  insert into crm_users (login, password_hash, role, display_name, status, notes)
  values ('auditor_demo', 'dev_placeholder_hash', 'auditor', 'Auditor Demo', 'active', 'seed user')
  on conflict (login) do update set updated_at = now()
  returning id
),
seed_client as (
  insert into crm_clients (user_id, name, contact_name, telegram, phone, notes)
  select cu.id, 'Demo Client LLC', 'Client Demo', '@client_demo', '+7-900-000-00-01', 'dev seed'
  from client_user cu
  on conflict do nothing
  returning id
),
seed_project as (
  insert into crm_projects (client_id, title, source, currency, status, deadline_at)
  select sc.id, 'Demo Reputation Project', 'seed', 'USD', 'active', now() + interval '90 days'
  from seed_client sc
  returning id, client_id
),
seed_links as (
  insert into crm_links (
    project_id, client_id, executor_id, auditor_id, url, work_type, work_status,
    client_payment_status, executor_payment_status, price, executor_price, currency, deadline_at, notes
  )
  select
    sp.id,
    sp.client_id,
    eu.id,
    au.id,
    link_data.url,
    link_data.work_type,
    link_data.work_status,
    link_data.client_payment_status,
    link_data.executor_payment_status,
    link_data.price,
    link_data.executor_price,
    'USD',
    now() + interval '90 days',
    'seed link'
  from seed_project sp
  cross join executor_user eu
  cross join auditor_user au
  cross join (
    values
      ('https://example.com/review/1', 'removal', 'new', 'unpaid', 'not_accrued', 120::numeric, 60::numeric),
      ('https://example.com/review/2', 'deindex', 'in_work', 'partially_paid', 'accrued', 140::numeric, 70::numeric),
      ('https://example.com/review/3', 'removal_and_deindex', 'waiting_audit', 'paid', 'paid_to_executor', 180::numeric, 90::numeric)
  ) as link_data(url, work_type, work_status, client_payment_status, executor_payment_status, price, executor_price)
  returning id
)
insert into crm_notifications (user_id, type, title, body, entity_type, entity_id, is_read)
select au.id, 'info', 'Seed notification', 'Supabase seed loaded successfully', 'project', sp.id, false
from admin_user au
cross join seed_project sp;
