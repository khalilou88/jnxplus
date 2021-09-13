import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nrwl/devkit';
import { appRootPath } from '@nrwl/workspace/src/utils/app-root';
import { fileExists } from '@nrwl/workspace/src/utils/fileutils';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);

  for (const [projectName, node] of Object.entries(builder.graph.nodes)) {
    if (node.type === 'app' || node.type === 'lib') {
      const buildGradleFile = path.join(
        appRootPath,
        node.data.root,
        'build.gradle'
      );

      if (fileExists(buildGradleFile)) {
        const contents = fs.readFileSync(buildGradleFile, 'utf-8');
        const regexp = /project\((.*)\)/g;
        const matches = (contents.match(regexp) || []).map((e) =>
          e.replace(regexp, '$1')
        );
        for (const match of matches) {
          const dependecyProjectName = getDependecyProjectName(match);
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

function getDependecyProjectName(match: string) {
  const str = match.split(':').pop();
  return str.substring(0, str.length - 1);
}
