import {
  checkstyleVersion,
  springDependencyManagementVersion,
  ktlintVersion,
  springBootVersion,
  kotlinVersion,
  updateNxJson,
  jnxplusGradlePluginVersion,
} from '@jnxplus/common';
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
  updateGitIgnore,
} from '@jnxplus/gradle';
import { Tree, formatFiles, generateFiles, offsetFromRoot } from '@nx/devkit';
import * as path from 'path';
import { NxBootGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  springDependencyManagementVersion: string;
  kotlinVersion: string;
  checkstyleVersion: string;
  ktlintVersion: string;
  jnxplusGradlePluginVersion: string;
  generateRepositories: boolean;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleGeneratorSchema
): NormalizedSchema {
  const kotlinExtension = options.dsl === 'kotlin' ? '.kts' : '';

  const generateRepositories = process.env['NODE_ENV'] === 'test';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    springDependencyManagementVersion,
    kotlinVersion,
    checkstyleVersion,
    ktlintVersion,
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
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'gradle', 'wrapper'),
    '',
    templateOptions
  );
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'gradle', 'config'),
    '',
    templateOptions
  );
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'linters'),
    'tools/linters',
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree, '@jnxplus/nx-boot-gradle');
  updateGitIgnore(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
