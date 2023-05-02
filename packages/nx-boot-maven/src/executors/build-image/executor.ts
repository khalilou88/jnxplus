import { ExecutorContext, logger } from '@nx/devkit';
import { runCommand } from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';
import { getExecutable } from '@jnxplus/maven';

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
