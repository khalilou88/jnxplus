import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { getTargetName, runCommand, waitForever } from '@jnxplus/common';
import { RunTaskExecutorSchema } from './schema';
import {
  getExecutable,
  getLocalRepoRelativePath,
  getMavenRootDirectory,
} from '../../utils';
import { join } from 'path';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext,
) {
  const targetName = getTargetName(context);
  logger.info(`Executor ran for ${targetName}: ${JSON.stringify(options)}`);

  const mavenRootDirectory = getMavenRootDirectory();

  let task = '';
  if (Array.isArray(options.task)) {
    task = options.task.join(' ');
  } else {
    task = options.task;
  }

  let command = `${getExecutable()} ${task}`;

  const localRepoRelativePath = getLocalRepoRelativePath();
  if (localRepoRelativePath) {
    const mavenRepoLocal = `-Dmaven.repo.local=${join(
      workspaceRoot,
      mavenRootDirectory,
      localRepoRelativePath,
    )}`;
    command += ` ${mavenRepoLocal}`;
  }

  command += ` -pl :${context.projectName}`;

  const result = runCommand(command, join(workspaceRoot, mavenRootDirectory));

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
