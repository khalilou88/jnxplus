import { readXml } from '@jnxplus/xml';
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
  getArtifactId,
  getPlugin,
  getSkipAggregatorProjectLinkingOption,
} from '../utils';
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
        if (path.basename(fileData.file) === 'pom.xml') {
          const pomXmlContent = readXml(fileData.file);
          const artifactId = getArtifactId(pomXmlContent);

          const project = projects.find(
            (element) => element.artifactId === artifactId,
          );

          if (!project) {
            throw new Error(`Can't find project with artifactId ${artifactId}`);
          }

          if (!project.skipProject) {
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
