import {
  checkstyleVersion,
  dependencyManagementVersion,
  ktlintVersion,
  springBootVersion,
  springKotlinVersion,
  updateNxJson,
  jnxplusGradlePluginVersion,
  quarkusPlatformVersion,
  quarkusKotlinVersion,
  micronautVersion,
  micronautKotlinVersion,
} from '@jnxplus/common';
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
  updateGitIgnore,
} from '@jnxplus/gradle';
import { Tree, formatFiles, generateFiles, offsetFromRoot } from '@nx/devkit';
import * as path from 'path';
import { NxGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxGradleGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  dependencyManagementVersion: string;
  kotlinJvmVersion: string;
  kotlinSpringVersion: string;
  checkstyleVersion: string;
  ktlintVersion: string;
  jnxplusGradlePluginVersion: string;
  generateRepositories: boolean;

  //TODO
  quarkusPluginVersion: string;
  quarkusPlatformVersion: string;
  kotlinPluginAllopenVersion: string;
  micronautVersion: string;
  kotlinVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleGeneratorSchema
): NormalizedSchema {
  const kotlinExtension = options.dsl === 'kotlin' ? '.kts' : '';

  const generateRepositories = process.env['NODE_ENV'] === 'test';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    dependencyManagementVersion,
    kotlinJvmVersion: springKotlinVersion,
    kotlinSpringVersion: springKotlinVersion,
    checkstyleVersion,
    ktlintVersion,
    jnxplusGradlePluginVersion,
    generateRepositories,

    quarkusPluginVersion: quarkusPlatformVersion,
    quarkusPlatformVersion,
    kotlinPluginAllopenVersion: quarkusKotlinVersion,
    micronautVersion,
    kotlinVersion: micronautKotlinVersion,
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

export default async function (tree: Tree, options: NxGradleGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree, '@jnxplus/nx-gradle');
  updateGitIgnore(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
