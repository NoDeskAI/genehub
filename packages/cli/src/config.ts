import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.genehub');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export type CliConfig = {
  registryUrl: string;
  token?: string;
};

const DEFAULT_CONFIG: CliConfig = {
  registryUrl: 'http://localhost:3000',
};

export async function loadConfig(): Promise<CliConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: Partial<CliConfig>): Promise<void> {
  const current = await loadConfig();
  const merged = { ...current, ...config };
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
}
