import { ExecutorContext, logger } from '@nx/devkit';
import { getProjectPath } from '../../utils';
import { RunTaskExecutorSchema } from './schema';
import {
  getGradleExecutable,
  getTargetName,
  runCommand,
  waitForever,
} from '@jnxplus/common';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext,
) {
  const targetName = getTargetName(context);
  logger.info(`Executor ran for ${targetName}: ${JSON.stringify(options)}`);

  let projectPath = '';
  if (options.projectPath) {
    projectPath = options.projectPath;
  } else {
    projectPath = getProjectPath(context);
  }

  let task = '';
  if (Array.isArray(options.task)) {
    task = options.task.join(' ');
  } else {
    task = options.task;
  }

  const command = `${getGradleExecutable()} ${projectPath}:${task}`;

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
