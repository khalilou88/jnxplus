import { getProjectType, runCommand } from '@jnxplus/common';
import { getExecutable, getProjectPath } from '../../../.';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let target = '';
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

  return runCommand(`${getExecutable()} ${getProjectPath(context)}:${target}`);
}
