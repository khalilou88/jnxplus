import { runCommand } from '@jnxplus/common';
import { RunCommandsExecutorSchema } from './schema';
import { workspaceRoot } from '@nx/devkit';
import { join } from 'path';
import { getExecutable } from '../../utils';

export default async function runExecutor(options: RunCommandsExecutorSchema) {
  console.log('Executor ran for RunCommands', options);
  return runCommand(
    `${getExecutable()} ${options.command}`,
    join(workspaceRoot, options.cwd),
  );
}
