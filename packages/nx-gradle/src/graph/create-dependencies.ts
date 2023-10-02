import {
  CreateDependencies,
  DependencyType,
  RawProjectGraphDependency,
  validateDependency,
} from '@nx/devkit';

import { getExecutable } from '@jnxplus/gradle';
import { joinPathFragments, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';

export const createDependencies: CreateDependencies = (context) => {
  const results: RawProjectGraphDependency[] = [];

  const isVerbose = process.env['NX_VERBOSE_LOGGING'] === 'true';
  const outputFile = path.join(
    projectGraphCacheDirectory,
    `nx-gradle-deps.json`,
  );

  let command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

  if (isVerbose) {
    command += ' --stacktrace';
  }

  execSync(command, {
    cwd: workspaceRoot,
    stdio: isVerbose ? 'inherit' : 'pipe',
    env: process.env,
    encoding: 'utf-8',
  });

  const projects: GradleProjectType[] = JSON.parse(
    fs.readFileSync(outputFile, 'utf8'),
  );

  for (const project of projects) {
    if (project.isBuildGradleExists || project.isBuildGradleKtsExists) {
      const projectName = getProjectName(project);

      const buildFile = project.isBuildGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      const projectSourceFile = joinPathFragments(
        project.relativePath,
        buildFile,
      );

      const parentProject = getParentProject(
        projects,
        project.parentProjectName,
      );
      if (parentProject) {
        const parentProjectName = getProjectName(parentProject);

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
        const dependencyName = getProjectName(dependency);

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

function getProjectName(project: GradleProject1Type) {
  if (project.isProjectJsonExists) {
    const projectJsonPath = path.join(
      workspaceRoot,
      project.relativePath,
      'project.json',
    );
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    return projectJson.name;
  }

  return project.name;
}

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
