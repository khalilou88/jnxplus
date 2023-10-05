import { getGradleExecutable, runCommand } from '@jnxplus/common';
import { RunCommandsExecutorSchema } from './schema';
import { workspaceRoot } from '@nx/devkit';
import { join } from 'path';

export default async function runExecutor(options: RunCommandsExecutorSchema) {
  console.log('Executor ran for RunCommands', options);
  return runCommand(
    `${getGradleExecutable()} ${options.command}`,
    join(workspaceRoot, options.cwd),
  );
}
