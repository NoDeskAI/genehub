import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { genesRouter } from './api/genes.js';
import { genomesRouter } from './api/genomes.js';
import { resolveRouter } from './api/resolve.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.onError(errorHandler);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/api/info', (c) =>
  c.json({
    name: 'GeneHub Registry',
    version: '0.1.0',
    docs: 'https://github.com/NoDeskAI/genehub',
  }),
);

app.route('/api/v1/genes', genesRouter);
app.route('/api/v1/genomes', genomesRouter);
app.route('/api/v1/resolve', resolveRouter);

const PUBLIC_DIR = process.env.PUBLIC_DIR || './public';

if (existsSync(join(process.cwd(), PUBLIC_DIR))) {
  app.use('*', serveStatic({ root: PUBLIC_DIR }));

  app.get('*', async (c) => {
    const html = await readFile(join(process.cwd(), PUBLIC_DIR, 'index.html'), 'utf-8');
    return c.html(html);
  });
}
