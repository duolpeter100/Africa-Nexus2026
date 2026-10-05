import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const articles = pgTable('articles', {
  id: serial().primaryKey(),
  title: text().notNull(),
  excerpt: text().notNull(),
  content: text().notNull(),
  category: text().notNull(),
  region: text().notNull(),
  author: text().notNull(),
  image: text().notNull().default(''),
  status: text().notNull().default('draft'),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by').notNull(),
  version: integer().notNull().default(1),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('articles_status_idx').on(table.status)]);

export const staffProfiles = pgTable('staff_profiles', {
  identityId: text('identity_id').primaryKey(),
  username: text().notNull().unique(),
  email: text().notNull(),
  name: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
