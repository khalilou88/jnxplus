import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphNode,
  ProjectGraphProcessorContext,
} from '@nrwl/devkit';
import { appRootPath, fileExists } from '@nrwl/tao/src/utils/app-root';
import * as fs from 'fs';
import { join } from 'path';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

  for (const project of getManagedProjects(builder.graph.nodes)) {
    let buildGradleContents = '';
    const buildGradleFile = join(
      appRootPath,
      project.data.root,
      'build.gradle'
    );

    const buildGradleKtsFile = join(
      appRootPath,
      project.data.root,
      'build.gradle.kts'
    );

    if (fileExists(buildGradleFile)) {
      buildGradleContents = fs.readFileSync(buildGradleFile, 'utf-8');
      const deps = getDependecies(buildGradleContents);
      for (const dep of deps) {
        const dependecyProjectName = getDependecyProjectName(dep);
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'build.gradle').replace(/\\/g, '/'),
          dependecyProjectName
        );
      }
    }

    if (fileExists(buildGradleKtsFile)) {
      buildGradleContents = fs.readFileSync(buildGradleKtsFile, 'utf-8');
      const deps = getDependecies(buildGradleContents);
      for (const dep of deps) {
        const dependecyProjectName = getDependecyProjectName(dep);
        builder.addExplicitDependency(
          project.name,
          join(project.data.root, 'build.gradle.kts').replace(/\\/g, '/'),
          dependecyProjectName
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
      '@jnxplus/nx-boot-gradle'
    ) ||
      projectGraphNode.data?.architect?.build?.builder?.includes(
        '@jnxplus/nx-boot-gradle'
      ))
  );
}

function getDependecies(buildGradleContents: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (buildGradleContents.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependecyProjectName(gradleProjectPath: string) {
  return gradleProjectPath.split(':').pop();
}
