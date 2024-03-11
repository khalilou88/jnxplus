import { logger } from '@nx/devkit';
import { execSync } from 'child_process';

export function runCommand(
  command: string,
  workDir: string,
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
  } catch (e) {
    if (isVerbose) {
      logger.error(`Failed to execute command: ${command}`);
      logger.error(e);
    }
    return { success: false };
  }
  return { success: true };
}
