import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const textEncoder = new TextEncoder();

async function hashPassword(password) {
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

async function comparePasswords(password, hashedPassword) {
  const hashedInput = await hashPassword(password);
  return hashedInput === hashedPassword;
}

async function createToken(payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(Deno.env.get('JWT_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return await create({ alg: 'HS256', typ: 'JWT' }, payload, key);
}

async function verifyToken(token) {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(Deno.env.get('JWT_SECRET')),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await verify(token, key);
  } catch (error) {
    return null;
  }
}

// 默认导出函数
export default async function handler(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 处理认证相关的请求
  if (path.endsWith('/auth/login') || path.endsWith('/auth/signup')) {
    return {
      hashPassword,
      comparePasswords,
      createToken,
      verifyToken
    };
  }

  // 默认响应
  return new Response(JSON.stringify({ error: 'Invalid auth endpoint' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 导出其他工具函数
export {
  hashPassword,
  comparePasswords,
  createToken,
  verifyToken
}; 