import { addProjectsAndDependencies } from '@jnxplus/gradle';
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
  addProjectsAndDependencies(builder, '@jnxplus/nx-boot-gradle');
  return builder.getUpdatedProjectGraph();
}
