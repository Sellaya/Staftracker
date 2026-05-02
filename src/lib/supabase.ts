import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Server routes should use this when set so inserts/selects work with RLS enabled (see .env.example). */
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getSupabaseBrowserClient(): SupabaseClient<any> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient<any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function getSupabaseServerClient(): SupabaseClient<any> {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a key (set NEXT_PUBLIC_SUPABASE_ANON_KEY and/or SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  return createClient<any>(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasSupabaseEnv(): boolean {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
}
