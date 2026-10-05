import { desc, eq } from 'drizzle-orm';
import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { articles } from '../../db/schema.js';
import { failure, json } from './lib/http.mjs';

export default async (request: Request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  try {
    const published = await db.select({
      id: articles.id, title: articles.title, excerpt: articles.excerpt, content: articles.content,
      category: articles.category, region: articles.region, author: articles.author,
      image: articles.image, publishedAt: articles.publishedAt,
    }).from(articles).where(eq(articles.status, 'published')).orderBy(desc(articles.publishedAt)).limit(500);
    return json(published);
  } catch (error) {
    return failure(error);
  }
};

export const config: Config = { path: '/api/published-articles' };
