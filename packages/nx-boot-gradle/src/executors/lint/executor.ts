import { ExecutorContext, logger } from '@nrwl/devkit';

import {
  getProjectSourceRoot,
  runCommand,
  getDependencyRoot,
} from '../../utils/command';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;
  const projectSourceRoot = getProjectSourceRoot(context);
  const checkstyleRoot = getDependencyRoot(
    '@jnxplus/checkstyle',
    `./node_modules/@jnxplus/checkstyle`
  );
  const pmdRoot = getDependencyRoot(
    '@jnxplus/pmd',
    `./node_modules/@jnxplus/pmd`
  );
  const ktlintRoot = getDependencyRoot(
    '@jnxplus/ktlint',
    `./node_modules/@jnxplus/ktlint`
  );

  if (options.linter === 'checkstyle') {
    command = `java -jar ${checkstyleRoot}/checkstyle.jar -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  }

  if (options.linter === 'pmd') {
    command = `java -cp ${pmdRoot}/lib/*${getClassPathDelimiter()}. net.sourceforge.pmd.PMD -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  }

  if (options.linter === 'ktlint') {
    command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintRoot}/ktlint "${projectSourceRoot}/**/*.kt"`;
  }

  return runCommand(command);
}

function getClassPathDelimiter() {
  const isWin = process.platform === 'win32';
  return isWin ? ';' : ':';
}
