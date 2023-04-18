import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let mvnArgs = '';
  let mvnCleanCommand = '';
  let mvnBuildCommand: string;
  let mvnBuildArgs = '';

  if (options.mvnArgs) {
    mvnArgs = `${options.mvnArgs}`;
  }

  if (!options.skipClean) {
    mvnCleanCommand = 'clean';
  }

  if (options.mvnBuildCommand) {
    mvnBuildCommand = `${options.mvnBuildCommand}`;
  } else {
    if (getProjectType(context) === 'application') {
      mvnBuildCommand = 'compile';
    }

    if (getProjectType(context) === 'library') {
      mvnBuildCommand = 'install';
    }
  }

  if (options.mvnBuildArgs) {
    mvnBuildArgs = `${options.mvnBuildArgs}`;
  }

  return runCommand(
    `${getExecutable()} ${mvnArgs} ${mvnCleanCommand} ${mvnBuildCommand} ${mvnBuildArgs} -DskipTests=true -pl :${
      context.projectName
    }`
  );
}

function getProjectType(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].projectType;
}
