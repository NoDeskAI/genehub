import { Command } from 'commander';
import { detectAdapter, getAdapter } from '@genehub/sdk';
import * as output from '../output.js';

export const listCommand = new Command('list')
  .description('列出本地已安装的基因')
  .option('-p, --product <product>', '指定目标产品')
  .action(async (opts) => {
    try {
      const adapter = opts.product ? getAdapter(opts.product) : await detectAdapter();

      output.info(`目标产品: ${adapter.product}`);

      const genes = await adapter.list();

      if (genes.length === 0) {
        output.info('暂无已安装的基因');
        return;
      }

      output.table(
        ['slug', '版本', '安装时间', '文件'],
        genes.map((g) => [
          g.slug,
          g.version,
          new Date(g.installedAt).toLocaleString(),
          g.files.join(', '),
        ]),
      );

      output.info(`共 ${genes.length} 个基因`);
    } catch (err) {
      output.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
