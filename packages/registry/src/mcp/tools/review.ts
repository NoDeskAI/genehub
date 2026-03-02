import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { emitGeneEvent } from '../../services/gene-events.js';

const { genes, geneReviews } = schema;

async function findGene(slug: string) {
  const result = await db
    .select()
    .from(genes)
    .where(and(eq(genes.slug, slug), isNull(genes.deleted_at)));
  return result[0] ?? null;
}

export async function postReview(args: {
  slug: string;
  score: number;
  verdict: string;
  comments: string[];
  model?: string;
}) {
  const gene = await findGene(args.slug);
  if (!gene) return { error: `基因 ${args.slug} 不存在` };

  const [review] = await db
    .insert(geneReviews)
    .values({
      gene_id: gene.id,
      reviewer: 'curator-agent',
      score: args.score,
      verdict: args.verdict,
      comments: args.comments,
      model: args.model,
    })
    .returning();

  const isApproved = args.verdict === 'approve' || args.verdict === 'approved';

  await db
    .update(genes)
    .set({
      ai_score: args.score,
      ai_verdict: args.verdict,
      ai_enriched: true,
      ...(isApproved && { review_status: 'approved', is_published: true }),
      updated_at: new Date(),
    })
    .where(eq(genes.id, gene.id));

  await emitGeneEvent('gene.reviewed', args.slug, 'curator-agent', {
    score: args.score,
    verdict: args.verdict,
  });

  return { review_id: review.id, slug: args.slug, score: args.score, verdict: args.verdict };
}

export async function flagForDeletion(args: { slug: string; reason: string; model?: string }) {
  const gene = await findGene(args.slug);
  if (!gene) return { error: `基因 ${args.slug} 不存在` };

  await db
    .update(genes)
    .set({
      review_status: 'flagged',
      ai_verdict: 'flagged',
      updated_at: new Date(),
    })
    .where(eq(genes.id, gene.id));

  const [review] = await db
    .insert(geneReviews)
    .values({
      gene_id: gene.id,
      reviewer: 'curator-agent',
      score: 0,
      verdict: 'flagged',
      comments: [`[FLAG] ${args.reason}`],
      model: args.model,
    })
    .returning();

  await emitGeneEvent('gene.flagged', args.slug, 'curator-agent', {
    reason: args.reason,
  });

  return { flagged: args.slug, review_id: review.id, reason: args.reason };
}

export async function approveGene(args: { slug: string; model?: string }) {
  const gene = await findGene(args.slug);
  if (!gene) return { error: `基因 ${args.slug} 不存在` };

  await db
    .update(genes)
    .set({
      review_status: 'approved',
      is_published: true,
      ai_verdict: 'approved',
      ai_enriched: true,
      updated_at: new Date(),
    })
    .where(eq(genes.id, gene.id));

  const [review] = await db
    .insert(geneReviews)
    .values({
      gene_id: gene.id,
      reviewer: 'curator-agent',
      verdict: 'approved',
      comments: ['审核通过'],
      model: args.model,
    })
    .returning();

  return { approved: args.slug, review_id: review.id };
}
