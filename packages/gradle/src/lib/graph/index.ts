import { Hasher, ProjectGraphBuilder } from '@nx/devkit';
import { canUseGradleTask } from '../utils';
import { addProjectsAndDependenciesLegacy } from './graph-legacy';
import { addProjectsAndDependenciesFromTask } from './graph-task';

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string
) {
  if (canUseGradleTask()) {
    addProjectsAndDependenciesFromTask(builder, hasher, pluginName);
  } else {
    addProjectsAndDependenciesLegacy(builder, hasher, pluginName);
  }
}
