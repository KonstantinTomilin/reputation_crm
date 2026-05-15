import type { LinkStatus } from '@/mocks/crm';

export type QuickFilterValue =
  | 'all'
  | LinkStatus
  | 'с данными'
  | 'без данных'
  | 'просроченные';

interface QuickFiltersProps {
  active: QuickFilterValue;
  onChange: (v: QuickFilterValue) => void;
  counts?: Record<string, number>;
  showDataFilters?: boolean;
  showOverdue?: boolean;
}

const baseFilters: { value: QuickFilterValue; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'в работе', label: 'В работе' },
  { value: 'в карантине', label: 'Карантин' },
  { value: 'готово', label: 'Готово' },
  { value: 'сдано', label: 'Сдано' },
  { value: 'удалено', label: 'Удалено' },
];

export default function QuickFilters({ active, onChange, counts = {}, showDataFilters = true, showOverdue = true }: QuickFiltersProps) {
  const filters = [
    ...baseFilters,
    ...(showDataFilters ? [{ value: 'с данными' as QuickFilterValue, label: 'С данными' }] : []),
    ...(showDataFilters ? [{ value: 'без данных' as QuickFilterValue, label: 'Без данных' }] : []),
    ...(showOverdue ? [{ value: 'просроченные' as QuickFilterValue, label: 'Просроченные' }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => {
        const isActive = active === f.value;
        const count = counts[f.value] ?? 0;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
              isActive
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-slate-300 hover:text-blue-800'
            }`}
          >
            {f.label}
            {count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}