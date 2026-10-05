import { acceptInvite, recoverPassword, requestPasswordRecovery, login, logout, AuthError } from '@netlify/identity';
import { eq } from 'drizzle-orm';
import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { staffProfiles } from '../../db/schema.js';
import { body, failure, json, mutation } from './lib/http.mjs';
import { password, RequestError, text } from './lib/validation.mjs';

export default async (request: Request) => {
  try {
    mutation(request);
    if (request.method !== 'POST') throw new RequestError('Method not allowed.', 405);
    const input = await body(request);
    if (input.action === 'recover') {
      const identifier = text(input.username, 'Username', 254).toLowerCase();
      let address = identifier;
      if (!identifier.includes('@')) {
        const [profile] = await db.select().from(staffProfiles).where(eq(staffProfiles.username, identifier)).limit(1);
        address = profile?.email ?? 'unregistered@invalid.example';
      }
      try { await requestPasswordRecovery(address); } catch (error) {
        if (!(error instanceof AuthError)) throw error;
      }
      return json({ success: true });
    }
    if (input.action !== 'invite' && input.action !== 'recovery') throw new RequestError('Invalid account action.');
    const token = text(input.token, 'Account link', 2048);
    const newPassword = password(input.password);
    const user = input.action === 'invite' ? await acceptInvite(token, newPassword) : await recoverPassword(token, newPassword);
    if (!user.email) throw new RequestError('Account setup could not be completed.');
    if (!user.roles?.some((role) => role === 'admin' || role === 'owner')) {
      await logout();
      return json({ error: 'Your password is set. Ask the site owner to grant newsroom access before signing in.' }, 403);
    }
    await login(user.email, newPassword);
    return json({ success: true });
  } catch (error) {
    return failure(error);
  }
};

export const config: Config = {
  path: '/api/newsroom-account',
  rateLimit: { windowSize: 60, windowLimit: 5, aggregateBy: ['ip'], action: 'rate_limit' },
};
