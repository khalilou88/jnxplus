import {
  logger,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphNode,
  ProjectGraphProcessorContext,
  workspaceRoot,
} from '@nrwl/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';

export function processProjectGraph(
  graph: ProjectGraph,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ProjectGraphProcessorContext
): ProjectGraph {
  logger.info(
    `processProjectGraph ran for nx-boot-gradle with context: ${JSON.stringify(
      context
    )}`
  );

  const builder = new ProjectGraphBuilder(graph);
  const managedProjects = getManagedProjects(builder.graph.nodes);

  for (const project of managedProjects) {
    let buildGradleContents = '';
    const buildGradleFile = join(
      workspaceRoot,
      project.data.root,
      'build.gradle'
    );

    const buildGradleKtsFile = join(
      workspaceRoot,
      project.data.root,
      'build.gradle.kts'
    );

    if (fileExists(buildGradleFile)) {
      buildGradleContents = fs.readFileSync(buildGradleFile, 'utf-8');
      const deps = getDependencies(buildGradleContents);
      for (const dep of deps) {
        const dependencyProjectName = getDependencyProjectName(
          dep,
          managedProjects
        );
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'build.gradle').replace(/\\/g, '/'),
          dependencyProjectName
        );
      }
    }

    if (fileExists(buildGradleKtsFile)) {
      buildGradleContents = fs.readFileSync(buildGradleKtsFile, 'utf-8');
      const deps = getDependencies(buildGradleContents);
      for (const dep of deps) {
        const dependencyProjectName = getDependencyProjectName(
          dep,
          managedProjects
        );
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'build.gradle.kts').replace(/\\/g, '/'),
          dependencyProjectName
        );
      }
    }
  }

  return builder.getUpdatedProjectGraph();
}

function getManagedProjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: Record<string, ProjectGraphNode<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ProjectGraphNode<any>[] {
  return Object.entries(nodes)
    .filter((node) => isManagedProject(node[1]))
    .map((node) => node[1]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isManagedProject(projectGraphNode: ProjectGraphNode<any>): boolean {
  return (
    (projectGraphNode.type === 'app' || projectGraphNode.type === 'lib') &&
    (projectGraphNode.data?.targets?.build?.executor?.includes(
      '@jnxplus/nx-boot-gradle'
    ) ||
      projectGraphNode.data?.architect?.build?.builder?.includes(
        '@jnxplus/nx-boot-gradle'
      ))
  );
}

function getDependencies(buildGradleContents: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (buildGradleContents.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependencyProjectName(
  gradleProjectPath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  managedProjects: ProjectGraphNode<any>[]
) {
  const [, ...folders] = gradleProjectPath.split(':');
  const root = folders.join('/');
  const node = managedProjects.find((project) => project.data.root === root);

  return (
    node?.name || gradleProjectPath.split(':libs:').pop().replace(/:/g, '-')
  );
}
