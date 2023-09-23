import { logger, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';

export async function waitForever() {
  return new Promise(() => {
    // wait forever
  });
}

export function runCommand(
  command: string,
  workDir: string = workspaceRoot,
): { success: boolean } {
  const isVerbose = process.env['NX_VERBOSE_LOGGING'] === 'true';

  try {
    if (isVerbose) {
      logger.debug(`Running command: ${command} from: ${workDir}`);
    }
    execSync(command, {
      cwd: workDir,
      stdio: 'inherit',
      env: process.env,
      encoding: 'utf-8',
    });
    return { success: true };
  } catch (e) {
    if (isVerbose) {
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
