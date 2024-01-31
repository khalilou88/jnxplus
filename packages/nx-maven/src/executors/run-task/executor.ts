import { getTargetName, runCommand, waitForever } from '@jnxplus/common';
import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import * as path from 'path';
import { getExecutable, getMavenRootDirectory } from '../../utils';
import { RunTaskExecutorSchema } from './schema';

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

  let command = `${getExecutable()} ${task}`;

  if (!options.skipProject) {
    command += ` -pl :${context.projectName}`;
  }

  let cwd;
  if (options.cwd && path.isAbsolute(options.cwd)) {
    cwd = options.cwd;
  } else {
    const mavenRootDirectory = getMavenRootDirectory();
    if (options.cwd) {
      cwd = path.join(workspaceRoot, mavenRootDirectory, options.cwd);
    } else {
      cwd = path.join(workspaceRoot, mavenRootDirectory);
    }
  }

  const result = runCommand(command, cwd);

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
