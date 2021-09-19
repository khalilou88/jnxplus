import { ExecutorContext, logger } from '@nrwl/devkit';
import { runCommand } from '../../utils/command';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;

  if (options.linter === 'checkstyle') {
    command = `java -jar ./node_modules/@jnxplus/checkstyle/checkstyle.jar -c ./tools/linters/checkstyle.xml ${getProjectSourceRoot(
      context
    )}`;
  }

  if (options.linter === 'ktlint') {
    command = `java -jar ./node_modules/@jnxplus/ktlint/ktlint ${getProjectSourceRoot(
      context
    )}`;
  }

  return runCommand(command);
}

function getProjectSourceRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].sourceRoot;
}
