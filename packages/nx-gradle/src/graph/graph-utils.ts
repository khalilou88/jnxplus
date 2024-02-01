import { normalizePath, workspaceRoot } from '@nx/devkit';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';

interface ProjectNamesType {
  name: string;
  nxProjectName?: string;
}

export type GradleProject1Type = ProjectNamesType & {
  relativePath: string;
  isProjectJsonExists: boolean;
  isBuildGradleExists: boolean;
};

interface GradleProject2Type {
  isBuildGradleKtsExists: boolean;
  isSettingsGradleExists: boolean;
  isSettingsGradleKtsExists: boolean;
  isGradlePropertiesExists: boolean;
  parentProjectNames: ProjectNamesType;
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

export function getProjectName(project: ProjectNamesType) {
  if (project.nxProjectName) {
    return project.nxProjectName;
  }

  return project.name;
}
