import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../lib/utils/index';
import { TestExecutorSchema } from './schema';
import { runCommand } from '@jnxplus/common';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  return runCommand(`${getExecutable()} ${getProjectPath(context)}:test`);
}
