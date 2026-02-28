import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ClawHubClient, type ClawHubSearchResult } from '../adapters/clawhub/client.js';
import { db, schema } from '../db/index.js';

const { genes } = schema;

export type FederatedSource = 'local' | 'clawhub';

export type FederatedGeneItem = {
  slug: string;
  name: string;
  description: string | null;
  version: string | null;
  category: string | null;
  tags: string[];
  source: FederatedSource;
  score: number;
  install_count: number | null;
  avg_rating: number | null;
  /** ClawHub display name (when source is clawhub) */
  clawhub_display_name?: string;
};

export type FederatedSearchResult = {
  query: string;
  total: number;
  items: FederatedGeneItem[];
  sources: { local: number; clawhub: number };
};

const clawhubClient = new ClawHubClient({
  baseUrl: process.env.CLAWHUB_BASE_URL,
  token: process.env.CLAWHUB_TOKEN,
  timeoutMs: 8_000,
});

async function searchLocal(
  query: string,
  opts: { category?: string; limit: number },
): Promise<FederatedGeneItem[]> {
  const term = `%${query}%`;

  const conditions = [
    isNull(genes.deleted_at),
    eq(genes.is_published, true),
    sql`(${genes.name} ILIKE ${term} OR ${genes.slug} ILIKE ${term} OR ${genes.short_description} ILIKE ${term})`,
  ];

  if (opts.category) {
    conditions.push(eq(genes.category, opts.category));
  }

  const rows = await db
    .select({
      slug: genes.slug,
      name: genes.name,
      short_description: genes.short_description,
      version: genes.version,
      category: genes.category,
      tags: genes.tags,
      install_count: genes.install_count,
      avg_rating: genes.avg_rating,
    })
    .from(genes)
    .where(and(...conditions))
    .orderBy(desc(genes.install_count))
    .limit(opts.limit);

  return rows.map((row, idx) => ({
    slug: row.slug,
    name: row.name,
    description: row.short_description,
    version: row.version,
    category: row.category,
    tags: (row.tags ?? []) as string[],
    source: 'local' as const,
    score: 1 - idx * 0.02,
    install_count: row.install_count,
    avg_rating: row.avg_rating,
  }));
}

function normalizeClawHubScores(items: ClawHubSearchResult[]): FederatedGeneItem[] {
  if (items.length === 0) return [];
  const maxScore = Math.max(...items.map((i) => i.score), 1);

  return items.map((item) => ({
    slug: item.slug,
    name: item.displayName ?? item.slug,
    description: item.summary,
    version: item.version,
    category: null,
    tags: [],
    source: 'clawhub' as const,
    score: (item.score / maxScore) * 0.85,
    install_count: null,
    avg_rating: null,
    clawhub_display_name: item.displayName,
  }));
}

async function searchClawHub(query: string): Promise<FederatedGeneItem[]> {
  try {
    const response = await clawhubClient.searchSkills(query);
    return normalizeClawHubScores(response.results);
  } catch {
    return [];
  }
}

function deduplicateAndMerge(
  local: FederatedGeneItem[],
  external: FederatedGeneItem[],
): FederatedGeneItem[] {
  const localSlugs = new Set(local.map((g) => g.slug));
  const unique = external.filter((g) => !localSlugs.has(g.slug));
  const merged = [...local, ...unique];
  merged.sort((a, b) => b.score - a.score);
  return merged;
}

export async function federatedSearch(
  query: string,
  opts: { category?: string; limit?: number } = {},
): Promise<FederatedSearchResult> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));

  const [localResults, clawhubResults] = await Promise.all([
    searchLocal(query, { category: opts.category, limit }),
    searchClawHub(query),
  ]);

  const merged = deduplicateAndMerge(localResults, clawhubResults).slice(0, limit);

  const localCount = merged.filter((g) => g.source === 'local').length;
  const clawhubCount = merged.filter((g) => g.source === 'clawhub').length;

  return {
    query,
    total: merged.length,
    items: merged,
    sources: { local: localCount, clawhub: clawhubCount },
  };
}
