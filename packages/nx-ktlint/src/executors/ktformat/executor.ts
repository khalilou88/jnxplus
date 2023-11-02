import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { KotlinFormatExecutorSchema } from './schema';
import { getProjectSourceRoot, runCommand } from '@jnxplus/common';
import { getKtlintPath } from '../../lib/nx-ktlint';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  const ktlintPath = await getKtlintPath();
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} -F "${projectSourceRoot}/**/*.kt"`;
  return runCommand(command, workspaceRoot);
}
