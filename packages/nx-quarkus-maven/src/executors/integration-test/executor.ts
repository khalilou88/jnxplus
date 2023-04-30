import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { IntegrationTestExecutorSchema } from './schema';

export default async function runExecutor(
  options: IntegrationTestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Integration-test: ${JSON.stringify(options)}`);

  let args = '';
  if (options.args) {
    args = options.args;
  }

  return runCommand(
    `${getExecutable()} integration-test ${args} -pl :${context.projectName}`
  );
}
