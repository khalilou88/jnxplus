import { isRootProject, runCommand } from '@jnxplus/common';
import { getExecutable, isPomPackaging } from '@jnxplus/maven';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  let command = getExecutable();

  if (isPomPackaging(context)) {
    command += isRootProject(context) ? ' install -N' : ' install';

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

function getProjectType(context: ExecutorContext) {
  return context.projectsConfigurations.projects[context.projectName]
    .projectType;
}
