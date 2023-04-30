import { ExecutorContext, logger } from '@nrwl/devkit';
import { getExecutable, runCommand } from '../../utils/command';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);
  return runCommand(
    `${getExecutable()} spring-boot:build-image -DskipTests=true -pl :${
      context.projectName
    }`
  );
}
