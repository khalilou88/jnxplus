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

  const projects = getManagedProjects(builder.graph.nodes);
  const projectNames = projects.map((project) => project.name);

  for (const project of projects) {
    const pomXmlPath = join(workspaceRoot, project.data.root, 'pom.xml');

    if (fileExists(pomXmlPath)) {
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
  }

  return builder.getUpdatedProjectGraph();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getManagedProjects(nodes: Record<string, ProjectGraphProjectNode>) {
  return Object.entries(nodes)
    .filter((node) => isManagedProject(node[1]))
    .map((node) => node[1]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isManagedProject(projectGraphNode: ProjectGraphProjectNode): boolean {
  return (
    (projectGraphNode.type === 'app' || projectGraphNode.type === 'lib') &&
    projectGraphNode.data?.targets?.build?.executor?.includes(
      '@jnxplus/nx-boot-maven'
    )
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
