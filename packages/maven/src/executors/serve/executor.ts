import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand, waitForever } from '@jnxplus/common';
import { ServeExecutorSchema } from './schema';
import { getExecutable } from '../../lib/utils';

export default async function runExecutor(
  options: ServeExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for serve: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (options.framework === 'spring-boot') {
    command = ' spring-boot:run';
  }

  if (options.framework === 'quarkus') {
    command = ' quarkus:dev';
  }

  if (options.framework === 'micronaut') {
    command = ' mn:run';
  }

  command += ` -pl :${context.projectName}`;

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
