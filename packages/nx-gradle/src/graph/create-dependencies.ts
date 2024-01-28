import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  joinPathFragments,
  validateDependency,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';
import {
  getExecutable,
  getGradleRootDirectory,
  getProjectName,
} from '../utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const outputFile = path.join(
    projectGraphCacheDirectory,
    'nx-gradle-deps.json',
  );

  const command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

  const gradleRootDirectory = getGradleRootDirectory();
  execSync(command, {
    cwd: path.join(workspaceRoot, gradleRootDirectory),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
    windowsHide: true,
  });

  const projects: GradleProjectType[] = JSON.parse(
    fs.readFileSync(outputFile, 'utf8'),
  );

  for (const project of projects) {
    if (project.isBuildGradleExists || project.isBuildGradleKtsExists) {
      const projectName = getProjectName(
        project.relativePath,
        project.isProjectJsonExists,
      );

      const buildFile = project.isBuildGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      const projectSourceFile = joinPathFragments(
        gradleRootDirectory,
        project.relativePath,
        buildFile,
      );

      const parentProject = getParentProject(
        projects,
        project.parentProjectName,
      );
      if (parentProject) {
        const parentProjectName = getProjectName(
          parentProject.relativePath,
          parentProject.isProjectJsonExists,
        );

        const newDependency = {
          source: projectName,
          target: parentProjectName,
          sourceFile: projectSourceFile,
          type: DependencyType.static,
        };

        validateDependency(newDependency, context);
        results.push(newDependency);
      }

      for (const dependency of project.dependencies) {
        const dependencyName = getProjectName(
          dependency.relativePath,
          dependency.isProjectJsonExists,
        );

        const newDependency = {
          source: projectName,
          target: dependencyName,
          sourceFile: projectSourceFile,
          type: DependencyType.static,
        };

        validateDependency(newDependency, context);
        results.push(newDependency);
      }
    }
  }

  return results;
};

type GradleProject1Type = {
  name: string;
  relativePath: string;
  isProjectJsonExists: boolean;
  isBuildGradleExists: boolean;
};

type GradleProject2Type = {
  isBuildGradleKtsExists: boolean;
  isSettingsGradleExists: boolean;
  isSettingsGradleKtsExists: boolean;
  isGradlePropertiesExists: boolean;
  parentProjectName: string;
  dependencies: GradleProject1Type[];
};

type GradleProjectType = GradleProject1Type & GradleProject2Type;

function getParentProject(
  projects: GradleProjectType[],
  parentProjectName: string,
): GradleProjectType | undefined {
  const project = projects.find(
    (element) => element.name === parentProjectName,
  );

  if (!project) {
    return undefined;
  }

  if (
    project.isBuildGradleExists ||
    project.isBuildGradleKtsExists ||
    project.isSettingsGradleExists ||
    project.isSettingsGradleKtsExists
  ) {
    return project;
  }

  return getParentProject(projects, project.parentProjectName);
}
