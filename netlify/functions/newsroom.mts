import { admin, logout } from '@netlify/identity';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { articles, staffProfiles } from '../../db/schema.js';
import { body, failure, json, mutation, staff } from './lib/http.mjs';
import { articleInput, email, password, RequestError, text, username } from './lib/validation.mjs';

export default async (request: Request) => {
  try {
    const action = new URL(request.url).pathname.replace('/api/newsroom/', '');
    if (request.method !== 'GET') mutation(request);
    if (action === 'logout' && request.method === 'POST') {
      await logout();
      return json({ success: true });
    }
    const user = await staff();
    if (action === 'session' && request.method === 'GET') {
      const [profile] = await db.select().from(staffProfiles).where(eq(staffProfiles.identityId, user.id));
      return json({ id: user.id, name: profile?.name ?? user.name ?? user.email, email: user.email, username: profile?.username ?? '', role: user.newsroomRole });
    }
    if (action === 'profile' && request.method === 'POST') {
      const input = await body(request);
      if (!user.email) throw new RequestError('This account needs an email address.');
      const values = { identityId: user.id, username: username(input.username), name: text(input.name, 'Name', 100), email: user.email };
      await db.insert(staffProfiles).values(values).onConflictDoUpdate({ target: staffProfiles.identityId, set: values });
      return json({ success: true });
    }
    if (action === 'articles') {
      if (request.method === 'GET') return json(await db.select().from(articles).orderBy(desc(articles.updatedAt)).limit(500));
      const input = await body(request);
      if (request.method === 'POST') {
        const values = articleInput(input);
        const [created] = await db.insert(articles).values({ ...values, createdBy: user.id, updatedBy: user.id, publishedAt: values.status === 'published' ? new Date() : null }).returning();
        return json(created, 201);
      }
      if (!Number.isSafeInteger(input.id) || Number(input.id) < 1 || !Number.isSafeInteger(input.version)) throw new RequestError('Invalid article reference.');
      const condition = and(eq(articles.id, Number(input.id)), eq(articles.version, Number(input.version)));
      if (request.method === 'DELETE') {
        const deleted = await db.delete(articles).where(condition).returning({ id: articles.id });
        if (!deleted.length) throw new RequestError('This story changed or was removed. Refresh before trying again.', 409);
        return json({ success: true });
      }
      if (request.method === 'PATCH') {
        const values = articleInput(input);
        const [updated] = await db.update(articles).set({
          ...values, updatedBy: user.id, updatedAt: new Date(), version: sql`${articles.version} + 1`,
          publishedAt: values.status === 'published' ? sql`coalesce(${articles.publishedAt}, now())` : null,
        }).where(condition).returning();
        if (!updated) throw new RequestError('Another editor changed this story. Refresh before saving again.', 409);
        return json(updated);
      }
    }
    if (action === 'team') {
      if (user.newsroomRole !== 'owner') throw new RequestError('Only the owner can manage team access.', 403);
      if (request.method === 'GET') {
        const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get('page')) || 1));
        const users = await admin.listUsers({ page, perPage: 50 });
        const profiles = await db.select().from(staffProfiles);
        return json({ page, hasMore: users.length === 50, users: users.map((member) => {
          const profile = profiles.find((entry) => entry.identityId === member.id);
          return { id: member.id, name: profile?.name ?? member.name ?? '', username: profile?.username ?? '', email: member.email, role: member.roles?.includes('owner') ? 'owner' : member.roles?.includes('admin') ? 'admin' : 'none' };
        }) });
      }
      const input = await body(request);
      const role = text(input.role, 'Role', 10);
      if (!['admin', 'owner', 'none'].includes(role)) throw new RequestError('Invalid role.');
      if (request.method === 'POST') {
        if (role === 'none') throw new RequestError('Choose admin or owner for a new account.');
        const account = { email: email(input.email), username: username(input.username), name: text(input.name, 'Name', 100) };
        const existing = await db.select().from(staffProfiles).where(eq(staffProfiles.username, account.username)).limit(1);
        if (existing.length) throw new RequestError('That username is already in use.', 409);
        const created = await admin.createUser({ email: account.email, password: password(input.password), data: { app_metadata: { roles: [role] }, user_metadata: { full_name: account.name } } });
        try {
          await db.insert(staffProfiles).values({ identityId: created.id, email: account.email, username: account.username, name: account.name });
        } catch (error) {
          await admin.deleteUser(created.id);
          throw error;
        }
        return json({ success: true }, 201);
      }
      if (request.method === 'PATCH') {
        const id = text(input.id, 'Account ID', 100);
        const member = await admin.getUser(id);
        if (id === user.id || member.roles?.includes('owner')) throw new RequestError('Owner accounts are protected. Manage owner removal in Netlify Identity.', 403);
        const roles = (member.roles ?? []).filter((entry) => entry !== 'admin' && entry !== 'owner');
        if (role !== 'none') roles.push(role);
        await admin.updateUser(id, { app_metadata: { ...member.appMetadata, roles } });
        return json({ success: true });
      }
    }
    throw new RequestError('Endpoint or method not found.', 404);
  } catch (error) {
    return failure(error);
  }
};

export const config: Config = { path: '/api/newsroom/*' };
