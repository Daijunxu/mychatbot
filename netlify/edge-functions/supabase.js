import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
}

// 用户相关函数
export async function findUserByEmail(email) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
}

export async function createNewUser(userData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 消息相关函数
export async function saveMessage(messageData) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserMessages(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// 添加默认导出函数
export default async function handler(request, context) {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const supabase = getSupabaseClient();
    return new Response(JSON.stringify({ status: 'Supabase connection successful' }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
} 