import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { GeneHubClient } from '@nodeskai/genehub-sdk';
import type { Gene } from '@nodeskai/genehub-types';
import { GeneManifestSchema } from '@nodeskai/genehub-types';
import { Command } from 'commander';
import ora from 'ora';
import { parse } from 'yaml';
import { loadConfig } from '../config.js';
import * as output from '../output.js';

const IGNORED_PATTERNS = ['.git', 'node_modules', '.DS_Store', '__pycache__', '.venv'];

async function scanDirectory(dirPath: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  async function walk(currentPath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_PATTERNS.includes(entry.name)) continue;
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = relative(dirPath, fullPath);
        const content = await readFile(fullPath, 'utf-8');
        files[relPath] = content;
      }
    }
  }

  await walk(dirPath);
  return files;
}

export const publishCommand = new Command('publish')
  .description('发布基因到 GeneHub Registry')
  .argument('<path>', '基因目录路径（包含 gene.yaml）')
  .action(async (dirPath: string) => {
    const config = await loadConfig();

    if (!config.token) {
      output.fail('未配置认证 token');
      output.info('  方式 1: genehub config set token <token>');
      output.info('  方式 2: export GENEHUB_TOKEN=<token>');
      process.exit(1);
    }

    const client = new GeneHubClient({ registryUrl: config.registryUrl, token: config.token });
    const absPath = resolve(dirPath);

    try {
      const yamlPath = join(absPath, 'gene.yaml');
      const raw = await readFile(yamlPath, 'utf-8');
      const parsed = parse(raw);

      if (parsed.skill?.file && !parsed.skill.content) {
        try {
          parsed.skill.content = await readFile(join(absPath, parsed.skill.file), 'utf-8');
        } catch {
          try {
            parsed.skill.content = await readFile(join(absPath, 'SKILL.md'), 'utf-8');
          } catch {
            // no skill content file found
          }
        }
      }

      const validation = GeneManifestSchema.safeParse(parsed);
      if (!validation.success) {
        output.fail('Manifest 校验失败:');
        for (const issue of validation.error.issues) {
          output.fail(`  ${issue.path.join('.')}: ${issue.message}`);
        }
        process.exit(1);
      }

      const { slug, version } = validation.data;

      const scanSpinner = ora('扫描基因目录...').start();
      const files = await scanDirectory(absPath);
      const fileCount = Object.keys(files).length;
      scanSpinner.succeed(`扫描完成: ${fileCount} 个文件`);

      const spinner = ora(`发布 ${slug}@${version} (${fileCount} 个文件)...`).start();

      let gene: Gene;
      try {
        gene = await client.publishGene(validation.data, files);
      } catch (err) {
        const isSlugExists = err instanceof Error && err.message.includes('gene_slug_exists');
        if (!isSlugExists) throw err;

        spinner.text = `基因 ${slug} 已存在，发布新版本 ${version}...`;
        gene = await client.publishVersion(slug, validation.data, undefined, files);
      }

      spinner.succeed('发布成功');
      output.ok(`${gene.slug}@${gene.version} 已发布到 GeneHub Registry (${fileCount} 个文件)`);
    } catch (err) {
      output.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
