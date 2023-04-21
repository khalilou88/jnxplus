import { ExecutorContext, logger, workspaceRoot } from '@nrwl/devkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  downloadFile,
  getProjectSourceRoot,
  runCommand,
} from '../../utils/command';
import { KotlinFormatExecutorSchema } from './schema';

import { ktlintVersion } from '../../utils/versions';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  const projectSourceRoot = getProjectSourceRoot(context);

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

  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintAbsolutePath} -F "${projectSourceRoot}/**/*.kt"`;

  return runCommand(command);
}
