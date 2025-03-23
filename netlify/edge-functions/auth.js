import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function verifySession(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) throw error;
  return user;
}

export default async function handler(request, context) {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    return new Response(JSON.stringify({ status: 'Auth service is running' }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
} 