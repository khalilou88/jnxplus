import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { TestExecutorSchema } from './schema';
import { getExecutable } from '@jnxplus/maven';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  let command = getExecutable();
  command += ` test -pl :${context.projectName}`;

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }
  return runCommand(command);
}
