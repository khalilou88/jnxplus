import { addProjectsAndDependencies } from '@jnxplus/maven';
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
  addProjectsAndDependencies(builder, hasher, '@jnxplus/nx-micronaut-maven');
  return builder.getUpdatedProjectGraph();
}
