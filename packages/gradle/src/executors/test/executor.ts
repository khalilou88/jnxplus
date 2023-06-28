import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../lib/utils/index';
import { TestExecutorSchema } from './schema';
import { runCommand } from '@jnxplus/common';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);

  let projectPath = '';
  if (options.projectPath) {
    projectPath = options.projectPath;
  } else {
    projectPath = getProjectPath(context);
  }

  return runCommand(`${getExecutable()} ${projectPath}:test`);
}
