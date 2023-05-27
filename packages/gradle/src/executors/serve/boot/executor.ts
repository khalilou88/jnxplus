import { runCommand, waitForever } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';

import { getExecutable, getProjectPath } from '../../../.';
import { ServeExecutorSchema } from './schema';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for serve: ${JSON.stringify(options)}`);

  let command = `${getExecutable()} ${getProjectPath(context)}:bootRun`;

  if (options.args) {
    command += ` --args='${options.args}'`;
  }

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  await waitForever();
  return { success: true };
}
