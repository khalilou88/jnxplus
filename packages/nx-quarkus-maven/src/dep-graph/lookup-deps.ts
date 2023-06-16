import { addProjectsAndDependencies } from '@jnxplus/maven';
import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nx/devkit';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  addProjectsAndDependencies(builder, context, '@jnxplus/nx-quarkus-maven');
  return builder.getUpdatedProjectGraph();
}
