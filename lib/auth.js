import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined');
}

/**
 * Generate a JWT access token for a user.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * @typedef {Object} SessionUser
 * @property {string} userId
 * @property {string} email
 * @property {string} role
 * @property {string} name
 */

/**
 * Verify a JWT token and return the payload or null.
 * @param {string} token
 * @returns {SessionUser | null}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract and verify the user from a Next.js request.
 * Reads from Authorization header (Bearer token) or httpOnly cookie.
 * @param {import('next/server').NextRequest} req
 * @returns {Promise<SessionUser | null>}
 */
export async function getUserFromRequest(req) {
  // 1. Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) return payload;
  }

  // 2. Try httpOnly cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agrivet_token')?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload) return payload;
    }
  } catch {
    // cookies() may throw outside request context
  }

  return null;
}

/**
 * Set the JWT as an httpOnly cookie on the response.
 */
export function setAuthCookie(response, token) {
  response.cookies.set('agrivet_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return response;
}

/**
 * Clear the auth cookie.
 */
export function clearAuthCookie(response) {
  response.cookies.set('agrivet_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
