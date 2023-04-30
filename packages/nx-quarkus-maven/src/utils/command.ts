import { ExecutorContext, logger, workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';
import { checkstyleVersion, ktlintVersion } from './versions';
import { readXml } from './xml';

export async function waitForever() {
  return new Promise(() => {
    // wait forever
  });
}

export function getProjectRoot(context: ExecutorContext) {
  return context.projectsConfigurations.projects[context.projectName].root;
}

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'mvnw.cmd' : './mvnw';
}

export function runCommand(
  command: string,
  workDir: string = workspaceRoot
): { success: boolean } {
  try {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      logger.debug(`Executing command: ${command}`);
      logger.debug(`WorkDir: ${workDir}`);
    }
    execSync(command, { cwd: workDir, stdio: [0, 1, 2] });
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
  return context.projectsConfigurations.projects[context.projectName]
    .sourceRoot;
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
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

export async function getKtlintAbsolutePath() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const ktlintVersionXml = parentPomXmlContent
    .childNamed('properties')
    .childNamed('ktlint.version');

  const version =
    ktlintVersionXml === undefined ? ktlintVersion : ktlintVersionXml.val;

  const downloadUrl = `https://github.com/pinterest/ktlint/releases/download/${version}/ktlint`;

  const outputDirectory = path.join(
    workspaceRoot,
    'node_modules',
    '@jnxplus',
    'tools',
    'linters',
    'ktlint'
  );

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const ktlintAbsolutePath = path.join(outputDirectory, 'ktlint');

  await downloadFile(downloadUrl, ktlintAbsolutePath);
  return ktlintAbsolutePath;
}

export async function getCheckstyleJarAbsolutePath() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const checkstyleVersionXml = parentPomXmlContent
    .childNamed('properties')
    .childNamed('checkstyle.version');

  const version =
    checkstyleVersionXml === undefined
      ? checkstyleVersion
      : checkstyleVersionXml.val;

  const checkstyleJarName = `checkstyle-${version}-all.jar`;
  const downloadUrl = `https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${version}/${checkstyleJarName}`;

  const outputDirectory = path.join(
    workspaceRoot,
    'node_modules',
    '@jnxplus',
    'tools',
    'linters',
    'checkstyle'
  );

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const checkstyleJarAbsolutePath = path.join(
    outputDirectory,
    checkstyleJarName
  );

  await downloadFile(downloadUrl, checkstyleJarAbsolutePath);
  return checkstyleJarAbsolutePath;
}

export function getPmdExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'pmd.bat' : 'pmd';
}
