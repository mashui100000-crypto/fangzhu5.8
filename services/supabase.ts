import { createClient } from '@supabase/supabase-js';

const viteEnv = ((import.meta as any).env || {}) as Record<string, string | undefined>;

const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL ||
  'https://exsupxyolwkihmttjxty.supabase.co';

const supabaseKey =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4c3VweHlvbHdraWhtdHRqeHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTcyNjgsImV4cCI6MjA4NDQzMzI2OH0.7nOLlqhiDYkDr3B9LLlsIZbzrS7M_vLSyxprlIm9hz8';

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
