interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
  sub?: string;
}

export default function KPICard({ label, value, icon, accent = 'text-blue-900', sub }: KPICardProps) {
  // Derive background color class from accent text color class
  const bgClass = accent
    .replace('text-', 'bg-')
    .replace('950', '100')
    .replace('900', '100')
    .replace('800', '100')
    .replace('700', '50')
    .replace('600', '50')
    .replace('500', '50');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${bgClass}`}>
          <i className={`${icon} ${accent} text-lg`} />
        </div>
      </div>
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}
