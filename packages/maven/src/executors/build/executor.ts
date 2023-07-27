import {
  getPluginName,
  getProjectType,
  isRootProject,
  runCommand,
} from '@jnxplus/common';
import { getExecutable, isPomPackaging } from '../../lib/utils';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

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

  if (options.mvnBuildCommand) {
    command += ` ${options.mvnBuildCommand}`;
  } else {
    if (getProjectType(context) === 'application') {
      if (
        getPluginName(context) === '@jnxplus/nx-boot-maven' ||
        options.framework === 'spring-boot'
      ) {
        command += ' package spring-boot:repackage';
      } else {
        command += ' compile';
      }
    }

    if (getProjectType(context) === 'library') {
      command += ' install';
    }
  }

  if (options.mvnBuildArgs) {
    command += ` ${options.mvnBuildArgs}`;
  }

  return runCommand(`${command} -DskipTests=true -pl :${context.projectName}`);
}
