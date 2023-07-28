import { ExecutorContext, logger } from '@nx/devkit';
import { getTargetName, runCommand, waitForever } from '@jnxplus/common';
import { RunTaskExecutorSchema } from './schema';
import { getExecutable } from '../../lib/utils';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext
) {
  const targetName = getTargetName(context);
  logger.info(`Executor ran for ${targetName}: ${JSON.stringify(options)}`);

  const command = `${getExecutable()} ${options.task} -pl :${
    context.projectName
  }`;

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  if (options.keepItRunning) {
    await waitForever();
  }

  return { success: true };
}
