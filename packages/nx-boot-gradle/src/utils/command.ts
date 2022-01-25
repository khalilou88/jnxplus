import { ExecutorContext, logger } from '@nrwl/devkit';
import { execSync } from 'child_process';

export async function waitForever() {
  return new Promise(() => {
    // wait forever
  });
}

export function getProjectPath(context: ExecutorContext) {
  const projectFolder = context.workspace.projects[context.projectName].root;
  return `:${projectFolder.split('/').join(':')}`;
}

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'gradlew.bat' : './gradlew';
}

export function runCommand(command: string): { success: boolean } {
  try {
    if (process.env.VERBOSE_OUTPUT) {
      logger.debug(`Executing command: ${command}`);
    }
    execSync(command, { cwd: process.cwd(), stdio: [0, 1, 2] });
    return { success: true };
  } catch (e) {
    if (process.env.VERBOSE_OUTPUT) {
      logger.error(`Failed to execute command: ${command}`);
      logger.error(e);
    }
    return { success: false };
  }
}

export function getProjectSourceRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].sourceRoot;
}
