import {
  getCheckstylePath,
  getKtlintPath,
  getPmdExecutable,
  getProjectSourceRoot,
  runCommand,
} from '@jnxplus/common';
import { getCheckstyleVersion, getKtlintVersion } from '@jnxplus/gradle';
import { ExecutorContext, logger } from '@nx/devkit';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;
  const projectSourceRoot = getProjectSourceRoot(context);

  if (options.linter === 'checkstyle') {
    const checkstylePath = await getCheckstylePath(getCheckstyleVersion);
    command = `java -jar ${checkstylePath} -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  }

  if (options.linter === 'pmd') {
    command = `${getPmdExecutable()} check -f text -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  }

  if (options.linter === 'ktlint') {
    const ktlintPath = await getKtlintPath(getKtlintVersion);
    command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} "${projectSourceRoot}/**/*.kt"`;
  }

  return runCommand(command);
}
