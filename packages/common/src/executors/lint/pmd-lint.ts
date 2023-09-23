import { ExecutorContext } from '@nx/devkit';
import { getPmdExecutable, getProjectSourceRoot, runCommand } from '../../.';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
) {
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `${getPmdExecutable()} check -f text -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  return runCommand(command);
}
