import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nrwl/devkit';
import * as path from 'path';
import {
  kotlinVersion,
  springBootStarterParentVersion,
} from '../../utils/versions';
import { NxBootMavenGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootMavenGeneratorSchema {
  dot: string;
  kotlinVersion: string;
  springBootStarterParentVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootMavenGeneratorSchema
): NormalizedSchema {
  const dot = '.';

  return {
    ...options,
    dot,
    kotlinVersion,
    springBootStarterParentVersion,
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
    path.join(__dirname, '..', 'init', 'files', 'maven', 'wrapper'),
    '',
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootMavenGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('mvnw', '755');
  tree.changePermissions('mvnw.cmd', '755');
  await formatFiles(tree);
}
