import { getProjectRoot } from '@jnxplus/common';
import { readXml } from '@jnxplus/xml';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

export function getExecutable() {
  let executable = '';

  if (process.env['NX_SKIP_MAVEN_WRAPPER'] === 'true') {
    executable = 'mvn';
  } else {
    const isWrapperExists = isWrapperExistsFunction();

    if (isWrapperExists) {
      const isWin = process.platform === 'win32';
      executable = isWin ? 'mvnw.cmd' : './mvnw';
    } else {
      executable = 'mvn';
    }
  }

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    executable += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  return executable;
}

function isWrapperExistsFunction() {
  const mavenRootDirectory = getMavenRootDirectory();
  const mvnwPath = path.join(workspaceRoot, mavenRootDirectory, 'mvnw');
  return fs.existsSync(mvnwPath);
}

export function getMavenRootDirectory() {
  const pomXmlPath = path.join(workspaceRoot, 'pom.xml');
  if (fs.existsSync(pomXmlPath)) {
    return '';
  }
  return 'nx-maven';
}
