import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import semver from 'semver';
import { db, schema } from '../db/index.js';
import { AppError } from '../middleware/error-handler.js';
import { resolve as resolveGene } from './dependency-resolver.js';

const { genomes, genomeVersions, genes, geneRelations } = schema;

export type GenomeListQuery = {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  page_size?: number;
};

type GenomeGeneInput = {
  slug: string;
  version: string;
  config_override?: Record<string, unknown>;
};

export type CreateGenomeInput = {
  name: string;
  slug: string;
  version: string;
  description?: string;
  short_description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  genes: GenomeGeneInput[];
  compatibility?: string[];
  author?: { type: string; id?: string; name: string };
};

export async function listGenomes(query: GenomeListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [isNull(genomes.deleted_at), eq(genomes.is_published, true)];

  if (query.category) {
    conditions.push(eq(genomes.category, query.category));
  }

  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(
      sql`(${genomes.name} ILIKE ${term} OR ${genomes.slug} ILIKE ${term} OR ${genomes.short_description} ILIKE ${term})`,
    );
  }

  const where = and(...conditions);

  let orderBy: ReturnType<typeof desc> = desc(genomes.created_at);
  switch (query.sort) {
    case 'popular':
      orderBy = desc(genomes.install_count);
      break;
    case 'rating':
      orderBy = desc(genomes.avg_rating);
      break;
    default:
  }

  const [items, countResult] = await Promise.all([
    db.select().from(genomes).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(genomes).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0), page, pageSize };
}

export async function getFeaturedGenomes(limit = 10) {
  return db
    .select()
    .from(genomes)
    .where(and(isNull(genomes.deleted_at), eq(genomes.is_published, true)))
    .orderBy(desc(genomes.install_count), desc(genomes.avg_rating))
    .limit(Math.min(limit, 50));
}

export async function getGenomeBySlug(slug: string) {
  const result = await db
    .select()
    .from(genomes)
    .where(and(eq(genomes.slug, slug), isNull(genomes.deleted_at)));

  if (result.length === 0) {
    throw AppError.genomeNotFound(slug);
  }

  return result[0];
}

async function validateGeneRefs(geneRefs: GenomeGeneInput[]) {
  if (geneRefs.length === 0) {
    throw AppError.genomeValidationFailed('基因组至少需要包含一个基因');
  }

  const slugs = geneRefs.map((g) => g.slug);
  const uniqueSlugs = [...new Set(slugs)];
  if (slugs.length !== uniqueSlugs.length) {
    throw AppError.genomeValidationFailed('基因组中存在重复的基因引用');
  }

  const existing = await db
    .select({ slug: genes.slug, is_published: genes.is_published, version: genes.version })
    .from(genes)
    .where(and(inArray(genes.slug, uniqueSlugs), isNull(genes.deleted_at)));

  const existingMap = new Map(existing.map((g) => [g.slug, g]));
  const missing: string[] = [];
  const unpublished: string[] = [];

  for (const ref of geneRefs) {
    const gene = existingMap.get(ref.slug);
    if (!gene) {
      missing.push(ref.slug);
    } else if (!gene.is_published) {
      unpublished.push(ref.slug);
    }
  }

  if (missing.length > 0) {
    throw AppError.genomeValidationFailed(`引用的基因不存在: ${missing.join(', ')}`);
  }

  if (unpublished.length > 0) {
    throw AppError.genomeValidationFailed(`引用的基因未发布: ${unpublished.join(', ')}`);
  }
}

export async function createGenome(input: CreateGenomeInput) {
  if (!input.name || !input.slug || !input.version) {
    throw AppError.genomeValidationFailed('name, slug, version 为必填字段');
  }

  if (!semver.valid(input.version)) {
    throw AppError.genomeValidationFailed(`无效的版本号: ${input.version}`);
  }

  const existing = await db
    .select({ id: genomes.id })
    .from(genomes)
    .where(eq(genomes.slug, input.slug));

  if (existing.length > 0) {
    throw AppError.genomeSlugExists(input.slug);
  }

  await validateGeneRefs(input.genes);

  const [genome] = await db
    .insert(genomes)
    .values({
      name: input.name,
      slug: input.slug,
      version: input.version,
      description: input.description ?? '',
      short_description: input.short_description ?? '',
      category: input.category ?? 'general',
      tags: input.tags ?? [],
      icon: input.icon ?? null,
      genes: input.genes,
      compatibility: input.compatibility ?? [],
      author: input.author ?? { type: 'human', name: '' },
      is_published: true,
    })
    .returning();

  await db.insert(genomeVersions).values({
    genome_id: genome.id,
    version: input.version,
    genes: input.genes,
    changelog: '初始版本',
    is_latest: true,
  });

  return genome;
}

export async function publishVersion(
  slug: string,
  input: { version: string; genes: GenomeGeneInput[]; changelog?: string },
) {
  const genome = await getGenomeBySlug(slug);

  if (!semver.valid(input.version)) {
    throw AppError.genomeValidationFailed(`无效的版本号: ${input.version}`);
  }

  if (!semver.gt(input.version, genome.version)) {
    throw AppError.genomeValidationFailed(
      `新版本 ${input.version} 必须大于当前版本 ${genome.version}`,
    );
  }

  const existingVer = await db
    .select()
    .from(genomeVersions)
    .where(and(eq(genomeVersions.genome_id, genome.id), eq(genomeVersions.version, input.version)));

  if (existingVer.length > 0) {
    throw AppError.genomeVersionConflict(slug, input.version);
  }

  await validateGeneRefs(input.genes);

  await db
    .update(genomeVersions)
    .set({ is_latest: false })
    .where(and(eq(genomeVersions.genome_id, genome.id), eq(genomeVersions.is_latest, true)));

  await db.insert(genomeVersions).values({
    genome_id: genome.id,
    version: input.version,
    genes: input.genes,
    changelog: input.changelog ?? '',
    is_latest: true,
  });

  const [updated] = await db
    .update(genomes)
    .set({
      version: input.version,
      genes: input.genes,
      updated_at: new Date(),
    })
    .where(eq(genomes.id, genome.id))
    .returning();

  return updated;
}

export async function updateGenome(slug: string, updates: Record<string, unknown>) {
  const genome = await getGenomeBySlug(slug);

  const allowedFields: Record<string, string> = {
    name: 'name',
    description: 'description',
    short_description: 'short_description',
    category: 'category',
    tags: 'tags',
    icon: 'icon',
    compatibility: 'compatibility',
    is_published: 'is_published',
  };

  const setValues: Record<string, unknown> = { updated_at: new Date() };
  for (const [key, col] of Object.entries(allowedFields)) {
    if (key in updates) {
      setValues[col] = updates[key];
    }
  }

  const [updated] = await db
    .update(genomes)
    .set(setValues)
    .where(eq(genomes.id, genome.id))
    .returning();

  return updated;
}

export async function deleteGenome(slug: string) {
  const genome = await getGenomeBySlug(slug);

  const [deleted] = await db
    .update(genomes)
    .set({ deleted_at: new Date(), is_published: false, updated_at: new Date() })
    .where(eq(genomes.id, genome.id))
    .returning();

  return deleted;
}

export async function getGenomeVersions(slug: string) {
  const genome = await getGenomeBySlug(slug);

  return db
    .select()
    .from(genomeVersions)
    .where(eq(genomeVersions.genome_id, genome.id))
    .orderBy(desc(genomeVersions.published_at));
}

export async function getGenomeVersion(slug: string, version: string) {
  const genome = await getGenomeBySlug(slug);

  const result = await db
    .select()
    .from(genomeVersions)
    .where(and(eq(genomeVersions.genome_id, genome.id), eq(genomeVersions.version, version)));

  if (result.length === 0) {
    throw AppError.genomeVersionNotFound(slug, version);
  }

  return result[0];
}

export async function incrementInstallCount(slug: string) {
  const genome = await getGenomeBySlug(slug);

  await db
    .update(genomes)
    .set({ install_count: sql`${genomes.install_count} + 1`, updated_at: new Date() })
    .where(eq(genomes.id, genome.id));
}

export type GenomeResolveResult = {
  genome: { slug: string; name: string; version: string };
  genes: {
    slug: string;
    version: string;
    manifest: unknown;
    config_override?: Record<string, unknown>;
    resolved_from: 'direct' | 'dependency';
  }[];
  compatibility: string[];
  conflicts: string[];
  warnings: string[];
};

export async function resolveGenome(
  slug: string,
  version?: string,
  product?: string,
): Promise<GenomeResolveResult> {
  const genome = await getGenomeBySlug(slug);

  let geneRefs = genome.genes as GenomeGeneInput[];
  if (version && version !== genome.version) {
    const ver = await getGenomeVersion(slug, version);
    geneRefs = ver.genes as GenomeGeneInput[];
  }

  const directSlugs = new Set(geneRefs.map((g) => g.slug));
  const configOverrides = new Map(
    geneRefs.filter((g) => g.config_override).map((g) => [g.slug, g.config_override]),
  );

  const resolvedGenes: GenomeResolveResult['genes'] = [];
  const seenSlugs = new Set<string>();
  const allWarnings: string[] = [];
  const allCompatibility: string[][] = [];

  for (const ref of geneRefs) {
    try {
      const result = await resolveGene(ref.slug, ref.version, product);
      allWarnings.push(...result.warnings);

      for (const item of result.plan) {
        if (seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);

        const isDirect = directSlugs.has(item.slug);
        resolvedGenes.push({
          slug: item.slug,
          version: item.version,
          manifest: item.manifest,
          config_override: isDirect ? configOverrides.get(item.slug) : undefined,
          resolved_from: isDirect ? 'direct' : 'dependency',
        });

        const manifest = item.manifest as Record<string, unknown>;
        const compat = manifest.compatibility as { product: string }[] | undefined;
        if (compat) {
          allCompatibility.push(compat.map((c) => c.product));
        }
      }
    } catch (err) {
      allWarnings.push(
        `解析基因 ${ref.slug} 失败: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const compatibility =
    allCompatibility.length > 0
      ? allCompatibility.reduce((acc, cur) => acc.filter((p) => cur.includes(p)))
      : [];

  const resolvedSlugs = resolvedGenes.map((g) => g.slug);
  const conflicts = await detectConflicts(resolvedSlugs);

  return {
    genome: { slug: genome.slug, name: genome.name, version: genome.version },
    genes: resolvedGenes,
    compatibility,
    conflicts: conflicts.map((c) => c.description),
    warnings: allWarnings,
  };
}

async function detectConflicts(slugs: string[]) {
  if (slugs.length < 2) return [];

  const geneRows = await db
    .select({ id: genes.id, slug: genes.slug })
    .from(genes)
    .where(inArray(genes.slug, slugs));

  const idToSlug = new Map(geneRows.map((g) => [g.id, g.slug]));
  const geneIds = geneRows.map((g) => g.id);
  if (geneIds.length < 2) return [];

  const rows = await db
    .select({
      source_gene_id: geneRelations.source_gene_id,
      target_gene_id: geneRelations.target_gene_id,
      reason: geneRelations.reason,
      strength: geneRelations.strength,
    })
    .from(geneRelations)
    .where(
      and(
        eq(geneRelations.relation_type, 'conflict'),
        inArray(geneRelations.source_gene_id, geneIds),
        inArray(geneRelations.target_gene_id, geneIds),
      ),
    );

  return rows.map((r) => {
    const src = idToSlug.get(r.source_gene_id) ?? r.source_gene_id;
    const tgt = idToSlug.get(r.target_gene_id) ?? r.target_gene_id;
    const reason = r.reason ? `: ${r.reason}` : '';
    return { source: src, target: tgt, description: `${src} ↔ ${tgt} 存在冲突${reason}` };
  });
}
