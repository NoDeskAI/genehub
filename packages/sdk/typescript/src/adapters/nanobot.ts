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

const DEFAULT_WORKSPACE = join(homedir(), '.nanobot', 'workspace');

export class NanobotAdapter extends BaseAdapter {
  readonly product = 'nanobot';
  private workspace: string;

  constructor(options?: { workspace?: string }) {
    super();
    this.workspace = options?.workspace ?? DEFAULT_WORKSPACE;
  }

  private get skillsDir(): string {
    return join(this.workspace, 'skills');
  }

  async detect(): Promise<boolean> {
    try {
      await stat(join(homedir(), '.nanobot'));
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

    const skillContent = this.buildNanobotSkillContent(manifest);
    const skillPath = join(targetDir, 'SKILL.md');
    await writeFile(skillPath, skillContent, 'utf-8');
    files.push(skillPath);

    if (manifest.mcp_servers.length > 0) {
      await this.mergeNanobotMcpConfig(manifest.mcp_servers);
    }

    return {
      success: true,
      slug: manifest.slug,
      version: manifest.version,
      files,
      needsRestart: false,
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

    return { success: true, slug, files, needsRestart: false };
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

  private buildNanobotSkillContent(manifest: GeneManifest): string {
    if (manifest.skill.content?.trim().startsWith('---')) {
      return manifest.skill.content;
    }

    const nanobotMeta: Record<string, unknown> = {
      always: manifest.skill.always,
    };

    const nanobotConfig = manifest.config?.nanobot;
    if (nanobotConfig?.requires) nanobotMeta['requires'] = nanobotConfig.requires;
    if (nanobotConfig?.os) nanobotMeta['os'] = nanobotConfig.os;
    if (nanobotConfig?.install) nanobotMeta['install'] = nanobotConfig.install;

    const metadataJson = JSON.stringify({ nanobot: nanobotMeta });

    const frontMatter = [
      '---',
      `name: ${manifest.skill.name}`,
      `description: ${manifest.short_description}`,
      `metadata: ${metadataJson}`,
      '---',
    ].join('\n');

    const body = manifest.skill.content?.trim() ?? '';
    return body ? `${frontMatter}\n\n${body}` : frontMatter;
  }

  private async mergeNanobotMcpConfig(
    mcpServers: GeneManifest['mcp_servers'],
  ): Promise<void> {
    const configPath = join(homedir(), '.nanobot', 'config.json');

    let config: Record<string, unknown> = {};
    try {
      const raw = await readFile(configPath, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      // no existing config
    }

    if (!config['tools']) config['tools'] = {};
    const tools = config['tools'] as Record<string, unknown>;
    if (!tools['mcpServers']) tools['mcpServers'] = {};
    const servers = tools['mcpServers'] as Record<string, unknown>;

    for (const srv of mcpServers) {
      if (servers[srv.name]) continue;
      servers[srv.name] = {
        ...(srv.command ? { command: srv.command, args: srv.args ?? [], env: srv.env ?? {} } : {}),
        ...(srv.url ? { url: srv.url, headers: srv.headers ?? {} } : {}),
      };
    }

    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}
