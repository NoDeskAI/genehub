import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  GeneManifest,
  InstallOptions,
  InstallResult,
  UninstallOptions,
  UninstallResult,
  InstalledGene,
} from '@genehub/types';
import { BaseAdapter } from './base.js';

const DEFAULT_SKILLS_DIR = join(homedir(), '.openclaw', 'skills');
const DEFAULT_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

export class OpenClawAdapter extends BaseAdapter {
  readonly product = 'openclaw';
  private skillsDir: string;
  private configPath: string;

  constructor(options?: { skillsDir?: string; configPath?: string }) {
    super();
    this.skillsDir = options?.skillsDir ?? DEFAULT_SKILLS_DIR;
    this.configPath = options?.configPath ?? DEFAULT_CONFIG_PATH;
  }

  async detect(): Promise<boolean> {
    try {
      await stat(join(homedir(), '.openclaw'));
      return true;
    } catch {
      return false;
    }
  }

  async install(manifest: GeneManifest, options?: InstallOptions): Promise<InstallResult> {
    const targetDir = options?.targetPath
      ? join(options.targetPath, manifest.skill.name)
      : join(this.skillsDir, manifest.skill.name);

    await mkdir(targetDir, { recursive: true });
    const files: string[] = [];

    const skillPath = join(targetDir, 'SKILL.md');
    const content = this.generateSkillContent(manifest, 'openclaw');
    await writeFile(skillPath, content, 'utf-8');
    files.push(skillPath);

    if (manifest.config?.openclaw) {
      await this.mergeOpenClawConfig(manifest.config.openclaw);
      files.push(this.configPath);
    }

    return {
      success: true,
      slug: manifest.slug,
      version: manifest.version,
      files,
      needsRestart: true,
      dependencies: manifest.dependencies.map((d) => d.slug),
    };
  }

  async uninstall(slug: string, _options?: UninstallOptions): Promise<UninstallResult> {
    const targetDir = join(this.skillsDir, slug);
    const files: string[] = [];

    try {
      await rm(targetDir, { recursive: true });
      files.push(targetDir);
    } catch {
      // already removed
    }

    return { success: true, slug, files, needsRestart: true };
  }

  async list(): Promise<InstalledGene[]> {
    try {
      const dirs = await readdir(this.skillsDir, { withFileTypes: true });
      const results: InstalledGene[] = [];

      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const skillPath = join(this.skillsDir, dir.name, 'SKILL.md');
        try {
          const s = await stat(skillPath);
          results.push({
            slug: dir.name,
            version: 'unknown',
            installedAt: s.mtime.toISOString(),
            files: [skillPath],
          });
        } catch {
          // skip
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async isInstalled(slug: string): Promise<boolean> {
    try {
      await stat(join(this.skillsDir, slug, 'SKILL.md'));
      return true;
    } catch {
      return false;
    }
  }

  async getInstalledVersion(_slug: string): Promise<string | null> {
    return null;
  }

  private async mergeOpenClawConfig(config: NonNullable<GeneManifest['config']>['openclaw']) {
    if (!config) return;

    let existing: Record<string, unknown> = {};
    try {
      const raw = await readFile(this.configPath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // no existing config
    }

    if (config.openclaw_config) {
      Object.assign(existing, config.openclaw_config);
    }

    if (config.tool_allow) {
      const current = (existing['tools'] as Record<string, unknown>)?.['allow'] as string[] ?? [];
      const merged = [...new Set([...current, ...config.tool_allow])];
      if (!existing['tools']) existing['tools'] = {};
      (existing['tools'] as Record<string, unknown>)['allow'] = merged;
    }

    await writeFile(this.configPath, JSON.stringify(existing, null, 2), 'utf-8');
  }
}
