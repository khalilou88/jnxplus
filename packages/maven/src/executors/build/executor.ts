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

  if (options.command) {
    command += ` ${options.command}`;
  } else {
    if (getPluginName(context) === '@jnxplus/nx-boot-maven') {
      if (getProjectType(context) === 'application') {
        command += ' package spring-boot:repackage';
      }
      if (getProjectType(context) === 'library') {
        command += ' install';
      }
    }
  }

  return runCommand(`${command} -DskipTests=true -pl :${context.projectName}`);
}
