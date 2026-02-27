import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GeneHubClient } from '@nodeskai/genehub-sdk';
import { GeneManifestSchema } from '@nodeskai/genehub-types';
import { Command } from 'commander';
import ora from 'ora';
import { parse } from 'yaml';
import { loadConfig } from '../config.js';
import * as output from '../output.js';

export const publishCommand = new Command('publish')
  .description('发布基因到 GeneHub Registry')
  .argument('<path>', '基因目录路径（包含 gene.yaml）')
  .action(async (dirPath: string) => {
    const config = await loadConfig();

    if (!config.token) {
      output.fail('未配置认证 token，请先运行 genehub config --token <token>');
      process.exit(1);
    }

    const client = new GeneHubClient({ registryUrl: config.registryUrl, token: config.token });
    const absPath = resolve(dirPath);

    try {
      const yamlPath = join(absPath, 'gene.yaml');
      const raw = await readFile(yamlPath, 'utf-8');
      const parsed = parse(raw);

      const skillMdPath = join(absPath, 'SKILL.md');
      if (parsed.skill?.file && !parsed.skill.content) {
        try {
          parsed.skill.content = await readFile(join(absPath, parsed.skill.file), 'utf-8');
        } catch {
          parsed.skill.content = await readFile(skillMdPath, 'utf-8');
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

      const spinner = ora(`发布 ${validation.data.slug}@${validation.data.version}...`).start();
      const gene = await client.publishGene(validation.data);
      spinner.succeed('发布成功');

      output.ok(`${gene.slug}@${gene.version} 已发布到 GeneHub Registry`);
    } catch (err) {
      output.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
