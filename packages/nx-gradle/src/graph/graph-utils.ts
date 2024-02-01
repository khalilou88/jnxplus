import { normalizePath, readJsonFile, workspaceRoot } from '@nx/devkit';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
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

export function getProjectName(
  gradleRootDirectory: string,
  project: GradleProjectType,
) {
  if (project.isProjectJsonExists) {
    const projectJsonPath = path.join(
      workspaceRoot,
      gradleRootDirectory,
      project.relativePath,
      'project.json',
    );

    const projectJson = readJsonFile(projectJsonPath);
    const nxProjectName = projectJson.name;

    if (nxProjectName !== project.name) {
      throw new Error(
        `Nx projectName ${nxProjectName} and Gradle projectName ${project.name} should be the same`,
      );
    }
  }

  return project.name;
}
