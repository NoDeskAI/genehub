import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { installCommand } from './commands/install.js';
import { learnCommand } from './commands/learn.js';
import { listCommand } from './commands/list.js';
import { publishCommand } from './commands/publish.js';
import { searchCommand } from './commands/search.js';
import { uninstallCommand } from './commands/uninstall.js';

const program = new Command();

program.name('genehub').description('GeneHub CLI - AI 员工基因管理工具').version('0.1.0');

program.addCommand(authCommand);
program.addCommand(installCommand);
program.addCommand(uninstallCommand);
program.addCommand(searchCommand);
program.addCommand(listCommand);
program.addCommand(publishCommand);
program.addCommand(initCommand);
program.addCommand(configCommand);
program.addCommand(learnCommand);

program.parse();
