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
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { getArtifactId, getMavenRootDirectory } from '../utils';

export const createDependencies: CreateDependencies = (
  _,
  context: CreateDependenciesContext,
) => {
  const results: RawProjectGraphDependency[] = [];

  const mavenRootDirectory = getMavenRootDirectory();
  const projects: MavenProjectType[] = [];
  addProjects(mavenRootDirectory, projects, '');

  for (const project of projects) {
    const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

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

  return results;
};

type MavenProjectType = {
  artifactId: string;
  projectDirPath: string;
  dependencies: (string | undefined)[];
  parentProjectArtifactId?: string;
  aggregatorProjectArtifactId?: string;
};

function addProjects(
  mavenRootDirectory: string,
  projects: MavenProjectType[],
  projectRelativePath: string,
  aggregatorProjectArtifactId?: string,
) {
  //projectAbsolutePath
  const projectAbsolutePath = join(
    workspaceRoot,
    mavenRootDirectory,
    projectRelativePath,
  );
  const pomXmlPath = join(projectAbsolutePath, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);

  //artifactId
  const artifactId = getArtifactId(pomXmlContent);

  const parentProjectArtifactId = getParentProjectName(pomXmlContent);
  const dependencies = getDependencyArtifactIds(pomXmlContent);
  projects.push({
    artifactId: artifactId,
    projectDirPath: projectAbsolutePath,
    dependencies: dependencies,
    parentProjectArtifactId: parentProjectArtifactId,
    aggregatorProjectArtifactId: aggregatorProjectArtifactId,
  });

  const modulesXmlElement = pomXmlContent.childNamed('modules');
  if (modulesXmlElement === undefined) {
    return;
  }

  const moduleXmlElementArray = modulesXmlElement.childrenNamed('module');
  if (moduleXmlElementArray.length === 0) {
    return;
  }

  for (const moduleXmlElement of moduleXmlElementArray) {
    const moduleRelativePath = joinPathFragments(
      projectRelativePath,
      moduleXmlElement.val.trim(),
    );
    addProjects(mavenRootDirectory, projects, moduleRelativePath, artifactId);
  }
}

function getParentProjectName(pomXmlContent: XmlDocument): string | undefined {
  const parentXmlElement = pomXmlContent.childNamed('parent');
  if (parentXmlElement === undefined) {
    return undefined;
  }

  const relativePath = parentXmlElement.childNamed('relativePath')?.val;

  if (!relativePath) {
    return undefined;
  }

  return parentXmlElement.childNamed('artifactId')?.val;
}

function getProject(projects: MavenProjectType[], artifactId: string) {
  const project = projects.find((project) => project.artifactId === artifactId);

  if (!project) {
    throw new Error(`Project ${artifactId} not found`);
  }

  return project;
}

function getDependencyArtifactIds(pomXml: XmlDocument) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  return dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId')?.val;
    });
}

function getDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) => project.dependencies.includes(p.artifactId));
}
