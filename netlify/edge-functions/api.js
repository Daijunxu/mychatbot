import { connectToDatabase, findUser, createUser, saveChatMessage, getChatHistory } from './db.js';
import { hashPassword, comparePasswords, createToken, verifyToken } from './auth.js';

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
    const { db } = await connectToDatabase();

    // 添加数据库连接测试路由
    if (url.pathname === '/api/test-db') {
      console.log('Testing database connection...');
      
      // 尝试执行一个简单的数据库操作
      const collections = await db.listCollections().toArray();
      console.log('Available collections:', collections);
      
      return new Response(JSON.stringify({
        status: 'success',
        message: 'Database connection successful',
        collections: collections
      }), { headers });
    }

    // 认证路由
    if (url.pathname.startsWith('/api/auth/signup')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password, name } = await request.json();
      const existingUser = await findUser(db, email);

      if (existingUser) {
        return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400, headers });
      }

      const hashedPassword = await hashPassword(password);
      const user = await createUser(db, { email, password: hashedPassword, name });
      const token = createToken({ userId: user.insertedId });

      return new Response(JSON.stringify({ token }), { headers });
    }

    if (url.pathname.startsWith('/api/auth/login')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { email, password } = await request.json();
      const user = await findUser(db, email);

      if (!user || !(await comparePasswords(password, user.password))) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers });
      }

      const token = createToken({ userId: user._id });
      return new Response(JSON.stringify({ token }), { headers });
    }

    // 聊天路由
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (url.pathname.startsWith('/api/chat/send')) {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const { message } = await request.json();
      await saveChatMessage(db, {
        userId: decoded.userId,
        content: message,
        timestamp: new Date(),
        isUser: true
      });

      // TODO: 调用 AI 处理消息
      const aiResponse = "这是一个测试回复";
      await saveChatMessage(db, {
        userId: decoded.userId,
        content: aiResponse,
        timestamp: new Date(),
        isUser: false
      });

      return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (url.pathname.startsWith('/api/chat/history')) {
      if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
      }

      const history = await getChatHistory(db, decoded.userId);
      return new Response(JSON.stringify({ history }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error.message,
      stack: error.stack
    }), { status: 500, headers });
  }
} 