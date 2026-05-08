import { createClient } from '@supabase/supabase-js';

const viteEnv = ((import.meta as any).env || {}) as Record<string, string | undefined>;

const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL ||
  'https://jhdvuwzdzqujeopjwytg.supabase.co';

const supabaseKey =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_vA45eVJ75Fg1L33lH-XjIA_LxmKpiAq';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
