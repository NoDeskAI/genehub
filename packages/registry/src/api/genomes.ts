import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { paginated, success } from '../middleware/response.js';
import * as genomeService from '../services/genome-service.js';

export const genomesRouter = new Hono();

genomesRouter.get('/', async (c) => {
  const query: genomeService.GenomeListQuery = {
    q: c.req.query('q'),
    category: c.req.query('category'),
    sort: c.req.query('sort'),
    page: Number(c.req.query('page')) || 1,
    page_size: Number(c.req.query('page_size')) || 20,
  };

  const result = await genomeService.listGenomes(query);
  return paginated(c, result.items, result.total, result.page, result.pageSize);
});

genomesRouter.get('/featured', async (c) => {
  const limit = Number(c.req.query('limit')) || 10;
  const genomes = await genomeService.getFeaturedGenomes(limit);
  return success(c, genomes);
});

genomesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const genome = await genomeService.getGenomeBySlug(slug);
  return success(c, genome);
});

genomesRouter.get('/:slug/resolve', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.query('version');
  const product = c.req.query('product');
  const result = await genomeService.resolveGenome(slug, version, product);
  return success(c, result);
});

genomesRouter.get('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const versions = await genomeService.getGenomeVersions(slug);
  return success(c, versions);
});

genomesRouter.get('/:slug/versions/:version', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.param('version');
  const ver = await genomeService.getGenomeVersion(slug, version);
  return success(c, ver);
});

genomesRouter.post('/', requireAuth('publisher'), async (c) => {
  const body = await c.req.json();
  const genome = await genomeService.createGenome(body);
  return success(c, genome);
});

genomesRouter.post('/:slug/versions', requireAuth('publisher'), async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const genome = await genomeService.publishVersion(slug, body);
  return success(c, genome);
});

genomesRouter.put('/:slug', requireAuth('publisher'), async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const genome = await genomeService.updateGenome(slug, body);
  return success(c, genome);
});

genomesRouter.delete('/:slug', requireAuth('admin'), async (c) => {
  const slug = c.req.param('slug');
  const genome = await genomeService.deleteGenome(slug);
  return success(c, genome);
});

genomesRouter.post('/:slug/installed', async (c) => {
  const slug = c.req.param('slug');
  await genomeService.incrementInstallCount(slug);
  return success(c, { slug, recorded: true });
});
