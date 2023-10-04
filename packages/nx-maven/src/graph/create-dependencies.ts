import {
  CreateDependencies,
  DependencyType,
  RawProjectGraphDependency,
  validateDependency,
} from '@nx/devkit';

import { joinPathFragments, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import * as path from 'path';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml } from '../utils/xml';

export const createDependencies: CreateDependencies = (context) => {
  const results: RawProjectGraphDependency[] = [];

  const projects: MavenProjectType[] = [];
  addProjects(projects, '');

  for (const project of projects) {
    const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

    const projectSourceFile = joinPathFragments(projectRoot, 'pom.xml');

    if (project.parentProjectArtifactId) {
      const parentProject = getProject(
        projects,
        project.parentProjectArtifactId,
      );

      const newDependency = {
        source: project.name ?? project.artifactId,
        target: parentProject.name ?? parentProject.artifactId,
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
        source: project.name ?? project.artifactId,
        target: aggregatorProject.name ?? aggregatorProject.artifactId,
        sourceFile: projectSourceFile,
        type: DependencyType.static,
      };

      validateDependency(newDependency, context);
      results.push(newDependency);
    }

    const dependencies = getDependencyProjects(project, projects);
    for (const dependency of dependencies) {
      const newDependency = {
        source: project.name ?? project.artifactId,
        target: dependency.name ?? dependency.artifactId,
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
  name?: string;
  artifactId: string;
  projectDirPath: string;
  dependencies: (string | undefined)[];
  parentProjectArtifactId?: string;
  aggregatorProjectArtifactId?: string;
};

function addProjects(
  projects: MavenProjectType[],
  projectRoot: string,
  aggregatorProjectArtifactId?: string,
) {
  //projectDirPath
  const projectDirPath = join(workspaceRoot, projectRoot);
  const projectJsonPath = join(projectDirPath, 'project.json');
  const pomXmlPath = join(projectDirPath, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);

  //artifactId
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`artifactId not found in pom.xml ${pomXmlPath}`);
  }
  const artifactId = artifactIdXml.val;

  //projectName
  let projectName;
  const isProjectJsonExists = fileExists(projectJsonPath);
  if (isProjectJsonExists) {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    projectName = projectJson.name;
  }

  const parentProjectArtifactId = getParentProjectName(pomXmlContent);
  const dependencies = getDependencyArtifactIds(pomXmlContent);
  projects.push({
    name: projectName,
    artifactId: artifactId,
    projectDirPath: projectDirPath,
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
    const moduleRoot = joinPathFragments(
      projectRoot,
      moduleXmlElement.val.trim(),
    );
    addProjects(projects, moduleRoot, artifactId);
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
