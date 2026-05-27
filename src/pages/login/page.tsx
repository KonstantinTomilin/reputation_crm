import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRM } from '@/context/CRMContext';
import { getHomeRoute, setSessionUser } from '@/lib/auth';
import { signInWithLogin } from '@/services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const crm = useCRM();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [setupName, setSetupName] = useState('');
  const [setupLogin, setSetupLogin] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);
  const authMode = import.meta.env.VITE_CRM_AUTH_MODE ?? 'legacy';
  const isSupabaseAuthMode = authMode === 'supabase';

  const isFirstTime = crm.authUsers.length === 0 && crm.users.length === 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const id = identifier.trim();
    const pw = password.trim();
    try {
      if (isSupabaseAuthMode) {
        const sessionUser = await signInWithLogin(id, pw);
        navigate(getHomeRoute(sessionUser.role));
        return;
      }

      const normalized = id.toLowerCase();
      const user = crm.authUsers.find(
        (u) =>
          (u.email.toLowerCase() === normalized || (u.login && u.login.toLowerCase() === normalized)) &&
          u.password === pw
      );

      if (!user) {
        setError('Неверный логин или пароль');
        return;
      }

      const crmUser = crm.users.find((u) => u.id === user.id);
      if (crmUser?.status === 'заблокирован' || crmUser?.isDeleted) {
        setError('Учётная запись заблокирована. Обратитесь к администратору.');
        return;
      }

      setSessionUser({
        id: user.id,
        email: user.email,
        login: user.login,
        role: user.role,
        name: user.name,
      });
      navigate(getHomeRoute(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (!setupName.trim()) setSetupError('Введите имя администратора');
    else if (!setupLogin.trim()) setSetupError('Введите логин');
    else if (!setupEmail.trim() || !setupEmail.includes('@')) setSetupError('Введите корректный e-mail');
    else if (!setupPassword || setupPassword.length < 6) setSetupError('Пароль не менее 6 символов');
    else if (setupPassword !== setupConfirm) setSetupError('Пароли не совпадают');
    else {
      const newUser = {
        id: 1,
        role: 'main_admin' as const,
        login: setupLogin.trim(),
        email: setupEmail.trim(),
        fullName: setupName.trim(),
        language: 'ru' as const,
        status: 'активен' as const,
        alias: null,
      };
      const newAuthUser = {
        id: 1,
        email: setupEmail.trim(),
        login: setupLogin.trim(),
        password: setupPassword,
        role: 'main_admin',
        name: setupName.trim(),
      };
      crm.setUsers((prev) => [...prev, newUser]);
      crm.setAuthUsers((prev) => [...prev, newAuthUser]);
      setSetupSuccess(true);
      setTimeout(() => {
        setSessionUser({
          id: newAuthUser.id,
          email: newAuthUser.email,
          login: newAuthUser.login,
          role: newAuthUser.role,
          name: newAuthUser.name,
        });
        navigate('/management/overview');
      }, 1500);
    }
  };

  const inputCls =
    'w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-700';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#0b1220]">
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-900/30 border border-blue-800/30">
                <i className="ri-shield-check-line text-blue-400 text-base" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">deindex.ru</span>
            </div>
            <p className="text-xs text-slate-400">Управление ссылками и репутацией</p>
          </div>

          {isFirstTime && !isSupabaseAuthMode ? (
            <form onSubmit={handleSetup} className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-800/20 text-[11px] text-slate-400">
                Первый запуск: создайте главного администратора. Регистрация только через админа.
              </div>
              <input placeholder="Имя" value={setupName} onChange={(e) => setSetupName(e.target.value)} className={inputCls} />
              <input placeholder="Логин" value={setupLogin} onChange={(e) => setSetupLogin(e.target.value)} className={inputCls} />
              <input placeholder="E-mail" type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} className={inputCls} />
              <input placeholder="Пароль" type="password" value={setupPassword} onChange={(e) => setSetupPassword(e.target.value)} className={inputCls} />
              <input placeholder="Подтвердите пароль" type="password" value={setupConfirm} onChange={(e) => setSetupConfirm(e.target.value)} className={inputCls} />
              {setupError && <div className="text-xs text-red-400">{setupError}</div>}
              {setupSuccess && <div className="text-xs text-emerald-400">Создано. Вход...</div>}
              <button type="submit" disabled={setupSuccess} className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm cursor-pointer">
                Создать и войти
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {isFirstTime && isSupabaseAuthMode && (
                <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-800/20 text-[11px] text-slate-300">
                  Supabase auth mode: сначала создайте и свяжите первого main_admin в Supabase (Auth + crm_users.auth_user_id).
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 font-medium">Логин или e-mail</label>
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={`mt-1.5 ${inputCls}`} />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Пароль</label>
                <div className="relative mt-1.5">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer">
                    <i className={showPw ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
              </div>
              {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" className="w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm cursor-pointer">
                Войти
              </button>
              <p className="text-[11px] text-slate-500 text-center">Учётные записи создаёт главный администратор</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
