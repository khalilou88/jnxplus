import {
  jnxplusGradlePluginVersion,
  kotlinVersion,
  kspVersion,
  micronautVersion,
  quarkusVersion,
  shadowVersion,
  springBootVersion,
  springDependencyManagementVersion,
} from '@jnxplus/common';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  updateJson,
} from '@nx/devkit';
import * as path from 'path';
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
  updateGitIgnore,
} from '../../utils/generators';
import { NxGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxGradleGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  springDependencyManagementVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  kspVersion: string;
  shadowVersion: string;
  kotlinVersion: string;
  jnxplusGradlePluginVersion: string;
  generateRepositories: boolean;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleGeneratorSchema,
): NormalizedSchema {
  const kotlinExtension =
    options.dsl === 'kotlin' || options.preset === 'kotlin-multiplatform'
      ? '.kts'
      : '';

  const generateRepositories = process.env['NODE_ENV'] === 'test';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    springDependencyManagementVersion,
    quarkusVersion,
    micronautVersion,
    kspVersion,
    shadowVersion,
    kotlinVersion,
    jnxplusGradlePluginVersion,
    generateRepositories,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };

  if (!options.skipWrapper) {
    generateFiles(
      tree,
      path.join(__dirname, 'files', 'gradle', 'wrapper'),
      options.gradleRootDirectory,
      templateOptions,
    );
  }

  generateFiles(
    tree,
    path.join(__dirname, 'files', 'gradle', 'config', options.preset),
    options.gradleRootDirectory,
    templateOptions,
  );
}

export default async function (tree: Tree, options: NxGradleGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.gradleRootDirectory) {
    const projectConfiguration: ProjectConfiguration = {
      root: normalizedOptions.gradleRootDirectory,
      targets: {},
    };

    addProjectConfiguration(
      tree,
      normalizedOptions.rootProjectName,
      projectConfiguration,
    );
  }

  addFiles(tree, normalizedOptions);
  updateNxJson(tree, normalizedOptions);
  updateGitIgnore(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);

  if (!options.skipWrapper) {
    tree.changePermissions(
      joinPathFragments(options.gradleRootDirectory, 'gradlew'),
      '755',
    );
    tree.changePermissions(
      joinPathFragments(options.gradleRootDirectory, 'gradlew.bat'),
      '755',
    );
  }
  await formatFiles(tree);
}

export function updateNxJson(tree: Tree, options: NormalizedSchema) {
  const plugin = {
    plugin: '@jnxplus/nx-gradle',
    options: {
      gradleRootDirectory: options.gradleRootDirectory,
    },
  };

  updateJson(tree, 'nx.json', (nxJson) => {
    // if plugins is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add plugin
    nxJson.plugins.push(plugin);
    // return modified JSON object
    return nxJson;
  });
}
