import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  joinPathFragments,
  validateDependency,
  workspaceRoot,
} from '@nx/devkit';
import * as path from 'path';
import {
  MavenProjectType,
  WorkspaceDataType,
  getCachedWorkspaceData,
  getProject,
  removeWorkspaceDataCache,
} from './graph-utils';
import { getPlugin, getSkipAggregatorProjectLinkingOption } from '../utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const cachedWorkspaceData: WorkspaceDataType = getCachedWorkspaceData();
  const projects: MavenProjectType[] = cachedWorkspaceData.projects;

  for (const project of projects) {
    if (project.skipProject) {
      continue;
    }

    const projectRoot = path.relative(
      workspaceRoot,
      project.projectAbsolutePath,
    );

    const projectSourceFile = joinPathFragments(projectRoot, 'pom.xml');

    if (project.parentProjectArtifactId) {
      const parentProject = getProject(
        projects,
        project.parentProjectArtifactId,
      );

      if (!parentProject.skipProject) {
        const newDependency = {
          source: project.artifactId,
          target: parentProject.artifactId,
          sourceFile: projectSourceFile,
          type: DependencyType.static,
        };

        validateDependency(newDependency, context);
        results.push(newDependency);
      }
    }

    const plugin = getPlugin();
    if (getSkipAggregatorProjectLinkingOption(plugin) === false) {
      if (
        project.aggregatorProjectArtifactId &&
        project.aggregatorProjectArtifactId !== project.parentProjectArtifactId
      ) {
        const aggregatorProject = getProject(
          projects,
          project.aggregatorProjectArtifactId,
        );

        if (!aggregatorProject.skipProject) {
          const newDependency = {
            source: project.artifactId,
            target: aggregatorProject.artifactId,
            sourceFile: projectSourceFile,
            type: DependencyType.static,
          };

          validateDependency(newDependency, context);
          results.push(newDependency);
        }
      }
    }

    const dependencies = getDependencyProjects(project, projects);
    for (const dependency of dependencies) {
      if (!dependency.skipProject) {
        const newDependency = {
          source: project.artifactId,
          target: dependency.artifactId,
          sourceFile: projectSourceFile,
          type: DependencyType.static,
        };

        validateDependency(newDependency, context);
        results.push(newDependency);
      }
    }

    const profileDependencies = getProfileDependencyProjects(project, projects);
    for (const profileDependency of profileDependencies) {
      if (!profileDependency.skipProject) {
        const newDependency = {
          source: project.artifactId,
          target: profileDependency.artifactId,
          sourceFile: projectSourceFile,
          type: DependencyType.static,
        };

        validateDependency(newDependency, context);
        results.push(newDependency);
      }
    }
  }

  // Remove cached data
  removeWorkspaceDataCache();

  return results;
};

function getDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) => project.dependencies.includes(p.artifactId));
}

function getProfileDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) =>
    project.profileDependencies.includes(p.artifactId),
  );
}
