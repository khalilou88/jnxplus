import { ExecutorContext, logger } from '@nrwl/devkit';
import { runCommand } from '../../utils/command';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  const command = `java -jar ./node_modules/@jnxplus/checkstyle/checkstyle.jar -c checkstyle.xml ${
    context.workspace.projects[context.projectName].sourceRoot
  }`;
  return runCommand(command);
}
