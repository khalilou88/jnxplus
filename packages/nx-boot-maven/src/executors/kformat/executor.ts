import { ExecutorContext, logger } from '@nrwl/devkit';
import {
  getDependencyRoot,
  getProjectSourceRoot,
  runCommand,
} from '../../utils/command';
import { KotlinFormatExecutorSchema } from './schema';

export default async function runExecutor(
  options: KotlinFormatExecutorSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Kotlin Format: ${JSON.stringify(options)}`);
  const projectSourceRoot = getProjectSourceRoot(context);
  const ktlintRoot = getDependencyRoot(
    '@jnxplus/ktlint',
    `./node_modules/@jnxplus/ktlint`
  );

  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintRoot}/ktlint -F "${projectSourceRoot}/**/*.kt"`;

  return runCommand(command);
}
