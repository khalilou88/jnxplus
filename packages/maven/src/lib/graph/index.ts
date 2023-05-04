import {
  Hasher,
  ProjectGraphBuilder,
  ProjectGraphProjectNode,
  workspaceRoot,
} from '@nx/devkit';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml } from '@jnxplus/common';
import * as fs from 'fs';

export function addProjects(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string,
  projectRoot: string
) {
  const projectJson = join(workspaceRoot, projectRoot, 'project.json');
  const pomXmlPath = join(workspaceRoot, projectRoot, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);

  if (!fileExists(projectJson)) {
    const projectName =
      pomXmlContent.childNamed('artifactId')?.val ?? 'missingArtifactId';

    const projectType = getProjectType(projectRoot);
    builder.addNode({
      name: projectName,
      type: projectType,
      data: {
        root: projectRoot,
        projectType: projectType === 'app' ? 'application' : 'library',
        targets: {
          build: {
            executor: `${pluginName}:build`,
          },
          'run-task': {
            executor: `${pluginName}:run-task`,
          },
        },
        files: [
          projectRoot === ''
            ? {
                file: 'pom.xml',
                hash: hasher.hashFile('pom.xml'),
              }
            : {
                file: `${projectRoot}/pom.xml`,
                hash: hasher.hashFile(`${projectRoot}/pom.xml`),
              },
        ],
      },
    });
  }

  const modulesXmlElement = pomXmlContent.childNamed('modules');
  if (modulesXmlElement === undefined) {
    return;
  }

  const moduleXmlElementArray = modulesXmlElement.childrenNamed('module');
  if (moduleXmlElementArray.length === 0) {
    return;
  }

  for (const moduleXmlElement of moduleXmlElementArray) {
    const moduleRoot = join(projectRoot, moduleXmlElement.val).replace(
      /\\/g,
      '/'
    );
    addProjects(builder, hasher, pluginName, moduleRoot);
  }
}

export function addDependencies(builder: ProjectGraphBuilder) {
  const projects = getManagedProjects(builder.graph.nodes);

  for (const project of projects) {
    const pomXmlPath = join(workspaceRoot, project.data.root, 'pom.xml');
    const pomXmlContent = readXml(pomXmlPath);
    const dependencies = getDependencies(pomXmlContent, projects);
    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name,
        dependency.name,
        join(project.data.root, 'pom.xml').replace(/\\/g, '/')
      );
    }

    const projectAbsolutePath = join(workspaceRoot, project.data.root);
    const modules = getModules(projectAbsolutePath, pomXmlContent, projects);

    for (const module of modules) {
      builder.addStaticDependency(
        module.name,
        project.name,
        join(module.data.root, 'pom.xml').replace(/\\/g, '/')
      );
    }
  }
}

function getManagedProjects(nodes: Record<string, ProjectGraphProjectNode>) {
  return Object.entries(nodes)
    .filter((node) => isManagedProject(node[1]))
    .map((node) => node[1]);
}

function isManagedProject(projectGraphNode: ProjectGraphProjectNode): boolean {
  const pomXmlPath = join(workspaceRoot, projectGraphNode.data.root, 'pom.xml');
  return (
    (projectGraphNode.type === 'app' || projectGraphNode.type === 'lib') &&
    fileExists(pomXmlPath)
  );
}

function getDependencies(
  pomXml: XmlDocument,
  projects: ProjectGraphProjectNode[]
) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  const dependencies = dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId')?.val;
    });

  return projects.filter((project) => dependencies.includes(project.name));
}

function getModules(
  projectAbsolutePath: string,
  pomXml: XmlDocument,
  projects: ProjectGraphProjectNode[]
) {
  const modulesXml = pomXml.childNamed('modules');
  if (modulesXml === undefined) {
    return [];
  }

  const modules = modulesXml.childrenNamed('module').map((moduleXmlElement) => {
    const moduleRoot = join(projectAbsolutePath, moduleXmlElement.val);
    const modulePomXmlPath = join(moduleRoot, 'pom.xml');
    const modulePomXmlContent = readXml(modulePomXmlPath);
    const moduleProjectName = modulePomXmlContent.childNamed('artifactId')?.val;
    return moduleProjectName;
  });

  return projects.filter((project) => modules.includes(project.name));
}

function getProjectType(projectRoot: string): 'app' | 'e2e' | 'lib' {
  if (projectRoot === '') {
    return 'lib';
  }

  const nxJson = JSON.parse(
    fs.readFileSync(join(workspaceRoot, 'nx.json'), 'utf8')
  );

  const appsDir = nxJson?.workspaceLayout?.appsDir
    ? nxJson.workspaceLayout.appsDir
    : 'apps';

  if (projectRoot.startsWith(appsDir)) {
    return 'app';
  }

  return 'lib';
}
