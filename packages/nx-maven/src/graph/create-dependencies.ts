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
  MavenMonorepo,
  MavenProjectType,
  getMavenMonorepo,
  getProject,
  removeCache,
} from './graph-context';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const mavenMonorepo: MavenMonorepo = getMavenMonorepo();
  const projects: MavenProjectType[] = mavenMonorepo.projects;

  for (const project of projects) {
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

      const newDependency = {
        source: project.artifactId,
        target: parentProject.artifactId,
        sourceFile: projectSourceFile,
        type: DependencyType.static,
      };

      validateDependency(newDependency, context);
      results.push(newDependency);
    }

    if (
      project.aggregatorProjectArtifactId &&
      project.aggregatorProjectArtifactId !== project.parentProjectArtifactId
    ) {
      const aggregatorProject = getProject(
        projects,
        project.aggregatorProjectArtifactId,
      );

      const newDependency = {
        source: project.artifactId,
        target: aggregatorProject.artifactId,
        sourceFile: projectSourceFile,
        type: DependencyType.static,
      };

      validateDependency(newDependency, context);
      results.push(newDependency);
    }

    const dependencies = getDependencyProjects(project, projects);
    for (const dependency of dependencies) {
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

  // Remove cached data
  removeCache();

  return results;
};

function getDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) => project.dependencies.includes(p.artifactId));
}
