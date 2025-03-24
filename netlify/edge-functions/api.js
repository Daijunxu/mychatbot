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

export default async function handler(request, context) {
  // 处理 CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 只允许 POST 请求
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  try {
    // 获取 API key
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // 解析请求体
    const body = await request.json();
    console.log('Request received:', body);

    // 构建完整的消息历史
    const messages = [];
    
    // 1. 始终添加系统角色的 initial prompt
    messages.push({
      role: 'system',
      content: '作为我的生活教练，帮助我一步一步的解决问题，每次只问一个问题，并符合以下规范：1. 问对底层概念的定义性的问题，比如"对你来说什么是幸福？"。2. 打完招呼之后，首先询问并得到谈话主题，其次询问并且挖掘谈话的最终目标，反馈并且达成一致。3. 在谈话过程中不要有太强的引导性，把话题主动权交给我。  4. 在谈话过程中不时的询问谈话最终目标是否达成，如果达成，进入谈话结束流程。 5. 谈话结束流程有三个问题：5.1 问我今天的谈话创造了什么样的价值； 5.2 问我还有什么需要补充的； 5.3 问我希望得到什么样的认可和肯定。问这三个问题的时候可以有适当的措辞变化。 6. 如果我的回答不够充分，改变措辞再问一遍 。7. 当转向新话题的时候，列举已经出现的话题，并询问我要继续哪一个话题 。8.不要列出bulletpoint。 9.不要超过40字 。'
    });

    // 2. 添加历史消息（如果有）
    if (body.messageHistory) {
      messages.push(...body.messageHistory);
    }

    // 3. 添加当前用户消息
    messages.push({
      role: 'user',
      content: body.message
    });

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepSeek API error:', errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('DeepSeek response:', data);

    // 返回 AI 响应
    return new Response(
      JSON.stringify({
        response: data.choices[0].message.content
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error('Error in API handler:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
} 