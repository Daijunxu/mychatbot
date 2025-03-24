import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isProd = import.meta.env.PROD;
const redirectUrl = isProd 
  ? 'https://gilded-cucurucho-a6bf54.netlify.app'
  : 'http://localhost:3000';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    redirectTo: `${redirectUrl}/auth/callback`
  }
}); 