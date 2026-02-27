import { Hono } from 'hono';
import * as geneService from '../services/gene-service.js';
import { success, paginated } from '../middleware/response.js';

export const genesRouter = new Hono();

genesRouter.get('/', async (c) => {
  const query: geneService.GeneListQuery = {
    q: c.req.query('q'),
    category: c.req.query('category'),
    tags: c.req.query('tags'),
    compatibility: c.req.query('compatibility'),
    sort: c.req.query('sort'),
    page: Number(c.req.query('page')) || 1,
    page_size: Number(c.req.query('page_size')) || 20,
  };

  const result = await geneService.listGenes(query);
  return paginated(c, result.items, result.total, result.page, result.pageSize);
});

genesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const gene = await geneService.getGeneBySlug(slug);
  return success(c, gene);
});

genesRouter.get('/:slug/manifest', async (c) => {
  const slug = c.req.param('slug');
  const manifest = await geneService.getGeneManifest(slug);
  return success(c, manifest);
});

genesRouter.get('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const versions = await geneService.getGeneVersions(slug);
  return success(c, versions);
});

genesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const gene = await geneService.createGene(body.manifest ?? body);
  return success(c, gene);
});
