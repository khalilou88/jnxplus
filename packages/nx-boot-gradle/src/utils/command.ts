import { ExecutorContext, logger } from '@nrwl/devkit';
import { execSync } from 'child_process';

export async function wait() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

export function getProjectPath(context: ExecutorContext) {
  const projectFolder = context.workspace.projects[context.projectName].root;
  return `:${projectFolder.split('/').join(':')}`;
}

function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'gradlew.bat' : './gradlew';
}

export function runCommand(command: string): { success: boolean } {
  const executable = getExecutable();

  // Create the command to execute
  const execute = `${executable} ${command}`;

  try {
    logger.info(`Executing command: ${execute}`);
    execSync(execute, { cwd: process.cwd(), stdio: [0, 1, 2] });
    return { success: true };
  } catch (e) {
    logger.error(`Failed to execute command: ${execute}`);
    logger.error(e);
    return { success: false };
  }
}
