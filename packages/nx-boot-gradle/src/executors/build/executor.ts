import { ExecutorContext, logger } from '@nrwl/devkit';
import { getProjectPath, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let target: string;
  if (getProjectType(context) === 'library') {
    target = 'jar';
  } else {
    if (options.packaging === 'jar') {
      target = 'bootJar';
    }
    if (options.packaging === 'war') {
      target = 'bootWar';
    }
  }

  const command = `${getProjectPath(context)}:${target}`;
  return runCommand(command);
}

function getProjectType(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].projectType;
}
