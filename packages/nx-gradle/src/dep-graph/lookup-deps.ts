import { addProjectsAndDependenciesFromTask } from '@jnxplus/gradle';
import {
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nx/devkit';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext,
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  addProjectsAndDependenciesFromTask(builder, context, '@jnxplus/nx-gradle');
  return builder.getUpdatedProjectGraph();
}
