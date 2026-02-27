import { eq, sql, isNull, and, desc, asc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { GeneManifestSchema } from '@genehub/types';
import { AppError } from '../middleware/error-handler.js';

const { genes, geneVersions } = schema;

export type GeneListQuery = {
  q?: string;
  category?: string;
  tags?: string;
  compatibility?: string;
  sort?: string;
  page?: number;
  page_size?: number;
};

export async function listGenes(query: GeneListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [isNull(genes.deleted_at), eq(genes.is_published, true)];

  if (query.category) {
    conditions.push(eq(genes.category, query.category));
  }

  if (query.compatibility) {
    conditions.push(sql`${genes.compatibility} @> ${JSON.stringify([query.compatibility])}`);
  }

  if (query.tags) {
    const tagList = query.tags.split(',');
    conditions.push(sql`${genes.tags} ?| array[${sql.join(tagList.map((t) => sql`${t}`), sql`, `)}]`);
  }

  if (query.q) {
    const searchTerm = `%${query.q}%`;
    conditions.push(
      sql`(${genes.name} ILIKE ${searchTerm} OR ${genes.slug} ILIKE ${searchTerm} OR ${genes.short_description} ILIKE ${searchTerm})`,
    );
  }

  const where = and(...conditions);

  let orderBy;
  switch (query.sort) {
    case 'popular':
      orderBy = desc(genes.install_count);
      break;
    case 'rating':
      orderBy = desc(genes.avg_rating);
      break;
    default:
      orderBy = desc(genes.created_at);
  }

  const [items, countResult] = await Promise.all([
    db.select().from(genes).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(genes).where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return { items, total, page, pageSize };
}

export async function getGeneBySlug(slug: string) {
  const result = await db
    .select()
    .from(genes)
    .where(and(eq(genes.slug, slug), isNull(genes.deleted_at)));

  if (result.length === 0) {
    throw AppError.geneNotFound(slug);
  }

  return result[0];
}

export async function getGeneManifest(slug: string) {
  const gene = await getGeneBySlug(slug);
  return gene.manifest;
}

export async function getGeneVersions(slug: string) {
  const gene = await getGeneBySlug(slug);

  return db
    .select()
    .from(geneVersions)
    .where(eq(geneVersions.gene_id, gene.id))
    .orderBy(desc(geneVersions.published_at));
}

export async function createGene(manifestRaw: unknown) {
  const parsed = GeneManifestSchema.safeParse(manifestRaw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw AppError.manifestInvalid(detail);
  }

  const manifest = parsed.data;

  const existing = await db.select({ id: genes.id }).from(genes).where(eq(genes.slug, manifest.slug));
  if (existing.length > 0) {
    throw AppError.slugExists(manifest.slug);
  }

  const compatibility = manifest.compatibility.map((c) => c.product);

  const [gene] = await db
    .insert(genes)
    .values({
      name: manifest.name,
      slug: manifest.slug,
      version: manifest.version,
      description: manifest.description,
      short_description: manifest.short_description,
      category: manifest.category,
      tags: manifest.tags,
      icon: manifest.icon ?? null,
      manifest,
      compatibility,
      dependencies: manifest.dependencies,
      synergies: manifest.synergies,
      author: manifest.author ?? { type: 'human', name: '' },
      review_status: 'approved',
      is_published: true,
    })
    .returning();

  await db.insert(geneVersions).values({
    gene_id: gene.id,
    version: manifest.version,
    manifest,
    changelog: '初始版本',
    is_latest: true,
  });

  return gene;
}
