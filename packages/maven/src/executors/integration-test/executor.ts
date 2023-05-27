import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { IntegrationTestExecutorSchema } from './schema';
import { getExecutable } from '../../lib/utils';

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
