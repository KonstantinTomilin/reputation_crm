import type { LinkStatus, TaskStatus } from '@/mocks/crm';

// MVP статусы
const linkStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'в работе':                 { label: 'В работе',                  bg: 'bg-blue-100',    text: 'text-blue-700' },
  'удалено':                  { label: 'Удалено',                   bg: 'bg-green-100',   text: 'text-green-700' },
  'деиндексировано':          { label: 'Деиндексировано',           bg: 'bg-teal-100',    text: 'text-teal-700' },
  'на паузе':                 { label: 'На паузе',                  bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  'не в работе':              { label: 'Не в работе',               bg: 'bg-gray-100',    text: 'text-gray-600' },
  'на карантине':             { label: 'На карантине',              bg: 'bg-orange-100',  text: 'text-orange-700' },
  'вернулись':                { label: 'Вернулись',                 bg: 'bg-red-100',     text: 'text-red-700' },
  'частично деиндексированы': { label: 'Частично деинд.',           bg: 'bg-purple-100',  text: 'text-purple-700' },

  // MVP новые
  'в карантине':              { label: 'В карантине',               bg: 'bg-orange-100',  text: 'text-orange-700' },
  'готово':                   { label: 'Готово',                    bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  'сдано':                    { label: 'Сдано',                     bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  'отклонено':                { label: 'Отклонено',                 bg: 'bg-red-100',     text: 'text-red-700' },

  // v2/v3 расширенные
  'новый':                    { label: 'Новый',                     bg: 'bg-slate-100',   text: 'text-slate-600' },
  'ожидает аудита':           { label: 'Ожидает аудита',            bg: 'bg-pink-100',    text: 'text-pink-700' },
  'в аудите':                 { label: 'В аудите',                  bg: 'bg-amber-100',   text: 'text-amber-700' },
  'аудит выполнен':           { label: 'Аудит выполнен',            bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'на просчёт':               { label: 'На просчёт',                bg: 'bg-sky-100',     text: 'text-sky-700' },
  'просчёт выполнен':         { label: 'Просчёт выполнен',          bg: 'bg-teal-100',    text: 'text-teal-700' },
  'не взято в работу':        { label: 'Не взято в работу',         bg: 'bg-gray-100',    text: 'text-gray-600' },
  'деиндексировано google':   { label: 'Деинд. Google',             bg: 'bg-green-100',   text: 'text-green-700' },
  'деиндексировано yandex':  { label: 'Деинд. Яндекс',             bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  'деиндексировано bing':    { label: 'Деинд. Bing',               bg: 'bg-blue-100',    text: 'text-blue-700' },
  'деиндексировано yahoo':   { label: 'Деинд. Yahoo',              bg: 'bg-purple-100',  text: 'text-purple-700' },
  'частично деиндексировано': { label: 'Частично деинд.',           bg: 'bg-teal-100',    text: 'text-teal-700' },
  'вернулось':                { label: 'Вернулось',                 bg: 'bg-red-100',     text: 'text-red-700' },
  'повторно в работе':        { label: 'Повторно в работе',         bg: 'bg-blue-100',    text: 'text-blue-700' },
  'сдано клиенту':            { label: 'Сдано клиенту',             bg: 'bg-slate-100',  text: 'text-blue-800' },
  'принято':         { label: 'Принято',          bg: 'bg-green-100',   text: 'text-green-700' },
  'не принято':      { label: 'Не принято',       bg: 'bg-red-100',     text: 'text-red-700' },
  'согласовано':     { label: 'Согласовано',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'отправлено клиенту': { label: 'Отправлено клиенту', bg: 'bg-slate-100', text: 'text-blue-800' },
};

const taskStatusConfig: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  new:         { label: 'Новая',      bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'В работе',   bg: 'bg-slate-100', text: 'text-blue-800' },
  paused:      { label: 'На паузе',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  done:        { label: 'Готово',     bg: 'bg-green-100',  text: 'text-green-700' },
};

const projectStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'новый':      { label: 'Новый',      bg: 'bg-slate-100',  text: 'text-slate-600' },
  'в работе':   { label: 'В работе',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  'на паузе':   { label: 'На паузе',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'завершён':   { label: 'Завершён',   bg: 'bg-green-100',  text: 'text-green-700' },
  'просрочен':  { label: 'Просрочен',  bg: 'bg-red-100',    text: 'text-red-700' },
};

const paymentStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  'запланирован': { label: 'Запланирован', bg: 'bg-slate-100',  text: 'text-slate-600' },
  'оплачен':      { label: 'Оплачен',      bg: 'bg-green-100',  text: 'text-green-700' },
  'просрочен':    { label: 'Просрочен',    bg: 'bg-red-100',    text: 'text-red-700' },
  unpaid: { label: 'Не оплачено', bg: 'bg-red-100', text: 'text-red-700' },
  partially_paid: { label: 'Частично оплачено', bg: 'bg-amber-100', text: 'text-amber-700' },
  paid: { label: 'Оплачено', bg: 'bg-green-100', text: 'text-green-700' },
  not_accrued: { label: 'Не начислено', bg: 'bg-slate-100', text: 'text-slate-600' },
  accrued: { label: 'Начислено', bg: 'bg-blue-100', text: 'text-blue-700' },
  paid_to_executor: { label: 'Выплачено исполнителю', bg: 'bg-green-100', text: 'text-green-700' },
};

interface StatusBadgeProps {
  status: LinkStatus | TaskStatus | string;
  type?: 'link' | 'task' | 'project' | 'payment';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, type = 'link', size = 'sm' }: StatusBadgeProps) {
  let config;

  if (type === 'task') {
    config = taskStatusConfig[status as TaskStatus];
  } else if (type === 'project') {
    config = projectStatusConfig[status];
  } else if (type === 'payment') {
    config = paymentStatusConfig[status];
  } else {
    config = linkStatusConfig[status as string];
  }

  if (!config) return <span className="text-xs text-gray-400">{status}</span>;

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-1.5 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizeClasses} ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
