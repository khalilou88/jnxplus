import { ExecutorContext } from '@nx/devkit';
import { getExecutable, getProjectPath } from '../../../.';
import { runCommand } from '@jnxplus/common';
import { BootBuildImageExecutorSchema } from './schema';

export default async function runBootBuildImageExecutor(
  options: BootBuildImageExecutorSchema,
  context: ExecutorContext
) {
  return runCommand(
    `${getExecutable()} ${getProjectPath(context)}:bootBuildImage`
  );
}
