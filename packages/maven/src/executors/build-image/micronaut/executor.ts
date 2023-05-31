import { runCommand } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import { BuildImageExecutorSchema } from './schema';

export default async function runExecutor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Build Image: ${JSON.stringify(options)}`);
  return runCommand(
    `getExecutable() package -pl :${context.projectName} ${options.args}`
  );
}
