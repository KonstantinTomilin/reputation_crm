-- Stage 2.5: Auth mapping bridge for Supabase Auth <-> crm_users
-- Safe additive migration. Keeps password_hash as legacy fallback.

alter table crm_users
  add column if not exists auth_user_id uuid null,
  add column if not exists technical_email text null,
  add column if not exists last_login_at timestamptz null;

create index if not exists idx_crm_users_auth_user_id on crm_users(auth_user_id);
create index if not exists idx_crm_users_technical_email on crm_users(technical_email);

create unique index if not exists uq_crm_users_auth_user_id_not_null
  on crm_users(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists uq_crm_users_technical_email_not_null
  on crm_users(technical_email)
  where technical_email is not null;

-- Optional data backfill for rows that already have login but no technical email.
update crm_users
set technical_email = lower(login) || '@crm.local'
where technical_email is null
  and login is not null
  and login <> '';

