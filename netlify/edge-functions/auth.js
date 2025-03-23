import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 获取环境变量
const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in auth.js');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

export default async (request, context) => {
  try {
    // 处理 OAuth 回调
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return new Response('Missing code parameter', { status: 400 });
    }

    // 交换 code 获取 session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth error:', error);
      return new Response(error.message, { status: 400 });
    }

    // 重定向到主页
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/',
        'Set-Cookie': `sb-token=${data.session.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict`
      }
    });
  } catch (error) {
    console.error('Auth handler error:', error);
    return new Response(error.message, { status: 500 });
  }
}; 