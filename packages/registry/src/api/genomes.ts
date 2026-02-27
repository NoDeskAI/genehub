import { Hono } from 'hono';
import { eq, isNull, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { success } from '../middleware/response.js';
import { AppError } from '../middleware/error-handler.js';
import { ERROR_CODES } from '@genehub/types';

const { genomes } = schema;

export const genomesRouter = new Hono();

genomesRouter.get('/', async (c) => {
  const items = await db
    .select()
    .from(genomes)
    .where(and(isNull(genomes.deleted_at), eq(genomes.is_published, true)));
  return success(c, items);
});

genomesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const result = await db
    .select()
    .from(genomes)
    .where(and(eq(genomes.slug, slug), isNull(genomes.deleted_at)));

  if (result.length === 0) {
    throw new AppError(ERROR_CODES.GENOME_NOT_FOUND, 'genome_not_found', `基因组 ${slug} 不存在`, 404);
  }

  return success(c, result[0]);
});
