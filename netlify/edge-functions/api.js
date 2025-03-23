import { hashPassword, comparePasswords, createToken, verifyToken } from './auth.js';
import { findUserByEmail, createNewUser, saveMessage, getUserMessages } from './supabase.js';

// 默认导出函数
export default async function handler(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const url = new URL(request.url);

    // 注册路由
    if (url.pathname.startsWith('/api/auth/signup')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password, name } = await request.json();
      
      // 检查用户是否已存在
      try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
          return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400, headers });
        }
      } catch (error) {
        // 用户不存在，继续注册流程
      }

      const hashedPassword = await hashPassword(password);
      const user = await createNewUser({ email, password: hashedPassword, name });
      const token = createToken({ userId: user.id });

      return new Response(JSON.stringify({ token }), { headers });
    }

    // 登录路由
    if (url.pathname.startsWith('/api/auth/login')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password } = await request.json();
      const user = await findUserByEmail(email);

      if (!user || !(await comparePasswords(password, user.password))) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers });
      }

      const token = createToken({ userId: user.id });
      return new Response(JSON.stringify({ token }), { headers });
    }

    // 验证 token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // 发送消息路由
    if (url.pathname.startsWith('/api/chat/send')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { message } = await request.json();
      
      // 保存用户消息
      await saveMessage({
        user_id: decoded.userId,
        content: message,
        is_user: true
      });

      // TODO: 调用 AI 处理消息
      const aiResponse = "这是一个测试回复";
      
      // 保存 AI 回复
      await saveMessage({
        user_id: decoded.userId,
        content: aiResponse,
        is_user: false
      });

      return new Response(JSON.stringify({ success: true }), { headers });
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