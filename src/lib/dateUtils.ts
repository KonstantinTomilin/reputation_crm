/** ISO date YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function defaultProjectDeadline(createdAt?: string): string {
  return addDaysISO(createdAt ?? todayISO(), 90);
}

export function isOverdue(deadline: string | null | undefined, completedStatuses: string[], status: string): boolean {
  if (!deadline) return false;
  if (completedStatuses.includes(status)) return false;
  return deadline < todayISO();
}
