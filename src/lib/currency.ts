export type CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'AED';

const SYMBOLS: Record<CurrencyCode, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  AED: 'AED',
};

export function normalizeCurrency(currency: CurrencyCode | string | undefined): string {
  if (!currency) return 'RUB';
  const upper = String(currency).toUpperCase();
  if (upper === 'RUR') return 'RUB';
  return upper;
}

export function getCurrencySymbol(currency: CurrencyCode | string | undefined): string {
  const code = normalizeCurrency(currency);
  return SYMBOLS[code as CurrencyCode] ?? code;
}

export function formatCurrency(amount: number, currency: CurrencyCode | string | undefined): string {
  const code = normalizeCurrency(currency);
  const sym = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString('ru-RU');
  // Show code for unknown symbols and for AED-like textual representation.
  if (sym === code || sym === 'AED') return `${formatted} ${code}`;
  return `${formatted} ${sym}`;
}

export function formatMoney(amount: number, currency: CurrencyCode | string | undefined): string {
  return formatCurrency(amount, currency);
}

export function isValidCurrency(c: string | undefined): c is CurrencyCode {
  const code = normalizeCurrency(c);
  return code === 'RUB' || code === 'USD' || code === 'EUR' || code === 'AED';
}

export function groupAmountsByCurrency(
  items: Array<{ amount: number; currency?: string | null }>
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const code = normalizeCurrency(item.currency ?? undefined);
    acc[code] = (acc[code] ?? 0) + item.amount;
    return acc;
  }, {});
}

export function formatGroupedAmounts(grouped: Record<string, number>): string {
  const entries = Object.entries(grouped).filter(([, value]) => Math.abs(value) > 0.00001);
  if (entries.length === 0) return formatCurrency(0, 'RUB');
  if (entries.length === 1) {
    const [cur, amount] = entries[0];
    return formatCurrency(amount, cur);
  }
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cur, amount]) => `${cur}: ${formatCurrency(amount, cur)}`)
    .join(' · ');
}
