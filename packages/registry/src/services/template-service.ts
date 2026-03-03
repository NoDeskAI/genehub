import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import semver from 'semver';
import { db, schema } from '../db/index.js';
import { AppError } from '../middleware/error-handler.js';

const { agentTemplates, agentTemplateVersions, genomes, genes } = schema;

export type TemplateListQuery = {
  q?: string;
  category?: string;
  role?: string;
  sort?: string;
  page?: number;
  page_size?: number;
};

type TemplateRef = {
  slug: string;
  version: string;
};

export type CreateTemplateInput = {
  name: string;
  slug: string;
  version: string;
  description?: string;
  short_description?: string;
  role?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  avatar_url?: string;
  genomes: TemplateRef[];
  genes?: TemplateRef[];
  compatibility?: string[];
  author?: { type: string; id?: string; name: string };
};

export async function listTemplates(query: TemplateListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 20));
  const offset = (page - 1) * pageSize;

  const conditions = [isNull(agentTemplates.deleted_at), eq(agentTemplates.is_published, true)];

  if (query.category) {
    conditions.push(eq(agentTemplates.category, query.category));
  }

  if (query.role) {
    conditions.push(eq(agentTemplates.role, query.role));
  }

  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(
      sql`(${agentTemplates.name} ILIKE ${term} OR ${agentTemplates.slug} ILIKE ${term} OR ${agentTemplates.short_description} ILIKE ${term} OR ${agentTemplates.role} ILIKE ${term})`,
    );
  }

  const where = and(...conditions);

  let orderBy: ReturnType<typeof desc> = desc(agentTemplates.created_at);
  switch (query.sort) {
    case 'popular':
      orderBy = desc(agentTemplates.install_count);
      break;
    case 'rating':
      orderBy = desc(agentTemplates.avg_rating);
      break;
    default:
  }

  const [items, countResult] = await Promise.all([
    db.select().from(agentTemplates).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(agentTemplates).where(where),
  ]);

  return { items, total: Number(countResult[0]?.count ?? 0), page, pageSize };
}

export async function getFeaturedTemplates(limit = 10) {
  return db
    .select()
    .from(agentTemplates)
    .where(and(isNull(agentTemplates.deleted_at), eq(agentTemplates.is_published, true)))
    .orderBy(desc(agentTemplates.install_count), desc(agentTemplates.avg_rating))
    .limit(Math.min(limit, 50));
}

export async function getTemplateBySlug(slug: string) {
  const result = await db
    .select()
    .from(agentTemplates)
    .where(and(eq(agentTemplates.slug, slug), isNull(agentTemplates.deleted_at)));

  if (result.length === 0) {
    throw AppError.templateNotFound(slug);
  }

  return result[0];
}

async function validateGenomeRefs(refs: TemplateRef[]) {
  if (refs.length === 0) return;

  const slugs = [...new Set(refs.map((r) => r.slug))];
  const existing = await db
    .select({ slug: genomes.slug, is_published: genomes.is_published })
    .from(genomes)
    .where(and(inArray(genomes.slug, slugs), isNull(genomes.deleted_at)));

  const existingMap = new Map(existing.map((g) => [g.slug, g]));
  const missing: string[] = [];

  for (const ref of refs) {
    const genome = existingMap.get(ref.slug);
    if (!genome) missing.push(ref.slug);
    else if (!genome.is_published) missing.push(`${ref.slug} (unpublished)`);
  }

  if (missing.length > 0) {
    throw AppError.templateValidationFailed(`引用的基因组不存在或未发布: ${missing.join(', ')}`);
  }
}

async function validateGeneRefs(refs: TemplateRef[]) {
  if (refs.length === 0) return;

  const slugs = [...new Set(refs.map((r) => r.slug))];
  const existing = await db
    .select({ slug: genes.slug, is_published: genes.is_published })
    .from(genes)
    .where(and(inArray(genes.slug, slugs), isNull(genes.deleted_at)));

  const existingMap = new Map(existing.map((g) => [g.slug, g]));
  const missing: string[] = [];

  for (const ref of refs) {
    const gene = existingMap.get(ref.slug);
    if (!gene) missing.push(ref.slug);
    else if (!gene.is_published) missing.push(`${ref.slug} (unpublished)`);
  }

  if (missing.length > 0) {
    throw AppError.templateValidationFailed(`引用的基因不存在或未发布: ${missing.join(', ')}`);
  }
}

export async function createTemplate(input: CreateTemplateInput) {
  if (!input.name || !input.slug || !input.version) {
    throw AppError.templateValidationFailed('name, slug, version 为必填字段');
  }

  if (!semver.valid(input.version)) {
    throw AppError.templateValidationFailed(`无效的版本号: ${input.version}`);
  }

  const existing = await db
    .select({ id: agentTemplates.id })
    .from(agentTemplates)
    .where(eq(agentTemplates.slug, input.slug));

  if (existing.length > 0) {
    throw AppError.templateSlugExists(input.slug);
  }

  await validateGenomeRefs(input.genomes);
  if (input.genes?.length) {
    await validateGeneRefs(input.genes);
  }

  const [template] = await db
    .insert(agentTemplates)
    .values({
      name: input.name,
      slug: input.slug,
      version: input.version,
      description: input.description ?? '',
      short_description: input.short_description ?? '',
      role: input.role ?? null,
      category: input.category ?? 'general',
      tags: input.tags ?? [],
      icon: input.icon ?? null,
      avatar_url: input.avatar_url ?? null,
      genomes: input.genomes,
      genes: input.genes ?? [],
      compatibility: input.compatibility ?? [],
      author: input.author ?? { type: 'human', name: '' },
      is_published: true,
    })
    .returning();

  await db.insert(agentTemplateVersions).values({
    template_id: template.id,
    version: input.version,
    genomes: input.genomes,
    genes: input.genes ?? [],
    changelog: '初始版本',
    is_latest: true,
  });

  return template;
}

export async function publishVersion(
  slug: string,
  input: {
    version: string;
    genomes: TemplateRef[];
    genes?: TemplateRef[];
    changelog?: string;
  },
) {
  const template = await getTemplateBySlug(slug);

  if (!semver.valid(input.version)) {
    throw AppError.templateValidationFailed(`无效的版本号: ${input.version}`);
  }

  if (!semver.gt(input.version, template.version)) {
    throw AppError.templateValidationFailed(
      `新版本 ${input.version} 必须大于当前版本 ${template.version}`,
    );
  }

  const existingVer = await db
    .select()
    .from(agentTemplateVersions)
    .where(
      and(
        eq(agentTemplateVersions.template_id, template.id),
        eq(agentTemplateVersions.version, input.version),
      ),
    );

  if (existingVer.length > 0) {
    throw AppError.templateVersionConflict(slug, input.version);
  }

  await validateGenomeRefs(input.genomes);
  if (input.genes?.length) {
    await validateGeneRefs(input.genes);
  }

  await db
    .update(agentTemplateVersions)
    .set({ is_latest: false })
    .where(
      and(
        eq(agentTemplateVersions.template_id, template.id),
        eq(agentTemplateVersions.is_latest, true),
      ),
    );

  await db.insert(agentTemplateVersions).values({
    template_id: template.id,
    version: input.version,
    genomes: input.genomes,
    genes: input.genes ?? [],
    changelog: input.changelog ?? '',
    is_latest: true,
  });

  const [updated] = await db
    .update(agentTemplates)
    .set({
      version: input.version,
      genomes: input.genomes,
      genes: input.genes ?? [],
      updated_at: new Date(),
    })
    .where(eq(agentTemplates.id, template.id))
    .returning();

  return updated;
}

export async function updateTemplate(slug: string, updates: Record<string, unknown>) {
  const template = await getTemplateBySlug(slug);

  const allowedFields: Record<string, string> = {
    name: 'name',
    description: 'description',
    short_description: 'short_description',
    role: 'role',
    category: 'category',
    tags: 'tags',
    icon: 'icon',
    avatar_url: 'avatar_url',
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
    .update(agentTemplates)
    .set(setValues)
    .where(eq(agentTemplates.id, template.id))
    .returning();

  return updated;
}

export async function deleteTemplate(slug: string) {
  const template = await getTemplateBySlug(slug);

  const [deleted] = await db
    .update(agentTemplates)
    .set({ deleted_at: new Date(), is_published: false, updated_at: new Date() })
    .where(eq(agentTemplates.id, template.id))
    .returning();

  return deleted;
}

export async function getTemplateVersions(slug: string) {
  const template = await getTemplateBySlug(slug);

  return db
    .select()
    .from(agentTemplateVersions)
    .where(eq(agentTemplateVersions.template_id, template.id))
    .orderBy(desc(agentTemplateVersions.published_at));
}

export async function getTemplateVersion(slug: string, version: string) {
  const template = await getTemplateBySlug(slug);

  const result = await db
    .select()
    .from(agentTemplateVersions)
    .where(
      and(
        eq(agentTemplateVersions.template_id, template.id),
        eq(agentTemplateVersions.version, version),
      ),
    );

  if (result.length === 0) {
    throw AppError.templateVersionNotFound(slug, version);
  }

  return result[0];
}

export async function incrementInstallCount(slug: string) {
  const template = await getTemplateBySlug(slug);

  await db
    .update(agentTemplates)
    .set({
      install_count: sql`${agentTemplates.install_count} + 1`,
      updated_at: new Date(),
    })
    .where(eq(agentTemplates.id, template.id));
}
