import { getPluginName, runCommand, waitForever } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';

import { getExecutable, getProjectPath } from '../../../.';
import { ServeExecutorSchema } from './schema';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for serve: ${JSON.stringify(options)}`);

  let command = `${getExecutable()} ${getProjectPath(context)}:`;

  if (
    getPluginName(context) === '@jnxplus/nx-boot-gradle' ||
    options.framework === 'spring-boot'
  ) {
    command += ' bootRun';
  }

  if (
    getPluginName(context) === '@jnxplus/nx-quarkus-gradle' ||
    options.framework === 'quarkus'
  ) {
    command += ' quarkusDev';
  }

  if (
    getPluginName(context) === '@jnxplus/nx-micronaut-gradle' ||
    options.framework === 'micronaut'
  ) {
    command += ' run';
  }

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
