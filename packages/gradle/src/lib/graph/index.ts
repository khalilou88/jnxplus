import { ProjectGraphBuilder } from '@nx/devkit';
import { canUseGradleTask } from '../utils';
import { addProjectsAndDependenciesLegacy } from './graph-legacy';
import { addProjectsAndDependenciesFromTask } from './graph-task';

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  pluginName: string
) {
  if (canUseGradleTask()) {
    addProjectsAndDependenciesFromTask(builder, pluginName);
  } else {
    addProjectsAndDependenciesLegacy(builder, pluginName);
  }
}
