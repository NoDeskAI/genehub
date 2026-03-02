import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://genehub:genehub@localhost:5432/genehub';
const CURATOR_CMD = process.env.CURATOR_CMD || 'opencode';
const CURATOR_CWD = process.env.CURATOR_CWD || dirname(fileURLToPath(import.meta.url));

const sql = postgres(DATABASE_URL);

async function listen() {
  console.log('[curator-listener] Connecting to gene_events channel...');

  await sql.listen('gene_events', (payload) => {
    try {
      const event = JSON.parse(payload);
      console.log(`[curator-listener] Received: ${event.type} — ${event.slug}`);

      if (event.type === 'gene.created') {
        triggerCurator(`审核新入库的基因 ${event.slug}，来源: ${event.source}`);
      }
    } catch (err) {
      console.error('[curator-listener] Failed to parse event:', err);
    }
  });

  console.log('[curator-listener] Listening for gene_events...');
}

function triggerCurator(prompt: string) {
  console.log(`[curator-listener] Triggering curator: ${prompt}`);

  execFile(
    CURATOR_CMD,
    ['run', '--model', 'minimax/MiniMax-M2.5', prompt],
    { cwd: CURATOR_CWD, env: { ...process.env } },
    (err, stdout, stderr) => {
      if (err) {
        console.error('[curator-listener] Curator execution failed:', err.message);
        return;
      }
      if (stdout) console.log('[curator-listener] Curator output:', stdout.slice(0, 500));
      if (stderr) console.error('[curator-listener] Curator stderr:', stderr.slice(0, 500));
    },
  );
}

listen().catch((err) => {
  console.error('[curator-listener] Fatal error:', err);
  process.exit(1);
});
