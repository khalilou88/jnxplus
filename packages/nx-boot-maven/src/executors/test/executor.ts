import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { TestExecutorSchema } from './schema';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  return runCommand(`${getExecutable()} test -am -pl :${context.projectName}`);
}
