# Stage 2.3: LocalStorage -> Supabase Migration Bootstrap

## 1) Что делает Stage 2.3

- Экспортирует текущий CRM snapshot из localStorage.
- Валидирует и нормализует snapshot (без падения на legacy/partial данных).
- Запускает dry-run импорт в Supabase (без записи).
- Запускает реальный import в Supabase (с idempotent-поведением).
- Делает post-import проверку целостности.
- Расширяет async слой `SupabaseCRMRepository` для основных сущностей.

## 2) Почему localStorage остается основным режимом

`VITE_CRM_DATA_MODE` по умолчанию остается `localStorage`.
Это безопасный режим для production/текущего UX до полного async-перехода контекста и server-side RBAC.

## 2.3.5) Diagnostics Panel в settings

Панель находится в `/management/settings` в блоке **Системные инструменты**:

- карточка: `Миграция в Supabase`
- доступ: только `main_admin`
- кнопки:
  - `Check Supabase connection`
  - `Read localStorage snapshot`
  - `Run dry-run`
  - `Import to Supabase` (с ручным подтверждением)
  - `Validate Supabase data`

Панель показывает:

- текущий `VITE_CRM_DATA_MODE`
- статус env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) без вывода секретов
- блок `Last operation result` с summary/counts/warnings/errors/raw JSON

Импорт не запускается автоматически и требует точный текст подтверждения:

`IMPORT_LOCALSTORAGE_TO_SUPABASE`

## 3) Как сделать dry-run

В dev console:

```js
const mod = await import('/src/migrations/localStorageToSupabase/runImportFromConsole.ts');
await mod.runCrmMigrationDryRun();
```

Или после импорта модуля использовать:

```js
window.__CRM_MIGRATION__.dryRun();
```

## 4) Как сделать реальный import

Только вручную и с подтверждением:

```js
const mod = await import('/src/migrations/localStorageToSupabase/runImportFromConsole.ts');
await mod.runCrmMigrationImport({ confirm: 'IMPORT_LOCALSTORAGE_TO_SUPABASE' });
```

Доп. опции:

- `overwriteExisting?: boolean` (default `false`)
- `skipExisting?: boolean` (default `true`)

## 5) Как проверить данные в Supabase

1. Запустить `validateSupabaseDataIntegrity()` из helper.
2. Проверить counts + warnings/errors в отчете.
3. Дополнительно сравнить количества в таблицах `crm_*` через SQL Editor.

## 6) Как откатиться

- Stage 2.3 **не удаляет localStorage** и не переключает default data mode.
- Для отката достаточно продолжать работу с `VITE_CRM_DATA_MODE=localStorage`.
- Если нужно, очистить только импортированные Supabase записи вручную в SQL Editor.

## 7) Если импорт частично упал

- Импорт best-effort: ошибки одной записи не останавливают весь процесс.
- Смотрите `errors[]` в отчете и перезапускайте импорт.
- Защита от дублей: `skipExisting=true` по умолчанию.
- Для принудительного обновления используйте `overwriteExisting=true`.

## 8) Что будет в Stage 2.4

- Server-side RBAC и auth mapping.
- Подготовка/включение RLS policies.
- Перевод критичных read/write путей на backend-first режим.

## 9) Почему service_role нельзя во frontend

`service_role` дает повышенные права и может скомпрометировать данные.
Во frontend допускается только `VITE_SUPABASE_ANON_KEY`.

## 10) Почему RLS/server-side RBAC еще не включены полностью

На этом этапе нет полной server auth-модели и actor-to-row mapping.
Раннее включение strict RLS может заблокировать легитимные запросы и сломать smoke/import flow.

