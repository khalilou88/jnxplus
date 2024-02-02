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

type ResultType = {
  pluginVersion: string;
  projects: GradleProjectType[];
};

export function getGradleProjects() {
  let gradleProjects: GradleProjectType[] = [];

  try {
    const result: ResultType = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

    if (result.pluginVersion !== jnxplusGradlePluginVersion) {
      throw new Error(
        `You are not using the supported version of io.github.khalilou88.jnxplus plugin. Please use version ${jnxplusGradlePluginVersion}`,
      );
    }
    gradleProjects = result.projects;
  } catch (err) {
    throw new Error(
      `You are not using the supported version of io.github.khalilou88.jnxplus plugin. Please use version ${jnxplusGradlePluginVersion}`,
    );
  }

  return gradleProjects;
}
