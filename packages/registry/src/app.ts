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

app.get('/', (c) =>
  c.json({
    name: 'GeneHub Registry',
    version: '0.1.0',
    docs: 'https://github.com/NoDeskAI/genehub',
  }),
);

app.route('/api/v1/genes', genesRouter);
app.route('/api/v1/genomes', genomesRouter);
app.route('/api/v1/resolve', resolveRouter);
