import { getProjectType, isRootProject, runCommand } from '@jnxplus/common';

import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';
import { getExecutable, isPomPackaging } from '../../../lib/utils';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    if (options.mvnArgs) {
      options.mvnArgs += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
    } else {
      options.mvnArgs = `${process.env['NX_MAVEN_CLI_OPTS']}`;
    }
  }

  let command = getExecutable();

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }

  if (!options.skipClean) {
    command += ' clean';
  }

  if (isPomPackaging(context)) {
    command += isRootProject(context) ? ' install -N' : ' install';

    return runCommand(`${command} -pl :${context.projectName}`);
  }

  if (getProjectType(context) === 'application') {
    command += ' package spring-boot:repackage';
  }

  if (getProjectType(context) === 'library') {
    command += ' install';
  }

  return runCommand(`${command} -DskipTests=true -pl :${context.projectName}`);
}
