import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { BuildExecutorSchema } from './schema';
import { getExecutable, getProjectPath } from '../../../.';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let args = '';

  if (options.args) {
    args = options.args;
  }

  //use quarkusBuild (instead of build task) to not trigger test
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:quarkusBuild ${args}`
  );
}
