import {
  checkstyleVersion,
  downloadFile,
  getProjectRoot,
  ktlintVersion,
  readXml,
} from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'mvnw.cmd' : './mvnw';
}

export function isPomPackaging(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context) || '';
  const pomXmlPath = path.join(context.root, projectRoot, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}

export async function getKtlintAbsolutePath() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const ktlintVersionXml = parentPomXmlContent
    .childNamed('properties')
    ?.childNamed('ktlint.version');

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
  if (!fs.existsSync(ktlintAbsolutePath)) {
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  }
  return ktlintAbsolutePath;
}

export async function getCheckstyleJarAbsolutePath() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const checkstyleVersionXml = parentPomXmlContent
    .childNamed('properties')
    ?.childNamed('checkstyle.version');

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

  if (!fs.existsSync(checkstyleJarAbsolutePath)) {
    await downloadFile(downloadUrl, checkstyleJarAbsolutePath);
  }
  return checkstyleJarAbsolutePath;
}
