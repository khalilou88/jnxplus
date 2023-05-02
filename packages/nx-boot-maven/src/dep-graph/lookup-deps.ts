import {
  Hasher,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nx/devkit';

import { addDependencies, addProjects } from '@jnxplus/common/graph/maven';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  const hasher = new Hasher(graph, context.nxJsonConfiguration, {});
  addProjects(builder, hasher, '@jnxplus/nx-boot-maven', '');
  addDependencies(builder);
  return builder.getUpdatedProjectGraph();
}
