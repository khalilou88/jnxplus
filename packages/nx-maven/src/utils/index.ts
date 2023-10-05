import {
  checkstyleVersion,
  getProjectRoot,
  ktlintVersion,
} from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { readXml } from '@jnxplus/xml';

export function getExecutable() {
  let executable = '';

  const isWrapperExists = isWrapperExistsFunction();

  if (isWrapperExists) {
    const isWin = process.platform === 'win32';
    executable = isWin ? 'mvnw.cmd' : './mvnw';
  } else {
    executable = 'mvn';
  }

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    executable += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  return executable;
}

function isWrapperExistsFunction() {
  const mvnwPath = path.join(workspaceRoot, 'mvnw');
  return fs.existsSync(mvnwPath);
}

export function isPomPackaging(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
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
