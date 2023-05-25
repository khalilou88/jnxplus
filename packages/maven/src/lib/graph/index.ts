import { getProjectGraphNodeType } from '@jnxplus/common';
import {
  Hasher,
  ProjectGraphBuilder,
  joinPathFragments,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import * as path from 'path';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml } from '../xml';

type MavenProjectType = {
  name?: string;
  artifactId: string;
  projectDirPath: string;
  parentProjectName?: string;
  aggregatorProjectName?: string;
};

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string
) {
  const projects: MavenProjectType[] = [];
  addProjects(builder, hasher, projects, pluginName, '');
  addDependencies(builder, projects);
}

function addProjects(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  projects: MavenProjectType[],
  pluginName: string,
  projectRoot: string,
  aggregatorProjectName?: string
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

  //isProjectJsonExists
  const isProjectJsonExists = fileExists(projectJsonPath);

  //name
  let projectName;
  if (isProjectJsonExists) {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    projectName = projectJson.name;
  }

  //add project to graph
  if (!isProjectJsonExists) {
    const projectGraphNodeType = getProjectGraphNodeType(projectRoot);
    builder.addNode({
      name: artifactId,
      type: projectGraphNodeType,
      data: {
        root: projectRoot,
        projectType: projectGraphNodeType === 'app' ? 'application' : 'library',
        targets: {
          build: {
            executor: `${pluginName}:build`,
          },
          'run-task': {
            executor: `${pluginName}:run-task`,
          },
        },
        files: [
          {
            file: joinPathFragments(projectRoot, 'pom.xml'),
            hash: hasher.hashFile(joinPathFragments(projectRoot, 'pom.xml')),
          },
        ],
      },
    });
  }

  const parentProjectName = getParentProjectName(pomXmlContent);

  projects.push({
    name: projectName,
    artifactId: artifactId,
    projectDirPath: projectDirPath,
    parentProjectName: parentProjectName,
    aggregatorProjectName: aggregatorProjectName,
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
    const moduleRoot = joinPathFragments(projectRoot, moduleXmlElement.val);
    addProjects(builder, hasher, projects, pluginName, moduleRoot, artifactId);
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

function addDependencies(
  builder: ProjectGraphBuilder,
  projects: MavenProjectType[]
) {
  for (const project of projects) {
    const pomXmlPath = join(project.projectDirPath, 'pom.xml');
    const pomXmlContent = readXml(pomXmlPath);
    const dependencies = getDependencies(pomXmlContent, projects);

    const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

    const projectSourceFile = joinPathFragments(projectRoot, 'pom.xml');

    if (project.parentProjectName) {
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        project.parentProjectName,
        projectSourceFile
      );
    }

    if (project.aggregatorProjectName) {
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        project.aggregatorProjectName,
        projectSourceFile
      );
    }

    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        dependency.name ?? dependency.artifactId,
        projectSourceFile
      );
    }
  }
}

function getDependencies(pomXml: XmlDocument, projects: MavenProjectType[]) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  const dependencies = dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId')?.val;
    });

  return projects.filter((project) =>
    dependencies.includes(project.artifactId)
  );
}
