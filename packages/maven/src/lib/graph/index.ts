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
  projectRoot: string
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

  projects.push({
    name: projectName,
    artifactId: artifactId,
    projectDirPath: projectDirPath,
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
    addProjects(builder, hasher, projects, pluginName, moduleRoot);
  }
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

    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        dependency.name ?? dependency.artifactId,
        joinPathFragments(projectRoot, 'pom.xml')
      );
    }

    const modules = getModules(project.projectDirPath, pomXmlContent, projects);
    for (const module of modules) {
      const moduleRoot = path.relative(workspaceRoot, module.projectDirPath);

      builder.addStaticDependency(
        module.name ?? module.artifactId,
        project.name ?? project.artifactId,
        joinPathFragments(moduleRoot, 'pom.xml')
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

function getModules(
  projectDirPath: string,
  pomXml: XmlDocument,
  projects: MavenProjectType[]
) {
  const modulesXml = pomXml.childNamed('modules');
  if (modulesXml === undefined) {
    return [];
  }

  const modules = modulesXml.childrenNamed('module').map((moduleXmlElement) => {
    const moduleDirPath = join(projectDirPath, moduleXmlElement.val);
    const modulePomXmlPath = join(moduleDirPath, 'pom.xml');
    const modulePomXmlContent = readXml(modulePomXmlPath);
    return modulePomXmlContent.childNamed('artifactId')?.val;
  });

  return projects.filter((project) => modules.includes(project.artifactId));
}
