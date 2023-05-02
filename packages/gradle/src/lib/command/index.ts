import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { checkstyleVersion, ktlintVersion } from '@jnxplus/common';
import { downloadFile } from '@jnxplus/common';

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'gradlew.bat' : './gradlew';
}

export function getProjectPath(context: ExecutorContext) {
  const projectFolder =
    context.projectsConfigurations?.projects[context.projectName || ''].root ||
    '';
  return `:${projectFolder.split('/').join(':')}`;
}

export function getQuarkusPlatformVersion(gradlePropertiesContent: string) {
  const regexp = /quarkusPlatformVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

function getktlintVersion2(gradlePropertiesContent: string) {
  const regexp = /ktlintVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getKtlintVersion() {
  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );
  const versionFromFile = getktlintVersion2(gradlePropertiesContent);

  const version =
    versionFromFile === undefined ? ktlintVersion : versionFromFile;
  return version;
}

function getCheckstyleVersion2(gradlePropertiesContent: string) {
  const regexp = /checkstyleVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getCheckstyleVersion() {
  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );
  const versionFromFile = getCheckstyleVersion2(gradlePropertiesContent);

  const version =
    versionFromFile === undefined ? checkstyleVersion : versionFromFile;
  return version;
}
