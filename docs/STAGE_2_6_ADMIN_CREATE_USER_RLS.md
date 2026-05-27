# Stage 2.6 Admin Create User + RLS Notes

## Edge Function secrets (Supabase Dashboard)

For `supabase/functions/admin-create-user/index.ts`:

- Do **not** add `SUPABASE_URL` manually in Dashboard secrets.
  - `SUPABASE_URL` is provided by Supabase Edge runtime by default.
- Add only custom service-role secret:
  - `CRM_SUPABASE_SERVICE_ROLE_KEY`

The function reads service role key in this order:

1. `CRM_SUPABASE_SERVICE_ROLE_KEY`
2. `SUPABASE_SERVICE_ROLE_KEY` (fallback)

If no service role secret is present, the function returns:

- `Missing CRM_SUPABASE_SERVICE_ROLE_KEY Edge Function secret`

## Security boundary

- `service_role` must be stored only in Supabase Edge Function secrets.
- Never store `service_role` in frontend env or Railway frontend variables.
- Never expose DB URL/service credentials to browser runtime.

## RLS relation

This function is intended as trusted admin path for creating auth users + CRM profiles.
RLS and policy hardening should continue to rely on `crm_users.auth_user_id` mapping.

