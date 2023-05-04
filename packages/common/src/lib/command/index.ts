import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';

export async function waitForever() {
  return new Promise(() => {
    // wait forever
  });
}

export function runCommand(
  command: string,
  workDir: string = workspaceRoot
): { success: boolean } {
  try {
    if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
      logger.debug(`Executing command: ${command}`);
      logger.debug(`WorkDir: ${workDir}`);
    }
    execSync(command, { cwd: workDir, stdio: [0, 1, 2] });
    return { success: true };
  } catch (e) {
    if (process.env['NX_VERBOSE_LOGGING'] === 'true') {
      logger.error(`Failed to execute command: ${command}`);
      logger.error(e);
    }
    return { success: false };
  }
}

export function getPmdExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'pmd.bat' : 'pmd';
}

export function getProjectRoot(context: ExecutorContext) {
  return context.projectsConfigurations?.projects[context.projectName || '']
    .root;
}

export function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return projectRoot === '';
}
