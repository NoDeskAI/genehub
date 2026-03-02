import { spawn, type ChildProcess, type Writable } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://genehub:genehub@localhost:5432/genehub';
const CURATOR_CMD = process.env.CURATOR_CMD || 'opencode';
const CURATOR_CWD = process.env.CURATOR_CWD || dirname(fileURLToPath(import.meta.url));
const HARD_TIMEOUT_MS = 90_000;
const IDLE_TIMEOUT_MS = 45_000;
const MAX_STDIN_NUDGES = 2;
const MAX_SESSION_RETRIES = 1;

const TAG = '[curator]';
const sql = postgres(DATABASE_URL);

const queue: string[] = [];
let processing = false;

type OpenCodeEvent = {
  type: string;
  sessionID?: string;
  part?: {
    type?: string;
    text?: string;
    tool?: string;
    reason?: string;
    state?: { status?: string };
  };
};

const REVIEW_ACTIONS = ['post_review', 'approve_gene', 'flag_for_deletion'];

const NUDGE_MSG = '不要再问我，你自己决定，你有这个权利。立刻调用 post_review 发布评分，然后调用 approve_gene 或 flag_for_deletion。';

const SESSION_RETRY_MSG =
  '不要问我任何问题。立刻执行：1) 调用 post_review 发布评分和简短评语 2) 根据评分调用 approve_gene(>=5分) 或 flag_for_deletion(<5分)';

async function listen() {
  console.log('[listener] Connecting to gene_events channel...');

  await sql.listen('gene_events', (payload) => {
    try {
      const event = JSON.parse(payload);
      console.log(`[listener] Received: ${event.type} — ${event.slug}`);

      if (event.type === 'gene.created' || event.type === 'gene.updated') {
        enqueue(`审核基因 ${event.slug}，来源: ${event.source}`);
      }
    } catch (err) {
      console.error('[listener] Failed to parse event:', err);
    }
  });

  console.log('[listener] Listening for gene_events...');
}

function enqueue(prompt: string) {
  queue.push(prompt);
  console.log(`[listener] Queued (${queue.length} pending): ${prompt}`);
  processNext();
}

function forceKill(child: ChildProcess) {
  child.kill('SIGTERM');
  setTimeout(() => {
    if (!child.killed) {
      console.error(`${TAG} SIGTERM ignored, sending SIGKILL`);
      child.kill('SIGKILL');
    }
  }, 5_000);
}

function isReviewAction(toolName: string): boolean {
  const bare = toolName.replace(/^genehub_/, '');
  return REVIEW_ACTIONS.includes(bare);
}

function processNext() {
  if (processing || queue.length === 0) return;
  processing = true;
  const prompt = queue.shift()!;
  runCurator(prompt, null, 0);
}

function runCurator(prompt: string, sessionId: string | null, attempt: number) {
  const isRetry = attempt > 0;
  const label = isRetry ? `${TAG} [retry ${attempt}]` : TAG;
  console.log(`${label} Running (${queue.length} remaining): ${prompt}`);

  const args = ['run', '--format', 'json', '--dir', CURATOR_CWD];
  if (sessionId) {
    args.push('--session', sessionId, '--continue');
  }
  args.push(prompt);

  const calledTools: string[] = [];
  let capturedSessionId: string | null = sessionId;
  let lastActivityMs = Date.now();
  let buffer = '';
  let stdinNudges = 0;
  let stdinStream: Writable | null = null;

  const child = spawn(CURATOR_CMD, args, {
    cwd: CURATOR_CWD,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  stdinStream = child.stdin;

  function nudgeViaStdin() {
    if (!stdinStream || stdinNudges >= MAX_STDIN_NUDGES) return false;
    stdinNudges++;
    console.warn(`${label} Nudge #${stdinNudges}: auto-replying via stdin`);
    stdinStream.write(NUDGE_MSG + '\n');
    return true;
  }

  function parseEvents(raw: string) {
    buffer += raw;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event: OpenCodeEvent = JSON.parse(line);
        handleEvent(event);
      } catch {
        if (line.trim()) console.log(`${label} ${line}`);
      }
    }
  }

  function handleEvent(event: OpenCodeEvent) {
    lastActivityMs = Date.now();

    if (event.sessionID && !capturedSessionId) {
      capturedSessionId = event.sessionID;
    }

    switch (event.type) {
      case 'text':
        if (event.part?.text) {
          for (const l of event.part.text.split('\n')) {
            if (l.trim()) console.log(`${label} ${l}`);
          }
        }
        break;

      case 'tool_use': {
        const toolName = event.part?.tool ?? 'unknown';
        calledTools.push(toolName);
        const status = event.part?.state?.status ?? '';
        console.log(`${label} tool: ${toolName} (${status})`);
        break;
      }

      case 'step_finish': {
        const reason = event.part?.reason;
        console.log(`${label} step done (reason: ${reason})`);

        if (reason === 'stop' || reason === 'end_turn') {
          const hasAction = calledTools.some(isReviewAction);
          if (!hasAction) {
            // Layer 2: try stdin nudge before killing
            if (!nudgeViaStdin()) {
              console.warn(`${label} Nudges exhausted, killing...`);
              forceKill(child);
            }
          }
        }
        break;
      }
    }
  }

  child.stdout.on('data', (chunk: Buffer) => {
    lastActivityMs = Date.now();
    parseEvents(chunk.toString());
  });

  child.stderr.on('data', (chunk: Buffer) => {
    lastActivityMs = Date.now();
    for (const line of chunk.toString().split('\n')) {
      if (line.trim() && !line.includes('getConfigContext')) {
        console.error(`${label} [stderr] ${line}`);
      }
    }
  });

  const hardTimer = setTimeout(() => {
    console.error(`${label} Hard timeout (${HARD_TIMEOUT_MS / 1000}s), killing...`);
    forceKill(child);
  }, HARD_TIMEOUT_MS);

  const idleChecker = setInterval(() => {
    const idleMs = Date.now() - lastActivityMs;
    if (idleMs > IDLE_TIMEOUT_MS) {
      console.error(`${label} Idle timeout (${Math.round(idleMs / 1000)}s no output), killing...`);
      forceKill(child);
    }
  }, 5_000);

  function cleanup(code: number | null) {
    clearTimeout(hardTimer);
    clearInterval(idleChecker);

    const hasAction = calledTools.some(isReviewAction);
    const toolList = calledTools.length > 0 ? calledTools.join(', ') : 'none';

    if (hasAction) {
      console.log(`${label} OK (code=${code}, tools=[${toolList}])`);
      processing = false;
      processNext();
      return;
    }

    // Layer 3: session continuation retry
    if (attempt < MAX_SESSION_RETRIES && capturedSessionId) {
      console.warn(
        `${label} INCOMPLETE (code=${code}, tools=[${toolList}]) — session retry with ${capturedSessionId}`,
      );
      runCurator(SESSION_RETRY_MSG, capturedSessionId, attempt + 1);
    } else {
      console.error(
        `${label} FAILED after ${attempt + 1} attempts, ${stdinNudges} nudges (code=${code}, tools=[${toolList}])`,
      );
      processing = false;
      processNext();
    }
  }

  child.on('close', (code) => cleanup(code));

  child.on('error', (err) => {
    clearTimeout(hardTimer);
    clearInterval(idleChecker);
    console.error(`${label} Spawn error: ${err.message}`);
    processing = false;
    processNext();
  });
}

listen().catch((err) => {
  console.error('[listener] Fatal error:', err);
  process.exit(1);
});
