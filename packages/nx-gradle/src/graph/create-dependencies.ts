import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  joinPathFragments,
  RawProjectGraphDependency,
  validateDependency,
} from '@nx/devkit';
import * as path from 'path';
import { getGradleRootDirectory } from '../utils';
import { getGradleProjects, GradleProjectType } from './graph-utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const gradleRootDirectory = getGradleRootDirectory();

  const projects = getGradleProjects();

  Object.keys(context.filesToProcess.projectFileMap).forEach((source) => {
    Object.values(context.filesToProcess.projectFileMap[source]).forEach(
      (fileData) => {
        const filePath = fileData.file;
        if (
          path.basename(filePath) === 'build.gradle' ||
          path.basename(filePath) === 'build.gradle.kts'
        ) {
          const project = projects.find(
            (element: GradleProjectType) =>
              joinPathFragments(
                gradleRootDirectory,
                element.relativePath,
                'build.gradle',
              ) === filePath ||
              joinPathFragments(
                gradleRootDirectory,
                element.relativePath,
                'build.gradle.kts',
              ) === filePath,
          );

          if (!project) {
            throw new Error(`Can't find project for file: ${filePath}`);
          }

          const buildFile = project.isBuildGradleExists
            ? 'build.gradle'
            : 'build.gradle.kts';

          const projectSourceFile = joinPathFragments(
            gradleRootDirectory,
            project.relativePath,
            buildFile,
          );

          if (project.parentProjectName) {
            const newDependency = {
              source: project.name,
              target: project.parentProjectName,
              sourceFile: projectSourceFile,
              type: DependencyType.static,
            };

            validateDependency(newDependency, context);
            results.push(newDependency);
          }

          for (const dependency of project.dependencies) {
            const newDependency = {
              source: project.name,
              target: dependency.name,
              sourceFile: projectSourceFile,
              type: DependencyType.static,
            };

            validateDependency(newDependency, context);
            results.push(newDependency);
          }
        }
      },
    );
  });

  return results;
};
