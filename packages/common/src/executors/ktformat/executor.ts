import { ExecutorContext, logger } from '@nx/devkit';
import { KotlinFormatExecutorSchema } from './schema';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
  ktlintPath: string,
) {
  logger.info(`Jnxplus don't provide linter anymore`);

  return { success: true };
}
