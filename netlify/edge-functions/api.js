import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 获取环境变量
const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async (request, context) => {
  try {
    // 获取认证 token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 解析请求体
    const { message } = await request.json();
    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // 获取历史消息
    const { data: messages, error: historyError } = await supabase
      .from('messages')
      .select('content, is_user')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    // 构建上下文
    const context = messages ? messages.map(msg => 
      `${msg.is_user ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n') + '\nUser: ' + message : message;

    // 调用 AI API
    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: context }]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // 保存对话记录
    await supabase.from('messages').insert([
      { user_id: user.id, content: message, is_user: true },
      { user_id: user.id, content: aiMessage, is_user: false }
    ]);

    return new Response(JSON.stringify({ response: aiMessage }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 