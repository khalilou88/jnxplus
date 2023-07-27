import { ExecutorContext, logger } from '@nx/devkit';
import { getPluginName, runCommand, waitForever } from '@jnxplus/common';
import { ServeExecutorSchema } from './schema';
import { getExecutable } from '../../lib/utils';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for serve: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (options.command) {
    command += ` ${options.command}`;
  } else if (getPluginName(context) === '@jnxplus/nx-boot-maven') {
    command += ' spring-boot:run';

    if (options.args) {
      command += ` ${options.args}`;
    }
  }

  command += ` -pl :${context.projectName}`;

  const result = runCommand(command);

  if (!result.success) {
    return { success: false };
  }

  await waitForever();
  return { success: true };
}
