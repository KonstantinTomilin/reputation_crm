# PM Feedback Smoke Tests

Checklist after PM feedback remediation (users, links filters/comments, audit workflow).

## main_admin

1. Create user in `/management/users` with valid login/password (6+ chars).
2. On duplicate login or edge function error, modal stays open and shows error text.
3. After successful create in Supabase mode, user appears in list without page reload error.
4. Open `/management/links`:
   - filter by project/type/geo/status/payment/delivered;
   - search by URL, project name, status, link id;
   - open comment popover, add comment, reload page — comment persists.
5. From links table use **В аудит** / **На просчёт** — audit record appears in `/management/audits` with workflow step badge.
6. `/management/overdue` — comment popover shows full history.
7. `/management/executors` — **Отчёт** opens modal + PDF; **Выплаты** opens payment modal.

## client

1. Login and verify only own projects/links visible.
2. Cannot access `/management/users`.

## executor

1. Login and verify only assigned links/projects.
2. Can update work status on assigned links.
3. Sees audit/calculation links when status is `на просчёт`.

## auditor

1. Login and verify assigned audits/links only.
2. Audit transfer comments visible in link history.

## Regression

- `npx tsc --noEmit`
- `npm run build`
- Create project + links — no Supabase UUID errors on notifications.
