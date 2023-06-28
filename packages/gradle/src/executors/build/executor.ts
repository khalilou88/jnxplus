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

  if (
    getPluginName(context) === '@jnxplus/nx-boot-gradle' ||
    options.framework === 'spring-boot'
  ) {
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

  if (
    getPluginName(context) === '@jnxplus/nx-quarkus-gradle' ||
    options.framework === 'quarkus'
  ) {
    //use quarkusBuild (instead of build task) to not trigger test
    target = 'quarkusBuild';
  }

  if (
    getPluginName(context) === '@jnxplus/nx-micronaut-gradle' ||
    options.framework === 'micronaut'
  ) {
    target = 'build -x test';
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
