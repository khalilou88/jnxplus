import { addDependencies, addProjects } from '@jnxplus/gradle';
import {
  Hasher,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nx/devkit';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  const hasher = new Hasher(graph, context.nxJsonConfiguration, {});
  addProjects(builder, hasher, '@jnxplus/nx-boot-gradle', '');
  addDependencies(builder);
  return builder.getUpdatedProjectGraph();
}
