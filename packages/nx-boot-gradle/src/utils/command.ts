import { ExecutorContext, logger, workspaceRoot } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { resolve } from 'path';

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
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.debug(`Executing command: ${command}`);
    }
    execSync(command, { cwd: workspaceRoot, stdio: [0, 1, 2] });
    return { success: true };
  } catch (e) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.error(`Failed to execute command: ${command}`);
      logger.error(e);
    }
    return { success: false };
  }
}

export function getProjectSourceRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].sourceRoot;
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

export function getDependencyRoot(dependency) {
  try {
    return resolve(require.resolve(dependency), '../..');
  } catch (error) {
    return `./node_modules/${dependency}`;
  }
}
