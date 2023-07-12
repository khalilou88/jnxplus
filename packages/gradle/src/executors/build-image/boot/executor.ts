import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { runCommand } from '@jnxplus/common';
import { BootBuildImageExecutorSchema } from './schema';

export default async function runBootBuildImageExecutor(
  options: BootBuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:bootBuildImage`
  );
}
