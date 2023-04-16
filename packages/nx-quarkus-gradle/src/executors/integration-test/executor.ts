import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, getProjectPath, runCommand } from '../../utils/command';
import { IntegrationTestExecutorSchema } from './schema';

export default async function runExecutor(
  options: IntegrationTestExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Integration-test: ${JSON.stringify(options)}`);
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:quarkusIntTest`
  );
}
