import {
  checkstyleVersion,
  getProjectRoot,
  ktlintVersion,
} from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'gradlew.bat' : './gradlew';
}

export function getProjectPath(context: ExecutorContext) {
  const projectRoot = getProjectRoot(context);
  return `:${getProjectPathFromProjectRoot(projectRoot)}`;
}

export function getProjectPathFromProjectRoot(projectRoot: string) {
  return projectRoot.replace(new RegExp('/', 'g'), ':');
}

export function getProjectRootFromProjectPath(projectPath: string) {
  if (projectPath.startsWith(':')) {
    throw new Error(`Path ${projectPath} should not starts with two dots (:)`);
  }

  return projectPath.replace(/:/g, '/');
}

export function getQuarkusVersion(gradlePropertiesContent: string) {
  const regexp = /quarkusVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

function readKtlintVersion(gradlePropertiesContent: string) {
  const regexp = /ktlintVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getKtlintVersion(dir: string) {
  const gradlePropertiesPath = path.join(dir, 'gradle.properties');
  let version = undefined;
  if (fs.existsSync(gradlePropertiesPath)) {
    const gradlePropertiesContent = fs.readFileSync(
      gradlePropertiesPath,
      'utf-8'
    );
    version = readKtlintVersion(gradlePropertiesContent);
  }
  return version === undefined ? ktlintVersion : version;
}

function readCheckstyleVersion(gradlePropertiesContent: string) {
  const regexp = /checkstyleVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getCheckstyleVersion(dir: string) {
  const gradlePropertiesPath = path.join(dir, 'gradle.properties');
  let version = undefined;
  if (fs.existsSync(gradlePropertiesPath)) {
    const gradlePropertiesContent = fs.readFileSync(
      gradlePropertiesPath,
      'utf-8'
    );
    version = readCheckstyleVersion(gradlePropertiesContent);
  }
  return version === undefined ? checkstyleVersion : version;
}

export function canUseGradleTask() {
  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');

  if (!fs.existsSync(gradlePropertiesPath)) {
    return false;
  }

  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );

  return jnxplusGradlePluginExists(gradlePropertiesContent);
}

export function jnxplusGradlePluginExists(gradlePropertiesContent: string) {
  const regexp = /jnxplusGradlePluginVersion=(.*)/g;
  const matches = gradlePropertiesContent.match(regexp) || [];
  return matches.length > 0;
}
