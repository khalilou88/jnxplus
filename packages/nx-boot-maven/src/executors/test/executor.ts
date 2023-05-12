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

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    command += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  command += ` test -pl :${context.projectName}`;

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }

  return runCommand(command);
}
