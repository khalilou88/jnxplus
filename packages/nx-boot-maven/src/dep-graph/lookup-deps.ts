import {
  Hasher,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
  ProjectGraphProjectNode,
  workspaceRoot,
} from '@nrwl/devkit';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml } from '../utils/xml';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  const projects = getManagedProjects(builder.graph.nodes);

  const hasher = new Hasher(graph, context.nxJsonConfiguration, {});

  const parentPomXmlPath = join(workspaceRoot, 'pom.xml');
  const parentPomXmlContent = readXml(parentPomXmlPath);

  const parentProjectName = parentPomXmlContent.childNamed('artifactId').val;

  builder.addNode({
    name: parentProjectName,
    type: 'app',
    data: {
      root: '',
      targets: {
        build: {
          executor: '@jnxplus/nx-boot-maven:run-task',
          options: {
            task: 'install -N',
          },
        },
        'run-task': {
          executor: '@jnxplus/nx-boot-maven:run-task',
        },
      },
      files: [
        {
          file: 'pom.xml',
          hash: hasher.hashFile('pom.xml'),
        },
      ],
    },
  });

  const parentPomModules = getModules(
    workspaceRoot,
    parentPomXmlContent,
    projects
  );

  for (const module of parentPomModules) {
    builder.addStaticDependency(
      module.name,
      parentProjectName,
      join(module.data.root, 'pom.xml').replace(/\\/g, '/')
    );
  }

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

  return builder.getUpdatedProjectGraph();
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
      return dependencyXmlElement.childNamed('artifactId').val;
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
    const moduleProjectName = modulePomXmlContent.childNamed('artifactId').val;
    return moduleProjectName;
  });

  return projects.filter((project) => modules.includes(project.name));
}
