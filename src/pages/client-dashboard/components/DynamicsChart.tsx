import type { mockChartData } from '@/mocks/crm';

interface Props {
  data?: typeof mockChartData;
}

export default function DynamicsChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Динамика удалений</h2>
        </div>
        <div className="flex items-center justify-center h-24 text-sm text-gray-400">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.removed, d.deindexed))) + 5;
  const H = 140;
  const W = 500;
  const pad = { top: 10, bottom: 30, left: 30, right: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const stepX = chartW / (data.length - 1);

  const toY = (v: number) => pad.top + chartH - (v / maxVal) * chartH;
  const toX = (i: number) => pad.left + i * stepX;

  const points = (key: 'removed' | 'deindexed') =>
    data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' ');

  const areaPath = (key: 'removed' | 'deindexed') => {
    const pts = data.map((d, i) => `${toX(i)},${toY(d[key])}`);
    return `M${toX(0)},${toY(data[0][key])} L${pts.join(' L')} L${toX(data.length - 1)},${pad.top + chartH} L${toX(0)},${pad.top + chartH} Z`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Динамика удалений</h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-500 inline-block rounded" />Удалено
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />Деиндексировано
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
                <text x={pad.left - 4} y={y + 3} fontSize="8" fill="#9ca3af" textAnchor="end">
                  {Math.round(maxVal * t)}
                </text>
              </g>
            );
          })}

          {/* Area fills */}
          <defs>
            <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath('removed')} fill="url(#gradViolet)" />
          <path d={areaPath('deindexed')} fill="url(#gradBlue)" />

          {/* Lines */}
          <polyline points={points('removed')} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round" />
          <polyline points={points('deindexed')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

          {/* Dots */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(d.removed)} r="3" fill="#7c3aed" stroke="white" strokeWidth="1.5" />
              <circle cx={toX(i)} cy={toY(d.deindexed)} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
              <text x={toX(i)} y={H - 6} fontSize="8" fill="#9ca3af" textAnchor="middle">{d.date}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
