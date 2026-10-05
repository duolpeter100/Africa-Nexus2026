import { login, logout, AuthError } from '@netlify/identity';
import { eq } from 'drizzle-orm';
import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { staffProfiles } from '../../db/schema.js';
import { body, failure, json, mutation } from './lib/http.mjs';
import { RequestError, text } from './lib/validation.mjs';

export default async (request: Request) => {
  try {
    mutation(request);
    if (request.method !== 'POST') throw new RequestError('Method not allowed.', 405);
    const input = await body(request);
    const identifier = text(input.username, 'Username', 254).toLowerCase();
    if (typeof input.password !== 'string' || !input.password || input.password.length > 128) {
      throw new RequestError('Enter your username and password.');
    }
    let address = identifier;
    if (!identifier.includes('@')) {
      const [profile] = await db.select().from(staffProfiles).where(eq(staffProfiles.username, identifier)).limit(1);
      address = profile?.email ?? 'unregistered@invalid.example';
    }
    try {
      const user = await login(address, input.password);
      if (!user.roles?.some((role) => role === 'admin' || role === 'owner')) {
        await logout();
        return json({ error: 'This account does not have newsroom access. Contact the owner.' }, 403);
      }
      return json({ success: true });
    } catch (error) {
      if (error instanceof AuthError && [400, 401, 403, 422].includes(error.status ?? 0)) {
        return json({ error: 'Invalid username or password.' }, 401);
      }
      throw error;
    }
  } catch (error) {
    return failure(error);
  }
};

export const config: Config = {
  path: '/api/newsroom-login',
  rateLimit: { windowSize: 60, windowLimit: 10, aggregateBy: ['ip'], action: 'rate_limit' },
};
