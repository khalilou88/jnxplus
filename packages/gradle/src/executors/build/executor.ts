import { getPluginName, getProjectType, runCommand } from '@jnxplus/common';
import { getExecutable, getProjectPath } from '../../../.';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);

  let projectPath = '';
  if (options.projectPath) {
    projectPath = options.projectPath;
  } else {
    projectPath = getProjectPath(context);
  }

  let target = '';

  if (options.command) {
    target = options.command;
  } else if (getPluginName(context) === '@jnxplus/nx-boot-gradle') {
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
  }

  //default build task
  if (!target) {
    target = 'build -x test';
  }

  let args = '';

  if (options.args) {
    args = options.args;
  }

  return runCommand(`${getExecutable()} ${projectPath}:${target} ${args}`);
}
