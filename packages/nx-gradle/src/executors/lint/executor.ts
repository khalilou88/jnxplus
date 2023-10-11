import { LintExecutorSchema } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(`Jnxplus don't provide linter anymore`);

  return { success: true };
}
