import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const genes = pgTable(
  'genes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    version: varchar('version', { length: 16 }).notNull(),
    description: text('description').notNull().default(''),
    short_description: varchar('short_description', { length: 256 }).notNull().default(''),
    category: varchar('category', { length: 32 }).notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    icon: varchar('icon', { length: 64 }),
    source: varchar('source', { length: 16 }).notNull().default('official'),
    source_ref: text('source_ref'),
    manifest: jsonb('manifest').notNull(),
    compatibility: jsonb('compatibility').$type<string[]>().notNull().default([]),
    dependencies: jsonb('dependencies')
      .$type<{ slug: string; version: string }[]>()
      .notNull()
      .default([]),
    synergies: jsonb('synergies').$type<string[]>().notNull().default([]),
    parent_gene_id: uuid('parent_gene_id'),
    author: jsonb('author')
      .$type<{ type: string; id?: string; name: string }>()
      .notNull()
      .default({ type: 'human', name: '' }),
    install_count: integer('install_count').notNull().default(0),
    avg_rating: real('avg_rating').notNull().default(0),
    effectiveness_score: real('effectiveness_score').notNull().default(0),
    review_status: varchar('review_status', { length: 16 }).notNull().default('draft'),
    is_published: boolean('is_published').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('genes_slug_idx').on(table.slug),
    index('genes_category_idx').on(table.category),
    index('genes_source_idx').on(table.source),
    index('genes_review_status_idx').on(table.review_status),
  ],
);

export const genomes = pgTable(
  'genomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    version: varchar('version', { length: 16 }).notNull(),
    description: text('description').notNull().default(''),
    short_description: varchar('short_description', { length: 256 }).notNull().default(''),
    icon: varchar('icon', { length: 64 }),
    genes: jsonb('genes')
      .$type<{ slug: string; version: string; config_override?: Record<string, unknown> }[]>()
      .notNull()
      .default([]),
    compatibility: jsonb('compatibility').$type<string[]>().notNull().default([]),
    install_count: integer('install_count').notNull().default(0),
    avg_rating: real('avg_rating').notNull().default(0),
    author: jsonb('author')
      .$type<{ type: string; id?: string; name: string }>()
      .notNull()
      .default({ type: 'human', name: '' }),
    is_published: boolean('is_published').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('genomes_slug_idx').on(table.slug)],
);

export const geneVersions = pgTable(
  'gene_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gene_id: uuid('gene_id')
      .notNull()
      .references(() => genes.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 16 }).notNull(),
    manifest: jsonb('manifest').notNull(),
    changelog: text('changelog').notNull().default(''),
    is_latest: boolean('is_latest').notNull().default(false),
    published_at: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('gene_versions_gene_id_idx').on(table.gene_id),
    uniqueIndex('gene_versions_gene_version_idx').on(table.gene_id, table.version),
  ],
);
