import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const crm = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // First-time setup state
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  const isFirstTime = crm.authUsers.length === 0 && crm.users.length === 0;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = crm.authUsers.find(
      (u) => u.email === email.trim() && u.password === password.trim()
    );

    if (!user) {
      setError('Неверный e-mail или пароль');
      return;
    }

    localStorage.setItem('crm_user', JSON.stringify(user));

    const routeMap: Record<string, string> = {
      client: '/client',
      executor: '/executor',
      auditor: '/auditor',
      management: '/management',
      admin: '/management',
      manager: '/management',
      main_admin: '/management',
      leader: '/management',
    };
    navigate(routeMap[user.role] || '/client');
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (!setupName.trim()) {
      setSetupError('Введите имя администратора');
      return;
    }
    if (!setupEmail.trim() || !setupEmail.includes('@')) {
      setSetupError('Введите корректный e-mail');
      return;
    }
    if (!setupPassword || setupPassword.length < 6) {
      setSetupError('Пароль должен быть не менее 6 символов');
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError('Пароли не совпадают');
      return;
    }

    // Create first user in CRM
    const newUser = {
      id: 1,
      role: 'main_admin' as const,
      login: setupEmail.split('@')[0],
      email: setupEmail.trim(),
      fullName: setupName.trim(),
      language: 'ru' as const,
      status: 'активен' as const,
      alias: null,
    };

    // Create auth user
    const newAuthUser = {
      id: 1,
      email: setupEmail.trim(),
      password: setupPassword,
      role: 'main_admin',
      name: setupName.trim(),
    };

    crm.setUsers((prev) => [...prev, newUser]);
    crm.setAuthUsers((prev) => [...prev, newAuthUser]);

    setSetupSuccess(true);

    setTimeout(() => {
      localStorage.setItem('crm_user', JSON.stringify(newAuthUser));
      navigate('/management');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#0b1220]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-slate-700/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-900/30 border border-blue-800/30">
                <i className="ri-shield-check-line text-blue-400 text-base" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                deindex.ru
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Управление ссылками и репутацией
            </p>
          </div>

          {isFirstTime ? (
            <div>
              <div className="mb-5 p-3 rounded-lg bg-blue-900/10 border border-blue-800/20">
                <div className="flex items-center gap-2 mb-1">
                  <i className="ri-rocket-line text-blue-400 text-sm" />
                  <span className="text-xs font-medium text-blue-300">Первый запуск</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Система пуста. Создайте учётную запись главного администратора, чтобы начать работу.
                </p>
              </div>

              <form onSubmit={handleSetup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">Имя администратора</label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">E-mail</label>
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="admin@company.ru"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">Пароль</label>
                  <input
                    type="password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    placeholder="Повторите пароль"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                  />
                </div>

                {setupError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {setupError}
                  </div>
                )}

                {setupSuccess && (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                    <i className="ri-check-line" />
                    Учётная запись создана. Переход в систему...
                  </div>
                )}

                <button
                  type="submit"
                  disabled={setupSuccess}
                  className="w-full bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Создать и войти
                </button>
              </form>
            </div>
          ) : (
            <>
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-medium">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль"
                      className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700 focus:bg-slate-800/80 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      <i className={`${showPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`} />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Войти
                </button>
              </form>

              {crm.authUsers.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-slate-700/30" />
                    <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Аккаунты</span>
                    <div className="flex-1 h-px bg-slate-700/30" />
                  </div>
                  <div className="flex flex-col gap-2">
                    {crm.authUsers.map((u) => {
                      const roleLabels: Record<string, string> = {
                        client: 'Клиент',
                        executor: 'Исполнитель',
                        auditor: 'Аудитор',
                        management: 'Управление',
                        admin: 'Админ',
                        manager: 'Менеджер',
                        main_admin: 'Главный админ',
                        leader: 'Руководитель',
                      };
                      const roleColors: Record<string, string> = {
                        client: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        executor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        auditor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                        management: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                        admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                        manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                        main_admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                        leader: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      };
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setEmail(u.email);
                            setPassword(u.password);
                            setError('');
                          }}
                          className="w-full text-left bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/20 hover:border-slate-600/40 rounded-lg p-3 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-white group-hover:text-slate-200 transition-colors">
                              {u.name || u.email}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleColors[u.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <i className="ri-mail-line text-[10px]" />
                              {u.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <i className="ri-key-2-line text-[10px]" />
                              {u.password}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-5">
          deindex.ru CRM · Все права защищены
        </p>
      </div>
    </div>
  );
}