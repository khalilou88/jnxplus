import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';
import { GetVersionFunction } from '../types';
import { readNxJson, workspaceLayout } from 'nx/src/config/configuration';
import { execSync } from 'child_process';

export function getProject(context: ExecutorContext) {
  if (!context.projectName) {
    throw new Error('No project name found in context');
  }

  const project =
    context?.projectsConfigurations?.projects[context.projectName];

  if (!project) {
    throw new Error(
      `No project found in project graph for ${context.projectName}`
    );
  }
  return project;
}

export function getProjectRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.root;
}

export function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return projectRoot === '';
}

export function getProjectType(context: ExecutorContext) {
  const project = getProject(context);
  return project.projectType;
}

export function getProjectSourceRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.sourceRoot;
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

export async function getKtlintPath(
  getKtlintVersion: GetVersionFunction,
  dir = workspaceRoot
) {
  const version = getKtlintVersion(dir);

  const downloadUrl = `https://github.com/pinterest/ktlint/releases/download/${version}/ktlint`;

  let outputDirectory;
  const nxJson = readNxJson();
  if (nxJson.installation) {
    outputDirectory = path.join(
      dir,
      '.nx',
      'installation',
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'ktlint'
    );
  } else {
    outputDirectory = path.join(
      dir,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'ktlint'
    );
  }

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const ktlintAbsolutePath = path.join(outputDirectory, 'ktlint');
  if (!fs.existsSync(ktlintAbsolutePath)) {
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  } else if (isAnotherVersion(ktlintAbsolutePath, version)) {
    fs.unlinkSync(ktlintAbsolutePath);
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  }
  return ktlintAbsolutePath;
}

function isAnotherVersion(ktlintAbsolutePath: string, version: string) {
  const jarVersion = execSync(`java -jar ${ktlintAbsolutePath} --version`)
    .toString()
    .trim();
  return jarVersion !== version;
}

export async function getCheckstylePath(
  getCheckstyleVersion: GetVersionFunction,
  dir = workspaceRoot
) {
  const version = getCheckstyleVersion(dir);

  const checkstyleJarName = `checkstyle-${version}-all.jar`;
  const downloadUrl = `https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${version}/${checkstyleJarName}`;

  let outputDirectory;
  const nxJson = readNxJson();
  if (nxJson.installation) {
    outputDirectory = path.join(
      dir,
      '.nx',
      'installation',
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'checkstyle'
    );
  } else {
    outputDirectory = path.join(
      dir,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'checkstyle'
    );
  }

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

export function getProjectGraphNodeType(
  projectRoot: string
): 'app' | 'e2e' | 'lib' {
  if (!projectRoot) {
    return 'lib';
  }

  const layout = workspaceLayout();

  if (projectRoot.startsWith(layout.appsDir)) {
    return 'app';
  }

  return 'lib';
}
