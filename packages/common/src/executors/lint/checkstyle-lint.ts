import { ExecutorContext } from '@nx/devkit';
import { getProjectSourceRoot, runCommand } from '../../.';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
  checkstylePath: string,
) {
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java -jar ${checkstylePath} -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  return runCommand(command);
}
