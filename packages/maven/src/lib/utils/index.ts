import {
  checkstyleVersion,
  getProjectRoot,
  ktlintVersion,
} from '@jnxplus/common';
import { ExecutorContext } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { readXml } from '../xml';

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

export function getKtlintVersion(dir: string) {
  const parentPomXmlPath = path.join(dir, 'pom.xml');

  let ktlintVersionXml = undefined;
  if (fs.existsSync(parentPomXmlPath)) {
    const parentPomXmlContent = readXml(parentPomXmlPath);
    ktlintVersionXml = parentPomXmlContent
      .childNamed('properties')
      ?.childNamed('ktlint.version');
  }

  return ktlintVersionXml === undefined ? ktlintVersion : ktlintVersionXml.val;
}

export function getCheckstyleVersion(dir: string) {
  const parentPomXmlPath = path.join(dir, 'pom.xml');

  let checkstyleVersionXml = undefined;
  if (fs.existsSync(parentPomXmlPath)) {
    const parentPomXmlContent = readXml(parentPomXmlPath);
    checkstyleVersionXml = parentPomXmlContent
      .childNamed('properties')
      ?.childNamed('checkstyle.version');
  }

  return checkstyleVersionXml === undefined
    ? checkstyleVersion
    : checkstyleVersionXml.val;
}
