import { ExecutorContext, logger } from '@nx/devkit';
import {
  getPluginName,
  runQuarkusBuildImageExecutor,
  runCommand,
} from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';
import { getExecutable } from '../../lib/utils';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);

  if (
    getPluginName(context) === '@jnxplus/nx-quarkus-maven' ||
    options.framework === 'quarkus'
  ) {
    return await runQuarkusBuildImageExecutor(options, context);
  }

  let command = getExecutable();

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    command += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  if (
    getPluginName(context) === '@jnxplus/nx-boot-maven' ||
    options.framework === 'spring-boot'
  ) {
    command += ' spring-boot:build-image';
  }

  if (
    getPluginName(context) === '@jnxplus/nx-micronaut-maven' ||
    options.framework === 'micronaut'
  ) {
    command += ' package';

    if (options.args) {
      command += ` ${options.args}`;
    }
  }

  command += ` -DskipTests=true -pl :${context.projectName}`;

  return runCommand(command);
}
