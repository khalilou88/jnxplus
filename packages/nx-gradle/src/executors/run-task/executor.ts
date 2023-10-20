import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { getGradleRootDirectory, getProjectPath } from '../../utils';
import { RunTaskExecutorSchema } from './schema';
import {
  getGradleExecutable,
  getTargetName,
  runCommand,
  waitForever,
} from '@jnxplus/common';
import { join } from 'path';

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

  const gradleRootDirectory = getGradleRootDirectory();
  const result = runCommand(command, join(workspaceRoot, gradleRootDirectory));

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
