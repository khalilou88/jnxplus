import {
  LintExecutorSchema,
  getProjectSourceRoot,
  runCommand,
} from '@jnxplus/common';
import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { getCheckstylePath } from '../../lib/nx-checkstyle';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  const checkstylePath = await getCheckstylePath();
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java -jar ${checkstylePath} -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  return runCommand(command, workspaceRoot);
}
