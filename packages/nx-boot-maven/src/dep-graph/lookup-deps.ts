import {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

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
            task: '-no-transfer-progress clean install -N',
          },
        },
      },
      files: [],
    },
  });

  parentPomXmlContent
    .childNamed('modules')
    .childrenNamed('module')
    .map((moduleXmlElement) => {
      return moduleXmlElement.val;
    })
    .forEach((projectRoot) => {
      console.log(parentProjectName);
      console.log(projectRoot);
      console.log(projectRoot.split('/').pop());
      console.log(join(projectRoot, 'pom.xml').replace(/\\/g, '/'));
      console.log('end');

      builder.addStaticDependency(
        projectRoot.split('/').pop(),
        parentProjectName,
        join(projectRoot, 'pom.xml').replace(/\\/g, '/')
      );
    });

  const projects = getManagedProjects(builder.graph.nodes);
  const projectNames = projects.map((project) => project.name);

  for (const project of projects) {
    const pomXmlPath = join(workspaceRoot, project.data.root, 'pom.xml');
    const pomXmlContent = readXml(pomXmlPath);
    const dependencies = getDependencies(pomXmlContent, projectNames);
    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name,
        dependency,
        join(project.data.root, 'pom.xml').replace(/\\/g, '/')
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

function getDependencies(pomXml: XmlDocument, projectNames: string[]) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  const allDependencies = dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId').val;
    });
  return allDependencies.filter((dependency) =>
    projectNames.includes(dependency)
  );
}
