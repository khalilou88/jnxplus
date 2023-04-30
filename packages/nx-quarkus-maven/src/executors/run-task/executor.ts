import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { RunTaskExecutorSchema } from './schema';

export default async function runExecutor(
  options: RunTaskExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Run Task: ${JSON.stringify(options)}`);
  return runCommand(
    `${getExecutable()} ${options.task} -pl :${context.projectName}`
  );
}
