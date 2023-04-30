import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nx/devkit';
import * as path from 'path';
import { kotlinVersion, quarkusVersion } from '../../utils/versions';
import { NxQuarkusMavenGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusMavenGeneratorSchema {
  dot: string;
  kotlinVersion: string;
  quarkusVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusMavenGeneratorSchema
): NormalizedSchema {
  const dot = '.';

  return {
    ...options,
    dot,
    kotlinVersion,
    quarkusVersion,
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
  options: NxQuarkusMavenGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('mvnw', '755');
  tree.changePermissions('mvnw.cmd', '755');
  await formatFiles(tree);
}
