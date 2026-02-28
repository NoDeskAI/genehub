import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export type GeneEventType = 'gene.created' | 'gene.updated' | 'gene.flagged' | 'gene.reviewed';

export type GeneEvent = {
  type: GeneEventType;
  slug: string;
  source: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export async function emitGeneEvent(
  type: GeneEventType,
  slug: string,
  source: string,
  meta?: Record<string, unknown>,
) {
  const payload: GeneEvent = {
    type,
    slug,
    source,
    timestamp: new Date().toISOString(),
    meta,
  };

  try {
    await db.execute(sql`NOTIFY gene_events, ${JSON.stringify(payload)}`);
  } catch {
    // NOTIFY failure should not break the main operation
    console.error(`[gene-events] Failed to emit ${type} for ${slug}`);
  }
}
