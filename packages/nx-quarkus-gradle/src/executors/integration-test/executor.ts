import { ExecutorContext, logger } from '@nx/devkit';
import { getExecutable, getProjectPath, runCommand } from '../../utils/command';
import { IntegrationTestExecutorSchema } from './schema';

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
