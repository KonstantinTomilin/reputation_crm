import { useState } from 'react';
import type { CRMUser, UserRole } from '@/mocks/crm';

interface UserModalProps {
  user?: CRMUser;
  onClose: () => void;
  onSave: (u: Omit<CRMUser, 'id'>) => void;
}

export default function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    login: user?.login || '',
    email: user?.email || '',
    role: (user?.role || 'executor') as UserRole,
    status: (user?.status || 'активен') as 'активен' | 'заблокирован',
    alias: user?.alias || '',
    language: (user?.language || 'ru') as 'ru' | 'en',
    password: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">{user ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">ФИО / Название</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="Иванов Алексей"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Логин</label>
            <input
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="ivanov_a"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="user@example.com"
              type="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Роль</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
              >
                <option value="client">Клиент</option>
                <option value="executor">Исполнитель</option>
                <option value="auditor">Аудитор</option>
                <option value="admin">Администратор</option>
                <option value="manager">Руководитель</option>
                <option value="main_admin">Гл. администратор</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'активен' | 'заблокирован' })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
              >
                <option value="активен">Активен</option>
                <option value="заблокирован">Заблокирован</option>
              </select>
            </div>
          </div>
          {!user && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Пароль для входа</label>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
                placeholder="пароль"
                type="text"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Псевдоним (для обезличивания)</label>
            <input
              value={form.alias}
              onChange={(e) => setForm({ ...form, alias: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              placeholder="User 1"
            />
          </div>
        </div>

        <button
          onClick={() => {
            onSave(form as Omit<CRMUser, 'id'>);
            onClose();
          }}
          className="mt-2 w-full py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
        >
          {user ? 'Сохранить изменения' : 'Создать пользователя'}
        </button>
      </div>
    </div>
  );
}