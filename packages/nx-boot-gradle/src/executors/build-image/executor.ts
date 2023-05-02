import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '@jnxplus/gradle';
import { runCommand } from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:bootBuildImage`
  );
}
