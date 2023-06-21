import { ProjectGraphBuilder, ProjectGraphProcessorContext } from '@nx/devkit';
import { canUseGradleTask } from '../utils';
import { addProjectsAndDependenciesLegacy } from './graph-legacy';
import { addProjectsAndDependenciesFromTask } from './graph-task';

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  context: ProjectGraphProcessorContext,
  pluginName: string
) {
  if (canUseGradleTask()) {
    addProjectsAndDependenciesFromTask(builder, context, pluginName);
  } else {
    addProjectsAndDependenciesLegacy(builder, context, pluginName);
  }
}
