import { getProjectType, isRootProject, runCommand } from '@jnxplus/common';
import { getExecutable, isPomPackaging } from '@jnxplus/maven';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    options.mvnArgs += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  let command = getExecutable();

  if (isPomPackaging(context)) {
    if (!options.skipClean) {
      command += ' clean';
    }

    command += isRootProject(context) ? ' install -N' : ' install';

    if (options.mvnArgs) {
      command += ` ${options.mvnArgs}`;
    }

    return runCommand(`${command} -pl :${context.projectName}`);
  }

  if (!options.skipClean) {
    command += ' clean';
  }

  if (getProjectType(context) === 'application') {
    command += ' package spring-boot:repackage';
  }

  if (getProjectType(context) === 'library') {
    command += ' install';
  }

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }

  return runCommand(`${command} -DskipTests=true -pl :${context.projectName}`);
}
