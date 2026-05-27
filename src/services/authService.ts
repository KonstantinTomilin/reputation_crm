import { supabase } from '@/lib/supabase';
import { clearSession, getSessionUser, setSessionUser, type SessionUser } from '@/lib/auth';
import { loginToTechnicalEmail, normalizeLogin } from '@/lib/auth/loginToEmail';
import { createExperimentalSupabaseRepository } from '@/repositories/crm';

const isSupabaseAuthMode = () => (import.meta.env.VITE_CRM_AUTH_MODE ?? 'legacy') === 'supabase';

interface CrmUserRow {
  id: string;
  login: string;
  role: string;
  display_name: string;
  status: 'active' | 'blocked' | 'deleted';
  auth_user_id: string | null;
  technical_email: string | null;
  password_hash: string | null;
  deleted_at: string | null;
}

function mapCrmRowToSessionUser(row: CrmUserRow): SessionUser {
  return {
    id: Number.parseInt(row.id.replace(/-/g, '').slice(0, 8), 16) || Date.now(),
    email: row.technical_email ?? `${row.login}@crm.local`,
    login: row.login,
    role: row.role,
    name: row.display_name,
  };
}

async function getCrmUserByLogin(login: string): Promise<CrmUserRow | null> {
  if (!supabase) throw new Error('Supabase client is not configured');
  const normalized = normalizeLogin(login);
  const { data, error } = await supabase
    .from('crm_users')
    .select('*')
    .eq('login', normalized)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Failed to load CRM user by login: ${error.message}`);
  return (data as CrmUserRow | null) ?? null;
}

export async function signInWithLogin(login: string, password: string): Promise<SessionUser> {
  const normalizedLogin = normalizeLogin(login);

  if (!isSupabaseAuthMode()) {
    const repository = createExperimentalSupabaseRepository();
    const session = await repository.login(normalizedLogin, password);
    setSessionUser(session);
    return session;
  }

  if (!supabase) throw new Error('Supabase client is not configured');
  const technicalEmail = loginToTechnicalEmail(normalizedLogin);

  const authAttempt = await supabase.auth.signInWithPassword({
    email: technicalEmail,
    password,
  });

  if (!authAttempt.error && authAttempt.data.user) {
    const authUserId = authAttempt.data.user.id;
    const { data, error } = await supabase
      .from('crm_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new Error(`Failed to map auth user to CRM profile: ${error.message}`);
    const crmUser = data as CrmUserRow | null;
    if (!crmUser) {
      throw new Error('CRM профиль не найден для текущего auth пользователя');
    }
    if (crmUser.status !== 'active') {
      throw new Error('Учетная запись заблокирована или удалена');
    }

    const now = new Date().toISOString();
    const { error: touchError } = await supabase
      .from('crm_users')
      .update({ last_login_at: now })
      .eq('id', crmUser.id);
    if (touchError) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] Failed to update last_login_at:', touchError.message);
    }

    const session = mapCrmRowToSessionUser(crmUser);
    setSessionUser(session);
    return session;
  }

  // Legacy fallback bridge for users not yet mapped to Supabase Auth.
  const legacyUser = await getCrmUserByLogin(normalizedLogin);
  if (!legacyUser) throw new Error('Неверный логин или пароль');
  if (legacyUser.status !== 'active' || legacyUser.deleted_at) {
    throw new Error('Учётная запись заблокирована. Обратитесь к администратору.');
  }
  if (!legacyUser.auth_user_id) {
    const passwordHash = legacyUser.password_hash ?? 'password';
    const accepted =
      password === passwordHash ||
      (passwordHash === 'dev_placeholder_hash' && password === 'password');
    if (!accepted) throw new Error('Неверный логин или пароль');
    const session = mapCrmRowToSessionUser(legacyUser);
    setSessionUser(session);
    return session;
  }

  throw new Error(authAttempt.error?.message ?? 'Неверный логин или пароль');
}

export async function signOut(): Promise<void> {
  if (isSupabaseAuthMode() && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] Supabase signOut warning:', error.message);
    }
  }
  clearSession();
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentCrmUser(): Promise<SessionUser | null> {
  const cached = getSessionUser();
  if (!isSupabaseAuthMode()) return cached;
  const session = await getSupabaseSession();
  if (!session?.user?.id || !supabase) return cached;
  const { data, error } = await supabase
    .from('crm_users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Failed to load current CRM user: ${error.message}`);
  if (!data) return cached;
  return mapCrmRowToSessionUser(data as CrmUserRow);
}

// Stage 2.5 bridge:
// This operation should be moved to Edge Function with service role.
export async function createAuthUserForCrmUser(input: {
  login: string;
  password: string;
  role: string;
  display_name: string;
  status: string;
}) {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
  });
  if (error) {
    throw new Error(
      `Не удалось создать auth пользователя через Edge Function admin-create-user: ${error.message}`
    );
  }
  return data;
}

export async function linkCrmUserToAuthUser(
  crmUserId: string,
  authUserId: string,
  technicalEmail: string
) {
  if (!supabase) throw new Error('Supabase client is not configured');
  const { data, error } = await supabase
    .from('crm_users')
    .update({
      auth_user_id: authUserId,
      technical_email: technicalEmail,
    })
    .eq('id', crmUserId)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to link CRM user to auth user: ${error.message}`);
  return data;
}

