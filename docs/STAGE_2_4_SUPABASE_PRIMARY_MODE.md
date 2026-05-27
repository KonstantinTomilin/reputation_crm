# Stage 2.4: Supabase Primary Data Mode

## Что изменилось

- `CRMContext` теперь поддерживает async загрузку/сохранение snapshot через repository layer.
- При `VITE_CRM_DATA_MODE=supabase` primary source данных — Supabase.
- `LocalStorageCRMRepository` сохранен и продолжает работать в legacy-режиме.
- `SupabaseCRMRepository` расширен до CRUD + soft-delete + settings + notifications + auth bridge.
- Панель диагностики миграции в `/management/settings` сохранена.

## Как включить Supabase mode

Установите на Railway:

- `VITE_CRM_DATA_MODE=supabase`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

Опционально совместимость:

- `VITE_PUBLIC_SUPABASE_URL`
- `VITE_PUBLIC_SUPABASE_ANON_KEY`

`backend` поддерживается как alias для `supabase`.

## Какие env нужны на Railway

Минимум:

- `VITE_CRM_DATA_MODE=supabase`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Не использовать во frontend:

- `service_role`
- `DATABASE_URL`
- `VITE_SUPABASE_DB_URL`

## Как создать первого main_admin

Рекомендуемый путь для нового проекта:

1. Применить `supabase/migrations/001_crm_schema.sql`.
2. Применить `supabase/seed.sql` (dev bootstrap).
3. Использовать логин из seed и временный пароль `password` (bridge Stage 2.4).

Альтернатива SQL вручную:

```sql
insert into crm_users (login, password_hash, role, display_name, status)
values ('main_admin', 'password', 'main_admin', 'Main Admin', 'active');
```

## Что хранится в Supabase

- `crm_users`
- `crm_clients`
- `crm_projects`
- `crm_links`
- `crm_audits`
- `crm_notifications`
- `crm_financial_operations`
- `crm_settings`

## Что пока остается в localStorage

- `crm_user` как session cache.
- локальный snapshot cache как fallback для аварийного переключения.

## Ограничения безопасности на Stage 2.4

- Auth bridge временный (password comparison в рамках transition).
- Полноценная Supabase Auth не включена.
- Strict RLS и server-side RBAC еще не активированы.

## Что будет в Stage 2.5

- нормальная auth-модель (hash/issuer/session strategy);
- поэтапное включение RLS;
- server-side RBAC и hardening.

