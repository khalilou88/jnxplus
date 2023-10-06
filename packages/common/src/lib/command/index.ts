import { logger, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

export function getGradleExecutable() {
  let executable = '';

  if (process.env['NX_SKIP_GRADLE_WRAPPER'] === 'true') {
    executable = 'gradle';
  } else {
    const isWrapperExists = isWrapperExistsFunction();

    if (isWrapperExists) {
      const isWin = process.platform === 'win32';
      executable = isWin ? 'gradlew.bat' : './gradlew';
    } else {
      executable = 'gradle';
    }
  }

  if (process.env['NX_GRADLE_CLI_OPTS']) {
    executable += ` ${process.env['NX_GRADLE_CLI_OPTS']}`;
  }

  return executable;
}

function isWrapperExistsFunction() {
  const gradlePath = path.join(workspaceRoot, 'gradlew');
  return fs.existsSync(gradlePath);
}
