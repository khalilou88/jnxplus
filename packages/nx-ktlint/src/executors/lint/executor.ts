import {
  LintExecutorSchema,
  getProjectSourceRoot,
  runCommand,
} from '@jnxplus/common';
import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { getKtlintPath } from '../../lib/nx-ktlint';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  const ktlintPath = await getKtlintPath();
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} "${projectSourceRoot}/**/*.kt"`;
  return runCommand(command, workspaceRoot);
}
