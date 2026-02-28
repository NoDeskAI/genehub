import { and, desc, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { paginated, success } from '../middleware/response.js';

const { genes, geneReviews } = schema;

export const reviewsRouter = new Hono();

reviewsRouter.get('/:slug/reviews', async (c) => {
  const slug = c.req.param('slug');

  const geneResult = await db
    .select({ id: genes.id })
    .from(genes)
    .where(and(eq(genes.slug, slug), isNull(genes.deleted_at)));

  if (geneResult.length === 0) throw AppError.geneNotFound(slug);

  const page = Number(c.req.query('page')) || 1;
  const pageSize = Math.min(50, Number(c.req.query('page_size')) || 20);
  const offset = (page - 1) * pageSize;

  const items = await db
    .select()
    .from(geneReviews)
    .where(eq(geneReviews.gene_id, geneResult[0].id))
    .orderBy(desc(geneReviews.created_at))
    .limit(pageSize)
    .offset(offset);

  return paginated(c, items, items.length, page, pageSize);
});

reviewsRouter.post('/:slug/reviews/:reviewId/feedback', requireAuth('admin'), async (c) => {
  const slug = c.req.param('slug');
  const reviewId = c.req.param('reviewId');
  const body = await c.req.json();

  const geneResult = await db
    .select({ id: genes.id })
    .from(genes)
    .where(and(eq(genes.slug, slug), isNull(genes.deleted_at)));

  if (geneResult.length === 0) throw AppError.geneNotFound(slug);

  const reviewResult = await db.select().from(geneReviews).where(eq(geneReviews.id, reviewId));

  if (reviewResult.length === 0) {
    throw new AppError(404, 'review_not_found', `Review ${reviewId} 不存在`, 404);
  }

  const [updated] = await db
    .update(geneReviews)
    .set({ feedback: body.feedback })
    .where(eq(geneReviews.id, reviewId))
    .returning();

  return success(c, updated);
});
