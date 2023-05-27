import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';
import { getExecutable } from '../../../lib/utils';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    command += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  return runCommand(
    `${command} spring-boot:build-image -DskipTests=true -pl :${context.projectName}`
  );
}
