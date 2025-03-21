import { create, verify } from 'https://deno.land/x/djwt@v2.9.1/mod.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const textEncoder = new TextEncoder();

export async function hashPassword(password) {
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function comparePasswords(password, hashedPassword) {
  const hashedInput = await hashPassword(password);
  return hashedInput === hashedPassword;
}

const key = await crypto.subtle.generateKey(
  { name: 'HMAC', hash: 'SHA-512' },
  true,
  ['sign', 'verify']
);

export function createToken(payload) {
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return create(
    { alg: 'HS512', typ: 'JWT' },
    { ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 },
    jwtSecret
  );
}

export function verifyToken(token) {
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  try {
    return verify(token, jwtSecret);
  } catch (error) {
    throw new Error('Invalid token');
  }
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