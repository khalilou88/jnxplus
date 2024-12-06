import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  RawProjectGraphDependency,
  joinPathFragments,
  logger,
  normalizePath,
  validateDependency,
} from '@nx/devkit';
import * as path from 'path';
import { getPlugin, getSkipAggregatorProjectLinkingOption } from '../utils';
import {
  MavenProjectType,
  WorkspaceDataType,
  getCachedWorkspaceData,
  getProject,
  removeWorkspaceDataCache,
} from './graph-utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const cachedWorkspaceData: WorkspaceDataType = getCachedWorkspaceData();
  const projects: MavenProjectType[] = cachedWorkspaceData.projects;

  const plugin = getPlugin();
  const skipAggregatorProjectLinkingOption =
    getSkipAggregatorProjectLinkingOption(plugin);

  Object.keys(context.filesToProcess.projectFileMap).forEach((source) => {
    Object.values(context.filesToProcess.projectFileMap[source]).forEach(
      (fileData) => {
        const filePath = fileData.file;
        if (path.basename(filePath) === 'pom.xml') {
          const normalizedFilePath = normalizePath(filePath);

          const project = projects.find(
            (element) =>
              joinPathFragments(element.projectRoot, 'pom.xml') ===
              normalizedFilePath,
          );

          if (!project) {
            logger.warn(`filePath: ${filePath}`);
            logger.warn(`normalizeFilePath: ${normalizedFilePath}`);

            throw new Error(`Can't find project for file: ${filePath}`);
          }

          if (!project.skipProject) {
            const projectSourceFile = joinPathFragments(
              project.projectRoot,
              'pom.xml',
            );

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

            if (skipAggregatorProjectLinkingOption === false) {
              if (
                project.aggregatorProjectArtifactId &&
                project.aggregatorProjectArtifactId !==
                  project.parentProjectArtifactId
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

            const profileDependencies = getProfileDependencyProjects(
              project,
              projects,
            );
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

            const pluginDependencies = getPluginDependencyProjects(
              project,
              projects,
            );
            for (const pluginDependency of pluginDependencies) {
              if (!pluginDependency.skipProject) {
                const newDependency = {
                  source: project.artifactId,
                  target: pluginDependency.artifactId,
                  sourceFile: projectSourceFile,
                  type: DependencyType.static,
                };

                validateDependency(newDependency, context);
                results.push(newDependency);
              }
            }
          }
        }
      },
    );
  });

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

function getPluginDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) =>
    project.pluginDependencies.includes(p.artifactId),
  );
}
