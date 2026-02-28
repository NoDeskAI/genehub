import { Hono } from 'hono';
import { paginated, success } from '../middleware/response.js';
import { federatedSearch } from '../services/federated-search.js';
import * as geneService from '../services/gene-service.js';

export const genesRouter = new Hono();

genesRouter.get('/search', async (c) => {
  const q = c.req.query('q') ?? '';
  if (!q.trim())
    return success(c, { query: '', total: 0, items: [], sources: { local: 0, clawhub: 0 } });

  const result = await federatedSearch(q, {
    category: c.req.query('category'),
    limit: Number(c.req.query('limit')) || 20,
  });
  return success(c, result);
});

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
  const version = c.req.query('version');
  const manifest = await geneService.getGeneManifest(slug, version);
  return success(c, manifest);
});

genesRouter.get('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const versions = await geneService.getGeneVersions(slug);
  return success(c, versions);
});

genesRouter.get('/:slug/versions/:version', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.param('version');
  const ver = await geneService.getGeneVersion(slug, version);
  return success(c, ver);
});

genesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const gene = await geneService.createGene(body.manifest ?? body);
  return success(c, gene);
});

genesRouter.post('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const gene = await geneService.publishVersion(slug, body.manifest ?? body, body.changelog);
  return success(c, gene);
});

genesRouter.put('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const gene = await geneService.updateGene(slug, body);
  return success(c, gene);
});

genesRouter.delete('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const gene = await geneService.deleteGene(slug);
  return success(c, gene);
});

genesRouter.post('/:slug/installed', async (c) => {
  const slug = c.req.param('slug');
  await geneService.incrementInstallCount(slug);
  return success(c, { slug, recorded: true });
});

genesRouter.post('/:slug/effectiveness', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  await geneService.reportEffectiveness(slug, body);
  return success(c, { slug, recorded: true });
});
