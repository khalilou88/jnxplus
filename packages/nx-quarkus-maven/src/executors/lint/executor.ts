import { ExecutorContext, logger } from '@nx/devkit';
import {
  getPmdExecutable,
  getProjectSourceRoot,
  runCommand,
} from '@jnxplus/common';
import { LintExecutorSchema } from './schema';
import {
  getCheckstyleJarAbsolutePath,
  getKtlintAbsolutePath,
} from '@jnxplus/maven';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;
  const projectSourceRoot = getProjectSourceRoot(context);

  if (options.linter === 'checkstyle') {
    const checkstyleJarAbsolutePath = await getCheckstyleJarAbsolutePath();
    command = `java -jar ${checkstyleJarAbsolutePath} -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  }

  if (options.linter === 'pmd') {
    command = `${getPmdExecutable()} check -f text -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  }

  if (options.linter === 'ktlint') {
    const ktlintAbsolutePath = await getKtlintAbsolutePath();
    command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintAbsolutePath} "${projectSourceRoot}/**/*.kt"`;
  }

  return runCommand(command);
}
