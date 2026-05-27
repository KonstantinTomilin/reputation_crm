// Stage 2.5 skeleton (not auto-deployed by app build).
// Deploy manually via Supabase CLI if/when ready.
// Uses service role ONLY inside edge function runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  login: string;
  password: string;
  role: string;
  display_name: string;
  status: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceRole || !anon) {
      return new Response(JSON.stringify({ error: 'Missing required Supabase env vars.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Caller context
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized caller.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role admin client
    const adminClient = createClient(supabaseUrl, serviceRole);

    const { data: callerCrm, error: callerCrmErr } = await adminClient
      .from('crm_users')
      .select('id, role, status, deleted_at')
      .eq('auth_user_id', caller.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (callerCrmErr || !callerCrm || callerCrm.role !== 'main_admin' || callerCrm.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Forbidden: main_admin only.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    const login = body.login.trim().toLowerCase();
    const technicalEmail = `${login}@crm.local`;
    if (!login || !body.password || body.password.length < 6) {
      return new Response(JSON.stringify({ error: 'Invalid login/password.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await adminClient
      .from('crm_users')
      .select('id')
      .eq('login', login)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'Пользователь с таким логином уже существует' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: technicalEmail,
      password: body.password,
      email_confirm: true,
    });
    if (createAuthError || !authUser.user) {
      return new Response(JSON.stringify({ error: createAuthError?.message ?? 'Failed to create auth user.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: crmUser, error: createCrmError } = await adminClient
      .from('crm_users')
      .insert({
        login,
        password_hash: body.password, // temporary fallback bridge
        role: body.role,
        display_name: body.display_name,
        status: body.status ?? 'active',
        technical_email: technicalEmail,
        auth_user_id: authUser.user.id,
      })
      .select('*')
      .single();

    if (createCrmError) {
      return new Response(
        JSON.stringify({
          error: `Auth user created, but crm_users insert failed: ${createCrmError.message}`,
          auth_user_id: authUser.user.id,
          technical_email: technicalEmail,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        crm_user: crmUser,
        auth_user_id: authUser.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

