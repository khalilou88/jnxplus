import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { getTargetName, runCommand, waitForever } from '@jnxplus/common';
import { RunTaskExecutorSchema } from './schema';
import { getExecutable, getMavenRootDirectory } from '../../utils';
import { join } from 'path';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext,
) {
  const targetName = getTargetName(context);
  logger.info(`Executor ran for ${targetName}: ${JSON.stringify(options)}`);

  let task = '';
  if (Array.isArray(options.task)) {
    task = options.task.join(' ');
  } else {
    task = options.task;
  }

  const command = `${getExecutable()} ${task} -pl :${context.projectName}`;

  const mavenRootDirectory = getMavenRootDirectory();
  const result = runCommand(command, join(workspaceRoot, mavenRootDirectory));

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
