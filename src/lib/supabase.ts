import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.VITE_PUBLIC_SUPABASE_URL ??
  '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return supabaseClient;
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Supabase] Missing URL or anon key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export function getSupabaseClientOrNull(): SupabaseClient | null {
  return createSupabaseClient();
}

export function getSupabaseClientOrThrow(): SupabaseClient {
  const client = createSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.'
    );
  }
  return client;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClientOrNull();
  if (!client) {
    return { ok: false, message: 'Supabase env is not configured.' };
  }

  try {
    const { error } = await client.auth.getSession();
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Supabase auth endpoint is reachable.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Supabase error';
    return { ok: false, message };
  }
}

// Backward-compatible export for existing imports.
export const supabase = getSupabaseClientOrNull();

