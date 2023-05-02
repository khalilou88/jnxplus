import {
  checkstyleVersion,
  getProjectRoot,
  ktlintVersion,
  readXml,
} from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
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

export function getKtlintVersion() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const ktlintVersionXml = parentPomXmlContent
    .childNamed('properties')
    ?.childNamed('ktlint.version');

  return ktlintVersionXml === undefined ? ktlintVersion : ktlintVersionXml.val;
}

export function getCheckstyleVersion() {
  const parentPomXmlPath = path.join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const checkstyleVersionXml = parentPomXmlContent
    .childNamed('properties')
    ?.childNamed('checkstyle.version');

  return checkstyleVersionXml === undefined
    ? checkstyleVersion
    : checkstyleVersionXml.val;
}
