/* eslint-disable @typescript-eslint/no-unused-vars */
import { LintExecutorSchema } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  logger.warn('This Executor do nothing');
  return { success: true };
}
