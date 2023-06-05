import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { PublishExecutorSchema } from './schema';
import { getExecutable, getProjectPath } from '../../lib/utils';

export default async function runExecutor(
  options: PublishExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Publish: ${JSON.stringify(options)}`);
  return runCommand(`${getExecutable()} ${getProjectPath(context)}:deploy`);
}
