import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { db, schema } from '../db/index.js';
import { AppError } from './error-handler.js';

const { apiKeys, publishers } = schema;

export type AuthRole = 'public' | 'publisher' | 'admin';

const ADMIN_TOKEN = process.env.GENEHUB_ADMIN_TOKEN ?? 'ghb_admin_dev';
const JWT_SECRET = process.env.GENEHUB_JWT_SECRET ?? 'genehub-dev-jwt-secret';
const COOKIE_NAME = 'ghb_session';

type AuthInfo = {
  role: AuthRole;
  publisherId?: string;
  githubLogin?: string;
};

function extractBearerToken(c: Context): string | undefined {
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

async function resolveAuth(c: Context): Promise<AuthInfo> {
  const bearerToken = extractBearerToken(c);

  if (bearerToken) {
    if (bearerToken === ADMIN_TOKEN) {
      return { role: 'admin' };
    }

    if (bearerToken.startsWith('ghb_')) {
      const tokenHash = createHash('sha256').update(bearerToken).digest('hex');
      const result = await db
        .select({
          keyId: apiKeys.id,
          publisherId: apiKeys.publisher_id,
          revokedAt: apiKeys.revoked_at,
          githubLogin: publishers.github_login,
        })
        .from(apiKeys)
        .innerJoin(publishers, eq(apiKeys.publisher_id, publishers.id))
        .where(eq(apiKeys.token_hash, tokenHash));

      if (result.length > 0 && !result[0].revokedAt) {
        db.update(apiKeys)
          .set({ last_used_at: new Date() })
          .where(eq(apiKeys.id, result[0].keyId))
          .then(() => {});

        return {
          role: 'publisher',
          publisherId: result[0].publisherId,
          githubLogin: result[0].githubLogin,
        };
      }
    }

    return { role: 'public' };
  }

  const jwt = getCookie(c, COOKIE_NAME);
  if (jwt) {
    try {
      const payload = await verify(jwt, JWT_SECRET, 'HS256');
      const publisherId = payload.sub as string;
      const login = payload.login as string | undefined;

      return { role: 'publisher', publisherId, githubLogin: login };
    } catch {
      return { role: 'public' };
    }
  }

  return { role: 'public' };
}

function applyAuthToContext(c: Context, auth: AuthInfo) {
  c.set('authRole', auth.role);
  c.set('publisherId', auth.publisherId);
  c.set('githubLogin', auth.githubLogin);
}

const ROLE_LEVEL: Record<AuthRole, number> = { public: 0, publisher: 1, admin: 2 };

export function requireAuth(minRole: AuthRole = 'publisher') {
  return async (c: Context, next: Next) => {
    const auth = await resolveAuth(c);
    applyAuthToContext(c, auth);

    if (ROLE_LEVEL[auth.role] < ROLE_LEVEL[minRole]) {
      if (auth.role === 'public') throw AppError.tokenInvalid();
      throw AppError.permissionDenied();
    }

    await next();
  };
}

export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const auth = await resolveAuth(c);
    applyAuthToContext(c, auth);
    await next();
  };
}
