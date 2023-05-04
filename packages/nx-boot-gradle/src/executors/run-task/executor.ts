import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '@jnxplus/gradle';
import { RunTaskExecutorSchema } from './schema';
import { runCommand } from '@jnxplus/common';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Run Task: ${JSON.stringify(options)}`);
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:${options.task}`
  );
}
