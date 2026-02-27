import { Command } from 'commander';
import { installCommand } from './commands/install.js';
import { searchCommand } from './commands/search.js';
import { listCommand } from './commands/list.js';
import { publishCommand } from './commands/publish.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('genehub')
  .description('GeneHub CLI - AI 员工基因管理工具')
  .version('0.1.0');

program.addCommand(installCommand);
program.addCommand(searchCommand);
program.addCommand(listCommand);
program.addCommand(publishCommand);
program.addCommand(initCommand);

program.parse();
