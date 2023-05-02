import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as stream from 'stream';
import { promisify } from 'util';

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

export function getProjectType(context: ExecutorContext) {
  return context.projectsConfigurations?.projects[context.projectName || '']
    .projectType;
}

export function getProjectSourceRoot(context: ExecutorContext) {
  return context.projectsConfigurations?.projects[context.projectName || '']
    .sourceRoot;
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

export function getPmdExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'pmd.bat' : 'pmd';
}

const finished = promisify(stream.finished);
export async function downloadFile(
  fileUrl: string,
  outputLocationPath: string
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
): Promise<any> {
  const writer = fs.createWriteStream(outputLocationPath);
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then((response) => {
    response.data.pipe(writer);
    return finished(writer); //this is a Promise
  });
}

export function getProjectRoot(context: ExecutorContext) {
  return context.projectsConfigurations?.projects[context.projectName || '']
    .root;
}

export function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return projectRoot === '';
}
