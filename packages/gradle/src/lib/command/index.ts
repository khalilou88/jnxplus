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

function getktlintVersion(gradlePropertiesContent: string) {
  const regexp = /ktlintVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export async function getKtlintAbsolutePath() {
  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );
  const versionFromFile = getktlintVersion(gradlePropertiesContent);

  const version =
    versionFromFile === undefined ? ktlintVersion : versionFromFile;

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

function getCheckstyleVersion(gradlePropertiesContent: string) {
  const regexp = /checkstyleVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export async function getCheckstyleJarAbsolutePath() {
  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );
  const versionFromFile = getCheckstyleVersion(gradlePropertiesContent);

  const version =
    versionFromFile === undefined ? checkstyleVersion : versionFromFile;

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
