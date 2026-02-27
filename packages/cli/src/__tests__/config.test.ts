import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('CLI Config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'genehub-cli-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('默认 registryUrl 应为 localhost:3000', async () => {
    const { loadConfig } = await import('../config.js');
    const config = await loadConfig();
    expect(config.registryUrl).toBe('http://localhost:3000');
  });
});
