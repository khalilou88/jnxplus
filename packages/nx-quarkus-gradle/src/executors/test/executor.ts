import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { TestExecutorSchema } from './schema';
import { getExecutable, getProjectPath } from '@jnxplus/gradle';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  return runCommand(`${getExecutable()} ${getProjectPath(context)}:test`);
}
