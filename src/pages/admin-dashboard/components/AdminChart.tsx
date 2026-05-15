import type { mockChartData } from '@/mocks/crm';

interface Props {
  data: typeof mockChartData;
}

export default function AdminChart({ data }: Props) {
  const maxVal = Math.max(...data.map((d) => d.removed + d.deindexed)) + 5;
  const H = 160;
  const W = 520;
  const pad = { top: 15, bottom: 30, left: 35, right: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = chartW / data.length;
  const barGap = 6;

  const toY = (v: number) => pad.top + chartH - (v / maxVal) * chartH;
  const barH = (v: number) => (v / maxVal) * chartH;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Динамика по месяцам</h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-500 inline-block" />Удалено
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" />Деиндексировано
          </span>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.top + chartH * (1 - t);
            return (
              <g key={t}>
                <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#ede9fe" strokeWidth="1" strokeDasharray="4 3" />
                <text x={pad.left - 5} y={y + 3} fontSize="8" fill="#9ca3af" textAnchor="end">
                  {Math.round(maxVal * t)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const x = pad.left + i * barW;
            const bw = (barW - barGap * 3) / 2;
            const x1 = x + barGap;
            const x2 = x + barGap * 2 + bw;
            return (
              <g key={i}>
                <rect x={x1} y={toY(d.removed)} width={bw} height={barH(d.removed)} rx="3" fill="#7c3aed" opacity="0.85" />
                <rect x={x2} y={toY(d.deindexed)} width={bw} height={barH(d.deindexed)} rx="3" fill="#60a5fa" opacity="0.85" />
                <text x={x + barW / 2} y={H - 6} fontSize="8" fill="#9ca3af" textAnchor="middle">{d.date}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
