import { jnxplusGradlePluginVersion } from '@jnxplus/common';
import { joinPathFragments, logger } from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

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

//TODO workspace-data didn't work
export const outputDirectory = path.join('.nx', 'cache', 'nx-gradle');

export const outputFile = path.join(outputDirectory, 'nx-gradle-deps.json');

export function getProjectRoot(
  gradleRootDirectory: string,
  project: GradleProjectType,
) {
  let projectRoot = joinPathFragments(
    gradleRootDirectory,
    project.relativePath,
  );

  // projectRoot should not be an empty string
  if (!projectRoot) {
    projectRoot = '.';
  }

  return projectRoot;
}

export function getGradleProjects() {
  const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  if (result.pluginVersion !== jnxplusGradlePluginVersion) {
    logger.warn(
      `You are not using the supported version of io.github.khalilou88.jnxplus plugin. Please use version ${jnxplusGradlePluginVersion}`,
    );
  }

  return result.projects;
}
