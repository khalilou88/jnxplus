import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  let command = getExecutable();

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

function getProjectType(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].projectType;
}
