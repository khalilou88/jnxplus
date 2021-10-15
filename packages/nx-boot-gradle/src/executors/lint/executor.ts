import { ExecutorContext, logger } from '@nrwl/devkit';
import { runCommand } from '../../utils/command';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;
  const projectSourceRoot = getProjectSourceRoot(context);

  if (options.linter === 'checkstyle') {
    command = `java -jar ./node_modules/@jnxplus/checkstyle/checkstyle.jar -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  }

  if (options.linter === 'pmd') {
    command = `java -cp ./node_modules/@jnxplus/pmd/lib/*${getClassPathDelimiter()}. net.sourceforge.pmd.PMD -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  }

  if (options.linter === 'ktlint') {
    command = `java -jar ./node_modules/@jnxplus/ktlint/ktlint "${projectSourceRoot}/**/*.kt"`;
  }

  return runCommand(command);
}

function getProjectSourceRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].sourceRoot;
}

function getClassPathDelimiter() {
  const isWin = process.platform === 'win32';
  return isWin ? ';' : ':';
}
