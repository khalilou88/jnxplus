import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphNode,
  ProjectGraphProcessorContext,
} from '@nrwl/devkit';
import { appRootPath, fileExists } from '@nrwl/tao/src/utils/app-root';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml2 } from '../utils/xml';

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
      const pomXmlContent = readXml2(pomXmlPath);
      const dependencies = getDependencies(pomXmlContent, projectNames);
      for (const dependency of dependencies) {
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'pom.xml').replace(/\\/g, '/'),
          dependency
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

function getDependencies(pomXml: XmlDocument, projectNames: string[]) {
  const allDependencies = pomXml
    .childNamed('dependencies')
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId').val;
    });
  return allDependencies.filter((dependency) =>
    projectNames.includes(dependency)
  );
}
