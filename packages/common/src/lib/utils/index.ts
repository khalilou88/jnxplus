import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import * as fs from 'fs';
import * as stream from 'stream';
import { promisify } from 'util';
import * as path from 'path';

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

type GetVersionFunction = (dir: string) => string;

export async function getKtlintPath(
  getKtlintVersion: GetVersionFunction,
  dir = workspaceRoot
) {
  const version = getKtlintVersion(dir);

  const downloadUrl = `https://github.com/pinterest/ktlint/releases/download/${version}/ktlint`;

  const outputDirectory = path.join(
    dir,
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
  if (!fs.existsSync(ktlintAbsolutePath)) {
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  }
  return ktlintAbsolutePath;
}

export async function getCheckstylePath(
  getCheckstyleVersion: GetVersionFunction,
  dir = workspaceRoot
) {
  const version = getCheckstyleVersion(dir);

  const checkstyleJarName = `checkstyle-${version}-all.jar`;
  const downloadUrl = `https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${version}/${checkstyleJarName}`;

  const outputDirectory = path.join(
    dir,
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

  if (!fs.existsSync(checkstyleJarAbsolutePath)) {
    await downloadFile(downloadUrl, checkstyleJarAbsolutePath);
  }
  return checkstyleJarAbsolutePath;
}

export function isE2eTest(tmpWorkspaceRoot: string) {
  return (
    fs.existsSync(tmpWorkspaceRoot) && isSubdir(tmpWorkspaceRoot, process.cwd())
  );
}

function isSubdir(parentPath: string, childPath: string) {
  const relative = path.relative(parentPath, childPath);
  const isSubdir =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isSubdir;
}

function isSameDir(path1: string, path2: string) {
  const relative = path.relative(path1, path2);
  return !relative;
}
