import { jnxplusGradlePluginVersion } from '@jnxplus/common';
import { normalizePath, workspaceRoot } from '@nx/devkit';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';
import * as fs from 'fs';

interface GradleProject1Type {
  name: string;
  relativePath: string;
  isProjectJsonExists: boolean;
  isBuildGradleExists: boolean;
}

interface GradleProject2Type {
  isBuildGradleKtsExists: boolean;
  isSettingsGradleExists: boolean;
  isSettingsGradleKtsExists: boolean;
  isGradlePropertiesExists: boolean;
  parentProjectName: string;
  dependencies: GradleProject1Type[];
}

export type GradleProjectType = GradleProject1Type & GradleProject2Type;

export const outputFile = path.join(
  projectGraphCacheDirectory,
  'nx-gradle-deps.json',
);

export function getProjectRoot(
  gradleRootDirectory: string,
  project: GradleProjectType,
) {
  let projectRoot = normalizePath(
    path.relative(
      workspaceRoot,
      path.join(workspaceRoot, gradleRootDirectory, project.relativePath),
    ),
  );

  // projectRoot should not be an empty string
  if (!projectRoot) {
    projectRoot = '.';
  }

  return projectRoot;
}

export function isGradlePluginOutdated(gradleRootDirectory: string) {
  //1 get version from gradle.properties
  const gradlePropertiesPath = path.join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle.properties',
  );
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8',
  );
  const version1 = getJnxplusGradlePluginVersionFromGradleProperties(
    gradlePropertiesContent,
  );

  if (version1) {
    return version1 === jnxplusGradlePluginVersion;
  }

  //2 get version from build.gradle(.kts)

  //3 get version from libs.versions.toml

  return false;
}

function getJnxplusGradlePluginVersionFromGradleProperties(
  gradlePropertiesContent: string,
) {
  const regexp = /jnxplusGradlePluginVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}
