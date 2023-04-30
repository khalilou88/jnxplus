import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath, runCommand } from '../../utils/command';
import { TestExecutorSchema } from './schema';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  return runCommand(`${getExecutable()} ${getProjectPath(context)}:test`);
}
