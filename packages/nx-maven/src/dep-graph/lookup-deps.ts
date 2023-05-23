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
  addProjectsAndDependencies(builder, '@jnxplus/nx-maven');
  return builder.getUpdatedProjectGraph();
}
