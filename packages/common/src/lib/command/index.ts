import { logger } from '@nx/devkit';
import { spawnSync } from 'child_process';

export function runCommand(
  command: string,
  workDir: string,
): { success: boolean } {
  const isVerbose = process.env['NX_VERBOSE_LOGGING'] === 'true';

  try {
    if (isVerbose) {
      logger.debug(`Running command: ${command} from: ${workDir}`);
    }
    spawnSync(command, {
      cwd: workDir,
      stdio: 'inherit',
      env: process.env,
      encoding: 'utf-8',
      shell: true,
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
