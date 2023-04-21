import { ExecutorContext, logger, workspaceRoot } from '@nrwl/devkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  downloadFile,
  getProjectSourceRoot,
  runCommand,
} from '../../utils/command';
import { LintExecutorSchema } from './schema';

import { checkstyleVersion, ktlintVersion } from '../../utils/versions';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Lint: ${JSON.stringify(options)}`);
  let command: string;
  const projectSourceRoot = getProjectSourceRoot(context);

  if (options.linter === 'checkstyle') {
    //TODO get checkstyleVersion from root parent pom
    const checkstyleJarName = `checkstyle-${checkstyleVersion}-all.jar`;
    const downloadUrl = `https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${checkstyleVersion}/${checkstyleJarName}`;

    const outputDirectory = path.join(
      workspaceRoot,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'checkstyle'
    );

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const checkstyleJarAbsolutePath = path.join(
      outputDirectory,
      checkstyleJarName
    );

    await downloadFile(downloadUrl, checkstyleJarAbsolutePath);

    command = `java -jar ${checkstyleJarAbsolutePath} -c ./tools/linters/checkstyle.xml ${projectSourceRoot}`;
  }

  if (options.linter === 'pmd') {
    command = `${getPmdExecutable()} check -f text -R ./tools/linters/pmd.xml -d ${projectSourceRoot}`;
  }

  if (options.linter === 'ktlint') {
    //TODO get ktlint version from root parent pom

    const url = `https://github.com/pinterest/ktlint/releases/download/${ktlintVersion}/ktlint`;

    const outputDirectory = path.join(
      workspaceRoot,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'ktlint'
    );

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const ktlintAbsolutePath = path.join(outputDirectory, 'ktlint');

    await downloadFile(url, ktlintAbsolutePath);

    command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintAbsolutePath} "${projectSourceRoot}/**/*.kt"`;
  }

  return runCommand(command);
}

function getPmdExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'pmd.bat' : 'pmd';
}
