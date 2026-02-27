import type { Context, Next } from 'hono';
import { AppError } from './error-handler.js';

export type AuthRole = 'public' | 'publisher' | 'admin';

const ADMIN_TOKEN = process.env.GENEHUB_ADMIN_TOKEN ?? 'ghb_admin_dev';
const PUBLISHER_TOKENS = (process.env.GENEHUB_PUBLISHER_TOKENS ?? '').split(',').filter(Boolean);

function resolveRole(token: string | undefined): AuthRole {
  if (!token) return 'public';
  if (token === ADMIN_TOKEN) return 'admin';
  if (PUBLISHER_TOKENS.includes(token) || token === ADMIN_TOKEN) return 'admin';
  if (token.startsWith('ghb_')) return 'publisher';
  return 'public';
}

function extractToken(c: Context): string | undefined {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return undefined;
}

export function requireAuth(minRole: AuthRole = 'publisher') {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);
    const role = resolveRole(token);

    c.set('authRole', role);
    c.set('authToken', token);

    const roleLevel: Record<AuthRole, number> = { public: 0, publisher: 1, admin: 2 };

    if (roleLevel[role] < roleLevel[minRole]) {
      if (!token) throw AppError.tokenInvalid();
      throw AppError.permissionDenied();
    }

    await next();
  };
}

export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);
    const role = resolveRole(token);
    c.set('authRole', role);
    c.set('authToken', token);
    await next();
  };
}
