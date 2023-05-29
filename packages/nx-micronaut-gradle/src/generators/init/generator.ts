import {
  checkstyleVersion,
  dependencyManagementVersion,
  ktlintVersion,
  springBootVersion,
  springKotlinVersion,
  updateNxJson,
} from '@jnxplus/common';
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
  updateGitIgnore,
} from '@jnxplus/gradle';
import { Tree, formatFiles, generateFiles, offsetFromRoot } from '@nx/devkit';
import * as path from 'path';
import { NxMicronautGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxMicronautGradleGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  dependencyManagementVersion: string;
  kotlinJvmVersion: string;
  kotlinSpringVersion: string;
  checkstyleVersion: string;
  ktlintVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMicronautGradleGeneratorSchema
): NormalizedSchema {
  const kotlinExtension = options.dsl === 'kotlin' ? '.kts' : '';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    dependencyManagementVersion,
    kotlinJvmVersion: springKotlinVersion,
    kotlinSpringVersion: springKotlinVersion,
    checkstyleVersion,
    ktlintVersion,
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
  options: NxMicronautGradleGeneratorSchema
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
