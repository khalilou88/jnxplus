import { runCommand } from '@jnxplus/common';
import { RunCommandsExecutorSchema } from './schema';
import { workspaceRoot } from '@nx/devkit';
import { join } from 'path';

export default async function runExecutor(options: RunCommandsExecutorSchema) {
  console.log('Executor ran for RunCommands', options);
  return runCommand(
    `${getExecutable()} ${options.command}`,
    join(workspaceRoot, options.cwd),
  );
}

//TODO find a solution for this
function getExecutable() {
  const isWin = process.platform === 'win32';
  let executable = isWin ? 'gradlew.bat' : './gradlew';

  if (process.env['NX_GRADLE_CLI_OPTS']) {
    executable += ` ${process.env['NX_GRADLE_CLI_OPTS']}`;
  }

  return executable;
}
