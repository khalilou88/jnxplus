import { ExecutorContext } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { runCommand } from '@jnxplus/common';
import { BuildImageExecutorSchema } from './schema';

export default async function run1Executor(
  options: BuildImageExecutorSchema,
  context: ExecutorContext
) {
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:bootBuildImage`
  );
}
