import { GeneManifestSchema } from '@nodeskai/genehub-types';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import semver from 'semver';
import { db, schema } from '../db/index.js';
import { AppError } from '../middleware/error-handler.js';
import { emitGeneEvent } from './gene-events.js';

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
    conditions.push(
      sql`${genes.tags} ?| array[${sql.join(
        tagList.map((t) => sql`${t}`),
        sql`, `,
      )}]`,
    );
  }

  if (query.q) {
    const searchTerm = `%${query.q}%`;
    conditions.push(
      sql`(${genes.name} ILIKE ${searchTerm} OR ${genes.slug} ILIKE ${searchTerm} OR ${genes.short_description} ILIKE ${searchTerm})`,
    );
  }

  const where = and(...conditions);

  let orderBy: ReturnType<typeof desc> = desc(genes.created_at);
  switch (query.sort) {
    case 'popular':
      orderBy = desc(genes.install_count);
      break;
    case 'rating':
      orderBy = desc(genes.avg_rating);
      break;
    default:
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

export async function getGeneManifest(slug: string, version?: string) {
  const gene = await getGeneBySlug(slug);

  if (!version) {
    return gene.manifest;
  }

  const ver = await db
    .select()
    .from(geneVersions)
    .where(and(eq(geneVersions.gene_id, gene.id), eq(geneVersions.version, version)));

  if (ver.length === 0) {
    throw AppError.versionNotFound(slug, version);
  }

  return ver[0].manifest;
}

export async function getGeneVersions(slug: string) {
  const gene = await getGeneBySlug(slug);

  return db
    .select()
    .from(geneVersions)
    .where(eq(geneVersions.gene_id, gene.id))
    .orderBy(desc(geneVersions.published_at));
}

export async function getGeneVersion(slug: string, version: string) {
  const gene = await getGeneBySlug(slug);

  const result = await db
    .select()
    .from(geneVersions)
    .where(and(eq(geneVersions.gene_id, gene.id), eq(geneVersions.version, version)));

  if (result.length === 0) {
    throw AppError.versionNotFound(slug, version);
  }

  return result[0];
}

export type PublisherContext = {
  publisherId?: string;
  githubLogin?: string;
  isAdmin?: boolean;
};

export async function createGene(manifestRaw: unknown, publisherCtx?: PublisherContext) {
  const parsed = GeneManifestSchema.safeParse(manifestRaw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw AppError.manifestInvalid(detail);
  }

  const manifest = parsed.data;

  if (!semver.valid(manifest.version)) {
    throw AppError.manifestInvalid(`无效的版本号: ${manifest.version}`);
  }

  const existing = await db
    .select({ id: genes.id })
    .from(genes)
    .where(eq(genes.slug, manifest.slug));
  if (existing.length > 0) {
    throw AppError.slugExists(manifest.slug);
  }

  const compatibility = manifest.compatibility.map((c) => c.product);

  const isGithubPublisher = publisherCtx?.publisherId && publisherCtx.githubLogin;
  const source = isGithubPublisher ? 'github' : 'official';
  const sourceRef = isGithubPublisher ? publisherCtx.githubLogin : null;
  const author = isGithubPublisher
    ? { type: 'human' as const, name: publisherCtx.githubLogin ?? '' }
    : (manifest.author ?? { type: 'human' as const, name: '' });

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
      source,
      source_ref: sourceRef,
      publisher_id: publisherCtx?.publisherId ?? null,
      manifest,
      compatibility,
      dependencies: manifest.dependencies,
      synergies: manifest.synergies,
      author,
      review_status: 'pending',
      is_published: false,
    })
    .returning();

  await db.insert(geneVersions).values({
    gene_id: gene.id,
    version: manifest.version,
    manifest,
    changelog: '初始版本',
    is_latest: true,
  });

  await emitGeneEvent('gene.created', manifest.slug, gene.source);

  return gene;
}

export async function publishVersion(slug: string, manifestRaw: unknown, changelog?: string) {
  const parsed = GeneManifestSchema.safeParse(manifestRaw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw AppError.manifestInvalid(detail);
  }

  const manifest = parsed.data;

  if (!semver.valid(manifest.version)) {
    throw AppError.manifestInvalid(`无效的版本号: ${manifest.version}`);
  }

  const gene = await getGeneBySlug(slug);

  if (manifest.slug !== slug) {
    throw AppError.manifestInvalid(`manifest.slug (${manifest.slug}) 与 URL slug (${slug}) 不匹配`);
  }

  const existingVersion = await db
    .select()
    .from(geneVersions)
    .where(and(eq(geneVersions.gene_id, gene.id), eq(geneVersions.version, manifest.version)));

  if (existingVersion.length > 0) {
    throw AppError.versionConflict(slug, manifest.version);
  }

  if (!semver.gt(manifest.version, gene.version)) {
    throw AppError.manifestInvalid(`新版本 ${manifest.version} 必须大于当前版本 ${gene.version}`);
  }

  await db
    .update(geneVersions)
    .set({ is_latest: false })
    .where(and(eq(geneVersions.gene_id, gene.id), eq(geneVersions.is_latest, true)));

  await db.insert(geneVersions).values({
    gene_id: gene.id,
    version: manifest.version,
    manifest,
    changelog: changelog ?? '',
    is_latest: true,
  });

  const compatibility = manifest.compatibility.map((c) => c.product);

  const [updated] = await db
    .update(genes)
    .set({
      version: manifest.version,
      name: manifest.name,
      description: manifest.description,
      short_description: manifest.short_description,
      category: manifest.category,
      tags: manifest.tags,
      icon: manifest.icon ?? null,
      manifest,
      compatibility,
      dependencies: manifest.dependencies,
      synergies: manifest.synergies,
      updated_at: new Date(),
    })
    .where(eq(genes.id, gene.id))
    .returning();

  await emitGeneEvent('gene.updated', slug, updated.source, {
    version: manifest.version,
  });

  return updated;
}

export async function updateGene(slug: string, updates: Record<string, unknown>) {
  const gene = await getGeneBySlug(slug);

  const allowedFields: Record<string, string> = {
    review_status: 'review_status',
    is_published: 'is_published',
    source: 'source',
    source_ref: 'source_ref',
  };

  const setValues: Record<string, unknown> = { updated_at: new Date() };
  for (const [key, col] of Object.entries(allowedFields)) {
    if (key in updates) {
      setValues[col] = updates[key];
    }
  }

  const [updated] = await db.update(genes).set(setValues).where(eq(genes.id, gene.id)).returning();

  await emitGeneEvent('gene.updated', slug, updated.source, {
    changed_fields: Object.keys(setValues).filter((k) => k !== 'updated_at'),
  });

  return updated;
}

export async function deleteGene(slug: string) {
  const gene = await getGeneBySlug(slug);

  const [deleted] = await db
    .update(genes)
    .set({ deleted_at: new Date(), is_published: false, updated_at: new Date() })
    .where(eq(genes.id, gene.id))
    .returning();

  return deleted;
}

export async function incrementInstallCount(slug: string) {
  const gene = await getGeneBySlug(slug);

  await db
    .update(genes)
    .set({ install_count: sql`${genes.install_count} + 1`, updated_at: new Date() })
    .where(eq(genes.id, gene.id));
}

export async function reportEffectiveness(
  slug: string,
  report: { metric_type: string; value: number },
) {
  const gene = await getGeneBySlug(slug);

  const currentRating = gene.avg_rating ?? 0;
  const currentCount = gene.install_count || 1;
  const newRating = (currentRating * (currentCount - 1) + report.value) / currentCount;

  await db
    .update(genes)
    .set({
      avg_rating: Math.round(newRating * 100) / 100,
      effectiveness_score: Math.round(newRating * 100) / 100,
      updated_at: new Date(),
    })
    .where(eq(genes.id, gene.id));
}
