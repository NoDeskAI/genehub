import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { paginated, success } from '../middleware/response.js';
import * as templateService from '../services/template-service.js';

export const templatesRouter = new Hono();

templatesRouter.get('/', async (c) => {
  const query: templateService.TemplateListQuery = {
    q: c.req.query('q'),
    category: c.req.query('category'),
    role: c.req.query('role'),
    sort: c.req.query('sort'),
    page: Number(c.req.query('page')) || 1,
    page_size: Number(c.req.query('page_size')) || 20,
  };

  const result = await templateService.listTemplates(query);
  return paginated(c, result.items, result.total, result.page, result.pageSize);
});

templatesRouter.get('/featured', async (c) => {
  const limit = Number(c.req.query('limit')) || 10;
  const templates = await templateService.getFeaturedTemplates(limit);
  return success(c, templates);
});

templatesRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const template = await templateService.getTemplateBySlug(slug);
  return success(c, template);
});

templatesRouter.get('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const versions = await templateService.getTemplateVersions(slug);
  return success(c, versions);
});

templatesRouter.get('/:slug/versions/:version', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.param('version');
  const ver = await templateService.getTemplateVersion(slug, version);
  return success(c, ver);
});

templatesRouter.get('/:slug/files', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.query('version');
  const files = await templateService.getTemplateFiles(slug, version);
  return success(c, files);
});

templatesRouter.get('/:slug/files/*', async (c) => {
  const slug = c.req.param('slug');
  const filePath = c.req.path.replace(`/api/v1/templates/${slug}/files/`, '');
  const version = c.req.query('version');
  const content = await templateService.getTemplateFileContent(slug, filePath, version);
  return success(c, { path: filePath, content });
});

templatesRouter.get('/:slug/archive', async (c) => {
  const slug = c.req.param('slug');
  const version = c.req.query('version');
  const stream = await templateService.getTemplateArchiveStream(slug, version);
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${slug}.tar.gz"`,
    },
  });
});

templatesRouter.post('/', requireAuth('publisher'), async (c) => {
  const body = await c.req.json();
  const template = await templateService.createTemplate(body);
  return success(c, template);
});

templatesRouter.post('/:slug/versions', requireAuth('publisher'), async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const template = await templateService.publishVersion(slug, body);
  return success(c, template);
});

templatesRouter.put('/:slug', requireAuth('publisher'), async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const template = await templateService.updateTemplate(slug, body);
  return success(c, template);
});

templatesRouter.delete('/:slug', requireAuth('admin'), async (c) => {
  const slug = c.req.param('slug');
  const template = await templateService.deleteTemplate(slug);
  return success(c, template);
});

templatesRouter.post('/:slug/installed', async (c) => {
  const slug = c.req.param('slug');
  await templateService.incrementInstallCount(slug);
  return success(c, { slug, recorded: true });
});
