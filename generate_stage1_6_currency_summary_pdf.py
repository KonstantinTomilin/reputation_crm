from datetime import datetime
from fpdf import FPDF


OUTPUT_FILE = "stage1_6_multi_currency_summary.pdf"


def add_title(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(190, 10, text, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)


def add_section(pdf: FPDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(190, 8, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)


def add_bullets(pdf: FPDF, items: list[str]) -> None:
    for item in items:
        pdf.multi_cell(190, 6, f"- {item}")
    pdf.ln(1)


def main() -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()

    add_title(pdf, "Stage 1.6 Summary: Multi-Currency Cleanup")

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        190,
        6,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(2)

    add_section(pdf, "Scope")
    add_bullets(
        pdf,
        [
            "Targeted cleanup only for currency formatting, UI/PDF output, and mixed-currency totals.",
            "No backend changes, no DB migrations, no architectural rewrite.",
            "Legacy fallback kept for records without currency (default RUB).",
        ],
    )

    add_section(pdf, "What Was Implemented")
    add_bullets(
        pdf,
        [
            "Unified currency helpers in src/lib/currency.ts: normalizeCurrency, formatCurrency, groupAmountsByCurrency, formatGroupedAmounts.",
            "Kept formatMoney as compatibility alias for existing code.",
            "Unknown currency handling is safe: values are shown with currency code (example: 1000 XYZ).",
            "Mixed-currency totals are grouped by currency instead of silently summed into one amount.",
        ],
    )

    add_section(pdf, "Hardcoded Currency Cleanup")
    add_bullets(
        pdf,
        [
            "Removed hardcoded RUB/rouble symbol output in key UI pages, tables, cards, and report sections.",
            "Removed hardcoded RUB output in project/client/executor/audit related PDF blocks.",
            "Left valid static currency labels only where expected (for example currency select option labels).",
        ],
    )

    add_section(pdf, "Main Updated Areas")
    add_bullets(
        pdf,
        [
            "Management dashboard and finance/report tabs",
            "Client billing and client reports",
            "Executor tasks, history, and executor reports",
            "Audit tabs and link/project detail displays",
            "Admin/manager/main-admin summary dashboards",
        ],
    )

    add_section(pdf, "Verification")
    add_bullets(
        pdf,
        [
            "npx tsc --noEmit: PASSED",
            "npm run build: PASSED",
            "No linter errors in edited files",
        ],
    )

    add_section(pdf, "Manual Smoke Test Checklist")
    add_bullets(
        pdf,
        [
            "Create RUB/USD/EUR/AED projects and confirm symbol/code consistency.",
            "Verify links inherit project currency where link currency is missing.",
            "Check project card, project page, links list, finance, overview, and Kanban.",
            "Download and review project PDF and executor PDF.",
            "Confirm mixed-currency totals are displayed by currency group.",
        ],
    )

    pdf.output(OUTPUT_FILE)
    print(f"Generated: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
