from fpdf import FPDF


OUTPUT_FILE = "stage1_acceptance_summary.pdf"


def main() -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.add_font("ArialUnicode", "", r"C:\Windows\Fonts\arial.ttf")

    pdf.set_font("ArialUnicode", size=14)
    pdf.cell(190, 10, "Stage 1 Acceptance Audit - Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_font("ArialUnicode", size=11)
    lines = [
        "Статус приемочного аудита Stage 1:",
        "- PASS: Auth-flow и route RBAC",
        "- PASS: Role-based доступ (после точечных фиксов)",
        "- PASS: Разделение рабочих и финансовых статусов",
        "- PASS: Deadline +90 и overdue/Kanban логика",
        "- PASS: Persisted уведомления и настройки",
        "- PASS: PDF отчеты исполнителя и проекта",
        "- PASS: Integrity checks и production safety",
        "- FAIL (частично): полная нормализация валют везде (RUB/USD/EUR/AED)",
        "",
        "Ключевые исправления в рамках аудита:",
        "- AuthGuard: проверка блокировки/soft-delete активной сессии.",
        "- Soft-delete пользователя в management вместо hard delete.",
        "- Удалена скрытая связка work-status -> accrued payment status.",
        "- Клиентские/аудиторские страницы переведены на role scope.",
        "- Soft-delete проекта и ссылок вместо физического удаления.",
        "- Deadline в аудиторских сценариях ставится от проекта/+90.",
        "- Kanban: убрано дублирование просроченных карточек.",
        "",
        "Остаточный риск:",
        "- Есть отдельные legacy UI/PDF места с жестким RUB/₽.",
        "- Нужен короткий follow-up только по multi-currency отображению.",
        "",
        "Техническая валидация:",
        "- npx tsc --noEmit: OK",
        "- npm run build: OK",
    ]

    for line in lines:
        pdf.multi_cell(190, 7, line)

    pdf.output(OUTPUT_FILE)


if __name__ == "__main__":
    main()
