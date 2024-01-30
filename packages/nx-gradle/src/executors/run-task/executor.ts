import { getTargetName, runCommand, waitForever } from '@jnxplus/common';
import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { join } from 'path';
import {
  getExecutable,
  getGradleRootDirectory,
  getProjectPath,
} from '../../utils';
import { RunTaskExecutorSchema } from './schema';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext,
) {
  const targetName = getTargetName(context);
  logger.info(`Executor ran for ${targetName}: ${JSON.stringify(options)}`);

  const gradleRootDirectory = getGradleRootDirectory();
  const gradleRootDirectoryAbsolutePath = join(
    workspaceRoot,
    gradleRootDirectory,
  );

  let projectPath = '';
  if (options.projectPath) {
    projectPath = options.projectPath;
  } else {
    projectPath = getProjectPath(context, gradleRootDirectoryAbsolutePath);
  }

  let task = '';
  if (Array.isArray(options.task)) {
    task = options.task.join(' ');
  } else {
    task = options.task;
  }

  const command = `${getExecutable()} ${projectPath}:${task}`;

  const result = runCommand(command, gradleRootDirectoryAbsolutePath);

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
