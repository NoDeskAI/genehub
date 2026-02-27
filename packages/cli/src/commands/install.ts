import { Command } from 'commander';
import ora from 'ora';
import { GeneHubClient, detectAdapter } from '@genehub/sdk';
import { loadConfig } from '../config.js';
import * as output from '../output.js';

export const installCommand = new Command('install')
  .description('安装基因到当前 Agent 环境')
  .argument('<slug>', '基因标识符')
  .option('-p, --product <product>', '指定目标产品（openclaw / nanobot / generic）')
  .option('-f, --force', '强制覆盖已安装版本', false)
  .option('--target <path>', '指定安装目标路径')
  .action(async (slug: string, opts) => {
    const config = await loadConfig();
    const client = new GeneHubClient({ registryUrl: config.registryUrl, token: config.token });

    const spinner = ora(`获取基因 ${slug} 的 manifest...`).start();

    try {
      const manifest = await client.getManifest(slug);
      spinner.succeed(`获取 ${manifest.name} v${manifest.version}`);

      const adapter = opts.product
        ? (await import('@genehub/sdk')).getAdapter(opts.product)
        : await detectAdapter();

      output.info(`目标产品: ${adapter.product}`);

      if (!opts.force && (await adapter.isInstalled(slug))) {
        output.warn(`${slug} 已安装，使用 --force 覆盖`);
        return;
      }

      const installSpinner = ora('安装中...').start();
      const result = await adapter.install(manifest, {
        force: opts.force,
        targetPath: opts.target,
      });
      installSpinner.succeed('安装完成');

      output.ok(`${result.slug}@${result.version} 安装成功`);
      output.info(`文件: ${result.files.join(', ')}`);

      if (result.needsRestart) {
        output.warn('需要重启 Agent Host 使基因生效');
      }

      if (result.dependencies.length > 0) {
        output.info(`依赖基因: ${result.dependencies.join(', ')}`);
      }
    } catch (err) {
      spinner.fail('安装失败');
      output.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
