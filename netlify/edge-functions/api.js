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

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url);
    const path = url.pathname.replace('/.netlify/edge-functions/api', '');

    switch (path) {
      case '/auth/login': {
        if (request.method === 'POST') {
          const { email, password } = await request.json();
          const user = await findUser(db, email);

          if (!user || !(await comparePasswords(password, user.password))) {
            return new Response(
              JSON.stringify({ error: 'Invalid credentials' }),
              { status: 401, headers }
            );
          }

          const token = await createToken({
            id: user._id.toString(),
            email: user.email
          });

          return new Response(
            JSON.stringify({
              token,
              user: {
                id: user._id,
                email: user.email,
                name: user.name
              }
            }),
            { headers }
          );
        }
        break;
      }

      case '/auth/signup': {
        if (request.method === 'POST') {
          const { email, password, name } = await request.json();
          const existingUser = await findUser(db, email);

          if (existingUser) {
            return new Response(
              JSON.stringify({ error: 'Email already registered' }),
              { status: 400, headers }
            );
          }

          const hashedPassword = await hashPassword(password);
          const userId = await createUser(db, {
            email,
            password: hashedPassword,
            name
          });

          const token = await createToken({
            id: userId.toString(),
            email
          });

          return new Response(
            JSON.stringify({
              token,
              user: { id: userId, email, name }
            }),
            { status: 201, headers }
          );
        }
        break;
      }

      case '/chat/history': {
        if (request.method === 'GET') {
          const authHeader = request.headers.get('Authorization');
          const token = authHeader?.split(' ')[1];
          const user = token ? await verifyToken(token) : null;

          if (!user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized' }),
              { status: 401, headers }
            );
          }

          const history = await getChatHistory(db, user.id);
          return new Response(
            JSON.stringify({ history }),
            { headers }
          );
        }
        break;
      }

      case '/chat/send': {
        if (request.method === 'POST') {
          const authHeader = request.headers.get('Authorization');
          const token = authHeader?.split(' ')[1];
          const user = token ? await verifyToken(token) : null;

          if (!user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized' }),
              { status: 401, headers }
            );
          }

          const { message } = await request.json();
          const chatMessage = await saveChatMessage(db, {
            userId: user.id,
            message,
            timestamp: new Date()
          });

          return new Response(
            JSON.stringify({ message: chatMessage }),
            { headers }
          );
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers }
    );

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers }
    );
  }
} 