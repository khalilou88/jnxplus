import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, getProjectPath, runCommand } from '../../utils/command';
import { BuildExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build: ${JSON.stringify(options)}`);
  let args = '';

  if (options.args) {
    args = options.args;
  }

  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:build ${args}`
  );
}
