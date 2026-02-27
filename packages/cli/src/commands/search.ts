import { GeneHubClient } from '@genehub/sdk';
import { Command } from 'commander';
import { loadConfig } from '../config.js';
import * as output from '../output.js';

export const searchCommand = new Command('search')
  .description('搜索基因库')
  .argument('[keyword]', '搜索关键词')
  .option('-c, --category <category>', '按分类过滤')
  .option('-t, --tags <tags>', '按标签过滤（逗号分隔）')
  .option('--compat <product>', '按兼容产品过滤')
  .option('-s, --sort <sort>', '排序方式（newest / popular / rating）', 'newest')
  .option('--page <page>', '页码', '1')
  .option('--json', 'JSON 格式输出', false)
  .action(async (keyword: string | undefined, opts) => {
    const config = await loadConfig();
    const client = new GeneHubClient({ registryUrl: config.registryUrl, token: config.token });

    try {
      const result = await client.searchGenes({
        q: keyword,
        category: opts.category,
        tags: opts.tags?.split(','),
        compatibility: opts.compat,
        sort: opts.sort,
        page: Number(opts.page),
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.items.length === 0) {
        output.info('未找到匹配的基因');
        return;
      }

      output.table(
        ['slug', '名称', '版本', '分类', '兼容', '安装数'],
        result.items.map((g) => [
          g.slug,
          g.name,
          g.version,
          g.category,
          (g.compatibility as string[]).join(', '),
          String(g.install_count),
        ]),
      );

      output.info(`共 ${result.total} 条结果，第 ${result.page}/${result.total_pages} 页`);
    } catch (err) {
      output.fail(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
