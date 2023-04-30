import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { TestExecutorSchema } from './schema';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  let command = getExecutable();
  command += ` test -pl :${context.projectName}`;

  if (options.mvnArgs) {
    command += ` ${options.mvnArgs}`;
  }
  return runCommand(command);
}
