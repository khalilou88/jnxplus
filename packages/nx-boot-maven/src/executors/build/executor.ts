import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let target: string;
  let mvnArgs = '';
  if (getProjectType(context) === 'application') {
    target = 'package spring-boot:repackage';
  }

  if (getProjectType(context) === 'library') {
    target = 'install';
  }

  if (options.mvnArgs) {
    mvnArgs = `${options.mvnArgs}`;
  }

  return runCommand(
    `${getExecutable()} ${mvnArgs} ${target} -DskipTests=true -pl :${
      context.projectName
    }`,
    `${getExecutable()} -no-transfer-progress clean install -N`
  );
}

function getProjectType(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].projectType;
}
