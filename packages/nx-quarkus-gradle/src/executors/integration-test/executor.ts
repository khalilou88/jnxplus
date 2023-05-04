import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { IntegrationTestExecutorSchema } from './schema';
import { getExecutable, getProjectPath } from '@jnxplus/gradle';

export default async function runExecutor(
  options: IntegrationTestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Integration-test: ${JSON.stringify(options)}`);

  let task = 'quarkusIntTest';

  if (options.native) {
    task = 'testNative';
  }

  return runCommand(`${getExecutable()} ${getProjectPath(context)}:${task}`);
}
