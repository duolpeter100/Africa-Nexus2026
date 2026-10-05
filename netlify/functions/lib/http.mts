import { admin, AuthError, getUser, MissingIdentityError, refreshSession, verifyRequestOrigin } from '@netlify/identity';
import { RequestError } from './validation.mjs';

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new RequestError('Expected JSON.', 415);
  const raw = await request.text();
  if (raw.length > 100000) throw new RequestError('Request is too large.', 413);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new RequestError('Invalid JSON request.');
  }
}

export function mutation(request: Request) {
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) throw new RequestError('Method not allowed.', 405);
  verifyRequestOrigin(request);
}

export async function staff() {
  await refreshSession();
  const session = await getUser();
  if (!session) throw new RequestError('Please sign in to continue.', 401);
  const user = await admin.getUser(session.id);
  const role = user.roles?.includes('owner') ? 'owner' : user.roles?.includes('admin') ? 'admin' : null;
  if (!role) throw new RequestError('This account does not have newsroom access. Contact the owner.', 403);
  return { ...user, newsroomRole: role };
}

export function failure(error: unknown) {
  if (error instanceof RequestError) return json({ error: error.message }, error.status);
  if (error instanceof MissingIdentityError) return json({ error: 'Authentication is unavailable. Contact the site owner.' }, 503);
  if (error instanceof AuthError) return json({ error: 'The account operation could not be completed. Check the details and try again.' }, error.status === 403 ? 403 : 400);
  const cause = error as { code?: string; cause?: { code?: string } };
  if (cause?.code === '23505' || cause?.cause?.code === '23505') return json({ error: 'That username is already in use.' }, 409);
  return json({ error: 'The service is temporarily unavailable. Please try again.' }, 503);
}
