import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const textEncoder = new TextEncoder();

export async function hashPassword(password) {
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

export async function comparePasswords(password, hashedPassword) {
  const hashedInput = await hashPassword(password);
  return hashedInput === hashedPassword;
}

export async function createToken(payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(Deno.env.get('JWT_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return await create({ alg: 'HS256', typ: 'JWT' }, payload, key);
}

export async function verifyToken(token) {
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