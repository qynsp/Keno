import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'casino_keno_secret_key_2026_super_secure';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'USER' | 'ADMIN';
  };
}

export function generateToken(user: { id: string; username: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 30 * 86400, // 30 days
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): { id: string; username: string; role: 'USER' | 'ADMIN' } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
    }
    next();
  });
}

/**
  Validates Telegram Mini App initData string against Telegram Bot Token using HMAC-SHA256
 */
export function validateTelegramInitData(initData: string, botToken: string): { isValid: boolean; user?: any; error?: string } {
  try {
    if (!initData) {
      return { isValid: false, error: 'Empty initData string' };
    }

    const searchParams = new URLSearchParams(initData);
    const hash = searchParams.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Missing hash in initData' };
    }

    // Sort all key-value pairs alphabetically excluding 'hash'
    const items: string[] = [];
    searchParams.forEach((val, key) => {
      if (key !== 'hash') {
        items.push(`${key}=${val}`);
      }
    });
    items.sort();
    const dataCheckString = items.join('\n');

    // Create secret key HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // Compute HMAC-SHA256 of dataCheckString using secretKey
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return { isValid: false, error: 'Telegram hash signature verification failed' };
    }

    // Extract user payload from parameters
    const userJson = searchParams.get('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return { isValid: true, user };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Error parsing Telegram initData' };
  }
}

/**
  Parses user payload from Telegram initData query string without signature check
 */
export function parseTelegramUserFromInitData(initData: string): any | null {
  try {
    if (!initData) return null;
    const searchParams = new URLSearchParams(initData);
    const userJson = searchParams.get('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    return null;
  }
}

