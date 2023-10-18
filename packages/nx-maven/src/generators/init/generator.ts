import {
  springBootVersion,
  kotlinVersion,
  updateNxJson,
  quarkusVersion,
  micronautVersion,
} from '@jnxplus/common';
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
  addOrUpdatePrettierRc,
  updateGitIgnore,
} from '../../utils/generators';
import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import { NxMavenGeneratorSchema } from './schema';

interface NormalizedSchema extends NxMavenGeneratorSchema {
  dot: string;
  kotlinVersion: string;
  springBootVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  mavenRootDirectory: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenGeneratorSchema,
): NormalizedSchema {
  const dot = '.';

  let mavenRootDirectory = '';
  if (options.useSubfolder) {
    mavenRootDirectory = 'nx-maven';
  }

  return {
    ...options,
    dot,
    kotlinVersion,
    springBootVersion,
    quarkusVersion,
    micronautVersion,
    mavenRootDirectory,
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
      path.join(__dirname, 'files', 'maven', 'wrapper'),
      options.mavenRootDirectory,
      templateOptions,
    );
  }
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'maven', 'config'),
    options.mavenRootDirectory,
    templateOptions,
  );

  if (options.useSubfolder) {
    generateFiles(
      tree,
      path.join(__dirname, 'files', 'nx'),
      options.mavenRootDirectory,
      templateOptions,
    );
  }
}

export default async function (tree: Tree, options: NxMavenGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree, '@jnxplus/nx-maven');
  updateGitIgnore(tree, options.skipWrapper);
  addOrUpdatePrettierRc(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);
  if (!options.skipWrapper) {
    tree.changePermissions(
      joinPathFragments(normalizedOptions.mavenRootDirectory, 'mvnw'),
      '755',
    );
    tree.changePermissions(
      joinPathFragments(normalizedOptions.mavenRootDirectory, 'mvnw.cmd'),
      '755',
    );
  }
  await formatFiles(tree);
}
