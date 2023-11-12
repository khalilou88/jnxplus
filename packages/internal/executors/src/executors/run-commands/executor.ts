import { runCommand } from '@jnxplus/common';
import { workspaceRoot } from '@nx/devkit';
import { join } from 'path';
import { RunCommandsExecutorSchema } from './schema';

function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'gradlew.bat' : './gradlew';
}

export default async function runExecutor(options: RunCommandsExecutorSchema) {
  console.log('Executor ran for RunCommands', options);
  return runCommand(
    `${getExecutable()} ${options.command}`,
    join(workspaceRoot, options.cwd),
  );
}
