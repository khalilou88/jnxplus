import { getKtlintPath } from '@jnxplus/common';
import { ExecutorContext, logger } from '@nx/devkit';
import { getProjectSourceRoot, runCommand } from '@jnxplus/common';
import { KotlinFormatExecutorSchema } from './schema';
import { getKtlintVersion } from '@jnxplus/gradle';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  const projectSourceRoot = getProjectSourceRoot(context);

  const ktlintPath = await getKtlintPath(getKtlintVersion);

  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} -F "${projectSourceRoot}/**/*.kt"`;

  return runCommand(command);
}
