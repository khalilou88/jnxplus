import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { RunTaskExecutorSchema } from './schema';
import { runCommand, waitForever } from '@jnxplus/common';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Run Task: ${JSON.stringify(options)}`);

  let projectPath = '';
  if (options.projectPath) {
    projectPath = options.projectPath;
  } else {
    projectPath = getProjectPath(context);
  }

  const command = `${getExecutable()} ${projectPath}:${options.task}`;

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
