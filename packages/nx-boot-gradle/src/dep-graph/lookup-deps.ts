import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nrwl/devkit';
import { appRootPath } from '@nrwl/workspace/src/utils/app-root';
import { fileExists } from '@nrwl/workspace/src/utils/fileutils';
import * as fs from 'fs';
import { join } from 'path';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

  for (const [projectName, node] of Object.entries(builder.graph.nodes)) {
    if (node.type === 'app' || node.type === 'lib') {
      const buildGradleFile = join(appRootPath, node.data.root, 'build.gradle');

      if (fileExists(buildGradleFile)) {
        const contents = fs.readFileSync(buildGradleFile, 'utf-8');
        const deps = getDependecies(contents);
        for (const dep of deps) {
          const dependecyProjectName = getDependecyProjectName(dep);
          builder.addExplicitDependency(
            projectName,
            join(node.data.root, 'build.gradle').replace(/\\/g, '/'),
            dependecyProjectName
          );
        }
      }
    }
  }

  return builder.getUpdatedProjectGraph();
}

function getDependecies(buildGradleContents: string) {
  const regexp = /project\((.*)\)/g;
  return (buildGradleContents.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependecyProjectName(match: string) {
  const str = match.split(':').pop();
  return str.substring(0, str.length - 1);
}
