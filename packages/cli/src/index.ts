import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { authCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { genomeCommand } from './commands/genome.js';
import { initCommand } from './commands/init.js';
import { installCommand } from './commands/install.js';
import { learnCommand } from './commands/learn.js';
import { listCommand } from './commands/list.js';
import { publishCommand } from './commands/publish.js';
import { searchCommand } from './commands/search.js';
import { templateCommand } from './commands/template.js';
import { uninstallCommand } from './commands/uninstall.js';

export const program = new Command();

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
program.addCommand(genomeCommand);
program.addCommand(templateCommand);

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  program.parse();
}
