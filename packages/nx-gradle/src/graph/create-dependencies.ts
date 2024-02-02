import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  joinPathFragments,
  validateDependency,
} from '@nx/devkit';
import { getGradleRootDirectory } from '../utils';
import { getGradleProjects } from './graph-utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const gradleRootDirectory = getGradleRootDirectory();

  const projects = getGradleProjects();

  for (const project of projects) {
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

  return results;
};
