import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nrwl/devkit';
import * as path from 'path';
import {
  dependencyManagementVersion,
  kotlinJvmVersion,
  kotlinSpringVersion,
  springBootVersion,
} from '../../utils/versions';
import { NxBootGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  dependencyManagementVersion: string;
  kotlinJvmVersion: string;
  kotlinSpringVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleGeneratorSchema
): NormalizedSchema {
  //TODO
  const kotlinExtension = '.kts';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    dependencyManagementVersion,
    kotlinJvmVersion,
    kotlinSpringVersion,
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
    path.join(__dirname, '..', 'init', 'files', 'gradle', 'wrapper'),
    '',
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
