import { ExecutorContext, logger } from '@nrwl/devkit';
import { getProjectPath, runCommand } from '../../utils/command';
import { TestExecutorSchema } from './schema';

export default async function runExecutor(
  options: TestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Test: ${JSON.stringify(options)}`);
  const command = `${getProjectPath(context)}:test`;
  return runCommand(command);
}
