import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, getProjectPath, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let target: string;
  let args = '';
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
  if (options.args) {
    args = `--args='${options.args}'`;
  }

  return runCommand(`${getExecutable()} ${getProjectPath(context)}:${target} ${args}`);
}

function getProjectType(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].projectType;
}
