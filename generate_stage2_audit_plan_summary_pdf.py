from datetime import datetime
from fpdf import FPDF


OUTPUT_FILE = "stage2_audit_plan_summary.pdf"


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

    add_title(pdf, "Stage 2 Audit and Migration Plan Summary")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        190,
        6,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(2)

    add_section(pdf, "Current State (Stage 1 complete)")
    add_bullets(
        pdf,
        [
            "SPA-level auth flow and route RBAC are in place.",
            "Role data isolation is implemented at frontend scope level.",
            "Work statuses and financial statuses are separated.",
            "Multi-currency formatting and grouping were normalized in Stage 1.6.",
            "Core data is still localStorage-based.",
        ],
    )

    add_section(pdf, "Data Layer Audit Highlights")
    add_bullets(
        pdf,
        [
            "Main storage orchestration is in src/context/CRMContext.tsx.",
            "Session is stored in localStorage key crm_user.",
            "Runtime link migration and legacy payment synchronization already exist.",
            "Entity families are present: users, clients, projects, links, audits, payments, notifications, settings.",
            "Derived metrics are heavily calculated in UI/report pages.",
        ],
    )

    add_section(pdf, "Proposed Database Schema")
    add_bullets(
        pdf,
        [
            "Core tables: users, clients, projects, links, audits, notifications, reports, financial_operations.",
            "Support tables: settings, integrity_issues, audit_log/status_history.",
            "Soft-delete strategy via deleted_at for major entities.",
            "JSON payload columns for flexible report/audit metadata where needed.",
        ],
    )

    add_section(pdf, "Server-side RBAC Target")
    add_bullets(
        pdf,
        [
            "main_admin: full access.",
            "client: own client/projects/links/reports/notifications only.",
            "executor: assigned links/projects only; restricted work-status transitions.",
            "auditor: assigned audits only; no finance mutations.",
            "Frontend RBAC remains UX helper; backend RBAC becomes security boundary.",
        ],
    )

    add_section(pdf, "Minimal API Surface")
    add_bullets(
        pdf,
        [
            "Auth: login, me, logout.",
            "CRUD groups: users, clients, projects, links, audits.",
            "Domain services: notifications, reports, finance operations, integrity checks.",
            "Dedicated status update endpoints for links/audits with policy checks.",
        ],
    )

    add_section(pdf, "Incremental Migration Phases")
    add_bullets(
        pdf,
        [
            "Phase 2.1: DB schema + backend skeleton + repository abstraction contract.",
            "Phase 2.2: replace direct localStorage access with repository methods (dual mode).",
            "Phase 2.3: import localStorage data into DB and validate integrity.",
            "Phase 2.4: enable server-side RBAC and enforce authorization in API.",
            "Phase 2.5: production hardening (backups, audit logging, monitoring, error policies).",
        ],
    )

    add_section(pdf, "Risks and Safety Controls")
    add_bullets(
        pdf,
        [
            "Role mapping drift between existing frontend roles and strict backend policy.",
            "Potential data mismatch between legacy payment flags and payment ledger rows.",
            "Need explicit no-loss mapping for comments, deadlines, statuses, notifications, settings.",
            "Use feature flag rollout and rollback plan before switching to backend mode.",
        ],
    )

    add_section(pdf, "Recommended First Safe Diff")
    add_bullets(
        pdf,
        [
            "Introduce repository interface without changing business behavior.",
            "Provide LocalStorageRepository as default implementation.",
            "Wire CRMContext to repository contract.",
            "Add backend mode flag but keep local mode enabled by default.",
        ],
    )

    pdf.output(OUTPUT_FILE)
    print(f"Generated: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
