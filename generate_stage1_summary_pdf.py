from fpdf import FPDF


OUTPUT_FILE = "stage1_summary.pdf"


def main() -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.add_font("ArialUnicode", "", r"C:\Windows\Fonts\arial.ttf")
    pdf.set_font("ArialUnicode", size=14)
    pdf.cell(190, 10, "CRM Stage 1 - Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("ArialUnicode", size=11)
    lines = [
        "Выполнено по этапу 1:",
        "- Усилен AuthGuard и добавлен route RBAC по ролям.",
        "- Логин: поддержка login/email + password, без утечки паролей в UI.",
        "- Добавлена role-based изоляция данных для client/executor/auditor.",
        "- Разделены рабочие статусы ссылок и финансовые статусы оплаты.",
        "- Убрано автоизменение рабочего статуса при изменении оплаты.",
        "- Исправлена валютная логика (RUB/USD/EUR/AED) в UI и отчетах.",
        "- Default deadline: created_at + 90 дней при создании проекта/ссылок.",
        "- Kanban приведен к целевым колонкам и фильтру просрочки.",
        "- Добавлены внутренние persisted уведомления + настройки звука/вкл.",
        "- Добавлен PDF для отчета исполнителя и PDF по проекту.",
        "- Расширены проверки целостности данных.",
        "- Кнопка reset test environment скрыта в production.",
        "",
        "Технические результаты:",
        "- TypeScript check: OK (npx tsc --noEmit).",
        "- Build: OK (npm run build).",
        "- Миграции SQL не требуются (localStorage + runtime migration).",
        "",
        "Оставшиеся риски (этап 2):",
        "- Нет серверного RBAC (пока SPA-level защита).",
        "- Нужен backend/DB этап для production-hardening.",
    ]

    for line in lines:
        pdf.multi_cell(190, 7, line)

    pdf.output(OUTPUT_FILE)


if __name__ == "__main__":
    main()
