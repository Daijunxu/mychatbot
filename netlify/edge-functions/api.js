import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 添加调试日志
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

console.log('Initializing Supabase client with:');
console.log('- URL available:', !!supabaseUrl);
console.log('- Anon key available:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials:');
  console.error('- URL:', supabaseUrl ? 'present' : 'missing');
  console.error('- Anon key:', supabaseAnonKey ? 'present' : 'missing');
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function callDeepSeekAPI(message, userId) {
  try {
    // 获取当前用户的所有历史消息
    const { data: historyMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.log('Error fetching history:', error);
      throw error;
    }

    console.log('Found history messages:', historyMessages.length);

    // 构建完整的对话历史
    const messages = [
      {
        role: "system",
        content: '作为我的生活教练，帮助我一步一步的解决问题，每次只问一个问题，并符合以下规范：1. 问对底层概念的定义性的问题，比如"对你来说什么是幸福？"。2. 打完招呼之后，首先询问并得到谈话主题，其次询问并且挖掘谈话的最终目标，反馈并且达成一致。3. 在谈话过程中不要有太强的引导性，把话题主动权交给我。4. 在谈话过程中不时的询问谈话最终目标是否达成，如果达成，进入谈话结束流程。5. 谈话结束流程有三个问题：5.1 问我今天的谈话创造了什么样的价值；5.2 问我还有什么需要补充的；5.3 问我希望得到什么样的认可和肯定。问这三个问题的时候可以有适当的措辞变化。6. 如果我的回答不够充分，改变措辞再问一遍。7. 当转向新话题的时候，列举已经出现的话题，并询问我要继续哪一个话题。8.不要列出bulletpoint。9.不要超过40字。'
      }
    ];

    // 添加所有历史消息
    for (const msg of historyMessages) {
      messages.push({
        role: msg.is_user ? "user" : "assistant",
        content: msg.content
      });
    }

    // 添加当前新消息
    messages.push({
      role: "user",
      content: message
    });

    console.log('Sending messages to API:', messages);

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response received');
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 默认导出函数
export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const url = new URL(request.url);
    console.log('Request path:', url.pathname);

    // 登录路由
    if (url.pathname.startsWith('/api/auth/login')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password } = await request.json();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 401, headers });
      }

      return new Response(JSON.stringify({ 
        token: data.session.access_token,
        user: data.user 
      }), { headers });
    }

    // 注册路由
    if (url.pathname.startsWith('/api/auth/signup')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password, name } = await request.json();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
      }

      return new Response(JSON.stringify({ 
        token: data.session?.access_token,
        user: data.user 
      }), { headers });
    }

    // 验证 session 并处理聊天消息
    if (url.pathname.startsWith('/api/chat/send')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers });
      }

      const { message } = await request.json();
      
      // 先保存用户消息
      const { error: userMsgError } = await supabase.from('messages').insert([
        {
          user_id: user.id,
          content: message,
          is_user: true,
          created_at: new Date().toISOString()
        }
      ]);

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
        throw userMsgError;
      }

      // 获取 AI 响应
      const aiResponse = await callDeepSeekAPI(message, user.id);

      // 保存 AI 响应
      const { error: aiMsgError } = await supabase.from('messages').insert([
        {
          user_id: user.id,
          content: aiResponse,
          is_user: false,
          created_at: new Date().toISOString()
        }
      ]);

      if (aiMsgError) {
        console.error('Error saving AI response:', aiMsgError);
        throw aiMsgError;
      }

      return new Response(JSON.stringify({ response: aiResponse }), { headers });
    }

    // 获取聊天历史
    if (url.pathname.startsWith('/api/chat/history')) {
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const messages = await getUserMessages(decoded.userId);
      return new Response(JSON.stringify({ history: messages }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers });
  }
} 