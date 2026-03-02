import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://genehub:genehub@localhost:5432/genehub';
const CURATOR_CMD = process.env.CURATOR_CMD || 'opencode';
const CURATOR_CWD = process.env.CURATOR_CWD || dirname(fileURLToPath(import.meta.url));

const sql = postgres(DATABASE_URL);

const queue: string[] = [];
let processing = false;

async function listen() {
  console.log('[curator-listener] Connecting to gene_events channel...');

  await sql.listen('gene_events', (payload) => {
    try {
      const event = JSON.parse(payload);
      console.log(`[curator-listener] Received: ${event.type} — ${event.slug}`);

      if (event.type === 'gene.created') {
        enqueue(`审核新入库的基因 ${event.slug}，来源: ${event.source}`);
      }
    } catch (err) {
      console.error('[curator-listener] Failed to parse event:', err);
    }
  });

  console.log('[curator-listener] Listening for gene_events...');
}

function enqueue(prompt: string) {
  queue.push(prompt);
  console.log(`[curator-listener] Queued (${queue.length} pending): ${prompt}`);
  processNext();
}

function processNext() {
  if (processing || queue.length === 0) return;

  processing = true;
  const prompt = queue.shift()!;
  console.log(`[curator-listener] Running curator (${queue.length} remaining): ${prompt}`);

  const child = spawn(CURATOR_CMD, ['run', prompt], {
    cwd: CURATOR_CWD,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const tag = '[curator]';

  child.stdout.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) console.log(`${tag} ${line}`);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) console.error(`${tag} ${line}`);
    }
  });

  const timer = setTimeout(() => {
    console.error(`${tag} Timeout (120s), killing...`);
    child.kill('SIGTERM');
  }, 120_000);

  child.on('close', (code) => {
    clearTimeout(timer);
    processing = false;
    console.log(`${tag} Exited with code ${code}`);
    processNext();
  });
}

listen().catch((err) => {
  console.error('[curator-listener] Fatal error:', err);
  process.exit(1);
});
