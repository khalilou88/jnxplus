import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nrwl/devkit';
import * as path from 'path';
import { kotlinJvmVersion } from '../../utils/versions';
import { NxQuarkusGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusGradleGeneratorSchema {
  //TODO remove this if not used
  kotlinJvmVersion: string;
  kotlinExtension: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusGradleGeneratorSchema
): NormalizedSchema {
  //TODO
  const kotlinExtension = '.kts';

  return {
    ...options,
    kotlinExtension,
    kotlinJvmVersion,
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
  options: NxQuarkusGradleGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
