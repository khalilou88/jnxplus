import { runCommand } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable } from '../../../lib/utils';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    command += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  command += ' spring-boot:build-image';

  command += ` -DskipTests=true -pl :${context.projectName}`;

  return runCommand(command);
}
