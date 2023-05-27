import { ExecutorContext, logger } from '@nx/devkit';
import { getProjectSourceRoot, runCommand } from '../../.';
import { KotlinFormatExecutorSchema } from './schema';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
  ktlintPath: string
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} -F "${projectSourceRoot}/**/*.kt"`;
  return runCommand(command);
}
