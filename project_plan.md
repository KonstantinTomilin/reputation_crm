# DenyPro CRM — Project Plan

## Overview
Internal CRM system for managing client links with role-based access control (RBAC). The system supports 6 roles: Main Admin, Admin/Manager, Leader (read-only), Client, Executor, and Auditor.

## Completed
- ✅ v1: Basic RBAC structure with 6 roles
- ✅ v1: Client, Executor, Auditor, Admin, Manager, Main Admin dashboards
- ✅ v1: Navigation (CRMLayout with role switcher)
- ✅ v1: Core tables (links, projects, users, payments, audits)
- ✅ v1: Client pages: Dashboard, Projects, Project detail, Links, Reports, Billing
- ✅ v1: Status badges, KPICard, charts
- ✅ v1: Mock data with realistic content

## v2 Features — Completed

### 1. Extended Link Statuses ✅
All statuses from spec implemented in `StatusBadge`:
- MVP: в работе, в карантине, готово, сдано, отклонено, удалено
- v2/v3: новый, ожидает аудита, в аудите, аудит выполнен, не взято в работу, на паузе, деиндексировано (Google/Яндекс/Bing/Yahoo), вернулось, повторно в работе, сдано клиенту, принято клиентом, не принято клиентом

### 2. Kanban Board ✅
- Route: `/admin/links`
- 5 columns: В работе → В карантине → Готово → Сдано → Удалено
- Link cards with URL, type badge, target SE badges, client, project, deadline
- Hover actions showing possible status transitions
- Click opens detail modal

### 3. Quick Filters Component ✅
- Reusable `<QuickFilters>` component
- Filters: Все, В работе, Карантин, Готово, Сдано, Удалено, С данными, Без данных, Просроченные
- Count badges on each filter button

### 4. Link Detail Modal ✅
- Full card overlay: `#link-{id}`
- Status badge, type, target SE
- Info grid: client, project, executor, auditor, dates, quarantine, deadline
- Cost cards: client cost + payment status, executor cost + payment status
- Audit results section (probability, timeline, risk)
- Proofs section (folder link + file list, collapsible)
- Comments with history (author, role, date, text)
- Add comment input

### 5. Overdue Deadline Highlighting ✅
- Red styling on deadlines past `2024-12-01` (current mock date)
- Applied in: Kanban cards, Executor tasks table, Link detail modal
- Red alert banner on dashboards showing count

### 6. Admin Reports Page ✅
- Route: `/admin/reports`
- 8 KPI cards: links received, in work, removed/deindexed, returned, quarantine, overdue, submitted to client, accepted by client
- Financial summary: billed, paid, pending, payouts, profit/margin
- Overdue payments alert
- Project breakdown table (revenue, payouts, profit per project)
- Executor report table (done links, earnings, paid, balance)
- Status distribution chart
- Monthly dynamics chart

### 7. Executor Reports Page ✅
- Route: `/executor/reports`
- 4 KPI cards: total tasks, done, in progress, quarantine
- Earnings cards: total, paid, pending
- Done links table with payment status
- Payment history table

### 8. Enhanced Mock Data ✅
- 16 links total covering all statuses
- Новый, Ожидает аудита, Принято клиентом, Сдано клиенту, Отклонено, Деиндексировано Google
- Full comments history on accepted/rejected links
- Complete proof folders and files

## v3 — CRMContext (Global State) — Completed

### 9. Centralized CRMContext ✅
- `src/context/CRMContext.tsx` — unified state store for links, projects, clients, payments, audits, users
- All roles (Client, Executor, Auditor, Management) now read from shared state
- Changes in one role instantly reflected in all others
- No more isolated mock data per page

### 10. Сброс тестовой среды ✅
- Button: «Сброс тестовой среды» in Settings → System Tools
- Deletes: all projects, links, audits, financial records
- Preserves: accounts, user roles
- Confirm dialog with full warning

### 11. Проверка целостности данных ✅
- Button: «Проверка целостности данных» in Settings → System Tools
- Detects:
  - Orphan links (no project)
  - Orphan payments (no valid link)
  - Orphan audits (no valid link)
  - Payments for incomplete links
  - Duplicate URLs
  - Executors without tasks
- Modal with categorized error/warning list

### 12. End-to-End Data Flow ✅
- Step 1: Management creates project → adds links → assigns executor
- Step 2: Executor changes link statuses → data syncs to Management
- Step 3: Management accepts links → financial records auto-created
- Step 4: Report generation with full project/link/payment data
- All mutations go through `CRMContext`, no manual state hacks

## v4 — Project-Only Model (Completed 2026-05-06)

### 13. Removed Separate Clients Entity ✅
- Eliminated dedicated «Клиенты» tab from management navigation
- Removed `renderClients()` function from management dashboard
- Removed `ClientCreateModal`, `ClientProjectsModal` imports and usage
- **Philosophy change**: Project IS the client — no separate client management needed

### 14. Source Field on Projects ✅
- Added `source: string` field to `CRMProject` interface in `src/mocks/crm.ts`
- Added mock source values for all projects (Telegram, Сайт, Рекомендация, WhatsApp, Email-рассылка)
- Added inline editing of source in Projects table (click-to-edit with Enter/Escape)
- Added source input field in `ProjectCreateModal` with placeholder
- Added source display and editing in `ProjectDetailModal` → Info tab
- Source shows as a violet badge in the table, or «+ добавить» prompt if empty

## Pending (Next Steps)
- 🔄 Manager reports page (`/manager/reports`) — currently placeholder route exists
- 🔄 Client report by project (detailed, client-ready format)
- 🔄 DMCA and proof structure visualization
- 🔄 Calendar / date range picker for filters
- 🔄 Excel import for bulk link upload
- 🔄 PDF/XLSX report generation (auditor)
- 🔄 Real-time notifications system
- 🔄 Settings pages (roles, statuses, prices, quarantine params)
- 🔄 Admin project management page (`/admin/projects`)
- 🔄 Admin executor/auditor management pages

## Technical Stack
- React 19 + TypeScript + Vite
- TailwindCSS
- Remix Icon (CDN)
- React Router (BrowserRouter with basename)
- Mock data in `src/mocks/crm.ts`
- Global state: `CRMContext` (React Context)