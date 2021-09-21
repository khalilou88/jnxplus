import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphNode,
  ProjectGraphProcessorContext,
} from '@nrwl/devkit';
import { appRootPath, fileExists } from '@nrwl/tao/src/utils/app-root';
import { join } from 'path';
import { XmlDocument, XmlElement } from 'xmldoc';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

  const projects = getManagedProjects(builder.graph.nodes);
  const projectNames = projects.map((project) => project.name);

  for (const project of projects) {
    const pomXmlPath = join(appRootPath, project.data.root, 'pom.xml');

    if (fileExists(pomXmlPath)) {
      const pomXmlContent = readXml(pomXmlPath);
      const dependecies = getDependecies(pomXmlContent, projectNames);
      for (const dependecy of dependecies) {
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'pom.xml').replace(/\\/g, '/'),
          dependecy
        );
      }
    }
  }

  return builder.getUpdatedProjectGraph();
}

function getManagedProjects(nodes: Record<string, ProjectGraphNode<any>>) {
  return Object.entries(nodes)
    .filter((node) => isManagedProject(node[1]))
    .map((node) => node[1]);
}

function isManagedProject(projectGraphNode: ProjectGraphNode<any>): boolean {
  return (
    (projectGraphNode.type === 'app' || projectGraphNode.type === 'lib') &&
    (projectGraphNode.data?.targets?.build?.executor?.includes(
      '@jnxplus/nx-boot-maven'
    ) ||
      projectGraphNode.data?.architect?.build?.builder?.includes(
        '@jnxplus/nx-boot-maven'
      ))
  );
}

function getDependecies(pomXml: XmlDocument, projectNames: string[]) {
  const allDependecies = pomXml
    .childNamed('dependencies')
    .children.map(
      (xmlNode) => (xmlNode as XmlElement).childNamed('artifactId').val
    );

  return allDependecies.filter((dependecy) => projectNames.includes(dependecy));
}

function readXml(filePath: string): XmlDocument {
  return new XmlDocument(filePath);
}
