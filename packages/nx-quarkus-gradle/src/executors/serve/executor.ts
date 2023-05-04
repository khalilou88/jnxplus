import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand, waitForever } from '@jnxplus/common';
import { ServeExecutorSchema } from './schema';
import { getExecutable, getProjectPath } from '@jnxplus/gradle';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for serve: ${JSON.stringify(options)}`);

  let command = `${getExecutable()} ${getProjectPath(context)}:quarkusDev`;

  if (options.args) {
    command += ` ${options.args}`;
  }

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  await waitForever();
  return { success: true };
}
