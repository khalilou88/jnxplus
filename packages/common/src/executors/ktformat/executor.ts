/* eslint-disable @typescript-eslint/no-unused-vars */
import { ExecutorContext, logger } from '@nx/devkit';
import { KotlinFormatExecutorSchema } from './schema';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
  ktlintPath: string,
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  logger.warn('This Executor do nothing');
  return { success: true };
}
