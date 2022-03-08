import { ExecutorContext, logger } from '@nrwl/devkit';
import { execSync } from 'child_process';
import { resolve } from 'path';

export async function waitForever() {
  return new Promise(() => {
    // wait forever
  });
}

export function getProjectRoot(context: ExecutorContext) {
  return context.workspace.projects[context.projectName].root;
}

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'mvnw.cmd' : './mvnw';
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
