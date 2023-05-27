import { ExecutorContext } from '@nx/devkit';
import { getProjectSourceRoot, runCommand } from '../../.';
import { LintExecutorSchema } from './schema';

export default async function runExecutor(
  options: LintExecutorSchema,
  context: ExecutorContext,
  ktlintPath: string
) {
  const projectSourceRoot = getProjectSourceRoot(context);
  const command = `java --add-opens java.base/java.lang=ALL-UNNAMED -jar ${ktlintPath} "${projectSourceRoot}/**/*.kt"`;
  return runCommand(command);
}
